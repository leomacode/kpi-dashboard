import {
  APICallError,
  LoadAPIKeyError,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { runAgent } from "./agent.js";
import type { KpiData } from "./data.js";

export const LIMITS = {
  questionChars: 500,
  answerChars: 4_000,
  messages: 10,
  bodyBytes: 64_000,
} as const;

// The client sends plain text history, not raw UI messages: the server never
// trusts client-supplied tool calls/results, and the payload stays small.
export const AskRequest = z.object({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({
          role: z.literal("user"),
          text: z.string().trim().min(1).max(LIMITS.questionChars),
        }),
        z.object({
          role: z.literal("assistant"),
          text: z.string().max(LIMITS.answerChars),
        }),
      ]),
    )
    .min(1)
    .max(LIMITS.messages)
    .refine((m) => m[m.length - 1].role === "user", "Last message must be from the user"),
});

export type AskRequest = z.infer<typeof AskRequest>;

const text = (status: number, body: string, headers: HeadersInit = {}) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...headers },
  });

// Never forward raw provider errors to the browser: they can contain request
// ids, model names or account details. Log server-side, show a friendly line.
export function toClientError(error: unknown): string {
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return "The AI service is busy right now. Please try again in a minute.";
  }
  if (LoadAPIKeyError.isInstance(error)) {
    return "The AI service is not configured on this deployment.";
  }
  return "Something went wrong while answering. Please try again.";
}

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

export function createAskHandler(deps: {
  getModel: () => LanguageModel;
  loadData: () => Promise<KpiData>;
  rateLimit: (key: string) => { ok: true } | { ok: false; retryAfterSec: number };
  log?: (error: unknown) => void;
}) {
  const log = deps.log ?? ((e: unknown) => console.error("[api/ask]", e));

  return async function handleAsk(req: Request): Promise<Response> {
    if (req.method !== "POST") return text(405, "Method not allowed", { allow: "POST" });

    const limited = deps.rateLimit(clientIp(req));
    if (!limited.ok) {
      return text(
        429,
        `Too many questions. Please wait ${limited.retryAfterSec} s and try again.`,
        { "retry-after": String(limited.retryAfterSec) },
      );
    }

    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > LIMITS.bodyBytes) {
      return text(413, "Request is too large.");
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return text(400, "Request body must be JSON.");
    }
    const parsed = AskRequest.safeParse(json);
    if (!parsed.success) {
      const tooLong = parsed.error.issues.some((i) => i.code === "too_big");
      return text(
        400,
        tooLong
          ? `Questions are limited to ${LIMITS.questionChars} characters.`
          : "Invalid request.",
      );
    }

    try {
      const messages: ModelMessage[] = parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const { result, tools } = runAgent({
        model: deps.getModel(),
        messages,
        data: await deps.loadData(),
      });
      return createUIMessageStreamResponse({
        stream: toUIMessageStream({
          stream: result.stream,
          tools,
          onError: (error) => {
            log(error);
            return toClientError(error);
          },
        }),
      });
    } catch (error) {
      log(error);
      return text(500, toClientError(error));
    }
  };
}
