import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const output = JSON.parse(execFileSync(process.execPath, ["scripts/benchmark-zf-specificity-models.mjs"], { encoding: "utf8" }));

assert.equal(output.baseline.bScore.n, 21);
assert.equal(output.baseline.bScore.active, 15);
assert.ok(output.baseline.bScore.rocAuc > 0.6 && output.baseline.bScore.rocAuc < 0.7);
assert.ok(output.baseline.bScore.averagePrecision > 0.7);
assert.deepEqual(
  output.plannedAdapters.map(({ id }) => id),
  [
    "persikov-2014-el-svm",
    "persikov-2015-b1h-nn",
    "gupta-2014-zfmodels",
    "deepzf-2022-pwmpredictor",
  ],
);
