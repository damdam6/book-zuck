import * as core from "@actions/core";
import type { Octokit } from "@octokit/rest";
import type {
  DiffChunk,
  LLMProvider,
  ResolverResult,
  ResolverSummary,
  ReviewThread,
} from "../types.js";
import { resolveThread } from "../github/threads.js";
import { replyToComment } from "../github/comments.js";
import { parseJsonResponse, sanitizeMarkdown } from "./reviewers/utils.js";

type GraphqlFn = <T>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<T>;

interface ResolverParams {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  confidenceThreshold: number;
  temperature?: number;
  maxTokens?: number;
  threads: ReviewThread[];
  diff: DiffChunk[];
  graphql: GraphqlFn;
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}

const findDiffForFile = (
  diff: DiffChunk[],
  path: string,
): DiffChunk | undefined => diff.find((chunk) => chunk.filename === path);

const MAX_COMMENT_LENGTH = 4000;

const sanitizeUserInput = (input: string): string =>
  input.length > MAX_COMMENT_LENGTH ? input.slice(0, MAX_COMMENT_LENGTH) + '...(truncated)' : input;

const buildUserMessage = (commentBody: string, fileDiff: DiffChunk): string =>
  `## 원본 리뷰 코멘트\n<user_comment>\n${sanitizeUserInput(commentBody)}\n</user_comment>\n\n## 해당 파일의 새로운 변경사항\n### File: ${fileDiff.filename}\n\`\`\`diff\n${fileDiff.patch}\n\`\`\``;

const formatReasonComment = (result: ResolverResult): string =>
  `🤖 **자동 해결 판정**\n\n` +
  `- **판정**: ${result.resolved ? "✅ 해결됨" : "❌ 미해결"}\n` +
  `- **확신도**: ${(result.confidence * 100).toFixed(0)}%\n` +
  `- **근거**: ${sanitizeMarkdown(result.reason)}`;

export const runResolver = async (
  params: ResolverParams,
): Promise<ResolverSummary> => {
  const summary: ResolverSummary = {
    resolved: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const thread of params.threads) {
    try {
      // 원본 코멘트 추출
      const originalComment = thread.comments[0]?.body;
      if (!originalComment) {
        summary.skipped++;
        continue;
      }

      // 해당 파일의 diff 찾기
      const fileDiff = findDiffForFile(params.diff, thread.path);
      if (!fileDiff) {
        // 이번 커밋에서 해당 파일이 변경되지 않음
        summary.skipped++;
        continue;
      }

      // LLM에 판정 요청
      const response = await params.provider.chat({
        model: params.model,
        systemPrompt: params.systemPrompt,
        userMessage: buildUserMessage(originalComment, fileDiff),
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      const result = parseJsonResponse<ResolverResult>(response);
      if (
        !result ||
        typeof result.resolved !== "boolean" ||
        typeof result.confidence !== "number" ||
        result.confidence < 0 || result.confidence > 1 ||
        typeof result.reason !== "string" || result.reason.length === 0
      ) {
        summary.failed++;
        continue;
      }

      summary.details.push(result);

      if (result.resolved && result.confidence >= params.confidenceThreshold) {
        // 근거 코멘트 남기기 (resolve 전에 reply)
        const lastComment = thread.comments[thread.comments.length - 1];
        if (lastComment) {
          await replyToComment(
            params.octokit,
            params.owner,
            params.repo,
            params.prNumber,
            lastComment.id,
            formatReasonComment(result),
          );
        }

        // resolve 처리 — 실패 시 코멘트만 남고 resolve 안 되는 상태 방지
        try {
          await resolveThread(params.graphql, thread.id);
        } catch (resolveError) {
          core.warning(`[Resolver] Failed to resolve thread ${thread.id} (model: ${params.model}): ${resolveError instanceof Error ? resolveError.message : String(resolveError)}`);
          summary.failed++;
          continue;
        }

        summary.resolved++;
      } else {
        summary.skipped++;
      }
    } catch (error) {
      core.warning(`[Resolver] Failed to process thread ${thread.id} (model: ${params.model}): ${error instanceof Error ? error.message : String(error)}`);
      summary.failed++;
    }
  }

  return summary;
};
