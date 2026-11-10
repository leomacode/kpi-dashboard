import type { UIMessage } from "ai";

// Must match LIMITS in server/ai/handler.ts.
export const MAX_QUESTION_CHARS = 500;
const MAX_ANSWER_CHARS = 4_000;
const MAX_MESSAGES = 10;

export type WireMessage = { role: "user" | "assistant"; text: string };

const textOf = (m: UIMessage) =>
  m.parts
    .flatMap((p) => (p.type === "text" ? [p.text] : []))
    .join("")
    .trim();

// The API takes plain-text history only (see AskRequest on the server), so
// tool parts are dropped and old turns trimmed before sending.
export function toWireMessages(messages: UIMessage[]): WireMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as WireMessage["role"],
      text: textOf(m).slice(0, m.role === "user" ? MAX_QUESTION_CHARS : MAX_ANSWER_CHARS),
    }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_MESSAGES);
}

// The server replies to rejected requests with a short plain-text message
// (rate limit, too long, not configured). Anything else — an HTML 404 page
// when the API isn't running, a network failure — gets a generic line.
export function describeError(error: Error): string {
  const msg = error.message.trim();
  if (error.name !== "TypeError" && msg && msg.length <= 200 && !msg.startsWith("<")) return msg;
  return "The assistant is unavailable right now. Please try again later.";
}
