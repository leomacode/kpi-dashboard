import type { UIMessage } from "ai";
import { ASK_LIMITS } from "./limits";

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
      text: textOf(m).slice(0, m.role === "user" ? ASK_LIMITS.questionChars : ASK_LIMITS.answerChars),
    }))
    .filter((m) => m.text.length > 0)
    .slice(-ASK_LIMITS.messages);
}

// The server replies to rejected requests with a short plain-text message
// (rate limit, too long, not configured). Anything else — an HTML 404 page
// when the API isn't running, a network failure — gets a generic line.
export function describeError(error: Error): string {
  const msg = error.message.trim();
  if (error.name !== "TypeError" && msg && msg.length <= 200 && !msg.startsWith("<")) return msg;
  return "The assistant is unavailable right now. Please try again later.";
}
