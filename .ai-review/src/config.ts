import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import type { AgentConfig, AppConfig } from './types.js';

const CONFIG_FILENAME = '.ai-review.yml';

const VALID_PROVIDERS = ['kimi', 'anthropic', 'google'] as const;

const DEFAULT_OPTIONS = {
  language: 'ko',
  max_comments_per_review: 20,
  review_draft_pr: false,
  skip_bot_prs: true,
  exclude_files: ['*.lock', '*.generated.*', 'dist/**'],
};

const DEFAULT_TRIGGERS = {
  review_on: ['opened', 'reopened'],
  resolve_on: ['synchronize'],
  respond_to: '@review-bot',
};

// ============================================
// Type Guards
// ============================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidProvider(value: unknown): value is AgentConfig['provider'] {
  return typeof value === 'string' && (VALID_PROVIDERS as readonly string[]).includes(value);
}

// ============================================
// Internal
// ============================================

function findConfigPath(): string {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const configPath = resolve(workspace, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return configPath;
}

function validateAgentConfig(name: string, config: unknown): AgentConfig {
  if (!isRecord(config)) {
    throw new Error(`Agent config for '${name}' is missing or invalid`);
  }

  if (!isValidProvider(config.provider)) {
    throw new Error(`Agent '${name}' has invalid provider: ${config.provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
  }
  if (typeof config.model !== 'string' || !config.model) {
    throw new Error(`Agent '${name}' requires a model name`);
  }
  if (typeof config.prompt_file !== 'string' || !config.prompt_file) {
    throw new Error(`Agent '${name}' requires a prompt_file path`);
  }

  return {
    provider: config.provider,
    model: config.model,
    prompt_file: config.prompt_file,
    confidence_threshold: typeof config.confidence_threshold === 'number' ? config.confidence_threshold : undefined,
  };
}

// ============================================
// Public API
// ============================================

export function loadPrompt(promptFile: string, baseDir: string): string {
  const promptPath = resolve(baseDir, promptFile);
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return readFileSync(promptPath, 'utf-8');
}

export function loadConfig(configPath?: string): AppConfig {
  const resolvedPath = configPath || findConfigPath();
  const raw = readFileSync(resolvedPath, 'utf-8');
  const parsed = yaml.load(raw);

  if (!isRecord(parsed)) {
    throw new Error('Invalid config file: expected YAML object');
  }

  if (!isRecord(parsed.agents)) {
    throw new Error('Config must have an "agents" section');
  }

  const agentsRaw = parsed.agents;
  const agents: AppConfig['agents'] = {
    quality: validateAgentConfig('quality', agentsRaw.quality),
    performance: validateAgentConfig('performance', agentsRaw.performance),
    security: validateAgentConfig('security', agentsRaw.security),
    orchestrator: validateAgentConfig('orchestrator', agentsRaw.orchestrator),
    resolver: validateAgentConfig('resolver', agentsRaw.resolver),
    responder: validateAgentConfig('responder', agentsRaw.responder),
  };

  const rawTriggers = isRecord(parsed.triggers) ? parsed.triggers : {};
  const triggers = { ...DEFAULT_TRIGGERS, ...rawTriggers };

  const rawOptions = isRecord(parsed.options) ? parsed.options : {};
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };

  return {
    agents,
    triggers: {
      review_on: Array.isArray(triggers.review_on) ? triggers.review_on : DEFAULT_TRIGGERS.review_on,
      resolve_on: Array.isArray(triggers.resolve_on) ? triggers.resolve_on : DEFAULT_TRIGGERS.resolve_on,
      respond_to: typeof triggers.respond_to === 'string' ? triggers.respond_to : DEFAULT_TRIGGERS.respond_to,
    },
    options: {
      language: typeof options.language === 'string' ? options.language : DEFAULT_OPTIONS.language,
      max_comments_per_review: typeof options.max_comments_per_review === 'number' ? options.max_comments_per_review : DEFAULT_OPTIONS.max_comments_per_review,
      review_draft_pr: typeof options.review_draft_pr === 'boolean' ? options.review_draft_pr : DEFAULT_OPTIONS.review_draft_pr,
      skip_bot_prs: typeof options.skip_bot_prs === 'boolean' ? options.skip_bot_prs : DEFAULT_OPTIONS.skip_bot_prs,
      exclude_files: Array.isArray(options.exclude_files) ? options.exclude_files : DEFAULT_OPTIONS.exclude_files,
    },
  };
}

export function getAiReviewDir(): string {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  return resolve(workspace, '.ai-review');
}
