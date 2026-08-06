import assert from "node:assert/strict";
import test from "node:test";

import {
  candidatesToCsv,
  cleanDNA,
  fingersForRecognitionStrand,
  generateCandidates,
  reverseComplement,
} from "../src/design-engine.ts";

test("cleanDNA removes FASTA headers without treating header letters as bases", () => {
  assert.equal(cleanDNA(">target ACGT\naacc 11\nggtt\n"), "AACCGGTT");
});

test("reverseComplement returns the opposite 5-prime to 3-prime strand", () => {
  assert.equal(reverseComplement("AACCGT"), "ACGGTT");
});

test("finger output follows protein N-to-C order", () => {
  const fingers = fingersForRecognitionStrand("AAACCCGGG");
  assert.deepEqual(
    fingers.map(({ finger, triplet, signature }) => ({ finger, triplet, signature })),
    [
      { finger: 1, triplet: "GGG", signature: "RRR" },
      { finger: 2, triplet: "CCC", signature: "DDD" },
      { finger: 3, triplet: "AAA", signature: "QQQ" },
    ],
  );
});

test("candidate strands face the spacer in the expected orientation", () => {
  const candidates = generateCandidates("AAACCCGGGTTTTTTCCCGGGAAA", 12, 3, 20);
  const candidate = candidates.find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.equal(candidate.leftTop, "AAACCCGGG");
  assert.equal(candidate.leftRecognition, "CCCGGGTTT");
  assert.equal(candidate.rightTop, "CCCGGGAAA");
  assert.equal(candidate.rightRecognition, "CCCGGGAAA");
});

test("ranking prefers an exact six-base spacer design", () => {
  const candidates = generateCandidates("AAACCCGGGTTTTTTCCCGGGAAA", 12, 3, 20);
  assert.equal(candidates[0].id, "0-6");
  assert.equal(candidates[0].distance, 0);
  assert.equal(candidates[0].spacerLength, 6);
});

test("CSV export contains recognition strands and N-to-C finger signatures", () => {
  const [candidate] = generateCandidates("AAACCCGGGTTTTTTCCCGGGAAA", 12, 3, 20);
  const csv = candidatesToCsv([candidate]);
  assert.match(csv, /left_recognition_strand_5to3/);
  assert.match(csv, /GGG:RRR/);
});
