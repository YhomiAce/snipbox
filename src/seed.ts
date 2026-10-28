import { SnippetModel } from "./models/snippet.js";

const SAMPLES = [
  {
    _id: "hello-ts01",
    title: "Debounce helper",
    language: "typescript",
    content: `/** Delays calls to \`fn\` until \`wait\` ms have passed without a new call. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 200) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const onResize = debounce(() => console.log(window.innerWidth), 150);
window.addEventListener("resize", onResize);
`,
  },
  {
    _id: "hello-py01",
    title: "Count words in a file",
    language: "python",
    content: `from collections import Counter
from pathlib import Path
import re
import sys


def top_words(path: Path, n: int = 10) -> list[tuple[str, int]]:
    text = path.read_text(encoding="utf-8").lower()
    words = re.findall(r"[a-z']+", text)
    return Counter(words).most_common(n)


if __name__ == "__main__":
    for word, count in top_words(Path(sys.argv[1])):
        print(f"{count:6}  {word}")
`,
  },
  {
    _id: "hello-sql1",
    title: "Monthly active users",
    language: "sql",
    content: `-- Distinct users with at least one event per calendar month
SELECT date_trunc('month', e.created_at) AS month,
       count(DISTINCT e.user_id)          AS active_users
FROM events e
WHERE e.created_at >= now() - interval '12 months'
GROUP BY 1
ORDER BY 1;
`,
  },
  {
    _id: "hello-go01",
    title: "Tiny HTTP server with graceful shutdown",
    language: "go",
    content: `package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	srv := &http.Server{Addr: ":8080", Handler: mux}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}
`,
  },
];

/**
 * Inserts a few public sample snippets when the collection is empty.
 * Idempotent: fixed ids plus upserts mean concurrent or repeated runs never duplicate.
 * Returns the number of snippets inserted.
 */
export async function seedIfEmpty(): Promise<number> {
  const existing = await SnippetModel.estimatedDocumentCount();
  if (existing > 0) return 0;

  const base = Date.now() - SAMPLES.length * 60_000;
  const result = await SnippetModel.bulkWrite(
    SAMPLES.map((sample, i) => ({
      updateOne: {
        filter: { _id: sample._id },
        update: {
          $setOnInsert: {
            ...sample,
            visibility: "public",
            burnAfterRead: false,
            expiresAt: null,
            createdAt: new Date(base + i * 60_000),
          },
        },
        upsert: true,
      },
    })),
    { timestamps: false },
  );
  return result.upsertedCount;
}
