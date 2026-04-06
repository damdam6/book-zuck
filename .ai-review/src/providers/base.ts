import type { LLMChatParams, LLMProvider } from "../types.js";
import { createKimi } from "./kimi.js";
import { createAnthropic } from "./anthropic.js";
import { createGoogle } from "./google.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const LLM_TIMEOUT_MS = 180_000;

type ChatFn = (params: LLMChatParams) => Promise<string>;

const isRetryable = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message;
    return (
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("timeout") ||
      msg.includes("ETIMEDOUT")
    );
  }
  return false;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`LLM call timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
};

export const withRetry = (chatFn: ChatFn): ChatFn => {
  return async (params) => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await withTimeout(chatFn(params), LLM_TIMEOUT_MS);
      } catch (error) {
        lastError = error as Error;
        if (!isRetryable(error)) {
          throw error;
        }
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };
};

export type ProviderName = "kimi" | "anthropic" | "google";

export const createProvider = (
  provider: ProviderName,
  apiKey: string,
): LLMProvider => {
  switch (provider) {
    case "kimi":
      return createKimi(apiKey);
    case "anthropic":
      return createAnthropic(apiKey);
    case "google":
      return createGoogle(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};
