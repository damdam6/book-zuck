import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMChatParams } from '../types.js';
import { BaseLLMProvider } from './base.js';

export class GoogleProvider extends BaseLLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super(apiKey);
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  protected async doChat(params: LLMChatParams): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: params.userMessage }] }],
      generationConfig: {
        temperature: params.temperature ?? 0.3,
        maxOutputTokens: params.maxTokens ?? 4096,
      },
    });

    const text = result.response.text();
    if (!text) {
      throw new Error('Google returned empty response');
    }
    return text;
  }
}
