import fs from "node:fs";

import { prognosPairScore } from "../src/off-target-engine.ts";
import { reverseComplement } from "../src/design-engine.ts";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/sander-2013-zfn-off-targets.json", import.meta.url), "utf8"),
);

function mismatches(a, b) {
  return [...a].reduce((sum, base, index) => sum + Number(base !== b[index]), 0);
}

function averageRanks(values) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = Array(values.length);
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1;
    const rank = (start + end - 1) / 2 + 1;
    for (let index = start; index < end; index += 1) ranks[sorted[index].index] = rank;
    start = end;
  }
  return ranks;
}

function pearson(a, b) {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const deltaA = a[index] - meanA;
    const deltaB = b[index] - meanB;
    numerator += deltaA * deltaB;
    denominatorA += deltaA ** 2;
    denominatorB += deltaB ** 2;
  }
  return numerator / Math.sqrt(denominatorA * denominatorB);
}

function spearman(a, b) {
  return pearson(averageRanks(a), averageRanks(b));
}

function analyzeNuclease(name, nuclease) {
  const halfLength = nuclease.halfSiteLength;
  const leftTarget = reverseComplement(nuclease.onTarget.slice(0, halfLength));
  const rightTarget = nuclease.onTarget.slice(-halfLength);
  const rows = nuclease.sites.map((site) => {
    const leftObserved = reverseComplement(site.sequence.slice(0, halfLength));
    const rightObserved = site.sequence.slice(-halfLength);
    const leftMismatches = mismatches(leftTarget, leftObserved);
    const rightMismatches = mismatches(rightTarget, rightObserved);
    return {
      ...site,
      spacerLength: site.sequence.length - halfLength * 2,
      leftMismatches,
      rightMismatches,
      totalMismatches: leftMismatches + rightMismatches,
      prognosScore: prognosPairScore(leftTarget, leftObserved, rightTarget, rightObserved),
      oldBothWithinThree: leftMismatches <= 3 && rightMismatches <= 3,
      eitherWithinThree: Math.min(leftMismatches, rightMismatches) <= 3,
      browserEngineCompatible: halfLength >= 12 && Math.min(leftMismatches, rightMismatches) <= 3,
    };
  });

  const uniqueLoci = new Set(rows.map(({ locus }) => locus)).size;
  const oldWithinLimit = rows.filter(({ oldBothWithinThree }) => oldBothWithinThree);
  const eitherWithinLimit = rows.filter(({ eitherWithinThree }) => eitherWithinThree);
  const engineCompatible = rows.filter(({ browserEngineCompatible }) => browserEngineCompatible);
  const highActivity = rows.filter(({ indelPercent }) => indelPercent >= 1);
  const highActivityWithinLimit = highActivity.filter(({ eitherWithinThree }) => eitherWithinThree);
  const scores = rows.map(({ prognosScore }) => prognosScore);
  const identity = rows.map(({ totalMismatches }) => -totalMismatches);
  const sanderPrediction = rows.map(({ classifierScore }) => -classifierScore);
  const activity = rows.map(({ indelPercent }) => indelPercent);

  return {
    name,
    fingerCount: halfLength / 3,
    sequenceRows: rows.length,
    uniqueLoci,
    oldBothWithinThree: oldWithinLimit.length,
    eitherWithinThree: eitherWithinLimit.length,
    browserEngineCompatible: engineCompatible.length,
    highActivity: highActivity.length,
    highActivityEitherWithinThree: highActivityWithinLimit.length,
    prognosScoreAtLeast50: rows.filter(({ prognosScore }) => prognosScore >= 50).length,
    spearman: {
      prognosVsIndel: spearman(scores, activity),
      identityVsIndel: spearman(identity, activity),
      sanderClassifierVsIndel: spearman(sanderPrediction, activity),
    },
    rescuedByEitherHalfAnchoring: rows
      .filter(({ oldBothWithinThree, eitherWithinThree }) => !oldBothWithinThree && eitherWithinThree)
      .sort((a, b) => b.indelPercent - a.indelPercent)
      .map(({ locus, sequence, indelPercent, leftMismatches, rightMismatches, prognosScore }) => ({
        locus,
        sequence,
        indelPercent,
        leftMismatches,
        rightMismatches,
        prognosScore,
      })),
    rows,
  };
}

const perNuclease = Object.entries(dataset.nucleases).map(([name, nuclease]) =>
  analyzeNuclease(name, nuclease),
);
const allRows = perNuclease.flatMap(({ rows }) => rows);
const summary = {
  source: dataset.source,
  perNuclease: perNuclease.map(({ rows: _rows, ...result }) => result),
  pooled: {
    sequenceRows: allRows.length,
    uniqueLoci: new Set(allRows.map(({ locus }) => locus)).size,
    oldBothWithinThree: allRows.filter(({ oldBothWithinThree }) => oldBothWithinThree).length,
    eitherWithinThree: allRows.filter(({ eitherWithinThree }) => eitherWithinThree).length,
    browserEngineCompatible: allRows.filter(({ browserEngineCompatible }) => browserEngineCompatible).length,
    highActivity: allRows.filter(({ indelPercent }) => indelPercent >= 1).length,
    highActivityEitherWithinThree: allRows.filter(
      ({ indelPercent, eitherWithinThree }) => indelPercent >= 1 && eitherWithinThree,
    ).length,
    prognosScoreAtLeast50: allRows.filter(({ prognosScore }) => prognosScore >= 50).length,
    spearman: {
      prognosVsIndel: spearman(
        allRows.map(({ prognosScore }) => prognosScore),
        allRows.map(({ indelPercent }) => indelPercent),
      ),
      identityVsIndel: spearman(
        allRows.map(({ totalMismatches }) => -totalMismatches),
        allRows.map(({ indelPercent }) => indelPercent),
      ),
      sanderClassifierVsIndel: spearman(
        allRows.map(({ classifierScore }) => -classifierScore),
        allRows.map(({ indelPercent }) => indelPercent),
      ),
    },
  },
};

console.log(JSON.stringify(summary, null, 2));
