import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const progressive = await readFile(new URL("../src/progressive-candidates.ts", import.meta.url), "utf8");

test("genome transition covers SELECT only until the first genome page is ready", () => {
  assert.match(css, /\.results-panel\.genome-transition-loading::before/);
  assert.match(css, /\.results-panel\.genome-transition-loading::after/);
  assert.match(progressive, /MIN_GENOME_TRANSITION_MS = 500/);
  assert.match(progressive, /genomeIsReady\(\)/);
});

test("target-first and genome-first input orders both request the same transition", () => {
  assert.match(progressive, /target\.matches\("#genome-file"\)/);
  assert.match(progressive, /target\.matches\("#target-sequence, \.simple-controls input"\)/);
  assert.match(progressive, /if \(genomeStatus\(\)\) requestGenomeTransition\(\)/);
});

test("genome sequence scanning remains in a Web Worker", () => {
  assert.match(app, /new Worker\(new URL\("\.\/genome-exact-match\.worker\.ts"/);
  assert.match(app, /genomeCheck\.status === "checking" \? copy\.genomeChecking/);
});

test("SELECT keeps exact mismatch numbers through the full searched Bhakta envelope", () => {
  assert.match(progressive, /\[1-8\] mismatch/);
  assert.match(progressive, /\(\[1-8\]\)\\s\*mm/);
  assert.match(css, /\.genome-match\.near-weak/);
  assert.doesNotMatch(css, /\.genome-match\.near-weak\s*\{\s*display:\s*none/);
});
