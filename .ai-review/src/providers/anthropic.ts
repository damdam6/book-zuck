import Anthropic from '@anthropic-ai/sdk';
import type { LLMChatParams } from '../types.js';
import { BaseLLMProvider } from './base.js';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    super(apiKey);
    this.client = new Anthropic({ apiKey });
  }

  protected async doChat(params: LLMChatParams): Promise<string> {
    const response = await this.client.messages.create({
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
  }
}
