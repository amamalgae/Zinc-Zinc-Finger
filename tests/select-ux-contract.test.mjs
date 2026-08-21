import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contract = await readFile(new URL("../docs/select-ux.md", import.meta.url), "utf8");

test("SELECT UX contract keeps progressive results after an explicit genome transition", () => {
  assert.match(contract, /Every designable candidate/);
  assert.match(contract, /batches of 30/);
  assert.match(contract, /full-panel loading state/);
  assert.match(contract, /Genome-first and target-first input orders are equivalent/);
  assert.match(contract, /minimum visible duration of 500 ms/);
  assert.match(contract, /Web Worker/);
  assert.match(contract, /0 mismatch/);
  assert.match(contract, /4 mismatch/);
  assert.match(contract, /No row is labelled "recommended"/);
});
