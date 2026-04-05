import type {
  LLMProvider,
  OrchestratorInput,
  OrchestratorOutput,
  ReviewComment,
  Severity,
} from '../types.js';
import { formatDiffForLLM, parseJsonResponse } from './reviewers/utils.js';

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

interface RawOrchestratorOutput {
  summary: string;
  comments: Array<{
    path: string;
    line: number;
    body: string;
    severity: Severity;
    side?: 'LEFT' | 'RIGHT';
  }>;
}

export const runOrchestrator = async (
  provider: LLMProvider,
  model: string,
  systemPrompt: string,
  input: OrchestratorInput,
  maxComments: number
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
    });

    const parsed = parseJsonResponse<RawOrchestratorOutput>(response);
    if (!parsed || !Array.isArray(parsed.comments)) {
      console.warn('Failed to parse orchestrator response');
      return {
        summary: 'Failed to generate review summary.',
        comments: [],
        stats: { total: 0, critical: 0, warning: 0, info: 0, filtered: 0 },
      };
    }

    // severity 우선순위로 정렬
    const sorted = [...parsed.comments].sort(
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
      summary: parsed.summary,
      comments: kept,
      stats,
    };
  } catch (error) {
    console.warn('Orchestrator failed:', error);
    return {
      summary: 'Failed to generate review summary.',
      comments: [],
      stats: { total: 0, critical: 0, warning: 0, info: 0, filtered: 0 },
    };
  }
};
