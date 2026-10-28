import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { warmUpHighlighter } from "./highlight.js";
import { seedIfEmpty } from "./seed.js";

async function main(): Promise<void> {
  const config = loadConfig();

  await connectDatabase(config.MONGODB_URI);
  const seeded = await seedIfEmpty();
  if (seeded > 0) console.log(`Seeded ${seeded} sample snippets`);
  await warmUpHighlighter();

  const app = createApp({ publicBaseUrl: config.PUBLIC_BASE_URL });
  const server = app.listen(config.PORT, "0.0.0.0", () => {
    console.log(`snipbox listening on http://0.0.0.0:${config.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  console.error("Failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
