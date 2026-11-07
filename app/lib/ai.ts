import { google } from "@ai-sdk/google";

/**
 * Google Gemini. With GOOGLE_GENERATIVE_AI_API_KEY it calls Google directly;
 * otherwise it goes through Vercel AI Gateway (AI_GATEWAY_API_KEY / OIDC).
 */
const hasGeminiKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export const MODEL = hasGeminiKey
  ? google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash")
  : (process.env.AI_MODEL ?? "google/gemini-3.8-flash");

/** True when some model credential is configured; otherwise use rule-based fallbacks. */
export const aiEnabled =
  hasGeminiKey || Boolean(process.env.AI_GATEWAY_API_KEY) || Boolean(process.env.VERCEL_OIDC_TOKEN);
