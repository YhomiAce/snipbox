import express, { type ErrorRequestHandler, type Express } from "express";
import helmet from "helmet";
import path from "node:path";
import { formatDate, timeLeft } from "./format.js";
import { languageLabel } from "./languages.js";
import { apiRouter } from "./routes/api.js";
import { healthRouter } from "./routes/health.js";
import { webRouter } from "./routes/web.js";

/** Request bodies above this size are rejected with 413 (content itself is capped at 200 KB). */
const BODY_LIMIT = "300kb";

/** Options for {@link createApp}. */
export interface AppOptions {
  /** Absolute public URL used in API responses and share links. */
  publicBaseUrl?: string;
}

/** Creates the Express application (without starting a server or connecting to MongoDB). */
export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const here = import.meta.dirname;

  app.set("view engine", "ejs");
  app.set("views", path.join(here, "views"));
  // Behind a reverse proxy (Traefik, nginx) on a private network: trust its X-Forwarded-* headers.
  app.set("trust proxy", "loopback, linklocal, uniquelocal");
  app.disable("x-powered-by");

  app.locals.languageLabel = languageLabel;
  app.locals.formatDate = formatDate;
  app.locals.timeLeft = timeLeft;

  app.use(helmet());
  app.use("/static", express.static(path.join(here, "public"), { maxAge: "1h" }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));

  app.use(healthRouter());
  app.use("/api", apiRouter(options.publicBaseUrl));
  app.use(webRouter(options.publicBaseUrl));

  app.use((_req, res) => {
    res.status(404).render("error", { title: "Not found", heading: "Page not found", message: "There's nothing here." });
  });

  const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" && err.status >= 400 && err.status < 600
        ? err.status
        : 500;
    if (status >= 500) console.error(err);
    const isParseError = typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed";
    const message =
      status === 413
        ? "Request body too large (snippets are limited to 200 KB)"
        : isParseError
          ? "Malformed request body"
          : status < 500
            ? "Bad request"
            : "Something went wrong";
    if (res.headersSent) return;
    if (req.path.startsWith("/api") || req.path === "/health") {
      res.status(status).json({ error: message });
      return;
    }
    res.status(status).render("error", { title: "Error", heading: status === 413 ? "Too large" : "Error", message });
  };
  app.use(errorHandler);

  return app;
}
