import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createProviderRegistry, type LanguageModel } from "ai";

const registry = createProviderRegistry({ anthropic, openai });

export const DEFAULT_MODEL = "anthropic:claude-sonnet-5-5";

type ModelId = Parameters<typeof registry.languageModel>[0];

const isModelId = (id: string): id is ModelId =>
  /^(anthropic|openai):.+$/.test(id);

// AI_MODEL="<provider>:<model>", e.g. "openai:gpt-5". Each provider reads its
// own key (ANTHROPIC_API_KEY / OPENAI_API_KEY) from the server environment.
export function getModel(
  id: string = process.env.AI_MODEL ?? DEFAULT_MODEL,
): LanguageModel {
  if (!isModelId(id)) {
    throw new Error(
      `AI_MODEL must look like "anthropic:<model>" or "openai:<model>", got "${id}"`,
    );
  }
  return registry.languageModel(id);
}
