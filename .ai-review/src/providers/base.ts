import type { LLMChatParams, LLMProvider } from '../types.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export abstract class BaseLLMProvider implements LLMProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(`API key is required for ${this.constructor.name}`);
    }
    this.apiKey = apiKey;
  }

  async chat(params: LLMChatParams): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.doChat(params);
      } catch (error) {
        lastError = error as Error;
        const isRateLimit = this.isRateLimitError(error);
        const isTimeout = this.isTimeoutError(error);

        if (!isRateLimit && !isTimeout) {
          throw error;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  protected abstract doChat(params: LLMChatParams): Promise<string>;

  protected isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('rate limit') || error.message.includes('429');
    }
    return false;
  }

  protected isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
    }
    return false;
  }
}

export type ProviderName = 'openai' | 'anthropic' | 'google';

export async function createProvider(provider: ProviderName, apiKey: string): Promise<LLMProvider> {
  switch (provider) {
    case 'openai': {
      const { OpenAIProvider } = await import('./openai.js');
      return new OpenAIProvider(apiKey);
    }
    case 'anthropic': {
      const { AnthropicProvider } = await import('./anthropic.js');
      return new AnthropicProvider(apiKey);
    }
    case 'google': {
      const { GoogleProvider } = await import('./google.js');
      return new GoogleProvider(apiKey);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
