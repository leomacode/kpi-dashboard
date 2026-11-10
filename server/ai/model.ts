import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createProviderRegistry, type LanguageModel } from "ai";

const registry = createProviderRegistry({ google, anthropic, openai });

// Gemini has a free API tier (AI Studio key), so it is the default.
export const DEFAULT_MODEL = "google:gemini-flash-latest";

type ModelId = Parameters<typeof registry.languageModel>[0];

const isModelId = (id: string): id is ModelId =>
  /^(google|anthropic|openai):.+$/.test(id);

// AI_MODEL="<provider>:<model>", e.g. "anthropic:claude-sonnet-5-5". Each
// provider reads its own key from the server environment:
// GOOGLE_GENERATIVE_AI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY.
export function getModel(
  id: string = process.env.AI_MODEL ?? DEFAULT_MODEL,
): LanguageModel {
  if (!isModelId(id)) {
    throw new Error(
      `AI_MODEL must look like "<google|anthropic|openai>:<model>", got "${id}"`,
    );
  }
  return registry.languageModel(id);
}
