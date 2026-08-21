import assert from "node:assert/strict";
import test from "node:test";

import { ExactGenomeMatchAccumulator } from "../src/genome-exact-match.ts";
import { generateZfnCandidates } from "../src/zfn-design-engine.ts";

const EXAMPLE_LEFT_TOP = "TGCAGGGCCTATTGCACC";
const EXAMPLE_SPACER = "AGGCCA";
const EXAMPLE_RIGHT_TOP = "GATGAGAGAACCAAGGGG";
const EXAMPLE_SEQUENCE = `CAGTCA${EXAMPLE_LEFT_TOP}${EXAMPLE_SPACER}${EXAMPLE_RIGHT_TOP}TGACGT`;
const SUBSTITUTION = { A: "C", C: "G", G: "T", T: "A" };

function mutate(sequence, positions) {
  return [...sequence].map((base, index) => positions.includes(index) ? SUBSTITUTION[base] : base).join("");
}

test("Bhakta candidates generated from a genomic window are all found exactly in that same genome", () => {
  const candidates = generateZfnCandidates(EXAMPLE_SEQUENCE, 27, 1000, "bhakta-2013");
  assert.ok(candidates.length > 0);
  const matcher = new ExactGenomeMatchAccumulator(
    candidates.map(({ id, leftTop, rightTop, spacerLength }) => ({ id, leftTop, rightTop, spacerLength })),
  );
  matcher.addSequence(EXAMPLE_SEQUENCE);
  const result = matcher.result(1);

  assert.equal(result.summaries.length, candidates.length);
  for (const summary of result.summaries) {
    assert.ok(summary.exactPairMatches >= 1, `${summary.candidateId} must recover its intended exact genomic pair`);
  }
});

test("a generated Bhakta candidate carries a broad nearest mismatch through the real summary path", () => {
  const [candidate] = generateZfnCandidates(EXAMPLE_SEQUENCE, 27, 1000, "bhakta-2013");
  assert.ok(candidate);
  const alternate = `${mutate(candidate.leftTop, [0, 1])}AAAAAA${mutate(candidate.rightTop, [0, 1, 2, 3, 4, 5, 6, 7, 8])}`;
  const matcher = new ExactGenomeMatchAccumulator([
    { id: candidate.id, leftTop: candidate.leftTop, rightTop: candidate.rightTop, spacerLength: candidate.spacerLength },
  ]);
  matcher.addSequence(`${EXAMPLE_SEQUENCE}NNNN${alternate}`);
  const summary = matcher.result(1).summaries[0];

  assert.ok(summary.exactPairMatches >= 1);
  assert.equal(summary.closestAlternative?.totalMismatches, 11);
  assert.equal(summary.closestAlternative?.leftMismatches, 2);
  assert.equal(summary.closestAlternative?.rightMismatches, 9);
});
