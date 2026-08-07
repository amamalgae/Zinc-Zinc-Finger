import assert from "node:assert/strict";
import test from "node:test";

import { generateCandidates, reverseComplement } from "../src/design-engine.ts";
import {
  candidateDiversity,
  candidateModuleOverlap,
  selectDiversePortfolio,
} from "../src/portfolio.ts";

const recognition = "GACGAAGATGCAGCCGGTGGAGGCGGTGACGAACTA";
const target = `${reverseComplement(recognition)}GATTAC${recognition}${recognition}`;

test("candidate diversity is zero for an identical design", () => {
  const candidate = generateCandidates(target, 45, 6, 100, { candidateLimit: 100 })[0];
  assert.ok(candidate);
  assert.equal(candidateDiversity(candidate, candidate), 0);
  assert.equal(candidateModuleOverlap(candidate, candidate), 1);
});

test("portfolio keeps the best candidate and selects distinct designs", () => {
  const candidates = generateCandidates(target, 45, 6, 100, { candidateLimit: 100 });
  assert.ok(candidates.length >= 3);
  const portfolio = selectDiversePortfolio(candidates, 3);
  assert.equal(portfolio.length, 3);
  assert.equal(portfolio[0].candidate.id, candidates[0].id);
  assert.equal(new Set(portfolio.map(({ candidate }) => candidate.id)).size, 3);
  assert.ok(portfolio[1].diversityScore > 0);
  assert.ok(portfolio[2].minimumCutSeparation !== null);
});

test("portfolio prefers B-score passing and TSO-compatible candidates when enough exist", () => {
  const candidates = generateCandidates(target, 45, 6, 100, { candidateLimit: 100 });
  const eligible = candidates.filter((candidate) => candidate.passesBScoreCutoff && candidate.tsoIssues === 0);
  assert.ok(eligible.length >= 3);
  const portfolio = selectDiversePortfolio(candidates, 3);
  assert.ok(portfolio.every(({ candidate }) => candidate.passesBScoreCutoff && candidate.tsoIssues === 0));
});
