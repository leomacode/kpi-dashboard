import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import {
  APICallError,
  createProviderRegistry,
  wrapLanguageModel,
  type LanguageModel,
} from "ai";

const registry = createProviderRegistry({ google, anthropic, openai });

type ModelId = Parameters<typeof registry.languageModel>[0];
type Model = ReturnType<typeof registry.languageModel>;

// Gemini has a free API tier (AI Studio key). Free quotas are per model and
// small (gemini-3.5-flash: 20 requests/day), so the default is a chain: the
// stronger model first, then flash-lite once its quota or capacity runs out.
// Pinned versions, not "-latest" aliases, so eval results stay comparable.
export const DEFAULT_MODEL =
  "google:gemini-3.5-flash,google:gemini-3.5-flash-lite";

const isModelId = (id: string): id is ModelId =>
  /^(google|anthropic|openai):.+$/.test(id);

// 429 = this model's quota is used up, 503 = this model is overloaded.
// Both are per model, so the next model in the chain may still answer.
export const shouldFallBack = (error: unknown) =>
  APICallError.isInstance(error) &&
  (error.statusCode === 429 || error.statusCode === 503);

export async function withFallback<M, T>(
  models: M[],
  call: (model: M) => PromiseLike<T>,
): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await call(model);
    } catch (error) {
      if (!shouldFallBack(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

// AI_MODEL is a comma-separated list of "<provider>:<model>", tried in order,
// e.g. "anthropic:claude-sonnet-5-5" or "google:a,google:b". Each provider
// reads its own key from the server environment:
// GOOGLE_GENERATIVE_AI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY.
export function getModel(
  spec: string = process.env.AI_MODEL || DEFAULT_MODEL,
): LanguageModel {
  const models: Model[] = spec
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => {
      if (!isModelId(id)) {
        throw new Error(
          `AI_MODEL entries must look like "<google|anthropic|openai>:<model>", got "${id}"`,
        );
      }
      return registry.languageModel(id);
    });

  if (models.length === 0) throw new Error("AI_MODEL is empty");
  if (models.length === 1) return models[0];

  return wrapLanguageModel({
    model: models[0],
    middleware: {
      wrapStream: ({ params }) =>
        withFallback(models, (m) => m.doStream(params)),
      wrapGenerate: ({ params }) =>
        withFallback(models, (m) => m.doGenerate(params)),
    },
  });
}
