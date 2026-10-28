import type { Request } from "express";

/** Resolves the public base URL: `PUBLIC_BASE_URL` if set, else derived from the request. */
export function baseUrl(req: Request, configured: string | undefined): string {
  return configured ?? `${req.protocol}://${req.get("host") ?? "localhost"}`;
}
