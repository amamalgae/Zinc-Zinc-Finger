import assert from "node:assert/strict";
import test from "node:test";

import {
  parseFastaText,
  prognosHalfSiteScore,
  prognosPairScore,
  scorePhysicalPair,
  searchGenomeOffTargets,
} from "../src/off-target-engine.ts";
import { reverseComplement } from "../src/design-engine.ts";

const LEFT = "AAACCCGGGTTT";
const RIGHT = "GGGAAACCCTTT";
const SPACER = "GATTAC";
const PAIR = `${reverseComplement(LEFT)}${SPACER}${RIGHT}`;
const WINDOW = `ACGT${PAIR}TGCA`;
const CANDIDATE = {
  id: "candidate-1",
  leftRecognition: LEFT,
  rightRecognition: RIGHT,
  spacerLength: 6,
  targetStart: 4,
  footprintLength: PAIR.length,
};

test("FASTA parsing preserves contigs and converts ambiguous bases to N", () => {
  assert.deepEqual(parseFastaText(">chr1 comment\nacgtNNry\n>chr2\nTT 11 aa\n"), [
    { name: "chr1", sequence: "ACGTNNNN" },
    { name: "chr2", sequence: "TTAA" },
  ]);
});

test("PROGNOS v2.0 normalization gives a perfect match 100", () => {
  assert.equal(prognosHalfSiteScore(LEFT, LEFT), 100);
  assert.equal(prognosPairScore(LEFT, LEFT, RIGHT, RIGHT), 100);
});

test("PROGNOS applies the first-mismatch and polarity terms finger by finger", () => {
  const target = "AAAAAAAAAAAA";
  const observed = `C${target.slice(1)}`;
  const expected = (30 + 85 + 80 + 70) / (100 + 85 + 80 + 70) * 100;
  assert.ok(Math.abs(prognosHalfSiteScore(target, observed) - expected) < 1e-9);
});

test("N-terminal FokI reverses polarity and a skipped base is not scored", () => {
  const physicalTarget = "AAACCCAGGGTTT";
  const observed = "AAACCCTGGGTTT";
  const perfect = scorePhysicalPair(
    { physicalTarget, strand: "forward", skippedBaseOffsets: [6], fokIEnd: "N" },
    observed,
    { physicalTarget: RIGHT, strand: "forward" },
    RIGHT,
  );
  assert.equal(perfect.score, 100);
  assert.equal(perfect.leftMismatches, 0);

  const mismatchAtRecognitionStart = `C${physicalTarget.slice(1)}`;
  assert.notEqual(
    scorePhysicalPair(
      { physicalTarget, strand: "forward", skippedBaseOffsets: [6], fokIEnd: "N" },
      mismatchAtRecognitionStart,
      { physicalTarget: RIGHT, strand: "forward" },
      RIGHT,
    ).leftScore,
    scorePhysicalPair(
      { physicalTarget, strand: "forward", skippedBaseOffsets: [6], fokIEnd: "C" },
      mismatchAtRecognitionStart,
      { physicalTarget: RIGHT, strand: "forward" },
      RIGHT,
    ).leftScore,
  );
});

test("seed-and-verify supports asymmetric arms and one skipped base per half-site", () => {
  const leftRecognition = "AAACCCGGGTTT";
  const leftRecognitionSpan = "AAACCCAGGGTTT";
  const rightRecognition = "GGGAAACCCTTTGAA";
  const spacer = "GATTAC";
  const pair = `${reverseComplement(leftRecognitionSpan)}${spacer}${rightRecognition}`;
  const window = `ACGT${pair}TGCA`;
  const candidate = {
    id: "gapped-asymmetric",
    leftRecognition,
    rightRecognition,
    leftSkippedBaseOffsets: [6],
    spacerLength: 6,
    targetStart: 4,
    footprintLength: pair.length,
  };
  const result = searchGenomeOffTargets([{ name: "chr-gap", sequence: window }], [candidate], window);
  const summary = result.summaries[0];

  assert.equal(summary.intendedSiteFound, true);
  assert.equal(summary.perfectPairHits, 1);
  assert.equal(summary.perfectOffTargetHits, 0);
});

