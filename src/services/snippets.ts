import { customAlphabet } from "nanoid";
import { expiryDate } from "../expiry.js";
import { SnippetModel, type Snippet } from "../models/snippet.js";
import type { CreateSnippetInput } from "../validation.js";

/** URL-safe alphabet without look-alike characters; 10 chars ≈ 57 bits. */
const newId = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 10);

/** Matches snippets that haven't expired yet (the TTL monitor can lag ~60 s). */
function notExpired(now: Date = new Date()) {
  return { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
}

/** Creates and stores a snippet, returning the saved document. */
export async function createSnippet(input: CreateSnippetInput): Promise<Snippet> {
  const doc = await SnippetModel.create({
    _id: newId(),
    title: input.title,
    language: input.language,
    content: input.content,
    visibility: input.visibility,
    burnAfterRead: input.burnAfterRead,
    expiresAt: expiryDate(input.expiry),
  });
  return doc.toObject() as Snippet;
}

/**
 * Fetches a snippet for reading. Burn-after-read snippets are deleted
 * atomically by the same operation, so only the first reader ever sees them.
 * Returns `null` when the snippet doesn't exist, has expired or was burned.
 */
export async function readSnippet(id: string): Promise<{ snippet: Snippet; burned: boolean } | null> {
  const burned = await SnippetModel.findOneAndDelete({
    _id: id,
    burnAfterRead: true,
    ...notExpired(),
  }).lean<Snippet>();
  if (burned) return { snippet: burned, burned: true };

  const snippet = await SnippetModel.findOne({
    _id: id,
    burnAfterRead: false,
    ...notExpired(),
  }).lean<Snippet>();
  return snippet ? { snippet, burned: false } : null;
}

/** Summary of a snippet for listings (no content). */
export type SnippetSummary = Pick<Snippet, "_id" | "title" | "language" | "createdAt" | "expiresAt">;

/** Lists the most recent public, non-burn snippets that haven't expired. */
export async function listRecentPublic(limit = 20): Promise<SnippetSummary[]> {
  return SnippetModel.find({ visibility: "public", burnAfterRead: false, ...notExpired() })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select({ title: 1, language: 1, createdAt: 1, expiresAt: 1 })
    .lean<SnippetSummary[]>();
}
