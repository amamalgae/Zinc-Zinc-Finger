import assert from "node:assert/strict";
import {
  MAX_NEIGHBORS,
  RELAXATION_ORDER,
  aggregateFingerFits,
  cognateTripletLogLikelihood,
  hammingDistance,
  recognitionCoreFromHelix,
} from "../scripts/zf-specificity-adapters/persikov-2015-b1h-nn.mjs";

assert.equal(MAX_NEIGHBORS, 25);
assert.deepEqual(RELAXATION_ORDER[0], [-1, 2, 3]);
assert.deepEqual(RELAXATION_ORDER[1], [2, -1, 6]);
assert.deepEqual(RELAXATION_ORDER[2], [6, 3, 2]);
assert.equal(recognitionCoreFromHelix("RSDNLVR"), "RSDNVR");
assert.equal(hammingDistance("RSDNVR", "RSDNVR"), 0);
assert.equal(hammingDistance("RSDNVR", "RSDNIR"), 1);

const logFit = cognateTripletLogLikelihood(
  [
    [0.7, 0.1, 0.1, 0.1],
    [0.1, 0.7, 0.1, 0.1],
    [0.1, 0.1, 0.7, 0.1],
  ],
  "ACG",
);
assert.ok(Math.abs(logFit - Math.log(0.7)) < 1e-12);
assert.deepEqual(aggregateFingerFits([-1, -2, -3]), { mean: -2, weakest: -3 });
