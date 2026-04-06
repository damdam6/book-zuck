// ============================================
// LLM Provider
// ============================================

export interface LLMChatParams {
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  chat(params: LLMChatParams): Promise<string>;
}

// ============================================
// GitHub - Diff
// ============================================

export interface DiffChunk {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  patch: string;
  additions: number;
  deletions: number;
}

// ============================================
// Review Agent Output
// ============================================

export type Severity = 'critical' | 'warning' | 'info' | 'nitpick';
export type Category = 'quality' | 'performance' | 'security';

export interface Issue {
  file: string;
  line: number;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  suggestion: string;
}

// ============================================
// GitHub - Review Comment
// ============================================

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side?: 'LEFT' | 'RIGHT';
}

// ============================================
// Orchestrator
// ============================================

export interface OrchestratorInput {
  diff: DiffChunk[];
  qualityIssues: Issue[];
  performanceIssues: Issue[];
  securityIssues: Issue[];
}

export interface ReviewStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  filtered: number;
}

export interface OrchestratorOutput {
  summary: string;
  comments: ReviewComment[];
  stats: ReviewStats;
}

// ============================================
// Resolver
// ============================================

export interface ResolverResult {
  resolved: boolean;
  confidence: number;
  reason: string;
}

export interface ResolverSummary {
  resolved: number;
  skipped: number;
  failed: number;
  details: ResolverResult[];
}

// ============================================
// Thread (GraphQL)
// ============================================

export interface ThreadComment {
  id: number;
  body: string;
  author: string;
}

export interface ReviewThread {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string;
  line: number;
  comments: ThreadComment[];
}

// ============================================
// Configuration
// ============================================

export interface AgentConfig {
  provider: 'kimi' | 'anthropic' | 'google';
  model: string;
  prompt_file: string;
  temperature?: number;
  max_tokens?: number;
  confidence_threshold?: number;
}

export interface TriggersConfig {
  review_on: string[];
  resolve_on: string[];
  respond_to: string;
}

export interface OptionsConfig {
  language: string;
  max_comments_per_review: number;
  review_draft_pr: boolean;
  skip_bot_prs: boolean;
  exclude_files: string[];
}

export interface AppConfig {
  agents: {
    quality: AgentConfig;
    performance: AgentConfig;
    security: AgentConfig;
    orchestrator: AgentConfig;
    resolver: AgentConfig;
    responder: AgentConfig;
  };
  triggers: TriggersConfig;
  options: OptionsConfig;
}
