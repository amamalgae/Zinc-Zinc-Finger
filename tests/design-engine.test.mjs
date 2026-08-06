import assert from "node:assert/strict";
import test from "node:test";

import {
  candidatesToCsv,
  cleanDNA,
  fingersForRecognitionStrand,
  generateCandidates,
  reverseComplement,
} from "../src/design-engine.ts";
import {
  calculateModuleBScore,
  moduleArchive,
} from "../src/module-archive.ts";
import { predictFingerPwm } from "../src/deepzf-pwm.ts";

test("cleanDNA removes FASTA headers without treating header letters as bases", () => {
  assert.equal(cleanDNA(">target ACGT\naacc 11\nggtt\n"), "AACCGGTT");
});

test("reverseComplement returns the opposite 5-prime to 3-prime strand", () => {
  assert.equal(reverseComplement("AACCGT"), "ACGGTT");
});

test("the archive exposes experiment-selected helices and the published B-score rule", () => {
  assert.equal(Object.keys(moduleArchive).length, 48);
  assert.equal(moduleArchive.GAA.helix, "QSSNLVR");
  assert.equal(calculateModuleBScore("GAA", "QSSNLVR"), 3);
  assert.equal(moduleArchive.AAA.bScore, 2);
});

test("the browser DeepZF port reproduces the upstream PWM model", () => {
  const prediction = predictFingerPwm("RSDNLVR", "GAG");
  assert.equal(prediction.topTriplet, "GAG");
  assert.equal(prediction.targetRank, 1);
  assert.ok(Math.abs(prediction.targetJointProbability - 0.9432) < 0.0001);
});

test("DeepZF contains recognition signal across the 48-module archive", () => {
  const modules = Object.values(moduleArchive);
  assert.equal(modules.filter(({ deepZf }) => deepZf.targetRank === 1).length, 15);
  assert.equal(modules.filter(({ deepZf }) => deepZf.targetRank <= 3).length, 24);
});

test("finger output follows protein N-to-C order", () => {
  const fingers = fingersForRecognitionStrand("AAACCCGAA");
  assert.ok(fingers);
  assert.deepEqual(
    fingers.map(({ finger, triplet, helix }) => ({ finger, triplet, helix })),
    [
      { finger: 1, triplet: "GAA", helix: "QSSNLVR" },
      { finger: 2, triplet: "CCC", helix: "SKKHLAE" },
      { finger: 3, triplet: "AAA", helix: "QRANLRA" },
    ],
  );
});

test("TSO-dependent modules require G or T immediately 3-prime", () => {
  assert.equal(fingersForRecognitionStrand("AAGCAA", "A"), null);
  assert.ok(fingersForRecognitionStrand("AAGGAA", "A"));
});

const LEFT_RECOGNITION = "GAAGACGAT";
const LEFT_TOP = reverseComplement(LEFT_RECOGNITION);
const RIGHT_RECOGNITION = "GCAGCCGGT";
const TEST_TARGET = `${LEFT_TOP}TTTTTT${RIGHT_RECOGNITION}`;

test("candidate strands face the spacer in the expected orientation", () => {
  const candidates = generateCandidates(TEST_TARGET, 12, 3, 20);
  const candidate = candidates.find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.equal(candidate.leftTop, LEFT_TOP);
  assert.equal(candidate.leftRecognition, LEFT_RECOGNITION);
  assert.equal(candidate.rightTop, RIGHT_RECOGNITION);
  assert.equal(candidate.rightRecognition, RIGHT_RECOGNITION);
});

test("candidate includes B-score, Sp1C array, and spacer-matched FokI linker", () => {
  const candidate = generateCandidates(TEST_TARGET, 12, 3, 20).find(
    ({ id }) => id === "0-6",
  );
  assert.ok(candidate);
  assert.equal(candidate.distance, 0);
  assert.equal(candidate.fokILinker, "TGAAAR");
  assert.match(candidate.leftArrayProtein, /^YKCPECGKSFS/);
  assert.match(candidate.leftArrayProtein, /TGEKP/);
  assert.equal(candidate.combinedBScore, 11);
  assert.ok(candidate.deepZfTargetFit > 0 && candidate.deepZfTargetFit < 1);
  assert.equal(candidate.deepZfExactModules, 3);
});

test("CSV export contains recognition strands and N-to-C finger signatures", () => {
  const candidate = generateCandidates(TEST_TARGET, 12, 3, 20).find(
    ({ id }) => id === "0-6",
  );
  assert.ok(candidate);
  const csv = candidatesToCsv([candidate]);
  assert.match(csv, /left_recognition_strand_5to3/);
  assert.match(csv, /deepzf_mean_target_fit/);
  assert.match(csv, /GAA:QSSNLVR:B3/);
  assert.match(csv, /left_zfa_protein_NtoC/);
});
