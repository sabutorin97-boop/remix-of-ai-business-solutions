import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * OpenRouter OpenAI-compatible provider.
 * Model slug goes in the request body (e.g. "anthropic/claude-haiku-4.5"),
 * unlike KIE.ai where it was baked into the URL path.
 */
export const createOpenRouterProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
