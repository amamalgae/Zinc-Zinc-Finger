import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { searchGenomeOffTargets } from "../src/off-target-engine.ts";
import { reverseComplement } from "../src/design-engine.ts";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/sander-2013-zfn-off-targets.json", import.meta.url), "utf8"),
);

function mismatchCount(a, b) {
  return [...a].reduce((sum, base, index) => sum + Number(base !== b[index]), 0);
}

function mismatchPair(nuclease, sequence) {
  const halfLength = nuclease.halfSiteLength;
  const leftTarget = reverseComplement(nuclease.onTarget.slice(0, halfLength));
  const leftObserved = reverseComplement(sequence.slice(0, halfLength));
  const rightTarget = nuclease.onTarget.slice(-halfLength);
  const rightObserved = sequence.slice(-halfLength);
  return [mismatchCount(leftTarget, leftObserved), mismatchCount(rightTarget, rightObserved)];
}

test("Sander prospective data reproduce the published 25 CCR5 loci and 26 VEGFA loci", () => {
  const ccr5 = dataset.nucleases.CCR5.sites;
  const vegfa = dataset.nucleases.VEGFA.sites;
  assert.equal(ccr5.length, 26);
  assert.equal(new Set(ccr5.map(({ locus }) => locus)).size, 25);
  assert.equal(vegfa.length, 26);
  assert.equal(new Set(vegfa.map(({ locus }) => locus)).size, 26);
  assert.equal(Math.max(...ccr5.map(({ indelPercent }) => indelPercent)), 4.59);
  assert.equal(Math.max(...vegfa.map(({ indelPercent }) => indelPercent)), 5.1);
});

test("the old both-halves cutoff misses most CCR5 positives while either-half anchoring covers all rows", () => {
  const ccr5 = dataset.nucleases.CCR5;
  const vegfa = dataset.nucleases.VEGFA;
  const ccr5MismatchPairs = ccr5.sites.map(({ sequence }) => mismatchPair(ccr5, sequence));
  const allMismatchPairs = [
    ...ccr5MismatchPairs,
    ...vegfa.sites.map(({ sequence }) => mismatchPair(vegfa, sequence)),
  ];

  assert.equal(ccr5MismatchPairs.filter(([left, right]) => left <= 3 && right <= 3).length, 5);
  assert.equal(allMismatchPairs.filter(([left, right]) => Math.min(left, right) <= 3).length, 52);
});

test("the genome engine recovers every prospective CCR5 sequence from either-half anchors", () => {
  const nuclease = dataset.nucleases.CCR5;
  const separator = "N".repeat(24);
  const sequence = nuclease.sites.map((site) => site.sequence).join(separator);
  const expectedPositions = [];
  let position = 0;
  for (const site of nuclease.sites) {
    expectedPositions.push(position);
    position += site.sequence.length + separator.length;
  }
  const halfLength = nuclease.halfSiteLength;
  const candidate = {
    id: "CCR5-224",
    leftRecognition: reverseComplement(nuclease.onTarget.slice(0, halfLength)),
    rightRecognition: nuclease.onTarget.slice(-halfLength),
    spacerLength: nuclease.onTarget.length - halfLength * 2,
    targetStart: 0,
    footprintLength: nuclease.onTarget.length,
  };
  const result = searchGenomeOffTargets(
    [{ name: "Sander_Table_3", sequence }],
    [candidate],
    "",
    { maxResultsPerCandidate: 200 },
  );
  const observedPositions = new Set(
    result.summaries[0].topHits
      .filter(({ pairType }) => pairType === "LR")
      .map(({ position: hitPosition }) => hitPosition),
  );

  assert.deepEqual(
    expectedPositions.filter((expected) => !observedPositions.has(expected)),
    [],
  );
});
