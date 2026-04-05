import Anthropic from '@anthropic-ai/sdk';
import type { LLMChatParams, LLMProvider } from '../types.js';
import { withRetry } from './base.js';

export const createAnthropic = (apiKey: string): LLMProvider => {
  if (!apiKey) {
    throw new Error('API key is required for Anthropic');
  }

  const client = new Anthropic({ apiKey });

  return {
    chat: withRetry(async (params: LLMChatParams) => {
      const response = await client.messages.create({
        model: params.model,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.userMessage },
        ],
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 4096,
      });

      const block = response.content[0];
      if (!block || block.type !== 'text') {
        throw new Error('Anthropic returned empty response');
      }
      return block.text;
    }),
  };
};
