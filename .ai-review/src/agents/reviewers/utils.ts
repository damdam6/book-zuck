import type { DiffChunk, Issue, LLMProvider } from '../../types.js';

export const parseJsonResponse = <T>(raw: string): T | null => {
  // 1. 코드펜스 제거
  const stripped = raw.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?```/g, '$1').trim();

  // 2. JSON.parse 시도
  try {
    return JSON.parse(stripped);
  } catch {
    // 3. regex로 JSON 블록 추출
    const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const formatDiffForLLM = (chunks: DiffChunk[]): string => {
  return chunks
    .map((chunk) =>
      `### File: ${chunk.filename} (${chunk.status})\n\`\`\`diff\n${chunk.patch}\n\`\`\``
    )
    .join('\n\n');
};

export const runReviewAgent = async (
  provider: LLMProvider,
  params: { model: string; systemPrompt: string },
  diff: DiffChunk[]
): Promise<Issue[]> => {
  const userMessage = formatDiffForLLM(diff);

  try {
    const response = await provider.chat({
      model: params.model,
      systemPrompt: params.systemPrompt,
      userMessage,
    });

    const parsed = parseJsonResponse<{ issues: Issue[] }>(response);
    if (!parsed || !Array.isArray(parsed.issues)) {
      console.warn('Failed to parse review agent response, returning empty issues');
      return [];
    }

    return parsed.issues;
  } catch (error) {
    console.warn('Review agent failed:', error);
    return [];
  }
};
