import assert from "node:assert/strict";
import test from "node:test";
import {
  approximateTm,
  cleavageAssayToCsv,
  designCleavageAssay,
} from "../src/assay-design.ts";
import { reverseComplement } from "../src/design-engine.ts";

function deterministicDna(length) {
  let state = 217;
  const bases = "ACGT";
  let result = "";
  for (let index = 0; index < length; index += 1) {
    state = (state * 48271) % 2147483647;
    result += bases[state % 4];
  }
  return result;
}

test("approximate primer Tm stays in the expected range", () => {
  assert.ok(approximateTm("GCTAGCTAGCTAGCTAGCTA") > 50);
  assert.ok(approximateTm("GCGCGCGCGCGCGCGCGCGC") > approximateTm("ATATATATATATATATATAT"));
});

test("cleavage assay produces a centered PCR amplicon and complementary SSA insert", () => {
  const dna = deterministicDna(720);
  const target = dna.slice(335, 385);
  const design = designCleavageAssay(dna, 360, target);
  assert.ok(design.amplicon);
  assert.ok(design.amplicon.length >= 240 && design.amplicon.length <= 450);
  assert.ok(design.amplicon.start < 360 && design.amplicon.end > 360);
  assert.equal(design.ssaTargetBottom, reverseComplement(target));
  assert.match(cleavageAssayToCsv(design), /cleavage_amplicon_F/);
});

test("short target windows still return the SSA insert and no speculative primers", () => {
  const design = designCleavageAssay("ACGT".repeat(15), 30, "AACCGGTT");
  assert.equal(design.amplicon, null);
  assert.equal(design.ssaTargetBottom, "AACCGGTT");
});
