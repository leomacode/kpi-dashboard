import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// `npm run eval` — real-API evals, kept out of `npm test` and CI.
export default defineConfig({
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    // Server secrets (GOOGLE_GENERATIVE_AI_API_KEY, AI_MODEL, …) from .env.
    env: loadEnv("development", process.cwd(), ""),
    testTimeout: 120_000,
    fileParallelism: false,
  },
});
