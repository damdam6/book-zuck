import { describe, it, expect, vi } from 'vitest';
import { runOrchestrator } from '../../src/agents/orchestrator.js';
import type { LLMProvider, OrchestratorInput } from '../../src/types.js';

const mockInput: OrchestratorInput = {
  diff: [{ filename: 'src/app.ts', status: 'modified', patch: '+line', additions: 1, deletions: 0 }],
  qualityIssues: [{ file: 'src/app.ts', line: 1, severity: 'warning', category: 'quality', title: 't', description: 'd', suggestion: 's' }],
  performanceIssues: [],
  securityIssues: [{ file: 'src/app.ts', line: 2, severity: 'critical', category: 'security', title: 't2', description: 'd2', suggestion: 's2' }],
};

const makeProvider = (response: string): LLMProvider => ({
  chat: vi.fn().mockResolvedValue(response),
});

describe('runOrchestrator', () => {
  it('parses LLM response and returns comments', async () => {
    const response = JSON.stringify({
      summary: 'PR 요약',
      comments: [
        { path: 'src/app.ts', line: 1, body: '코멘트1', severity: 'warning' },
        { path: 'src/app.ts', line: 2, body: '코멘트2', severity: 'critical' },
      ],
    });

    const result = await runOrchestrator(makeProvider(response), 'model', 'prompt', mockInput, 20);
    expect(result.summary).toBe('PR 요약');
    expect(result.comments).toHaveLength(2);
    expect(result.stats.total).toBe(2);
  });

  it('limits comments by maxComments and sorts by severity', async () => {
    const response = JSON.stringify({
      summary: '요약',
      comments: [
        { path: 'a.ts', line: 1, body: 'info', severity: 'info' },
        { path: 'a.ts', line: 2, body: 'critical', severity: 'critical' },
        { path: 'a.ts', line: 3, body: 'warning', severity: 'warning' },
      ],
    });

    const result = await runOrchestrator(makeProvider(response), 'model', 'prompt', mockInput, 2);
    expect(result.comments).toHaveLength(2);
    expect(result.stats.total).toBe(3);
    expect(result.stats.filtered).toBe(1);
  });

  it('returns empty result on parse failure', async () => {
    const result = await runOrchestrator(makeProvider('not json'), 'model', 'prompt', mockInput, 20);
    expect(result.comments).toHaveLength(0);
    expect(result.summary).toContain('Failed');
  });

  it('returns empty result on LLM error', async () => {
    const provider: LLMProvider = { chat: vi.fn().mockRejectedValue(new Error('API error')) };
    const result = await runOrchestrator(provider, 'model', 'prompt', mockInput, 20);
    expect(result.comments).toHaveLength(0);
  });

  it('includes existing comments in LLM message when provided', async () => {
    const response = JSON.stringify({ summary: '요약', comments: [] });
    const provider = makeProvider(response);

    const inputWithExisting: OrchestratorInput = {
      ...mockInput,
      existingComments: [
        { path: 'src/app.ts', line: 1, body: 'existing comment' },
      ],
    };

    await runOrchestrator(provider, 'model', 'prompt', inputWithExisting, 20);

    const callArgs = (provider.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.userMessage).toContain('Existing Bot Review Comments');
    expect(callArgs.userMessage).toContain('existing comment');
  });

  it('does not include existing comments section when none provided', async () => {
    const response = JSON.stringify({ summary: '요약', comments: [] });
    const provider = makeProvider(response);

    await runOrchestrator(provider, 'model', 'prompt', mockInput, 20);

    const callArgs = (provider.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.userMessage).not.toContain('Existing Bot Review Comments');
  });
});
