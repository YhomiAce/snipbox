import { Router, type Request } from "express";
import type { Snippet } from "../models/snippet.js";
import { createSnippet, readSnippet } from "../services/snippets.js";
import { createSnippetSchema, fieldErrors, snippetIdSchema } from "../validation.js";
import { baseUrl } from "./urls.js";

function present(snippet: Snippet, base: string) {
  return {
    id: snippet._id,
    url: `${base}/s/${snippet._id}`,
    rawUrl: `${base}/raw/${snippet._id}`,
    title: snippet.title,
    language: snippet.language,
    visibility: snippet.visibility,
    burnAfterRead: snippet.burnAfterRead,
    expiresAt: snippet.expiresAt ?? null,
    createdAt: snippet.createdAt,
  };
}

/** Builds the JSON API router (`/api/snippets`). */
export function apiRouter(publicBaseUrl: string | undefined): Router {
  const router = Router();

  router.post("/snippets", async (req: Request, res) => {
    if (!req.is("application/json")) {
      res.status(415).json({ error: "Content-Type must be application/json" });
      return;
    }
    const parsed = createSnippetSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", fields: fieldErrors(parsed.error) });
      return;
    }
    const snippet = await createSnippet(parsed.data);
    res.status(201).json(present(snippet, baseUrl(req, publicBaseUrl)));
  });

  router.get("/snippets/:id", async (req, res) => {
    const id = snippetIdSchema.safeParse(req.params.id);
    const result = id.success ? await readSnippet(id.data) : null;
    res.set("Cache-Control", "no-store");
    if (!result) {
      res.status(404).json({ error: "Snippet not found" });
      return;
    }
    res.json({
      ...present(result.snippet, baseUrl(req, publicBaseUrl)),
      content: result.snippet.content,
      burned: result.burned,
    });
  });

  router.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return router;
}
