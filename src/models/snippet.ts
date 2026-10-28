import { Schema, model, type InferSchemaType } from "mongoose";

const snippetSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    language: { type: String, required: true },
    content: { type: String, required: true },
    visibility: { type: String, enum: ["public", "unlisted"], required: true },
    burnAfterRead: { type: Boolean, default: false },
    /** When set, MongoDB's TTL monitor deletes the document after this date. */
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// TTL index: documents are removed once `expiresAt` is in the past.
// Documents with `expiresAt: null` never expire.
snippetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Supports the "recent public snippets" listing.
snippetSchema.index({ visibility: 1, createdAt: -1 });

/** Shape of a stored snippet. */
export type Snippet = InferSchemaType<typeof snippetSchema> & { _id: string; createdAt: Date };

/** Mongoose model for snippets. */
export const SnippetModel = model("Snippet", snippetSchema);
