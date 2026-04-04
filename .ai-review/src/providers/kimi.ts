import OpenAI from 'openai';
import type { LLMChatParams } from '../types.js';
import { BaseLLMProvider } from './base.js';

const KIMI_BASE_URL = 'https://api.moonshot.ai/v1';

export class KimiProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super(apiKey);
    this.client = new OpenAI({
      apiKey,
      baseURL: KIMI_BASE_URL,
    });
  }

  protected async doChat(params: LLMChatParams): Promise<string> {
    const response = await this.client.chat.completions.create({
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
  }
}
