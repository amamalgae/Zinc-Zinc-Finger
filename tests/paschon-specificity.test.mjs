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

test("none of the Paschon pairs are silently forced into the current PROGNOS geometry", () => {
  const result = runPaschonBenchmark();

  assert.equal(result.pooled.directlyPrognosCompatiblePairs, 0);
  assert.deepEqual(
    result.perSite.map(({ contiguousEqualArmPrognosCompatible }) =>
      contiguousEqualArmPrognosCompatible,
    ),
    [false, false, false, false, false],
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
