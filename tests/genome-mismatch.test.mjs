import assert from "node:assert/strict";
import test from "node:test";

import {
  ExactGenomeMatchAccumulator,
  reverseComplementGenomeSequence,
} from "../src/genome-exact-match.ts";

const candidate = {
  id: "candidate-1",
  leftTop: "ACGTACGTA",
  rightTop: "TGCATGCAT",
  spacerLength: 6,
};

const SUBSTITUTION = { A: "C", C: "G", G: "T", T: "A" };

function mutate(sequence, positions) {
  return [...sequence].map((base, index) => positions.includes(index) ? SUBSTITUTION[base] : base).join("");
}

function scan(sequence, selected = candidate) {
  const matcher = new ExactGenomeMatchAccumulator([selected]);
  matcher.addSequence(sequence);
  return matcher.result(1).summaries[0];
}

test("one intended exact locus is excluded from alternative counts", () => {
  const target = `${candidate.leftTop}CCCCCC${candidate.rightTop}`;
  const oneMismatch = `${mutate(candidate.leftTop, [0])}AAAAAA${candidate.rightTop}`;
  const summary = scan(`${target}NNNN${oneMismatch}`);
  assert.equal(summary.exactPairMatches, 1);
  assert.equal(summary.extraExactMatches, 0);
  assert.equal(summary.alternativeCountsByMismatch[1], 1);
  assert.deepEqual(summary.closestAlternative, {
    leftMismatches: 1,
    rightMismatches: 0,
    totalMismatches: 1,
    spacerLength: 6,
  });
});

test("exact alternatives at 5-7 bp spacers are detected", () => {
  const target = `${candidate.leftTop}CCCCCC${candidate.rightTop}`;
  const fiveBp = `${candidate.leftTop}AAAAA${candidate.rightTop}`;
  const summary = scan(`${target}NNNN${fiveBp}`);
  assert.equal(summary.exactPairMatches, 1);
  assert.equal(summary.extraExactMatches, 1);
  assert.equal(summary.closestAlternative.totalMismatches, 0);
  assert.equal(summary.closestAlternative.spacerLength, 5);
});

test("five total mismatches are retained but six are outside the search window", () => {
  const target = `${candidate.leftTop}CCCCCC${candidate.rightTop}`;
  const fiveMismatch = `${mutate(candidate.leftTop, [0, 1, 2])}AAAAAA${mutate(candidate.rightTop, [0, 1])}`;
  const sixMismatch = `${mutate(candidate.leftTop, [0, 1, 2])}AAAAAA${mutate(candidate.rightTop, [0, 1, 2])}`;
  const summary = scan(`${target}NNNN${fiveMismatch}NNNN${sixMismatch}`);
  assert.equal(summary.alternativeCountsByMismatch[5], 1);
  assert.equal(summary.alternativeCountsByMismatch.reduce((sum, count) => sum + count, 0), 1);
});

test("approximate matches are found on the opposite genomic orientation", () => {
  const target = `${candidate.leftTop}AAAAAA${candidate.rightTop}`;
  const approximate = `${mutate(candidate.leftTop, [0])}GATTAC${candidate.rightTop}`;
  const summary = scan(`${target}NNNN${reverseComplementGenomeSequence(approximate)}`);
  assert.equal(summary.alternativeCountsByMismatch[1], 1);
});

test("four-plus-one mismatch search works for 18 bp Bhakta half-sites", () => {
  const longer = {
    id: "candidate-6f",
    leftTop: "ACGTACGTAACGTACGTA",
    rightTop: "TGCATGCATTGCATGCAT",
    spacerLength: 6,
  };
  const target = `${longer.leftTop}CCCCCC${longer.rightTop}`;
  const approximate = `${mutate(longer.leftTop, [0, 1, 2, 3])}AAAAAA${mutate(longer.rightTop, [0])}`;
  const summary = scan(`${target}NNNN${approximate}`, longer);
  assert.equal(summary.alternativeCountsByMismatch[5], 1);
});

test("ambiguous N windows are not treated as mismatches", () => {
  const target = `${candidate.leftTop}AAAAAA${candidate.rightTop}`;
  const ambiguous = `${candidate.leftTop.slice(0, 8)}NAAAAAA${candidate.rightTop}`;
  const summary = scan(`${target}NNNN${ambiguous}`);
  assert.equal(summary.alternativeCountsByMismatch.reduce((sum, count) => sum + count, 0), 0);
});
