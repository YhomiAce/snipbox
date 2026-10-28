# snipbox

A small, self-hostable pastebin for code. Pages are rendered on the server, highlighted with [Shiki](https://shiki.style) and styled with one hand-written CSS file, so there's no frontend build step.

## Features

- **Create snippets** with a title, language, content (up to 200 KB), expiry (10 minutes, 1 hour, 1 day, 1 week or never) and visibility (public or unlisted)
- **Burn after read**: the first view deletes the snippet atomically (`findOneAndDelete`), so only one reader ever sees it, even with concurrent requests
- **Server-side syntax highlighting** for 20+ languages, with line numbers, a copy button and light/dark themes
- **Raw view** at `/raw/:id` (`text/plain`)
- **Recent public snippets** on the home page (unlisted and burn-after-read snippets are never listed)
- **Expiry through a MongoDB TTL index** on `expiresAt`; reads also filter out expired documents, because the TTL monitor only runs about once a minute
- Short random IDs (nanoid, 10 characters)
- **JSON API** for use from the command line
- Hardening: `helmet` (including a CSP with no inline scripts), a 300 KB request body limit, HTML escaping of all user content, and clean JSON or HTML errors with no stack traces
- `GET /health` pings MongoDB

## Requirements

- Node.js 22.12 or newer
- MongoDB 6 or newer

## Local development

```bash
cp .env.example .env            # adjust MONGODB_URI if needed
npm install
npm run dev                     # builds, then starts on http://localhost:5103
```

On first start the app creates its indexes and, if the collection is empty, inserts 4 sample public snippets.

### Tests

The tests use Vitest and Supertest against a real MongoDB. By default they use the `snipbox_test` database on `mongodb://127.0.0.1:57017` and drop it when they finish. Set `MONGODB_URI_TEST` to point them somewhere else.

```bash
npm test
```

### Scripts

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run build`     | Compiles TypeScript with `tsc` and copies `views/` and `public/` into `dist/` |
| `npm start`         | Runs `node dist/server.js`                                |
| `npm run dev`       | Builds, then starts using `.env` if present               |
| `npm test`          | Runs the test suite                                       |
| `npm run typecheck` | Type-checks without emitting                              |

## Environment variables

| Name              | Required | Example                              | Build or runtime | Notes |
| ----------------- | -------- | ------------------------------------ | ---------------- | ----- |
| `MONGODB_URI`     | yes      | `mongodb://127.0.0.1:57017/snipbox`  | runtime          | Defaults to the example value for local development |
| `PORT`            | no       | `5103`                               | runtime          | Defaults to `5103`; the server listens on `0.0.0.0` |
| `PUBLIC_BASE_URL` | no       | `https://snip.example.com`           | runtime          | Used for absolute links in API responses and burn-after-read share links. Without it, links are built from the request (`X-Forwarded-*` headers are trusted from private networks) |
| `NODE_ENV`        | no       | `production`                         | runtime          | |

## JSON API

### Create a snippet

`POST /api/snippets` with `Content-Type: application/json`

| Field           | Type    | Default    | Notes |
| --------------- | ------- | ---------- | ----- |
| `content`       | string  | required   | max 200 KB |
| `title`         | string  | `Untitled` | max 120 characters |
| `language`      | string  | `text`     | e.g. `typescript`, `python`, `go`, `rust`, `sql`, `bash`, `json` (see `src/languages.ts`) |
| `expiry`        | string  | `1w`       | `10m`, `1h`, `1d`, `1w` or `never` |
| `visibility`    | string  | `public`   | `public` or `unlisted` |
| `burnAfterRead` | boolean | `false`    | |

```bash
curl -s http://localhost:5103/api/snippets \
  -H 'Content-Type: application/json' \
  -d '{"title":"hello","language":"python","content":"print(\"hello\")","expiry":"1d"}'
```

```json
{
  "id": "Ap3zUe5jS7",
  "url": "http://localhost:5103/s/Ap3zUe5jS7",
  "rawUrl": "http://localhost:5103/raw/Ap3zUe5jS7",
  "title": "hello",
  "language": "python",
  "visibility": "public",
  "burnAfterRead": false,
  "expiresAt": "2026-10-29T10:00:00.000Z",
  "createdAt": "2026-10-28T10:00:00.000Z"
}
```

To paste a file, let `jq` build the JSON:

```bash
jq -Rs '{title: "main.go", language: "go", content: .}' main.go \
  | curl -s http://localhost:5103/api/snippets -H 'Content-Type: application/json' -d @-
```

### Read a snippet

```bash
curl -s http://localhost:5103/api/snippets/Ap3zUe5jS7   # JSON including "content"
curl -s http://localhost:5103/raw/Ap3zUe5jS7            # plain text
```

Reading a burn-after-read snippet through any route (page, raw or API) deletes it. Errors look like `{"error": "...", "fields": {...}}`, with status 400, 404, 413 or 415.

## Deploying

snipbox is a plain Node.js server with no build-time configuration.

| Step    | Command                     |
| ------- | --------------------------- |
| Install | `npm ci`                    |
| Build   | `npm run build`             |
| Start   | `npm start` (`node dist/server.js`) |
| Port    | `PORT`, default `5103`      |

- **Build-time env vars:** none.
- **Runtime env vars:** `MONGODB_URI` (required), `PORT`, `PUBLIC_BASE_URL` (optional, recommended behind a proxy).
- **Database setup:** there are no migrations to run. On every start the app syncs its MongoDB indexes, including the TTL index, which is idempotent, and seeds sample data only if the collection is empty.
- **Health check:** `GET /health` returns `200 {"status":"ok","database":"up"}`, or `503` when MongoDB is unreachable.
- The process handles `SIGTERM` gracefully and has no writable-filesystem requirements, so it can run as an unprivileged user.

## License

MIT
