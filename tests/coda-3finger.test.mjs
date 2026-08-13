import assert from "node:assert/strict";
import test from "node:test";

import { translateDna } from "../src/construct-output.ts";
import {
  buildCodaBicistronicZfn,
  CODA_ZFN_DONORS,
  codaConstructToGenBank,
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

test("CoDA construct uses complete arrays, ELD/F2A/KKR, and translates exactly", () => {
  const candidate = generateCodaCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  const construct = buildCodaBicistronicZfn(candidate, "auxenochlorella");
  assert.equal(translateDna(construct.cds), `${construct.protein}*`);
  assert.match(construct.processedLeftProtein, /^MAPKKKRKVFQCRICMRNFS/);
  assert.match(construct.processedRightProtein, /^PMAPKKKRKVFQCRICMRNFS/);
  assert.equal(CODA_ZFN_DONORS.length, 4);
  const genbank = codaConstructToGenBank(construct, "auxenochlorella");
  assert.match(genbank, /Sander 2011 CoDA 3-finger arrays/);
  assert.match(genbank, /FokI ELD/);
  assert.match(genbank, /FokI KKR/);
});
