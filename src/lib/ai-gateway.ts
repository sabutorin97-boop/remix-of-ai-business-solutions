import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * KIE.ai OpenAI-compatible provider.
 * Each model is exposed under its own path prefix:
 *   https://api.kie.ai/{model-slug}/v1/chat/completions
 * The model name in the request body is ignored by KIE (path decides).
 *
 * Used instead of OpenRouter because OpenRouter's Cloudflare-fronted edge
 * returns a hard 403 "Access denied by security policy" for calls
 * originating from Timeweb Cloud Apps IPs (same class of issue as the
 * Threads-automation project's openrouter.ai WAF block) — confirmed live,
 * reproducible on every request, not transient.
 */
export const createKieProvider = (apiKey: string, modelSlug = "gemini-3-flash") =>
  createOpenAICompatible({
    name: "kie",
    baseURL: `https://api.kie.ai/${modelSlug}/v1`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
