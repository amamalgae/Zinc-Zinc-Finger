import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");

test("candidate location is a plus-prefixed coordinate, never plus-minus", () => {
  assert.match(app, /\{functionalScore\}\+\{formatCut\(candidate\.cut\)\} · \{candidate\.spacerLength\} bp/);
  assert.doesNotMatch(app, /±\{formatCut\(candidate\.(?:cut|distance)\)\}/);
});

test("genome mismatch uses ordinary candidate metadata styling", () => {
  assert.match(css, /\.genome-match\s*\{[^}]*color:\s*var\(--muted\);[^}]*font-size:\s*13px;/s);
  assert.doesNotMatch(css, /\.genome-match\.(?:exact-duplicate|near-high|near-mid|near-weak)\s*\{/);
});
