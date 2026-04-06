import { readFileSync } from 'node:fs';
import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { loadConfig, loadPrompt, getAiReviewDir } from './config.js';
import { createProvider } from './providers/base.js';
import { getDiff } from './github/diff.js';
import { createReview, getExistingBotComments } from './github/comments.js';
import type { ReviewComment } from './types.js';
import { getUnresolvedThreads } from './github/threads.js';
import { runQualityReview } from './agents/reviewers/quality.js';
import { runPerformanceReview } from './agents/reviewers/performance.js';
import { runSecurityReview } from './agents/reviewers/security.js';
import { runOrchestrator } from './agents/orchestrator.js';
import { runResolver } from './agents/resolver.js';
import { runResponder, extractQuestion } from './agents/responder.js';
import { replyToComment } from './github/comments.js';

// ============================================
// Environment
// ============================================

const getEnvOrThrow = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const API_KEY_MAP: Record<string, string> = {
  kimi: 'KIMI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
};

const getApiKey = (provider: string): string => {
  const envName = API_KEY_MAP[provider];
  if (!envName) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const key = getEnvOrThrow(envName);
  core.setSecret(key);
  return key;
};

// ============================================
// Event Payload
// ============================================

interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    draft: boolean;
    user: { login: string; type: string };
  };
  repository: {
    owner: { login: string };
    name: string;
  };
}

interface CommentPayload {
  action: string;
  comment: {
    id: number;
    body: string;
    path?: string;
    line?: number | null;
    user: { login: string };
    in_reply_to_id?: number;
  };
  issue?: {
    number: number;
    pull_request?: { url: string };
  };
  pull_request?: {
    number: number;
  };
  repository: {
    owner: { login: string };
    name: string;
  };
}

// ============================================
// Review Pipeline
// ============================================

