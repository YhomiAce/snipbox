import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { SnippetModel } from "../src/models/snippet.js";
import { seedIfEmpty } from "../src/seed.js";

const TEST_URI = process.env.MONGODB_URI_TEST ?? "mongodb://127.0.0.1:57017/snipbox_test";
const app = createApp({ publicBaseUrl: "https://snip.example.com" });

beforeAll(async () => {
  await connectDatabase(TEST_URI);
});

beforeEach(async () => {
  await SnippetModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

async function createViaApi(body: Record<string, unknown>) {
  return request(app).post("/api/snippets").send(body).expect(201);
}

describe("creating snippets", () => {
  it("creates a snippet through the JSON API", async () => {
    const res = await createViaApi({ title: "Hello", language: "javascript", content: "console.log(1)", expiry: "1h" });
    expect(res.body.id).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(res.body.url).toBe(`https://snip.example.com/s/${res.body.id}`);
    expect(res.body.rawUrl).toBe(`https://snip.example.com/raw/${res.body.id}`);
    const expiresIn = new Date(res.body.expiresAt).getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(59 * 60 * 1000);
    expect(expiresIn).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("rejects invalid input with field errors", async () => {
    const res = await request(app)
      .post("/api/snippets")
      .send({ language: "brainfuck", content: "   ", expiry: "1y" })
      .expect(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(["content", "expiry", "language"]);
  });

  it("rejects content larger than 200 KB", async () => {
    const res = await request(app)
      .post("/api/snippets")
      .send({ content: "x".repeat(200 * 1024 + 1) })
      .expect(400);
    expect(res.body.fields.content).toMatch(/200 KB/);
  });

  it("returns 413 JSON for oversized bodies", async () => {
    const res = await request(app).post("/api/snippets").send({ content: "x".repeat(400 * 1024) }).expect(413);
    expect(res.body.error).toMatch(/too large/i);
    expect(res.text).not.toMatch(/at .*\.js/);
  });

  it("creates a snippet from the HTML form and redirects to it", async () => {
    const res = await request(app)
      .post("/snippets")
      .type("form")
      .send({ title: "Form", language: "python", content: "print('hi')", expiry: "never", visibility: "public" })
      .expect(303);
    expect(res.headers.location).toMatch(/^\/s\/[A-Za-z0-9]{10}$/);
  });
});

describe("viewing snippets", () => {
  it("renders highlighted, escaped HTML with line numbers markup", async () => {
    const { body } = await createViaApi({
      title: "<script>alert('t')</script>",
      language: "html",
      content: "<script>alert('x')</script>\n<p>two</p>\n",
      expiry: "never",
    });
    const res = await request(app).get(`/s/${body.id}`).expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).not.toContain("<script>alert(");
    expect(res.text).toContain("&lt;script&gt;alert(&#39;t&#39;)&lt;/script&gt;");
    expect(res.text).toContain('class="shiki');
    expect(res.text.match(/class="line"/g)).toHaveLength(2);
    expect(res.text).toContain("data-copy-target");
  });

  it("returns 404 for unknown or expired snippets", async () => {
    await request(app).get("/s/doesnotexist").expect(404);
    await SnippetModel.create({
      _id: "expired001",
      title: "old",
      language: "text",
      content: "bye",
      visibility: "public",
      expiresAt: new Date(Date.now() - 1000),
    });
    await request(app).get("/s/expired001").expect(404);
    await request(app).get("/api/snippets/expired001").expect(404);
  });

  it("serves the raw content as text/plain", async () => {
    const content = "<b>not html</b>\nline 2\n";
    const { body } = await createViaApi({ content, language: "text" });
    const res = await request(app).get(`/raw/${body.id}`).expect(200);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.text).toBe(content);
  });

  it("returns the snippet through the JSON API", async () => {
    const { body } = await createViaApi({ title: "api", content: "SELECT 1;", language: "sql" });
    const res = await request(app).get(`/api/snippets/${body.id}`).expect(200);
    expect(res.body).toMatchObject({ id: body.id, title: "api", language: "sql", content: "SELECT 1;", burned: false });
  });
});

describe("burn after read", () => {
  it("deletes the snippet on the first page view", async () => {
    const { body } = await createViaApi({ content: "secret", burnAfterRead: true });
    const first = await request(app).get(`/s/${body.id}`).expect(200);
    expect(first.text).toContain("burn after reading");
    expect(first.text).toContain("secret");
    await request(app).get(`/s/${body.id}`).expect(404);
    expect(await SnippetModel.countDocuments({ _id: body.id })).toBe(0);
  });

  it("burns on raw and API reads too", async () => {
    const raw = await createViaApi({ content: "raw secret", burnAfterRead: true });
    await request(app).get(`/raw/${raw.body.id}`).expect(200, "raw secret");
    await request(app).get(`/raw/${raw.body.id}`).expect(404);

    const api = await createViaApi({ content: "api secret", burnAfterRead: true });
    const res = await request(app).get(`/api/snippets/${api.body.id}`).expect(200);
    expect(res.body.burned).toBe(true);
    await request(app).get(`/api/snippets/${api.body.id}`).expect(404);
  });

  it("lets exactly one of many concurrent readers see it", async () => {
    const { body } = await createViaApi({ content: "once", burnAfterRead: true });
    const results = await Promise.all(Array.from({ length: 8 }, () => request(app).get(`/raw/${body.id}`)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 404)).toHaveLength(7);
  });

  it("shows a share page instead of redirecting after form creation", async () => {
    const res = await request(app)
      .post("/snippets")
      .type("form")
      .send({ content: "secret", language: "text", expiry: "1d", burnAfterRead: "on" })
      .expect(201);
    expect(res.text).toMatch(/https:\/\/snip\.example\.com\/s\/[A-Za-z0-9]{10}/);
    expect(await SnippetModel.countDocuments({ burnAfterRead: true })).toBe(1);
  });
});

describe("home page", () => {
  it("lists recent public snippets but not unlisted or burn-after-read ones", async () => {
    await createViaApi({ title: "Public one", content: "a" });
    await createViaApi({ title: "Hidden unlisted", content: "b", visibility: "unlisted" });
    await createViaApi({ title: "Hidden burner", content: "c", burnAfterRead: true });
    const res = await request(app).get("/").expect(200);
    expect(res.text).toContain("Public one");
    expect(res.text).not.toContain("Hidden unlisted");
    expect(res.text).not.toContain("Hidden burner");
  });

  it("seeds sample snippets only when empty", async () => {
    expect(await seedIfEmpty()).toBe(4);
    expect(await seedIfEmpty()).toBe(0);
    expect(await SnippetModel.countDocuments({ visibility: "public", expiresAt: null })).toBe(4);
  });
});

describe("health", () => {
  it("reports the database as up", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toEqual({ status: "ok", database: "up" });
  });
});
