import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contract = await readFile(new URL("../docs/select-ux.md", import.meta.url), "utf8");

test("SELECT UX contract keeps progressive non-blocking behavior", () => {
  assert.match(contract, /Every designable candidate/);
  assert.match(contract, /batches of 30/);
  assert.match(contract, /remain visible, scrollable, copyable and selectable/);
  assert.match(contract, /never uses a blocking full-panel/);
  assert.match(contract, /0 mismatch/);
  assert.match(contract, /4 mismatch/);
  assert.match(contract, /No row is labelled "recommended"/);
});
