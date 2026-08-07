import assert from "node:assert/strict";
import test from "node:test";

import { runBhaktaBenchmark } from "../scripts/benchmark-bhakta-2013.mjs";

test("Bhakta benchmark reconstructs the reported cohort sizes", () => {
  const result = runBhaktaBenchmark();
  assert.equal(result.figureReconstructed92.n, 92);
  assert.equal(result.figureReconstructed92.active, 41);
  assert.equal(result.exactL6R6.exploratory.n, 10);
  assert.equal(result.exactL6R6.exploratory.active, 7);
  assert.equal(result.exactL6R6.prospective.n, 11);
  assert.equal(result.exactL6R6.prospective.active, 8);
  assert.equal(result.exactL6R6.combined.n, 21);
  assert.equal(result.exactL6R6.combined.active, 15);
});

test("published full-array B-scores are reproduced except the documented CS7-3 inconsistency", () => {
  const result = runBhaktaBenchmark();
  assert.equal(result.scoreReproduction.exact, 20);
  assert.equal(result.scoreReproduction.total, 21);
  assert.deepEqual(result.scoreReproduction.mismatches, [
    { target: "CS7-3", published: 21, calculated: 20 },
  ]);
});

test("Bhakta activity-ranking metrics remain reproducible", () => {
  const result = runBhaktaBenchmark();
  const combined = result.exactL6R6.combined;
  const prospective = result.exactL6R6.prospective;

  assert.ok(Math.abs(combined.bScoreAuc - 0.6555555555555556) < 1e-12);
  assert.ok(Math.abs(combined.currentRankingAuc - 0.6555555555555556) < 1e-12);
  assert.deepEqual(
    {
      tp: combined.bScore15.tp,
      fp: combined.bScore15.fp,
      tn: combined.bScore15.tn,
      fn: combined.bScore15.fn,
    },
    { tp: 13, fp: 5, tn: 1, fn: 2 },
  );
  assert.ok(Math.abs(prospective.currentRankingAuc - 22 / 24) < 1e-12);
});
