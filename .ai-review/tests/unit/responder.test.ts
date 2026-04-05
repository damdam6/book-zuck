import { describe, it, expect, vi } from 'vitest';
import { extractQuestion, buildContext, runResponder } from '../../src/agents/responder.js';
import type { DiffChunk, LLMProvider } from '../../src/types.js';

const mockDiff: DiffChunk[] = [
  { filename: 'src/app.ts', status: 'modified', patch: '@@ -1,3 +1,4 @@\n+const x = 1;', additions: 1, deletions: 0 },
  { filename: 'src/utils.ts', status: 'added', patch: '@@ -0,0 +1,2 @@\n+export const foo = () => {};', additions: 2, deletions: 0 },
];

describe('extractQuestion', () => {
  it('extracts question after trigger keyword', () => {
    const result = extractQuestion('@review-bot 왜 이렇게 했어?', '@review-bot');
    expect(result).toBe('왜 이렇게 했어?');
  });

  it('returns null when trigger is not present', () => {
    const result = extractQuestion('일반 코멘트입니다', '@review-bot');
    expect(result).toBeNull();
  });

  it('trims whitespace from extracted question', () => {
    const result = extractQuestion('@review-bot   질문   ', '@review-bot');
    expect(result).toBe('질문');
  });
});

describe('buildContext', () => {
  it('includes only matching file diff for inline comment', () => {
    const context = buildContext(
      { commentBody: 'test', commentId: 1, path: 'src/app.ts', line: 10, threadComments: [] },
      mockDiff
    );
    expect(context).toContain('src/app.ts');
    expect(context).not.toContain('src/utils.ts');
    expect(context).toContain('10번째 줄');
  });

  it('includes all diffs for PR-level comment', () => {
    const context = buildContext(
      { commentBody: 'test', commentId: 1, path: null, line: null, threadComments: [] },
      mockDiff
    );
    expect(context).toContain('src/app.ts');
    expect(context).toContain('src/utils.ts');
    expect(context).toContain('전체 코드 변경사항');
  });

  it('includes thread history when present', () => {
    const context = buildContext(
      { commentBody: 'test', commentId: 1, path: null, line: null, threadComments: ['이전 코멘트1', '이전 코멘트2'] },
      mockDiff
    );
    expect(context).toContain('대화 히스토리');
    expect(context).toContain('이전 코멘트1');
    expect(context).toContain('이전 코멘트2');
  });
});

describe('runResponder', () => {
  it('returns LLM answer on success', async () => {
    const provider: LLMProvider = { chat: vi.fn().mockResolvedValue('답변입니다') };

    const result = await runResponder({
      provider,
      model: 'test',
      systemPrompt: 'test',
      input: { commentBody: '@review-bot 질문', commentId: 1, path: null, line: null, threadComments: [] },
      diff: mockDiff,
      trigger: '@review-bot',
    });

    expect(result).toBe('답변입니다');
  });

  it('returns error message when no mention detected', async () => {
    const provider: LLMProvider = { chat: vi.fn() };

    const result = await runResponder({
      provider,
      model: 'test',
      systemPrompt: 'test',
      input: { commentBody: '일반 코멘트', commentId: 1, path: null, line: null, threadComments: [] },
      diff: mockDiff,
      trigger: '@review-bot',
    });

    expect(result).toBe('멘션을 감지하지 못했습니다.');
    expect(provider.chat).not.toHaveBeenCalled();
  });

  it('returns fallback message on LLM error', async () => {
    const provider: LLMProvider = { chat: vi.fn().mockRejectedValue(new Error('API error')) };

    const result = await runResponder({
      provider,
      model: 'test',
      systemPrompt: 'test',
      input: { commentBody: '@review-bot 질문', commentId: 1, path: null, line: null, threadComments: [] },
      diff: mockDiff,
      trigger: '@review-bot',
    });

    expect(result).toContain('실패');
  });
});
