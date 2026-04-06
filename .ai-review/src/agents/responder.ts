import * as core from '@actions/core';
import type { DiffChunk, LLMProvider } from '../types.js';
import { formatDiffForLLM, sanitizeMarkdown } from './reviewers/utils.js';

interface ResponderInput {
  commentBody: string;
  commentId: number;
  path: string | null;
  line: number | null;
  threadComments: string[];
}

const MAX_COMMENT_LENGTH = 4000;

export const extractQuestion = (body: string, trigger: string): string | null => {
  if (!body.includes(trigger)) {
    return null;
  }
  const question = body.replaceAll(trigger, '').trim();
  return question.length > MAX_COMMENT_LENGTH
    ? question.slice(0, MAX_COMMENT_LENGTH) + '...(truncated)'
    : question;
};

export const buildContext = (input: ResponderInput, diff: DiffChunk[]): string => {
  const parts: string[] = [];

  // 스레드 히스토리
  if (input.threadComments.length > 0) {
    parts.push('## 대화 히스토리');
    input.threadComments.forEach((comment, i) => {
      parts.push(`### 코멘트 ${i + 1}\n${comment}`);
    });
  }

  // 코드 컨텍스트
  if (input.path) {
    // inline comment — 해당 파일의 diff만 전달
    const fileChunks = diff.filter((chunk) => chunk.filename === input.path);
    if (fileChunks.length > 0) {
      parts.push('## 관련 코드 변경사항');
      parts.push(formatDiffForLLM(fileChunks));
      if (input.line) {
        parts.push(`\n> 질문이 달린 위치: \`${input.path}\` ${input.line}번째 줄`);
      }
    }
  } else {
    // PR-level comment — 전체 diff 요약
    parts.push('## 전체 코드 변경사항');
    parts.push(formatDiffForLLM(diff));
  }

  return parts.join('\n\n');
};

interface ResponderParams {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  input: ResponderInput;
  diff: DiffChunk[];
  trigger: string;
}

export const runResponder = async (params: ResponderParams): Promise<string> => {
  const question = extractQuestion(params.input.commentBody, params.trigger);
  if (!question) {
    return '멘션을 감지하지 못했습니다.';
  }

  const context = buildContext(params.input, params.diff);
  const userMessage = `## 질문\n<user_comment>\n${question}\n</user_comment>\n\n${context}`;

  try {
    const answer = await params.provider.chat({
      model: params.model,
      systemPrompt: params.systemPrompt,
      userMessage,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    return sanitizeMarkdown(answer);
  } catch (error) {
    core.warning(`[Responder] Agent failed (model: ${params.model}): ${error instanceof Error ? error.message : String(error)}`);
    return '죄송합니다, 답변 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
};
