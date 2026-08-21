import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("genome checking leaves existing SELECT candidates interactive", () => {
  assert.doesNotMatch(css, /\.results-panel::before/);
  assert.doesNotMatch(css, /\.results-panel::after/);
  assert.match(app, /new Worker\(new URL\("\.\/genome-exact-match\.worker\.ts"/);
});

test("genome checking status remains visible without a blocking overlay", () => {
  assert.match(app, /genomeCheck\.status === "checking" \? copy\.genomeChecking/);
  assert.match(css, /Genome scans run in a worker\. Existing candidates remain visible and selectable/);
});
