// Vercel serverless function: POST /api/ask
// All logic lives in server/ai so it can be unit-tested without Vercel.
import { loadKpiData } from "../server/ai/data.js";
import { createAskHandler } from "../server/ai/handler.js";
import { getModel } from "../server/ai/model.js";
import { createRateLimiter } from "../server/ai/rateLimit.js";

const handleAsk = createAskHandler({
  getModel: () => getModel(),
  loadData: () => loadKpiData(),
  rateLimit: createRateLimiter({ limit: 10, windowMs: 60_000 }),
});

export const POST = handleAsk;