const handleReview = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  fetchExisting = false
): Promise<void> => {
  const config = loadConfig();
  const aiReviewDir = getAiReviewDir();

  // diff 추출
  const diff = await getDiff(octokit, owner, repo, prNumber, config.options.exclude_files);
  if (diff.length === 0) {
    core.info('No reviewable files found. Skipping review.');
    return;
  }

  // 기존 봇 코멘트 조회 (synchronize 이벤트에서만)
  let existingComments: ReviewComment[] = [];
  if (fetchExisting) {
    const botLogin = 'github-actions[bot]';
    existingComments = await getExistingBotComments(octokit, owner, repo, prNumber, botLogin);
    core.info(`Found ${existingComments.length} existing bot comments.`);
  }

  // 각 에이전트의 provider + prompt 준비
  const qualityProvider = createProvider(config.agents.quality.provider, getApiKey(config.agents.quality.provider));
  const perfProvider = createProvider(config.agents.performance.provider, getApiKey(config.agents.performance.provider));
  const securityProvider = createProvider(config.agents.security.provider, getApiKey(config.agents.security.provider));
  const orchProvider = createProvider(config.agents.orchestrator.provider, getApiKey(config.agents.orchestrator.provider));

  const qualityPrompt = loadPrompt(config.agents.quality.prompt_file, aiReviewDir);
  const perfPrompt = loadPrompt(config.agents.performance.prompt_file, aiReviewDir);
  const securityPrompt = loadPrompt(config.agents.security.prompt_file, aiReviewDir);
  const orchPrompt = loadPrompt(config.agents.orchestrator.prompt_file, aiReviewDir);

  // 3개 에이전트 병렬 실행 (개별 실패가 전체를 중단하지 않도록 allSettled 사용)
  const results = await Promise.allSettled([
    runQualityReview(qualityProvider, config.agents.quality.model, qualityPrompt, diff, config.agents.quality.temperature, config.agents.quality.max_tokens),
    runPerformanceReview(perfProvider, config.agents.performance.model, perfPrompt, diff, config.agents.performance.temperature, config.agents.performance.max_tokens),
    runSecurityReview(securityProvider, config.agents.security.model, securityPrompt, diff, config.agents.security.temperature, config.agents.security.max_tokens),
  ]);

  const extractResult = <T>(r: PromiseSettledResult<T>, name: string, fallback: T): T => {
    if (r.status === 'fulfilled') return r.value;
    core.warning(`${name} agent failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    return fallback;
  };

  const qualityIssues = extractResult(results[0], 'Quality', []);
  const perfIssues = extractResult(results[1], 'Performance', []);
  const securityIssues = extractResult(results[2], 'Security', []);

  core.info(`Found issues - Quality: ${qualityIssues.length}, Performance: ${perfIssues.length}, Security: ${securityIssues.length}`);

  // Orchestrator로 결과 병합
  const result = await runOrchestrator(
    orchProvider,
    config.agents.orchestrator.model,
    orchPrompt,
    { diff, qualityIssues, performanceIssues: perfIssues, securityIssues, existingComments },
    config.options.max_comments_per_review,
    config.agents.orchestrator.temperature,
    config.agents.orchestrator.max_tokens
  );

  // 리뷰 게시
  if (result.comments.length > 0) {
    await createReview(octokit, owner, repo, prNumber, result.comments, result.summary);
    core.info(`Posted review with ${result.comments.length} comments.`);
  } else {
    core.info('No issues to report.');
  }
};

// ============================================
// Resolver
// ============================================

const handleResolve = async (
  octokit: Octokit,
  graphqlFn: typeof graphql,
  owner: string,
  repo: string,
  prNumber: number
): Promise<void> => {
  const config = loadConfig();
  const aiReviewDir = getAiReviewDir();

  const threads = await getUnresolvedThreads(graphqlFn, owner, repo, prNumber);

  if (threads.length === 0) {
    core.info('No unresolved threads found.');
    return;
  }

  const diff = await getDiff(octokit, owner, repo, prNumber, config.options.exclude_files);
  const provider = createProvider(config.agents.resolver.provider, getApiKey(config.agents.resolver.provider));
  const prompt = loadPrompt(config.agents.resolver.prompt_file, aiReviewDir);

  core.info(`Checking ${threads.length} unresolved threads...`);
  const summary = await runResolver({
    provider,
    model: config.agents.resolver.model,
    systemPrompt: prompt,
    confidenceThreshold: config.agents.resolver.confidence_threshold ?? 0.8,
    temperature: config.agents.resolver.temperature,
    maxTokens: config.agents.resolver.max_tokens,
    threads,
    diff,
    graphql: graphqlFn,
    octokit,
    owner,
    repo,
    prNumber,
  });

  core.info(`Resolver results - Resolved: ${summary.resolved}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`);
};

// ============================================
// Responder
// ============================================

const handleRespond = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  comment: CommentPayload['comment']
): Promise<void> => {
  const config = loadConfig();
  const aiReviewDir = getAiReviewDir();
  const trigger = config.triggers.respond_to;

  const question = extractQuestion(comment.body, trigger);
  if (!question) {
    core.info('No bot mention detected. Skipping.');
    return;
  }

  const diff = await getDiff(octokit, owner, repo, prNumber, config.options.exclude_files);
  const provider = createProvider(config.agents.responder.provider, getApiKey(config.agents.responder.provider));
  const prompt = loadPrompt(config.agents.responder.prompt_file, aiReviewDir);

  const answer = await runResponder({
    provider,
    model: config.agents.responder.model,
    systemPrompt: prompt,
    temperature: config.agents.responder.temperature,
    maxTokens: config.agents.responder.max_tokens,
    input: {
      commentBody: comment.body,
      commentId: comment.id,
      path: comment.path ?? null,
      line: comment.line ?? null,
      threadComments: [],
    },
    diff,
    trigger,
  });

  await replyToComment(octokit, owner, repo, prNumber, comment.id, answer);
};

// ============================================
// Main
// ============================================

const main = async (): Promise<void> => {
  const eventName = getEnvOrThrow('GITHUB_EVENT_NAME');
  const eventPath = getEnvOrThrow('GITHUB_EVENT_PATH');
  const token = getEnvOrThrow('GITHUB_TOKEN');

  // 시크릿을 즉시 등록하여 로그에서 자동 마스킹
  // (getApiKey에서도 중복 등록하여 새 프로바이더 누락 방지)
  core.setSecret(token);
  for (const envName of Object.values(API_KEY_MAP)) {
    const key = process.env[envName];
    if (key) core.setSecret(key);
  }

  const octokit = new Octokit({ auth: token });
  const graphqlFn = graphql.defaults({ headers: { authorization: `token ${token}` } });

  const payloadRaw = readFileSync(eventPath, 'utf-8');

  core.info(`Event: ${eventName}`);

  if (eventName === 'pull_request') {
    const payload = JSON.parse(payloadRaw) as PullRequestPayload;
    const { action, pull_request: pr, repository: repo } = payload;
    const owner = repo.owner.login;
    const repoName = repo.name;

    // Pre-flight filters
    const config = loadConfig();
    if (!config.options.review_draft_pr && pr.draft) {
      core.info('Draft PR detected. Skipping.');
      return;
    }
    if (config.options.skip_bot_prs && pr.user.type === 'Bot') {
      core.info('Bot PR detected. Skipping.');
      return;
    }

    if (action === 'opened' || action === 'reopened') {
      await handleReview(octokit, owner, repoName, pr.number);
    } else if (action === 'synchronize') {
      // 1. 기존 리뷰 코멘트 해결 여부 판정
      await handleResolve(octokit, graphqlFn, owner, repoName, pr.number);
      // 2. 새 커밋에 대한 신규 리뷰 (기존 코멘트 중복 방지)
      await handleReview(octokit, owner, repoName, pr.number, true);
    }
  } else if (eventName === 'issue_comment' || eventName === 'pull_request_review_comment') {
    const payload = JSON.parse(payloadRaw) as CommentPayload;

    if (payload.action !== 'created') return;

    const owner = payload.repository.owner.login;
    const repoName = payload.repository.name;

    // issue_comment 이벤트에서 PR이 아닌 일반 이슈 필터링
    if (eventName === 'issue_comment' && !payload.issue?.pull_request) {
      core.info('Comment is on a regular issue (not a PR). Skipping.');
      return;
    }

    const prNumber = payload.pull_request?.number ?? payload.issue?.number;

    if (!prNumber) {
      core.warning('Could not determine PR number. Skipping.');
      return;
    }

    await handleRespond(octokit, owner, repoName, prNumber, payload.comment);
  } else {
    core.warning(`Unhandled event: ${eventName}`);
  }
};

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
