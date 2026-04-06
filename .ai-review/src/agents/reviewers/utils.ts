import * as core from '@actions/core';
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

const MAX_OUTPUT_LENGTH = 10000;

export const sanitizeMarkdown = (text: string): string => {
  let sanitized = text;
  // 외부 URL 이미지 태그 제거
  sanitized = sanitized.replace(/!\[[^\]]*\]\(https?:\/\/[^)]+\)/g, '');

  // 코드 블록 보존: fenced + inline code를 placeholder로 치환
  const codeBlocks: string[] = [];
  sanitized = sanitized.replace(/```[\s\S]*?```|`[^`]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 실제 HTML 태그만 제거 (코드 블록 외부)
  sanitized = sanitized.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/g, '');

  // 코드 블록 복원
  sanitized = sanitized.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)]);

  // 길이 제한
  if (sanitized.length > MAX_OUTPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_OUTPUT_LENGTH) + '\n\n...(truncated)';
  }
  return sanitized;
};

export const formatDiffForLLM = (chunks: DiffChunk[]): string => {
  return chunks
    .map((chunk) =>
      `### File: ${chunk.filename} (${chunk.status})\n\`\`\`diff\n${chunk.patch}\n\`\`\``
    )
    .join('\n\n');
};

export const runReviewAgent = async (
  agentName: string,
  provider: LLMProvider,
  params: { model: string; systemPrompt: string; temperature?: number; maxTokens?: number },
  diff: DiffChunk[]
): Promise<Issue[]> => {
  const userMessage = formatDiffForLLM(diff);

  try {
    const response = await provider.chat({
      model: params.model,
      systemPrompt: params.systemPrompt,
      userMessage,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    const parsed = parseJsonResponse<{ issues: Issue[] }>(response);
    if (!parsed || !Array.isArray(parsed.issues)) {
      core.warning(`[${agentName}] Failed to parse response (model: ${params.model}), returning empty issues`);
      return [];
    }

    return parsed.issues;
  } catch (error) {
    core.warning(`[${agentName}] Agent failed (model: ${params.model}): ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
};
