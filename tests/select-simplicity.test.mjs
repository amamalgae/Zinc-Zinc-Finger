import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");
const progressive = await readFile(new URL("../src/progressive-candidates.ts", import.meta.url), "utf8");

test("SELECT hides explanatory genome clutter but keeps candidate facts", () => {
  assert.match(css, /\.selection-help,\s*\.genome-scope-note,\s*\.genome-match-counts/);
  assert.doesNotMatch(css, /Recommended|推奨/);
});

test("SELECT shows one explicit nearest mismatch label without badge emphasis", () => {
  assert.match(progressive, /"0 mismatch"/);
  assert.match(progressive, /2\[01\]/);
  assert.match(css, /\.genome-match\s*\{[^}]*color:\s*var\(--muted\);[^}]*font-size:\s*13px;[^}]*font-style:\s*normal;[^}]*font-weight:\s*400;/s);
  assert.doesNotMatch(css, /\.genome-match\.(?:exact-duplicate|near-high|near-mid|near-weak)\s*\{/);
  assert.doesNotMatch(css, /\.genome-match\s*\{[^}]*(?:background|border-radius|padding|min-height):/s);
});

test("candidate rows progressively reveal in batches of 30", () => {
  assert.match(progressive, /PAGE_SIZE = 30/);
  assert.match(progressive, /current\.visible \+ PAGE_SIZE/);
  assert.match(css, /\.candidate\[hidden\]\s*\{\s*display:\s*none/);
});

test("a requested genome page stays hidden until each row has a genome summary", () => {
  assert.match(progressive, /rowHasGenomeSummary/);
  assert.match(progressive, /genomeSummaryReady/);
  assert.match(progressive, /dataset\.genomePageLoading = "true"/);
  assert.match(css, /candidate-list\[data-genome-page-loading="true"\]::after/);
});

test("later genome pages never cover or block existing SELECT candidates", () => {
  assert.doesNotMatch(css, /\.results-panel::before/);
  assert.doesNotMatch(css, /\.results-panel::after/);
});

test("missing intended target is collapsed to one list-level warning", () => {
  assert.match(css, /candidate-list:has\(\.genome-match\.target-missing\)::before/);
});
