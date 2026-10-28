// Copies EJS views and static assets next to the compiled JavaScript.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
for (const dir of ["views", "public"]) {
  rmSync(`${root}dist/${dir}`, { recursive: true, force: true });
  cpSync(`${root}src/${dir}`, `${root}dist/${dir}`, { recursive: true });
}
