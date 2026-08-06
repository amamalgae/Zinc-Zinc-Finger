import assert from "node:assert/strict";
import test from "node:test";

import { runChenBenchmark } from "../scripts/benchmark-chen-2013.mjs";

test("Chen benchmark reproduces the published ZFN cohort", () => {
  const result = runChenBenchmark();
  assert.deepEqual(result.fullCohort, { n: 84, active: 33 });
  assert.equal(result.sequenceScorable.n, 82);
  assert.equal(result.sequenceScorable.genes, 65);
  assert.equal(result.sequenceScorable.active, 32);
  assert.deepEqual(
    result.unscorable.map(({ gene }) => gene),
    ["DBH", "Hrh3"],
  );
});

test("actual-sequence DeepZF does not predict Chen ZFN activity", () => {
  const result = runChenBenchmark();
  const metrics = result.sequenceScorable.actualTwelveResidueFit;
  assert.ok(Math.abs(metrics.spearman - 0.05266594834623045) < 1e-12);
  assert.ok(Math.abs(metrics.auc - 0.49125) < 1e-12);
  assert.equal(result.conclusion.useDeepZfForActivityRanking, false);
});

test("weaker-finger alternatives also remain near random", () => {
  const result = runChenBenchmark();
  assert.ok(
    Math.abs(result.sequenceScorable.minimumFingerFit.auc - 0.5203125) < 1e-12,
  );
  assert.ok(
    Math.abs(result.sequenceScorable.minimumMonomerFit.auc - 0.5175) < 1e-12,
  );
});
