import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { runSanderBenchmark } from "../scripts/benchmark-sander-2013.mjs";
import { searchGenomeOffTargets } from "../src/off-target-engine.ts";
import { reverseComplement } from "../src/design-engine.ts";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/sander-2013-zfn-off-targets.json", import.meta.url), "utf8"),
);

function mismatchCount(a, b) {
  return [...a].reduce((sum, base, index) => sum + Number(base !== b[index]), 0);
}

function mismatchPair(nuclease, sequence) {
  const halfLength = nuclease.halfSiteLength;
  const leftTarget = reverseComplement(nuclease.onTarget.slice(0, halfLength));
  const leftObserved = reverseComplement(sequence.slice(0, halfLength));
  const rightTarget = nuclease.onTarget.slice(-halfLength);
  const rightObserved = sequence.slice(-halfLength);
  return [mismatchCount(leftTarget, leftObserved), mismatchCount(rightTarget, rightObserved)];
}

test("Sander prospective data reproduce the published 25 CCR5 loci and 26 VEGFA loci", () => {
  const ccr5 = dataset.nucleases.CCR5.sites;
  const vegfa = dataset.nucleases.VEGFA.sites;
  assert.equal(ccr5.length, 26);
  assert.equal(new Set(ccr5.map(({ locus }) => locus)).size, 25);
  assert.equal(vegfa.length, 26);
  assert.equal(new Set(vegfa.map(({ locus }) => locus)).size, 26);
  assert.equal(Math.max(...ccr5.map(({ indelPercent }) => indelPercent)), 4.59);
  assert.equal(Math.max(...vegfa.map(({ indelPercent }) => indelPercent)), 5.1);
});

test("the old both-halves cutoff misses most CCR5 positives while either-half anchoring covers all rows", () => {
  const ccr5 = dataset.nucleases.CCR5;
  const vegfa = dataset.nucleases.VEGFA;
  const ccr5MismatchPairs = ccr5.sites.map(({ sequence }) => mismatchPair(ccr5, sequence));
  const allMismatchPairs = [
    ...ccr5MismatchPairs,
    ...vegfa.sites.map(({ sequence }) => mismatchPair(vegfa, sequence)),
  ];

  assert.equal(ccr5MismatchPairs.filter(([left, right]) => left <= 3 && right <= 3).length, 5);
  assert.equal(allMismatchPairs.filter(([left, right]) => Math.min(left, right) <= 3).length, 52);
});

test("the genome engine recovers every prospective CCR5 sequence from either-half anchors", () => {
  const nuclease = dataset.nucleases.CCR5;
  const separator = "N".repeat(24);
  const sequence = nuclease.sites.map((site) => site.sequence).join(separator);
  const expectedPositions = [];
  let position = 0;
  for (const site of nuclease.sites) {
    expectedPositions.push(position);
    position += site.sequence.length + separator.length;
  }
  const halfLength = nuclease.halfSiteLength;
  const candidate = {
    id: "CCR5-224",
    leftRecognition: reverseComplement(nuclease.onTarget.slice(0, halfLength)),
    rightRecognition: nuclease.onTarget.slice(-halfLength),
    spacerLength: nuclease.onTarget.length - halfLength * 2,
    targetStart: 0,
    footprintLength: nuclease.onTarget.length,
  };
  const result = searchGenomeOffTargets(
    [{ name: "Sander_Table_3", sequence }],
    [candidate],
    "",
    { maxResultsPerCandidate: 200 },
  );
  const observedPositions = new Set(
    result.summaries[0].topHits
      .filter(({ pairType }) => pairType === "LR")
      .map(({ position: hitPosition }) => hitPosition),
  );

  assert.deepEqual(
    expectedPositions.filter((expected) => !observedPositions.has(expected)),
    [],
  );
});

test("Sander screened cohorts retain positive and negative off-targets", () => {
  const result = runSanderBenchmark();
  const [ccr5, vegfa] = result.screenedCohorts;

  assert.equal(ccr5.name, "CCR5");
  assert.equal(ccr5.listedRows, 141);
  assert.equal(ccr5.evaluableRowsIncludingOnTarget, 138);
  assert.equal(ccr5.assayedOffTargets, 137);
  assert.equal(ccr5.positives, 22);

  assert.equal(vegfa.name, "VEGFA");
  assert.equal(vegfa.listedRows, 169);
  assert.equal(vegfa.evaluableRowsIncludingOnTarget, 159);
  assert.equal(vegfa.assayedOffTargets, 158);
  assert.equal(vegfa.positives, 34);
});

test("Sander full-cohort PROGNOS metrics and the failed fixed threshold are reproducible", () => {
  const result = runSanderBenchmark();
  const [ccr5, vegfa] = result.screenedCohorts;

  assert.ok(Math.abs(ccr5.metrics.prognosScore.rocAuc - 0.642292490118577) < 1e-12);
  assert.ok(Math.abs(vegfa.metrics.prognosScore.rocAuc - 0.6774193548387096) < 1e-12);
  assert.deepEqual(ccr5.metrics.prognosScore.recallAt20, {
    recovered: 6,
    positives: 22,
    recall: 6 / 22,
  });
  assert.deepEqual(vegfa.metrics.prognosScore.recallAt50, {
    recovered: 18,
    positives: 34,
    recall: 18 / 34,
  });
  assert.deepEqual(ccr5.fixedPrognosThreshold50, {
    predictedPositive: 14,
    truePositive: 5,
    totalPositive: 22,
  });
  assert.deepEqual(vegfa.fixedPrognosThreshold50, {
    predictedPositive: 77,
    truePositive: 21,
    totalPositive: 34,
  });
});
