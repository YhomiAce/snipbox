import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5103),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:57017/snipbox"),
  PUBLIC_BASE_URL: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((value) => value?.replace(/\/+$/, "")),
});

/** Validated runtime configuration. */
export type Config = z.infer<typeof envSchema>;

/**
 * Parses and validates environment variables.
 * Exits with a readable message (no stack trace) when they are invalid.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error("Invalid environment configuration:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}
