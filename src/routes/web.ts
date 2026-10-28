import { Router, type Request, type Response } from "express";
import { EXPIRY_OPTIONS } from "../expiry.js";
import { highlight } from "../highlight.js";
import { LANGUAGES } from "../languages.js";
import { createSnippet, listRecentPublic, readSnippet } from "../services/snippets.js";
import { createSnippetSchema, fieldErrors, snippetIdSchema } from "../validation.js";
import { baseUrl } from "./urls.js";

const DEFAULT_FORM = { title: "", language: "text", content: "", expiry: "1w", burnAfterRead: false, visibility: "public" };

async function renderHome(
  res: Response,
  status: number,
  form: Record<string, unknown> = DEFAULT_FORM,
  errors: Record<string, string> = {},
): Promise<void> {
  const recent = await listRecentPublic();
  res.status(status).render("home", {
    title: "New snippet",
    recent,
    languages: LANGUAGES,
    expiryOptions: EXPIRY_OPTIONS,
    form: { ...DEFAULT_FORM, ...form },
    errors,
  });
}

function renderNotFound(res: Response): void {
  res.status(404).render("error", {
    title: "Not found",
    heading: "Snippet not found",
    message: "It may have expired, been burned after reading, or never existed.",
  });
}

/** Builds the router for the server-rendered HTML pages and the raw view. */
export function webRouter(publicBaseUrl: string | undefined): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    await renderHome(res, 200);
  });

  router.post("/snippets", async (req: Request, res: Response) => {
    const body: Record<string, unknown> = req.body ?? {};
    const parsed = createSnippetSchema.safeParse(body);
    if (!parsed.success) {
      await renderHome(res, 400, { ...body, burnAfterRead: body.burnAfterRead === "on" }, fieldErrors(parsed.error));
      return;
    }
    const snippet = await createSnippet(parsed.data);
    if (snippet.burnAfterRead) {
      // Don't redirect: opening the snippet would burn it before it's shared.
      res.status(201).render("created", {
        title: "Snippet created",
        snippet,
        link: `${baseUrl(req, publicBaseUrl)}/s/${snippet._id}`,
      });
      return;
    }
    res.redirect(303, `/s/${snippet._id}`);
  });

  router.get("/s/:id", async (req, res) => {
    const id = snippetIdSchema.safeParse(req.params.id);
    const result = id.success ? await readSnippet(id.data) : null;
    if (!result) return renderNotFound(res);

    const { snippet, burned } = result;
    const html = await highlight(snippet.content.replace(/\n$/, ""), snippet.language);
    res.set("Cache-Control", "no-store");
    res.render("snippet", {
      title: snippet.title,
      snippet,
      burned,
      html,
      lineCount: snippet.content.replace(/\n$/, "").split("\n").length,
    });
  });

  router.get("/raw/:id", async (req, res) => {
    const id = snippetIdSchema.safeParse(req.params.id);
    const result = id.success ? await readSnippet(id.data) : null;
    res.set("Cache-Control", "no-store");
    if (!result) {
      res.status(404).type("text/plain").send("Snippet not found\n");
      return;
    }
    res.type("text/plain; charset=utf-8").send(result.snippet.content);
  });

  return router;
}
