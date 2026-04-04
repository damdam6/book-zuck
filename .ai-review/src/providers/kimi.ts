import OpenAI from 'openai';
import type { LLMChatParams, LLMProvider } from '../types.js';
import { withRetry } from './base.js';

const KIMI_BASE_URL = 'https://api.moonshot.ai/v1';

export const createKimi = (apiKey: string): LLMProvider => {
  if (!apiKey) {
    throw new Error('API key is required for Kimi');
  }

  const client = new OpenAI({ apiKey, baseURL: KIMI_BASE_URL });

  return {
    chat: withRetry(async (params: LLMChatParams) => {
      const response = await client.chat.completions.create({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userMessage },
        ],
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 4096,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Kimi returned empty response');
      }
      return content;
    }),
  };
};
