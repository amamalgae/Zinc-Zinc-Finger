import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const output = JSON.parse(execFileSync(process.execPath, ["scripts/benchmark-zf-specificity-models.mjs"], { encoding: "utf8" }));

assert.equal(output.baseline.bScore.n, 21);
assert.equal(output.baseline.bScore.active, 15);
assert.ok(output.baseline.bScore.rocAuc > 0.65 && output.baseline.bScore.rocAuc < 0.66);
assert.ok(output.baseline.bScore.averagePrecision > 0.8);
assert.deepEqual(
  output.historicalControls.map(({ id }) => id),
  ["persikov-2014-el-svm", "deepzf-2022-pwmpredictor"],
);
assert.deepEqual(
  output.activeResearchCandidates.map(({ id }) => id),
  ["gupta-2014-zfmodels", "persikov-2015-b1h-nn"],
);
assert.equal(output.historicalControls[0].status, "already-benchmarked-not-promoted");
assert.equal(output.historicalControls[1].status, "already-benchmarked-rejected-for-activity-ranking");
assert.equal(output.activeResearchCandidates[0].status, "implemented-research-benchmark");
