import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import type { AgentConfig, AppConfig } from './types.js';

const CONFIG_FILENAME = '.ai-review.yml';

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

function findConfigPath(): string {
  // GitHub Actions 환경에서는 GITHUB_WORKSPACE 사용
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const configPath = resolve(workspace, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return configPath;
}

function validateAgentConfig(name: string, config: unknown): AgentConfig {
  const c = config as Record<string, unknown>;
  if (!c || typeof c !== 'object') {
    throw new Error(`Agent config for '${name}' is missing or invalid`);
  }

  const validProviders = ['kimi', 'anthropic', 'google'];
  if (!validProviders.includes(c.provider as string)) {
    throw new Error(`Agent '${name}' has invalid provider: ${c.provider}. Must be one of: ${validProviders.join(', ')}`);
  }
  if (!c.model || typeof c.model !== 'string') {
    throw new Error(`Agent '${name}' requires a model name`);
  }
  if (!c.prompt_file || typeof c.prompt_file !== 'string') {
    throw new Error(`Agent '${name}' requires a prompt_file path`);
  }

  return {
    provider: c.provider as AgentConfig['provider'],
    model: c.model as string,
    prompt_file: c.prompt_file as string,
    confidence_threshold: typeof c.confidence_threshold === 'number' ? c.confidence_threshold : undefined,
  };
}

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
  const parsed = yaml.load(raw) as Record<string, unknown>;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid config file: expected YAML object');
  }

  const agents = parsed.agents as Record<string, unknown> | undefined;
  if (!agents || typeof agents !== 'object') {
    throw new Error('Config must have an "agents" section');
  }

  const requiredAgents = ['quality', 'performance', 'security', 'orchestrator', 'resolver', 'responder'] as const;
  const validatedAgents = {} as Record<string, AgentConfig>;

  for (const name of requiredAgents) {
    validatedAgents[name] = validateAgentConfig(name, agents[name]);
  }

  const triggers = {
    ...DEFAULT_TRIGGERS,
    ...(parsed.triggers as Record<string, unknown> || {}),
  };

  const options = {
    ...DEFAULT_OPTIONS,
    ...(parsed.options as Record<string, unknown> || {}),
  };

  return {
    agents: validatedAgents as AppConfig['agents'],
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
