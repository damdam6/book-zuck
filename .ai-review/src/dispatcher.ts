import { readFileSync } from 'node:fs';
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { loadConfig, loadPrompt, getAiReviewDir } from './config.js';
import { createProvider } from './providers/base.js';
import { getDiff } from './github/diff.js';
import { createReview } from './github/comments.js';
import { getUnresolvedThreads, filterBotThreads } from './github/threads.js';
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

const getApiKey = (provider: string): string => {
  const keyMap: Record<string, string> = {
    kimi: 'KIMI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  };
  const envName = keyMap[provider];
  if (!envName) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return getEnvOrThrow(envName);
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
  prNumber: number
): Promise<void> => {
  const config = loadConfig();
  const aiReviewDir = getAiReviewDir();

  // diff 추출
  const diff = await getDiff(octokit, owner, repo, prNumber, config.options.exclude_files);
  if (diff.length === 0) {
    console.log('No reviewable files found. Skipping review.');
    return;
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

  // 3개 에이전트 병렬 실행
  console.log('Running review agents in parallel...');
  const [qualityIssues, perfIssues, securityIssues] = await Promise.all([
    runQualityReview(qualityProvider, config.agents.quality.model, qualityPrompt, diff, config.agents.quality.temperature, config.agents.quality.max_tokens),
    runPerformanceReview(perfProvider, config.agents.performance.model, perfPrompt, diff, config.agents.performance.temperature, config.agents.performance.max_tokens),
    runSecurityReview(securityProvider, config.agents.security.model, securityPrompt, diff, config.agents.security.temperature, config.agents.security.max_tokens),
  ]);

  console.log(`Found issues - Quality: ${qualityIssues.length}, Performance: ${perfIssues.length}, Security: ${securityIssues.length}`);

  // Orchestrator로 결과 병합
  const result = await runOrchestrator(
    orchProvider,
    config.agents.orchestrator.model,
    orchPrompt,
    { diff, qualityIssues, performanceIssues: perfIssues, securityIssues },
    config.options.max_comments_per_review,
    config.agents.orchestrator.temperature,
    config.agents.orchestrator.max_tokens
  );

  // 리뷰 게시
  if (result.comments.length > 0) {
    await createReview(octokit, owner, repo, prNumber, result.comments, result.summary);
    console.log(`Posted review with ${result.comments.length} comments.`);
  } else {
    console.log('No issues to report.');
  }

  console.log(`Stats: ${JSON.stringify(result.stats)}`);
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
  const botThreads = filterBotThreads(threads, 'github-actions[bot]');

  if (botThreads.length === 0) {
    console.log('No unresolved bot threads found.');
    return;
  }

  const diff = await getDiff(octokit, owner, repo, prNumber, config.options.exclude_files);
  const provider = createProvider(config.agents.resolver.provider, getApiKey(config.agents.resolver.provider));
  const prompt = loadPrompt(config.agents.resolver.prompt_file, aiReviewDir);

  console.log(`Checking ${botThreads.length} unresolved threads...`);
  const summary = await runResolver({
    provider,
    model: config.agents.resolver.model,
    systemPrompt: prompt,
    confidenceThreshold: config.agents.resolver.confidence_threshold ?? 0.8,
    temperature: config.agents.resolver.temperature,
    maxTokens: config.agents.resolver.max_tokens,
    threads: botThreads,
    diff,
    graphql: graphqlFn,
    octokit,
    owner,
    repo,
    prNumber,
  });

  console.log(`Resolver results - Resolved: ${summary.resolved}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`);
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
    console.log('No bot mention detected. Skipping.');
    return;
  }

  const diff = await getDiff(octokit, owner, repo, prNumber, config.options.exclude_files);
  const provider = createProvider(config.agents.responder.provider, getApiKey(config.agents.responder.provider));
  const prompt = loadPrompt(config.agents.responder.prompt_file, aiReviewDir);

  console.log('Generating response...');
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
  console.log('Reply posted.');
};

// ============================================
// Main
// ============================================

const main = async (): Promise<void> => {
  const eventName = getEnvOrThrow('GITHUB_EVENT_NAME');
  const eventPath = getEnvOrThrow('GITHUB_EVENT_PATH');
  const token = getEnvOrThrow('GITHUB_TOKEN');

  const octokit = new Octokit({ auth: token });
  const graphqlFn = graphql.defaults({ headers: { authorization: `token ${token}` } });

  const payloadRaw = readFileSync(eventPath, 'utf-8');

  console.log(`Event: ${eventName}`);

  if (eventName === 'pull_request') {
    const payload = JSON.parse(payloadRaw) as PullRequestPayload;
    const { action, pull_request: pr, repository: repo } = payload;
    const owner = repo.owner.login;
    const repoName = repo.name;

    // Pre-flight filters
    const config = loadConfig();
    if (!config.options.review_draft_pr && pr.draft) {
      console.log('Draft PR detected. Skipping.');
      return;
    }
    if (config.options.skip_bot_prs && pr.user.type === 'Bot') {
      console.log('Bot PR detected. Skipping.');
      return;
    }

    if (action === 'opened' || action === 'reopened') {
      await handleReview(octokit, owner, repoName, pr.number);
    } else if (action === 'synchronize') {
      // 1. 기존 리뷰 코멘트 해결 여부 판정
      await handleResolve(octokit, graphqlFn, owner, repoName, pr.number);
      // 2. 새 커밋에 대한 신규 리뷰
      await handleReview(octokit, owner, repoName, pr.number);
    }
  } else if (eventName === 'issue_comment' || eventName === 'pull_request_review_comment') {
    const payload = JSON.parse(payloadRaw) as CommentPayload;

    if (payload.action !== 'created') return;

    const owner = payload.repository.owner.login;
    const repoName = payload.repository.name;
    const prNumber = payload.pull_request?.number ?? payload.issue?.number;

    if (!prNumber) {
      console.log('Could not determine PR number. Skipping.');
      return;
    }

    await handleRespond(octokit, owner, repoName, prNumber, payload.comment);
  } else {
    console.log(`Unhandled event: ${eventName}`);
  }
};

main().catch((error) => {
  console.error('Dispatcher failed:', error);
  process.exit(1);
});
