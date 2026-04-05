import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config.js';
import * as fs from 'node:fs';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

const validYaml = `
agents:
  quality:
    provider: anthropic
    model: claude-sonnet-4-6
    prompt_file: prompts/quality.md
  performance:
    provider: kimi
    model: kimi-k2.5
    prompt_file: prompts/performance.md
  security:
    provider: anthropic
    model: claude-opus-4-6
    prompt_file: prompts/security.md
  orchestrator:
    provider: google
    model: gemini-2.5-flash
    prompt_file: prompts/orchestrator.md
  resolver:
    provider: kimi
    model: kimi-k2.5
    prompt_file: prompts/resolver.md
    confidence_threshold: 0.8
  responder:
    provider: anthropic
    model: claude-sonnet-4-6
    prompt_file: prompts/responder.md
`;

beforeEach(() => {
  vi.mocked(fs.readFileSync).mockReturnValue(validYaml);
  vi.mocked(fs.existsSync).mockReturnValue(true);
});

describe('loadConfig', () => {
  it('parses valid YAML config', () => {
    const config = loadConfig('/fake/path.yml');
    expect(config.agents.quality.provider).toBe('anthropic');
    expect(config.agents.quality.model).toBe('claude-sonnet-4-6');
    expect(config.agents.resolver.confidence_threshold).toBe(0.8);
  });

  it('applies default options when omitted', () => {
    const config = loadConfig('/fake/path.yml');
    expect(config.options.language).toBe('ko');
    expect(config.options.max_comments_per_review).toBe(20);
    expect(config.options.review_draft_pr).toBe(false);
    expect(config.options.skip_bot_prs).toBe(true);
  });

  it('applies default triggers when omitted', () => {
    const config = loadConfig('/fake/path.yml');
    expect(config.triggers.review_on).toEqual(['opened', 'reopened']);
    expect(config.triggers.resolve_on).toEqual(['synchronize']);
    expect(config.triggers.respond_to).toBe('@review-bot');
  });

  it('throws on missing agents section', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('options:\n  language: ko');
    expect(() => loadConfig('/fake/path.yml')).toThrow('agents');
  });

  it('throws on invalid provider name', () => {
    const yaml = validYaml.replace('provider: kimi', 'provider: chatgpt');
    vi.mocked(fs.readFileSync).mockReturnValue(yaml);
    expect(() => loadConfig('/fake/path.yml')).toThrow('Must be one of');
  });

  it('throws on missing model field', () => {
    const yaml = validYaml.replace('model: kimi-k2.5', '');
    vi.mocked(fs.readFileSync).mockReturnValue(yaml);
    expect(() => loadConfig('/fake/path.yml')).toThrow('requires a model');
  });

  it('throws on invalid YAML', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('not: [valid: yaml: content');
    expect(() => loadConfig('/fake/path.yml')).toThrow();
  });
});
