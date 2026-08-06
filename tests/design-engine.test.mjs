import assert from "node:assert/strict";
import test from "node:test";

import {
  candidatesToCsv,
  cleanDNA,
  compareCandidates,
  fingersForRecognitionStrand,
  generateCandidates,
  reverseComplement,
} from "../src/design-engine.ts";
import {
  calculateModuleBScore,
  moduleArchive,
} from "../src/module-archive.ts";
import {
  predictFingerPwm,
  predictFingerPwmFromTwelveResidues,
} from "../src/deepzf-pwm.ts";

test("cleanDNA removes FASTA headers without treating header letters as bases", () => {
  assert.equal(cleanDNA(">target ACGT\naacc 11\nggtt\n"), "AACCGGTT");
});

test("reverseComplement returns the opposite 5-prime to 3-prime strand", () => {
  assert.equal(reverseComplement("AACCGT"), "ACGGTT");
});

test("the archive exposes experiment-selected helices and the published B-score rule", () => {
  assert.equal(Object.keys(moduleArchive).length, 49);
  assert.equal(moduleArchive.GAA.helix, "QSSNLVR");
  assert.equal(calculateModuleBScore("GAA", "QSSNLVR"), 3);
  assert.equal(moduleArchive.AAA.bScore, 2);
  assert.equal(moduleArchive.AAG.bScore, 2);
  assert.equal(moduleArchive.ATC.helix, "DPGALRV");
});

test("the browser DeepZF port reproduces the upstream PWM model", () => {
  const prediction = predictFingerPwm("RSDNLVR", "GAG");
  assert.equal(prediction.topTriplet, "GAG");
  assert.equal(prediction.targetRank, 1);
  assert.ok(Math.abs(prediction.targetJointProbability - 0.9432) < 0.0001);
});

test("DeepZF accepts the actual 12-residue Cys2-to-His1 sequence", () => {
  const fromHelix = predictFingerPwm("RSDNLVR", "GAG");
  const fromTwelve = predictFingerPwmFromTwelveResidues(
    "GKSFSRSDNLVR",
    "GAG",
  );
  assert.deepEqual(fromTwelve, fromHelix);
  assert.throws(
    () => predictFingerPwmFromTwelveResidues("TOO-SHORT", "GAG"),
    /12 residues/,
  );
});

test("DeepZF is diagnostic only and cannot change candidate ranking", () => {
  const common = {
    passesBScoreCutoff: true,
    combinedBScore: 18,
    tsoIssues: 0,
    unfavorableModules: 0,
    favorableModules: 3,
    distance: 2,
    spacerLength: 6,
  };
  assert.equal(
    compareCandidates(
      { ...common, deepZfTargetFit: 0.01 },
      { ...common, deepZfTargetFit: 0.99 },
    ),
    0,
  );
  assert.ok(
    compareCandidates(
      { ...common, deepZfTargetFit: 0.01 },
      { ...common, tsoIssues: 1, deepZfTargetFit: 0.99 },
    ) < 0,
  );
});

test("DeepZF contains recognition signal across the 49-module archive", () => {
  const modules = Object.values(moduleArchive);
  assert.equal(modules.filter(({ deepZf }) => deepZf.targetRank === 1).length, 16);
  assert.equal(modules.filter(({ deepZf }) => deepZf.targetRank <= 3).length, 25);
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

test("TSO is restricted to GNG modules and remains a warning", () => {
  const unmet = fingersForRecognitionStrand("GTGCAA", "A");
  const met = fingersForRecognitionStrand("GTGGAA", "A");
  assert.ok(unmet);
  assert.ok(met);
  assert.equal(unmet.find(({ triplet }) => triplet === "GTG")?.tsoCompatible, false);
  assert.equal(met.find(({ triplet }) => triplet === "GTG")?.tsoCompatible, true);
  assert.equal(moduleArchive.AAG.requiresTsoContext, false);
});

test("a TSO warning does not exclude an otherwise assemblable candidate", () => {
  const recognition = "GTGCAAGAA";
  const target = `${reverseComplement(recognition)}TTTTTT${recognition}`;
  const candidate = generateCandidates(target, 12, 3, 20).find(
    ({ id }) => id === "0-6",
  );

  assert.ok(candidate);
  assert.equal(candidate.tsoIssues, 2);
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
