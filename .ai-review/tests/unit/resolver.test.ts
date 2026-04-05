import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runResolver } from '../../src/agents/resolver.js';
import type { DiffChunk, LLMProvider, ReviewThread } from '../../src/types.js';

vi.mock('../../src/github/threads.js', () => ({
  resolveThread: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/github/comments.js', () => ({
  replyToComment: vi.fn().mockResolvedValue(undefined),
}));

import { resolveThread } from '../../src/github/threads.js';
import { replyToComment } from '../../src/github/comments.js';

const mockThread = (path: string): ReviewThread => ({
  id: 'thread-1',
  isResolved: false,
  isOutdated: false,
  path,
  line: 10,
  comments: [{ id: 100, body: '변수명을 수정하세요', author: 'bot' }],
});

const mockDiff: DiffChunk[] = [
  { filename: 'src/app.ts', status: 'modified', patch: '@@ +1 @@\n+const betterName = 1;', additions: 1, deletions: 0 },
];

const mockGraphql = vi.fn() as any;
const mockOctokit = {} as any;

const makeProvider = (response: string): LLMProvider => ({
  chat: vi.fn().mockResolvedValue(response),
});

describe('runResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves thread when confidence >= threshold', async () => {
    const provider = makeProvider(JSON.stringify({ resolved: true, confidence: 0.9, reason: '변수명이 수정됨' }));

    const result = await runResolver({
      provider, model: 'test', systemPrompt: 'test', confidenceThreshold: 0.8,
      threads: [mockThread('src/app.ts')], diff: mockDiff,
      graphql: mockGraphql, octokit: mockOctokit, owner: 'o', repo: 'r', prNumber: 1,
    });

    expect(result.resolved).toBe(1);
    expect(resolveThread).toHaveBeenCalledWith(mockGraphql, 'thread-1');
    expect(replyToComment).toHaveBeenCalled();
  });

  it('skips thread when confidence < threshold', async () => {
    const provider = makeProvider(JSON.stringify({ resolved: true, confidence: 0.5, reason: '불확실' }));

    const result = await runResolver({
      provider, model: 'test', systemPrompt: 'test', confidenceThreshold: 0.8,
      threads: [mockThread('src/app.ts')], diff: mockDiff,
      graphql: mockGraphql, octokit: mockOctokit, owner: 'o', repo: 'r', prNumber: 1,
    });

    expect(result.skipped).toBe(1);
    expect(resolveThread).not.toHaveBeenCalled();
  });

  it('skips thread when file has no diff', async () => {
    const result = await runResolver({
      provider: makeProvider(''), model: 'test', systemPrompt: 'test', confidenceThreshold: 0.8,
      threads: [mockThread('other/file.ts')], diff: mockDiff,
      graphql: mockGraphql, octokit: mockOctokit, owner: 'o', repo: 'r', prNumber: 1,
    });

    expect(result.skipped).toBe(1);
  });

  it('counts failed when LLM response is unparseable', async () => {
    const provider = makeProvider('not json');

    const result = await runResolver({
      provider, model: 'test', systemPrompt: 'test', confidenceThreshold: 0.8,
      threads: [mockThread('src/app.ts')], diff: mockDiff,
      graphql: mockGraphql, octokit: mockOctokit, owner: 'o', repo: 'r', prNumber: 1,
    });

    expect(result.failed).toBe(1);
  });

  it('continues processing other threads when one fails', async () => {
    const provider: LLMProvider = {
      chat: vi.fn()
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(JSON.stringify({ resolved: true, confidence: 0.9, reason: 'ok' })),
    };

    const result = await runResolver({
      provider, model: 'test', systemPrompt: 'test', confidenceThreshold: 0.8,
      threads: [mockThread('src/app.ts'), mockThread('src/app.ts')], diff: mockDiff,
      graphql: mockGraphql, octokit: mockOctokit, owner: 'o', repo: 'r', prNumber: 1,
    });

    expect(result.failed).toBe(1);
    expect(result.resolved).toBe(1);
  });
});
