import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");

test("SELECT hides explanatory and zero-result genome clutter", () => {
  assert.match(css, /\.selection-help,\s*\.genome-scope-note,\s*\.genome-match-counts/);
  assert.match(css, /\.genome-match\.clear,[\s\S]*\.genome-match\.near-weak[\s\S]*display:\s*none/);
});

test("SELECT preserves compact candidate decision facts", () => {
  assert.doesNotMatch(css, /candidate-summary\s*>\s*strong[\s\S]{0,80}display:\s*none/);
  assert.doesNotMatch(css, /candidate-summary\s*>\s*small[\s\S]{0,80}display:\s*none/);
  assert.match(css, /candidate:first-child\s+\.candidate-action::before/);
  assert.match(css, /content:\s*"推奨 · "/);
});

test("SELECT only surfaces actionable genome similarity bands", () => {
  assert.match(css, /exact-duplicate::after/);
  assert.match(css, /near-high::after\s*\{\s*content:\s*"≤2 mm"/);
  assert.match(css, /near-mid::after\s*\{\s*content:\s*"3–4 mm"/);
});

test("missing intended target is collapsed to one list-level warning", () => {
  assert.match(css, /candidate-list:has\(\.genome-match\.target-missing\)::before/);
});
