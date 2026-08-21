import assert from "node:assert/strict";
import test from "node:test";

import {
  compareGenomeAwareZfnCandidates,
  genomeAwareRankingAvailable,
} from "../src/genome-ranking.ts";

const bhaktaArray = { method: "bhakta-2013" };

function candidate(id, extra = {}) {
  return {
    id,
    profile: "bhakta-2013",
    combinedBScore: 20,
    tsoIssues: 0,
    unfavorableModules: 0,
    favorableModules: 0,
    spacerLength: 6,
    start: 1,
    distance: 0,
    leftArray: bhaktaArray,
    rightArray: bhaktaArray,
    ...extra,
  };
}

function summary(id, counts = [0, 0, 0, 0, 0, 0], exactPairMatches = 1) {
  return {
    candidateId: id,
    exactPairMatches,
    extraExactMatches: counts[0],
    alternativeCountsByMismatch: counts,
    closestAlternative: null,
  };
}

test("Bhakta functional evidence stays ahead of non-exact mismatch risk", () => {
  const betterFunctional = candidate("functional", { combinedBScore: 21 });
  const cleanerGenome = candidate("cleaner", { combinedBScore: 20 });
  const summaries = new Map([
    ["functional", summary("functional", [0, 1, 0, 0, 0, 0])],
    ["cleaner", summary("cleaner")],
  ]);
  assert.ok(compareGenomeAwareZfnCandidates(betterFunctional, cleanerGenome, summaries) < 0);
});

test("an extra exact genomic copy strongly downgrades a candidate", () => {
  const duplicated = candidate("duplicated", { combinedBScore: 30 });
  const unique = candidate("unique", { combinedBScore: 15 });
  const summaries = new Map([
    ["duplicated", summary("duplicated", [1, 0, 0, 0, 0, 0])],
    ["unique", summary("unique")],
  ]);
  assert.ok(compareGenomeAwareZfnCandidates(duplicated, unique, summaries) > 0);
});

test("one-to-two mismatches affect rank before spacer preference", () => {
  const oneMismatch = candidate("one", { spacerLength: 6 });
  const twoMismatch = candidate("two", { spacerLength: 5 });
  const summaries = new Map([
    ["one", summary("one", [0, 1, 0, 0, 0, 0])],
    ["two", summary("two", [0, 0, 1, 0, 0, 0])],
  ]);
  assert.ok(compareGenomeAwareZfnCandidates(oneMismatch, twoMismatch, summaries) > 0);
});

test("three-to-four mismatches are weaker than spacer preference", () => {
  const threeMismatch = candidate("three", { spacerLength: 6 });
  const fourMismatch = candidate("four", { spacerLength: 5 });
  const summaries = new Map([
    ["three", summary("three", [0, 0, 0, 1, 0, 0])],
    ["four", summary("four", [0, 0, 0, 0, 1, 0])],
  ]);
  assert.ok(compareGenomeAwareZfnCandidates(threeMismatch, fourMismatch, summaries) < 0);
});

test("five-mismatch alternatives are displayed data, not a ranking factor", () => {
  const earlier = candidate("earlier", { start: 1 });
  const later = candidate("later", { start: 2 });
  const summaries = new Map([
    ["earlier", summary("earlier", [0, 0, 0, 0, 0, 20])],
    ["later", summary("later")],
  ]);
  assert.ok(compareGenomeAwareZfnCandidates(earlier, later, summaries) < 0);
});

test("genome-aware ranking is disabled when the intended exact target is absent", () => {
  const first = candidate("first");
  const second = candidate("second");
  const summaries = new Map([
    ["first", summary("first")],
    ["second", summary("second", [0, 0, 0, 0, 0, 0], 0)],
  ]);
  assert.equal(genomeAwareRankingAvailable([first, second], summaries), false);
});