test("seed-and-verify finds intended, mismatched, and homodimeric sites", () => {
  const mismatchedLeftPhysical = `C${reverseComplement(LEFT).slice(1)}`;
  const mismatchedPair = `${mismatchedLeftPhysical}${SPACER}${RIGHT}`;
  const homodimerPair = `${reverseComplement(LEFT)}${SPACER}${LEFT}`;
  const contig = {
    name: "chr1",
    sequence: `${WINDOW}NNNNN${mismatchedPair}NNNNN${homodimerPair}`,
  };
  const result = searchGenomeOffTargets([contig], [CANDIDATE], WINDOW);
  const summary = result.summaries[0];

  assert.equal(result.targetWindowUniquelyLocated, true);
  assert.equal(summary.intendedSiteFound, true);
  assert.ok(summary.pairHits >= 3);
  assert.ok(summary.offTargetHits >= 2);
  assert.ok(summary.homodimerHits >= 1);
  assert.equal(summary.perfectOffTargetHits, 0);
  assert.equal(summary.maxOffTargetScore, 100);
  assert.equal(summary.topHits.some(({ pairType }) => pairType === "LL"), true);
});

test("a close match on either half anchors a pair whose other half has more than three mismatches", () => {
  const farRight = `CCCC${RIGHT.slice(4)}`;
  const farLeftRecognition = `TTTT${LEFT.slice(4)}`;
  const leftAnchored = `${reverseComplement(LEFT)}${SPACER}${farRight}`;
  const rightAnchored = `${reverseComplement(farLeftRecognition)}${SPACER}${RIGHT}`;
  const separator = "N".repeat(20);
  const result = searchGenomeOffTargets(
    [{ name: "asymmetric", sequence: `${leftAnchored}${separator}${rightAnchored}` }],
    [CANDIDATE],
    "",
  );
  const lrHits = result.summaries[0].topHits.filter(({ pairType }) => pairType === "LR");

  assert.equal(lrHits.some(({ leftMismatches, rightMismatches }) =>
    leftMismatches === 0 && rightMismatches === 4), true);
  assert.equal(lrHits.some(({ leftMismatches, rightMismatches }) =>
    leftMismatches === 4 && rightMismatches === 0), true);
});

test("a uniquely located reverse-complement target is recognized as the intended RL site", () => {
  const result = searchGenomeOffTargets(
    [{ name: "chrR", sequence: `NNNN${reverseComplement(WINDOW)}NNNN` }],
    [CANDIDATE],
    WINDOW,
  );
  const summary = result.summaries[0];
  assert.equal(result.targetWindowUniquelyLocated, true);
  assert.equal(summary.intendedSiteFound, true);
  assert.equal(summary.perfectPairHits, 1);
  assert.equal(summary.perfectOffTargetHits, 0);
  assert.equal(summary.topHits.some(({ isIntended }) => isIntended), false);
});

test("ambiguous N bases are not treated as mismatches", () => {
  const brokenPair = `${reverseComplement(LEFT).slice(0, 5)}N${reverseComplement(LEFT).slice(6)}${SPACER}${RIGHT}`;
  const result = searchGenomeOffTargets(
    [{ name: "masked", sequence: brokenPair }],
    [CANDIDATE],
    WINDOW,
  );
  assert.equal(result.summaries[0].pairHits, 0);
});

test("3-finger genome searches are rejected before the hit set explodes", () => {
  assert.throws(
    () => searchGenomeOffTargets(
      [{ name: "chr1", sequence: "A".repeat(100) }],
      [{ ...CANDIDATE, leftRecognition: "AAACCCGGG", rightRecognition: "GGGAAACCC" }],
      "A".repeat(30),
    ),
    /4–6 finger/,
  );
});
