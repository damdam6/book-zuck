import type { DiffChunk, Issue, LLMProvider } from '../../types.js';
import { runReviewAgent } from './utils.js';

export const runSecurityReview = async (
  provider: LLMProvider,
  model: string,
  systemPrompt: string,
  diff: DiffChunk[]
): Promise<Issue[]> => {
  const issues = await runReviewAgent(provider, { model, systemPrompt }, diff);

  return issues.map((issue) => ({
    ...issue,
    category: 'security' as const,
  }));
};
