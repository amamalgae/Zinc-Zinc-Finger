import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCodaBicistronicZfn,
  CODA_ZFN_DONORS,
  codaConstructToProteinFasta,
} from "../src/coda-construct-output.ts";
import { generateCodaCandidates, reverseComplement } from "../src/coda-design-engine.ts";
import {
  buildCodaArray,
  CODA_F1_UNIT_COUNT,
  CODA_F2_CONTEXT_COUNT,
  CODA_F3_UNIT_COUNT,
  CODA_UNIT_COUNT,
} from "../src/coda-module-archive.ts";

const recognition = "GTGGGGGAG";
const target = `${reverseComplement(recognition)}GATTAC${recognition}`;

test("CoDA archive exposes the complete published F1/F2/F3 inventory", () => {
  assert.equal(CODA_F2_CONTEXT_COUNT, 18);
  assert.equal(CODA_F1_UNIT_COUNT, 319);
  assert.equal(CODA_F3_UNIT_COUNT, 344);
  assert.equal(CODA_UNIT_COUNT, 663);
});

test("CoDA joins context-compatible outer fingers around the same fixed F2", () => {
  const array = buildCodaArray(recognition);
  assert.ok(array);
  assert.equal(array.f2Context, "GGG");
  assert.deepEqual(array.fingers.map(({ triplet }) => triplet), ["GAG", "GGG", "GTG"]);
  assert.deepEqual(array.fingers.map(({ helix }) => helix), ["RNTNLTR", "RREHLVR", "RPDALPR"]);
  assert.equal(array.protein.length, 79);
  assert.match(array.protein, /^FQCRICMRNFSRNTNLTRHTRTHTGEKPFQCRICMRNFS/);
  assert.match(array.protein, /HLRTHTGEKPFQCRICMRNFSRPDALPRHLKTH$/);
});

test("CoDA does not impute absent context combinations", () => {
  assert.equal(buildCodaArray("AAAAAAAAA"), null);
  assert.equal(buildCodaArray("NNNNNNNNN"), null);
});

test("ZFN scanning preserves strand orientation and 5-7 bp spacer geometry", () => {
  const candidate = generateCodaCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.equal(candidate.leftRecognition, recognition);
  assert.equal(candidate.rightRecognition, recognition);
  assert.equal(candidate.spacer, "GATTAC");
  assert.deepEqual(candidate.leftArray.fingers.map(({ triplet }) => triplet), ["GAG", "GGG", "GTG"]);
  assert.deepEqual(candidate.rightArray.fingers.map(({ triplet }) => triplet), ["GAG", "GGG", "GTG"]);
});

test("CoDA output contains complete protein arrays, ELD/F2A/KKR, and no generated CDS", () => {
  const candidate = generateCodaCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  const construct = buildCodaBicistronicZfn(candidate);
  assert.equal("cds" in construct, false);
  assert.equal("gcPercent" in construct, false);
  assert.match(construct.processedLeftProtein, /^MAPKKKRKVFQCRICMRNFS/);
  assert.match(construct.processedRightProtein, /^PMAPKKKRKVFQCRICMRNFS/);
  assert.equal(CODA_ZFN_DONORS.length, 4);
  const fasta = codaConstructToProteinFasta(construct);
  assert.match(fasta, /precursor_polyprotein/);
  assert.match(fasta, /processed_left/);
  assert.match(fasta, /processed_right/);
  assert.doesNotMatch(fasta, /\bCDS\b|codon|GenBank/i);
});
