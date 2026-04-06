import * as core from '@actions/core';
import type {
  LLMProvider,
  OrchestratorInput,
  OrchestratorOutput,
  ReviewComment,
  Severity,
} from '../types.js';
import { formatDiffForLLM, parseJsonResponse, sanitizeMarkdown } from './reviewers/utils.js';

const SEVERITY_PRIORITY: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  nitpick: 3,
};

const limitComments = (comments: ReviewComment[], max: number): { kept: ReviewComment[]; filtered: number } => {
  if (comments.length <= max) {
    return { kept: comments, filtered: 0 };
  }
  return {
    kept: comments.slice(0, max),
    filtered: comments.length - max,
  };
};

interface RawComment {
  path: string;
  line: number;
  body: string;
  severity: Severity;
  side?: 'LEFT' | 'RIGHT';
}

interface RawOrchestratorOutput {
  summary: string;
  comments: RawComment[];
}

const VALID_SEVERITIES = new Set<string>(['critical', 'warning', 'info', 'nitpick']);
const VALID_SIDES = new Set<string>(['LEFT', 'RIGHT']);

const isValidComment = (c: unknown): c is RawComment => {
  if (typeof c !== 'object' || c === null) return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.path === 'string' && obj.path.length > 0 &&
    typeof obj.line === 'number' && Number.isInteger(obj.line) && obj.line > 0 &&
    typeof obj.body === 'string' && obj.body.length > 0 &&
    typeof obj.severity === 'string' && VALID_SEVERITIES.has(obj.severity) &&
    (obj.side === undefined || VALID_SIDES.has(obj.side as string))
  );
};

export const runOrchestrator = async (
  provider: LLMProvider,
  model: string,
  systemPrompt: string,
  input: OrchestratorInput,
  maxComments: number,
  temperature?: number,
  maxTokens?: number
): Promise<OrchestratorOutput> => {
  const diffText = formatDiffForLLM(input.diff);

  const issuesSummary = JSON.stringify({
    quality: input.qualityIssues,
    performance: input.performanceIssues,
    security: input.securityIssues,
  }, null, 2);

  const userMessage = `## Code Diff\n${diffText}\n\n## Review Issues from Specialist Agents\n${issuesSummary}`;

  try {
    const response = await provider.chat({
      model,
      systemPrompt,
      userMessage,
      temperature,
      maxTokens,
    });

    const parsed = parseJsonResponse<RawOrchestratorOutput>(response);
    if (!parsed || !Array.isArray(parsed.comments)) {
      core.warning(`[Orchestrator] Failed to parse response (model: ${model})`);
      return {
        summary: 'Failed to generate review summary.',
        comments: [],
        stats: { total: 0, critical: 0, warning: 0, info: 0, filtered: 0 },
      };
    }

    // 각 comment 유효성 검증 — 잘못된 항목은 필터링
    const validComments = parsed.comments.filter((c) => {
      if (isValidComment(c)) return true;
      core.warning(`Dropped invalid orchestrator comment: ${JSON.stringify(c)}`);
      return false;
    });

    // severity 우선순위로 정렬
    const sorted = [...validComments].sort(
      (a, b) => (SEVERITY_PRIORITY[a.severity] ?? 3) - (SEVERITY_PRIORITY[b.severity] ?? 3)
    );

    const { kept, filtered } = limitComments(
      sorted.map((c) => ({ path: c.path, line: c.line, body: c.body, side: c.side })),
      maxComments
    );

    // stats 계산
    const stats = {
      total: sorted.length,
      critical: sorted.filter((c) => c.severity === 'critical').length,
      warning: sorted.filter((c) => c.severity === 'warning').length,
      info: sorted.filter((c) => c.severity === 'info').length,
      filtered,
    };

    return {
      summary: sanitizeMarkdown(parsed.summary),
      comments: kept,
      stats,
    };
  } catch (error) {
    core.warning(`[Orchestrator] Agent failed (model: ${model}): ${error instanceof Error ? error.message : String(error)}`);
    return {
      summary: 'Failed to generate review summary.',
      comments: [],
      stats: { total: 0, critical: 0, warning: 0, info: 0, filtered: 0 },
    };
  }
};
