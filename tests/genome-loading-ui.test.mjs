import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");

test("SELECT is covered while a genome scan is pending", () => {
  assert.match(css, /:has\(\.genome-file-status:not\(\.error\)\):not\(:has\(\.genome-scope-note\)\) \.results-panel::before/);
  assert.match(css, /genome-select-spin/);
});

test("ready genome results keep the loading overlay briefly before reveal", () => {
  assert.match(css, /:has\(\.genome-scope-note\) \.results-panel::before/);
  assert.match(css, /genome-select-reveal \.5s/);
});
