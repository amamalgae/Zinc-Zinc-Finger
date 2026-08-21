import assert from "node:assert/strict";
import test from "node:test";

import {
  ExactGenomeMatchAccumulator,
  addFastaText,
  countExactPairMatchesInSequence,
  reverseComplementGenomeSequence,
} from "../src/genome-exact-match.ts";

const candidate = {
  id: "candidate-1",
  leftTop: "ACGTACGTA",
  rightTop: "TGCATGCAT",
  spacerLength: 6,
};

function footprint(spacer = "AAAAAA") {
  return `${candidate.leftTop}${spacer}${candidate.rightTop}`;
}

test("exact pair matching ignores spacer bases but requires spacer length", () => {
  const sequence = `TT${footprint("CCCCCC")}GG${candidate.leftTop}AAAAA${candidate.rightTop}TT`;
  assert.equal(countExactPairMatchesInSequence(sequence, candidate), 1);
});

test("exact pair matching finds the opposite genomic orientation", () => {
  const reverseFootprint = reverseComplementGenomeSequence(footprint("GATTAC"));
  assert.equal(countExactPairMatchesInSequence(`NN${reverseFootprint}NN`, candidate), 1);
});

test("exact pair matching counts repeated physical loci", () => {
  const sequence = `${footprint("AAAAAA")}NNNN${footprint("TTTTTT")}`;
  assert.equal(countExactPairMatchesInSequence(sequence, candidate), 2);
});

test("FASTA scanner preserves records and aggregates candidate counts", () => {
  const matcher = new ExactGenomeMatchAccumulator([candidate]);
  addFastaText(`>contig_1\n${candidate.leftTop}CCC\nCCC${candidate.rightTop}\n>contig_2\n${footprint("GGGGGG")}\n`, matcher);
  const result = matcher.result(1);
  assert.equal(result.sequenceCount, 2);
  assert.equal(result.genomeBases, footprint().length * 2);
  assert.equal(result.summaries[0].exactPairMatches, 2);
});

test("ambiguous genome bases do not create an exact match", () => {
  const sequence = `${candidate.leftTop.slice(0, 8)}NAAAAAA${candidate.rightTop}`;
  assert.equal(countExactPairMatchesInSequence(sequence, candidate), 0);
});

test("matching works for longer Bhakta-style half-sites", () => {
  const longer = {
    id: "candidate-6f",
    leftTop: "ACGTACGTAACGTACGTA",
    rightTop: "TGCATGCATTGCATGCAT",
    spacerLength: 6,
  };
  const sequence = `NN${longer.leftTop}GATTAC${longer.rightTop}NN`;
  assert.equal(countExactPairMatchesInSequence(sequence, longer), 1);
});
