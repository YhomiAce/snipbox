import { Router } from "express";
import { pingDatabase } from "../db.js";

/** `GET /health`: 200 when MongoDB answers a ping, 503 otherwise. */
export function healthRouter(): Router {
  const router = Router();
  router.get("/health", async (_req, res) => {
    const up = await pingDatabase();
    res.set("Cache-Control", "no-store");
    res.status(up ? 200 : 503).json({ status: up ? "ok" : "error", database: up ? "up" : "down" });
  });
  return router;
}
