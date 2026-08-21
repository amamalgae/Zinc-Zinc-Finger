import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");
const progressive = await readFile(new URL("../src/progressive-candidates.ts", import.meta.url), "utf8");

test("SELECT hides explanatory genome clutter but keeps candidate facts", () => {
  assert.match(css, /\.selection-help,\s*\.genome-scope-note,\s*\.genome-match-counts/);
  assert.doesNotMatch(css, /Recommended|推奨/);
});

test("SELECT shows one explicit nearest mismatch label through the searched envelope", () => {
  assert.match(progressive, /"0 mismatch"/);
  assert.match(progressive, /\[1-8\] mismatch/);
  assert.match(css, /\.genome-match\.near-weak\s*\{[^}]*background:/);
  assert.doesNotMatch(css, /\.genome-match\.near-weak\s*\{[^}]*display:\s*none/);
});

test("candidate rows progressively reveal in batches of 30", () => {
  assert.match(progressive, /PAGE_SIZE = 30/);
  assert.match(progressive, /current\.visible \+ PAGE_SIZE/);
  assert.match(css, /\.candidate\[hidden\]\s*\{\s*display:\s*none/);
});

test("genome checking no longer overlays or blocks SELECT", () => {
  assert.doesNotMatch(css, /\.results-panel::before/);
  assert.doesNotMatch(css, /\.results-panel::after/);
});

test("missing intended target is collapsed to one list-level warning", () => {
  assert.match(css, /candidate-list:has\(\.genome-match\.target-missing\)::before/);
});
