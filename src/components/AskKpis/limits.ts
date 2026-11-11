// Request limits for POST /api/ask. Single source for both sides: the
// server enforces them (server/ai/handler.ts), the browser trims to them
// (wire.ts) and caps the input field, so a valid UI never gets a 400.
export const ASK_LIMITS = {
  questionChars: 500,
  answerChars: 4_000,
  messages: 10,
  bodyBytes: 64_000,
} as const;
