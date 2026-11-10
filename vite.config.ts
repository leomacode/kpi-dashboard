import { defineConfig } from "vitest/config";
import { loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { Readable } from "node:stream";

// Dev only: serve the Vercel function at /api/ask from the Vite dev server so
// `npm run dev` works end to end without `vercel dev`. Production uses the
// real function in api/ask.ts.
const devApi = (): Plugin => ({
  name: "dev-api",
  apply: "serve",
  configureServer(server) {
    // Server-side secrets (ANTHROPIC_API_KEY, AI_MODEL, …) from .env.
    Object.assign(process.env, loadEnv("development", process.cwd(), ""));

    server.middlewares.use("/api/ask", async (req, res) => {
      const { POST } = await server.ssrLoadModule("/api/ask.ts");
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const response: Response = await POST(
        new Request(`http://localhost${req.originalUrl}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
        }),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(res);
      else res.end();
    });
  },
});

export default defineConfig({
  plugins: [react(), devApi()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: "./src/unitTests/setup.ts",
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
