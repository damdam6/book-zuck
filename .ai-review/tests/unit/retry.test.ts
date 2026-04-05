import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/providers/base.js';
import type { LLMChatParams } from '../../src/types.js';

const dummyParams: LLMChatParams = {
  model: 'test',
  systemPrompt: 'test',
  userMessage: 'test',
};

describe('withRetry', () => {
  it('returns immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const wrapped = withRetry(fn);

    const result = await wrapped(dummyParams);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on rate limit error and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockRejectedValueOnce(new Error('rate limit exceeded'))
      .mockResolvedValue('ok');

    const wrapped = withRetry(fn);
    const result = await wrapped(dummyParams);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('invalid api key'));
    const wrapped = withRetry(fn);

    await expect(wrapped(dummyParams)).rejects.toThrow('invalid api key');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('429 rate limit'));
    const wrapped = withRetry(fn);

    await expect(wrapped(dummyParams)).rejects.toThrow('429 rate limit');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on timeout error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValue('ok');

    const wrapped = withRetry(fn);
    const result = await wrapped(dummyParams);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
