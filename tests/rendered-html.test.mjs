import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production HTML is built for the GitHub Pages project path", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Zinc Zinc Finger — 3-Finger ZFN Designer<\/title>/);
  assert.match(html, /\/Zinc-Zinc-Finger\/assets\//);
  assert.match(html, /<div id="root"><\/div>/);
});
