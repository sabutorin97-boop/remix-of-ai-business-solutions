import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * KIE.ai OpenAI-compatible provider.
 * Each model is exposed under its own path prefix:
 *   https://api.kie.ai/{model-slug}/v1/chat/completions
 * The model name in the request body is ignored by KIE (path decides).
 */
export const createKieProvider = (apiKey: string, modelSlug = "gemini-3-flash") =>
  createOpenAICompatible({
    name: "kie",
    baseURL: `https://api.kie.ai/${modelSlug}/v1`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
