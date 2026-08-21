import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const progressive = await readFile(new URL("../src/progressive-candidates.ts", import.meta.url), "utf8");

test("genome transition covers SELECT until the genome-aware result is ready", () => {
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
