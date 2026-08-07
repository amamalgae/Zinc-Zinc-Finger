import assert from "node:assert/strict";
import test from "node:test";

import { runZhuBenchmark } from "../scripts/benchmark-zhu-2011.mjs";

test("Zhu benchmark reconstructs the reported 29-pair cohort", () => {
  const result = runZhuBenchmark();
  assert.equal(result.fullCohort.n, 29);
  assert.equal(result.fullCohort.active, 8);
  assert.equal(result.fullCohort.testedModules, 174);
});

test("Zhu proteins are not mislabeled as direct Barbas validation", () => {
  const result = runZhuBenchmark();
  assert.equal(result.fullCohort.exactProteinPairs, 0);
  assert.equal(result.fullCohort.matchedModules, 4);
  assert.equal(result.sequenceOnlyTransfer.n, 25);
  assert.equal(result.sequenceOnlyTransfer.active, 8);
  assert.equal(result.sequenceOnlyTransfer.excluded, 4);
});

test("sequence-only transfer metrics remain reproducible", () => {
  const result = runZhuBenchmark().sequenceOnlyTransfer;
  assert.ok(Math.abs(result.bScoreAuc - 0.5845588235294118) < 1e-12);
  assert.ok(Math.abs(result.currentRankingAuc - 0.5698529411764706) < 1e-12);
});

test("Table S5 and S7 identifier discrepancies remain explicit", () => {
  const result = runZhuBenchmark();
  assert.deepEqual(result.sourceIdMismatches, [
    { tableS7Id: "ZFNv1_5627", gene: "sbno2", tableS5Ids: ["ZFNv1_4729"] },
    { tableS7Id: "ZFNv1_4729", gene: "sgk", tableS5Ids: ["ZFNv1_38612"] },
    { tableS7Id: "ZFNv1_38612", gene: "spon1b", tableS5Ids: ["ZFNv1_36798"] },
  ]);
});
