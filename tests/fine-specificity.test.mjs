import assert from "node:assert/strict";
import test from "node:test";

import { runFineBenchmark } from "../scripts/benchmark-fine-2014.mjs";

test("Fine supplementary Tables 8 and 9 reconstruct the complete evaluable cohorts", () => {
  const result = runFineBenchmark();
  const threeFinger = result.perNuclease.find(({ name }) => name === "HBB_3F");
  const fourFinger = result.perNuclease.find(({ name }) => name === "HBB_4F");

  assert.deepEqual(
    {
      assayed: threeFinger.assayedOffTargets,
      positives: threeFinger.positives,
      negatives: threeFinger.negatives,
      untested: threeFinger.untested,
    },
    { assayed: 22, positives: 6, negatives: 16, untested: 1 },
  );
  assert.deepEqual(
    {
      assayed: fourFinger.assayedOffTargets,
      positives: fourFinger.positives,
      negatives: fourFinger.negatives,
      untested: fourFinger.untested,
    },
    { assayed: 22, positives: 1, negatives: 21, untested: 1 },
  );
});

test("the independent PROGNOS implementation reproduces Fine mismatch counts and rank order", () => {
  const result = runFineBenchmark();

  assert.equal(result.scoreReproduction.mismatchRowsExact, 46);
  assert.equal(result.scoreReproduction.mismatchRowsTotal, 46);
  assert.deepEqual(result.scoreReproduction.rankingOrderErrors, []);
});

test("Fine binary specificity metrics remain explicit and reproducible", () => {
  const result = runFineBenchmark();
  const threeFinger = result.perNuclease.find(({ name }) => name === "HBB_3F");
  const fourFinger = result.perNuclease.find(({ name }) => name === "HBB_4F");

  assert.ok(Math.abs(threeFinger.metrics.prognosV2.rocAuc - 67 / 96) < 1e-12);
  assert.ok(
    Math.abs(threeFinger.metrics.prognosV2.averagePrecision - 0.3993686868686868) < 1e-12,
  );
  assert.ok(Math.abs(fourFinger.metrics.prognosV2.rocAuc - 11 / 21) < 1e-12);
  assert.equal(threeFinger.metrics.prognosV2.recallAt10.recovered, 4);
  assert.equal(fourFinger.metrics.prognosV2.recallAt10.recovered, 0);
});

test("the matched HBB comparison records the observed 3F-to-4F specificity shift", () => {
  const result = runFineBenchmark();

  assert.deepEqual(result.matchedHbbComparison, {
    threeFinger: {
      onTargetIndelPercent: 1.9,
      assayedOffTargets: 22,
      positiveOffTargets: 6,
    },
    fourFinger: {
      onTargetIndelPercent: 6.3,
      assayedOffTargets: 22,
      positiveOffTargets: 1,
    },
    threeFingerPositiveRetestsWithFourFinger: {
      total: 5,
      evaluable: 4,
      significant: 0,
    },
  });
});
