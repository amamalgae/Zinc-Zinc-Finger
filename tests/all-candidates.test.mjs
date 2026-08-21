import assert from "node:assert/strict";
import test from "node:test";

import { generateZfnCandidates } from "../src/zfn-design-engine.ts";

const TARGET = "TGCAGGGCCTATTGCACCAGGCCAGATGAGAGAACCAAGGGG";
const repeated = Array.from({ length: 40 }, () => TARGET).join("AAA");

test("default candidate generation is not capped at 30", () => {
  const all = generateZfnCandidates(repeated, Math.floor(repeated.length / 2), repeated.length, "bhakta-2013");
  const limited = generateZfnCandidates(repeated, Math.floor(repeated.length / 2), repeated.length, "bhakta-2013", 30);
  assert.ok(all.length > 30);
  assert.equal(limited.length, 30);
  assert.deepEqual(limited, all.slice(0, 30));
});
