/** A language that can be picked when creating a snippet. */
export interface Language {
  /** Shiki grammar id. */
  id: string;
  /** Human-readable name shown in the UI. */
  label: string;
}

/** Languages offered in the language select, in display order. */
export const LANGUAGES: readonly Language[] = [
  { id: "text", label: "Plain text" },
  { id: "bash", label: "Bash / Shell" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "css", label: "CSS" },
  { id: "docker", label: "Dockerfile" },
  { id: "go", label: "Go" },
  { id: "html", label: "HTML" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "json", label: "JSON" },
  { id: "kotlin", label: "Kotlin" },
  { id: "markdown", label: "Markdown" },
  { id: "php", label: "PHP" },
  { id: "python", label: "Python" },
  { id: "ruby", label: "Ruby" },
  { id: "rust", label: "Rust" },
  { id: "sql", label: "SQL" },
  { id: "swift", label: "Swift" },
  { id: "typescript", label: "TypeScript" },
  { id: "yaml", label: "YAML" },
];

/** Tuple of language ids, usable with `z.enum`. */
export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id) as [string, ...string[]];

/** Returns the display label for a language id. */
export function languageLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}
