import OpenAI from 'openai';
import type { LLMChatParams } from '../types.js';
import { BaseLLMProvider } from './base.js';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
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
      throw new Error('OpenAI returned empty response');
    }
    return content;
  }
}
