import { z } from "zod";
import { EXPIRY_KEYS } from "./expiry.js";
import { LANGUAGE_IDS } from "./languages.js";

/** Maximum snippet size in bytes (200 KB). */
export const MAX_CONTENT_BYTES = 200 * 1024;

/** Accepts booleans as well as HTML checkbox / string values ("on", "true", "1"). */
const booleanish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true" || v === "1");

/** Schema for a new snippet, shared by the HTML form and the JSON API. */
export const createSnippetSchema = z.object({
  title: z
    .string()
    .trim()
    .max(120, "Title must be at most 120 characters")
    .optional()
    .transform((t) => t || "Untitled"),
  language: z.enum(LANGUAGE_IDS, { error: "Unknown language" }).default("text"),
  content: z
    .string({ error: "Content is required" })
    .refine((c) => c.trim().length > 0, "Content must not be empty")
    .refine(
      (c) => Buffer.byteLength(c, "utf8") <= MAX_CONTENT_BYTES,
      "Content must be at most 200 KB",
    ),
  expiry: z.enum(EXPIRY_KEYS, { error: "Unknown expiry option" }).default("1w"),
  burnAfterRead: booleanish,
  visibility: z.enum(["public", "unlisted"]).default("public"),
});

/** Validated input for creating a snippet. */
export type CreateSnippetInput = z.infer<typeof createSnippetSchema>;

/** Schema for snippet ids in URL params (nanoid alphabet). */
export const snippetIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,32}$/);

/** Flattens zod issues into `{ field: message }` pairs for display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
