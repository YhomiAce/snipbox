import mongoose from "mongoose";
import { SnippetModel } from "./models/snippet.js";

/**
 * Connects to MongoDB and brings indexes (including the TTL index) up to date.
 * Safe to run on every start: index syncing is idempotent.
 */
export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await SnippetModel.syncIndexes();
}

/** Closes the MongoDB connection. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/** Returns true when MongoDB answers a ping. */
export async function pingDatabase(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !db) return false;
  try {
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
