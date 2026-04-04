import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMChatParams, LLMProvider } from '../types.js';
import { withRetry } from './base.js';

export const createGoogle = (apiKey: string): LLMProvider => {
  if (!apiKey) {
    throw new Error('API key is required for Google');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    chat: withRetry(async (params: LLMChatParams) => {
      const model = genAI.getGenerativeModel({
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
    }),
  };
};
