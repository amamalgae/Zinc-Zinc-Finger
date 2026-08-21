import assert from "node:assert/strict";
import test from "node:test";

import {
  BHAKTA_B_SCORE_CUTOFF,
  BHAKTA_C_TERMINAL_FIXED,
  BHAKTA_MODULE_COUNT,
  BHAKTA_N_TERMINAL_FIXED,
  buildBhaktaArray,
} from "../src/bhakta-module-archive.ts";
import { buildBicistronicZfn } from "../src/zfn-construct-output.ts";
import {
  bhaktaAlternativesForCandidate,
  compareZfnCandidates,
  generateZfnCandidates,
  reverseComplement,
} from "../src/zfn-design-engine.ts";

const HIV992 = {
  leftTop: "TGCAGGGCCTATTGCACC",
  spacer: "AGGCCA",
  rightTop: "GATGAGAGAACCAAGGGG",
  bScore: 17,
};

const CS3_1 = {
  leftTop: "GCCTATGTGTGTTTCTGC",
  spacer: "ACATG",
  rightTop: "GTGATGGGAGGTACTGGT",
  bScore: 14,
};

function target({ leftTop, spacer, rightTop }) {
  return `${leftTop}${spacer}${rightTop}`;
}

test("Bhakta v3 exposes the audited 49-module archive and published B-score cutoff", () => {
  assert.equal(BHAKTA_MODULE_COUNT, 49);
  assert.equal(BHAKTA_B_SCORE_CUTOFF, 15);
});

test("Bhakta arrays use six antiparallel Barbas modules and complete Sp1C terminal sequences", () => {
  const recognition = reverseComplement(HIV992.leftTop);
  const array = buildBhaktaArray(recognition);
  assert.ok(array);
  assert.equal(array.fingers.length, 6);
  assert.deepEqual(array.fingers.map(({ triplet }) => triplet), [
    recognition.slice(15, 18),
    recognition.slice(12, 15),
    recognition.slice(9, 12),
    recognition.slice(6, 9),
    recognition.slice(3, 6),
    recognition.slice(0, 3),
  ]);
  assert.ok(array.protein.startsWith(BHAKTA_N_TERMINAL_FIXED));
  assert.ok(array.protein.endsWith(BHAKTA_C_TERMINAL_FIXED));
  assert.equal((array.protein.match(/TGEKP/g) ?? []).length, 5);
});

test("published HIV992 L6+R6 target is reconstructed at B=17", () => {
  const candidate = generateZfnCandidates(target(HIV992), 21, 0, "bhakta-2013", 30)[0];
  assert.ok(candidate);
  assert.equal(candidate.id, "bhakta-0-6");
  assert.equal(candidate.leftArray.fingers.length, 6);
  assert.equal(candidate.rightArray.fingers.length, 6);
  assert.equal(candidate.combinedBScore, HIV992.bScore);
  assert.equal(candidate.spacerLength, 6);
});

test("v3 excludes an otherwise constructible L6+R6 site below B=15", () => {
  const left = buildBhaktaArray(reverseComplement(CS3_1.leftTop));
  const right = buildBhaktaArray(CS3_1.rightTop);
  assert.ok(left && right);
  assert.equal(left.bScore + right.bScore, CS3_1.bScore);
  assert.deepEqual(generateZfnCandidates(target(CS3_1), 20.5, 0, "bhakta-2013", 30), []);
});

test("Bhakta candidate rank is functional and does not prefer a nearer lower-B site", () => {
  const common = {
    profile: "bhakta-2013",
    tsoIssues: 0,
    unfavorableModules: 0,
    favorableModules: 0,
    spacerLength: 6,
    start: 0,
  };
  const nearLower = { ...common, combinedBScore: 16, distance: 0 };
  const farHigher = { ...common, combinedBScore: 20, distance: 900, start: 1000 };
  assert.ok(compareZfnCandidates(farHigher, nearLower) < 0);
  assert.ok(compareZfnCandidates(nearLower, farHigher) > 0);
});

test("selected Bhakta sites expose all 16 spacer-proximal 3-6F alternatives", () => {
  const candidate = generateZfnCandidates(target(HIV992), 21, 0, "bhakta-2013", 30)[0];
  assert.ok(candidate);
  const alternatives = bhaktaAlternativesForCandidate(candidate);
  assert.equal(alternatives.length, 16);
  const l6r6 = alternatives.find(({ leftFingerCount, rightFingerCount }) => leftFingerCount === 6 && rightFingerCount === 6);
  assert.ok(l6r6);
  assert.equal(l6r6.combinedBScore, HIV992.bScore);
  assert.equal(l6r6.passesBScoreCutoff, true);
});

test("Bhakta protein export annotates twelve fingers and reaches the construct terminus", () => {
  const candidate = generateZfnCandidates(target(HIV992), 21, 0, "bhakta-2013", 30)[0];
  assert.ok(candidate);
  const construct = buildBicistronicZfn(candidate);
  assert.deepEqual(construct.features.filter(({ name }) => /^ZF\d+$/.test(name)).map(({ name }) => name),
    Array.from({ length: 12 }, (_, index) => `ZF${index + 1}`));
  assert.equal(construct.features.at(-1).end, construct.protein.length);
  assert.match(construct.methodSummary, /Bhakta 2013/);
  assert.match(construct.methodSummary, /combined B-score 17/);
});
