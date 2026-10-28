import { createHighlighter, type Highlighter } from "shiki";
import { LANGUAGES } from "./languages.js";

let highlighterPromise: Promise<Highlighter> | undefined;

/** Lazily creates the shared Shiki highlighter with every supported grammar loaded. */
function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: LANGUAGES.map((l) => l.id).filter((id) => id !== "text"),
  });
  return highlighterPromise;
}

/** Loads grammars ahead of time so the first request isn't slow. */
export async function warmUpHighlighter(): Promise<void> {
  await getHighlighter();
}

/**
 * Renders code to highlighted HTML on the server.
 * Shiki escapes the source text, so the output is safe to embed as-is.
 * Each source line becomes a `<span class="line">`, which CSS numbers.
 */
export async function highlight(code: string, language: string): Promise<string> {
  const highlighter = await getHighlighter();
  const lang = highlighter.getLoadedLanguages().includes(language) ? language : "text";
  return highlighter.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
  });
}
