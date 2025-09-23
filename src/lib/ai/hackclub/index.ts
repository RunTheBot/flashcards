import { createGroq } from '@ai-sdk/groq';

/**
 * Hack Club AI provider using Groq SDK
 * This is a Groq proxy service that provides free AI models
 */
export const hackclub = createGroq({
  baseURL: 'https://ai.hackclub.com', 
  apiKey: 'sk-dummy', // Some services require a key format
});

/**
 * Available models for Hack Club AI
 */
export const HACKCLUB_MODELS = {
  QWEN_32B: 'qwen/qwen3-32b',
  GPT_OSS_120B: 'openai/gpt-oss-120b', 
  GPT_OSS_20B: 'openai/gpt-oss-20b',
  LLAMA_4: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  KIMI: 'moonshotai/kimi-k2-instruct-0905'
} as const;

/**
 * Main model for heavy AI tasks (flashcard content generation)
 */
export const hackclubMainModel = hackclub(HACKCLUB_MODELS.GPT_OSS_120B);

/**
 * Light model for simple tasks (titles, descriptions)
 */
export const hackclubLightModel = hackclub(HACKCLUB_MODELS.GPT_OSS_20B);

/**
 * Default model for backward compatibility
 */
export const hackclubModel = hackclubMainModel;

