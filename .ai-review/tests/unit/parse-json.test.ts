import { describe, it, expect } from 'vitest';
import { parseJsonResponse } from '../../src/agents/reviewers/utils.js';

describe('parseJsonResponse', () => {
  it('parses valid JSON string', () => {
    const result = parseJsonResponse<{ issues: string[] }>('{"issues": ["a", "b"]}');
    expect(result).toEqual({ issues: ['a', 'b'] });
  });

  it('strips json code fences and parses', () => {
    const input = '```json\n{"issues": [1, 2]}\n```';
    const result = parseJsonResponse<{ issues: number[] }>(input);
    expect(result).toEqual({ issues: [1, 2] });
  });

  it('strips code fences without json label', () => {
    const input = '```\n{"value": true}\n```';
    const result = parseJsonResponse<{ value: boolean }>(input);
    expect(result).toEqual({ value: true });
  });

  it('extracts JSON from surrounding text via regex fallback', () => {
    const input = 'Here is the result:\n{"issues": []}\nEnd of response.';
    const result = parseJsonResponse<{ issues: unknown[] }>(input);
    expect(result).toEqual({ issues: [] });
  });

  it('returns null for completely broken string', () => {
    const result = parseJsonResponse('this is not json at all');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseJsonResponse('');
    expect(result).toBeNull();
  });
});
