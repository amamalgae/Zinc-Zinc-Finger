import assert from "node:assert/strict";
import test from "node:test";

import { runPaschonBenchmark } from "../scripts/benchmark-paschon-2019.mjs";

test("Paschon source data reconstruct all five TRAC specificity cohorts", () => {
  const result = runPaschonBenchmark();

  assert.deepEqual(
    result.perSite.map(({ assayedOffTargets }) => assayedOffTargets),
    [23, 23, 23, 26, 27],
  );
  assert.deepEqual(
    result.perSite.map(({ positiveOffTargets }) => positiveOffTargets),
    [4, 8, 4, 0, 0],
  );
  assert.equal(result.pooled.assayedOffTargets, 122);
  assert.equal(result.pooled.positiveOffTargets, 16);
});

test("all Paschon pairs retain explicit base-skipping, asymmetry, and FokI geometry", () => {
  const result = runPaschonBenchmark();

  assert.equal(result.pooled.sequenceGeometrySupportedPairs, 5);
  assert.equal(result.pooled.legacyContiguousEqualArmCompatiblePairs, 0);
  assert.deepEqual(
    result.perSite.map(({ onTargetMaskedPrognosScore }) => onTargetMaskedPrognosScore),
    [100, 100, 100, 100, 100],
  );
  assert.deepEqual(
    result.perSite.map(({ incompatibility }) => incompatibility),
    [
      ["base-skipping linker"],
      ["base-skipping linker"],
      ["base-skipping linker"],
      ["base-skipping linker"],
      ["unequal recognition-arm lengths"],
    ],
  );
});

test("masked PROGNOS metrics for the 122-site external cohort remain reproducible", () => {
  const result = runPaschonBenchmark();

  assert.ok(Math.abs(result.pooled.maskedPrognosRanking.rocAuc - 0.7594339623) < 1e-9);
  assert.ok(Math.abs(result.pooled.maskedPrognosRanking.averagePrecision - 0.3686781242) < 1e-9);
  assert.deepEqual(result.pooled.maskedPrognosRanking.recallAt20, {
    recovered: 6,
    positives: 16,
    recall: 0.375,
  });
  assert.deepEqual(result.pooled.maskedPrognosRanking.recallAt50, {
    recovered: 13,
    positives: 16,
    recall: 0.8125,
  });
  assert.ok(result.perSite[0].maskedPrognosRanking.rocAuc < 0.5);
});
