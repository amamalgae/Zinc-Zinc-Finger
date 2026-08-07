import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { prognosHalfSiteScore, prognosPairScore } from "../src/off-target-engine.ts";
import { reverseComplement } from "../src/design-engine.ts";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/sander-2013-zfn-off-targets.json", import.meta.url), "utf8"),
);
const screenedDataset = JSON.parse(
  fs.readFileSync(new URL("../data/sander-2013-zfn-screened-sites.json", import.meta.url), "utf8"),
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

function rocAuc(rows, scoreName) {
  const positives = rows.filter(({ significant }) => significant);
  const negatives = rows.filter(({ significant }) => !significant);
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive[scoreName] > negative[scoreName]) credit += 1;
      else if (positive[scoreName] === negative[scoreName]) credit += 0.5;
    }
  }
  return credit / (positives.length * negatives.length);
}

function averagePrecision(rows, scoreName) {
  const positiveCount = rows.filter(({ significant }) => significant).length;
  const groups = Map.groupBy(rows, (row) => row[scoreName]);
  let seen = 0;
  let truePositives = 0;
  let result = 0;
  for (const [, group] of [...groups].sort(([left], [right]) => right - left)) {
    const groupPositives = group.filter(({ significant }) => significant).length;
    seen += group.length;
    truePositives += groupPositives;
    result += (groupPositives / positiveCount) * (truePositives / seen);
  }
  return result;
}

function recallAt(rows, scoreName, cutoff) {
  const positives = rows.filter(({ significant }) => significant).length;
  const recovered = [...rows]
    .sort(
      (left, right) =>
        right[scoreName] - left[scoreName] ||
        left.sourceRow - right.sourceRow ||
        left.sourceBlock.localeCompare(right.sourceBlock),
    )
    .slice(0, cutoff)
    .filter(({ significant }) => significant).length;
  return { recovered, positives, recall: recovered / positives };
}

function analyzeScreenedCohort(name, nuclease) {
  const halfLength = nuclease.halfSiteLength;
  const leftTarget = reverseComplement(nuclease.onTarget.slice(0, halfLength));
  const rightTarget = nuclease.onTarget.slice(-halfLength);
  const rows = nuclease.rows.filter(({ isOnTarget }) => !isOnTarget).map((site) => {
    const leftObserved = reverseComplement(site.sequence.slice(0, halfLength));
    const rightObserved = site.sequence.slice(-halfLength);
    const leftMismatches = mismatches(leftTarget, leftObserved);
    const rightMismatches = mismatches(rightTarget, rightObserved);
    const leftScore = prognosHalfSiteScore(leftTarget, leftObserved);
    const rightScore = prognosHalfSiteScore(rightTarget, rightObserved);
    return {
      ...site,
      prognosScore: prognosPairScore(leftTarget, leftObserved, rightTarget, rightObserved),
      geometricHalfScore: Math.sqrt(leftScore * rightScore),
      minimumHalfScore: Math.min(leftScore, rightScore),
      identityScore: site.identity,
      totalMismatchScore: -(leftMismatches + rightMismatches),
      maximumHalfMismatchScore: -Math.max(leftMismatches, rightMismatches),
      sanderClassifierScore: -site.classifierScore,
    };
  });
  const scoreNames = [
    "prognosScore",
    "geometricHalfScore",
    "minimumHalfScore",
    "identityScore",
    "totalMismatchScore",
    "maximumHalfMismatchScore",
    "sanderClassifierScore",
  ];
  const thresholdRows = rows.filter(({ prognosScore }) => prognosScore >= 50);
  return {
    name,
    listedRows: nuclease.listedRows,
    evaluableRowsIncludingOnTarget: nuclease.evaluableRows,
    assayedOffTargets: rows.length,
    positives: rows.filter(({ significant }) => significant).length,
    matchedActiveControlCounts: rows.filter(({ matchedActiveControlCounts }) => matchedActiveControlCounts).length,
    metrics: Object.fromEntries(
      scoreNames.map((scoreName) => [
        scoreName,
        {
          rocAuc: rocAuc(rows, scoreName),
          averagePrecision: averagePrecision(rows, scoreName),
          recallAt20: recallAt(rows, scoreName, 20),
          recallAt50: recallAt(rows, scoreName, 50),
        },
      ]),
    ),
    fixedPrognosThreshold50: {
      predictedPositive: thresholdRows.length,
      truePositive: thresholdRows.filter(({ significant }) => significant).length,
      totalPositive: rows.filter(({ significant }) => significant).length,
    },
  };
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

export function runSanderBenchmark() {
  const perNuclease = Object.entries(dataset.nucleases).map(([name, nuclease]) =>
    analyzeNuclease(name, nuclease),
  );
  const allRows = perNuclease.flatMap(({ rows }) => rows);
  return {
    source: dataset.source,
    prospectivePositives: {
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
    },
    screenedCohorts: Object.entries(screenedDataset.nucleases).map(([name, nuclease]) =>
      analyzeScreenedCohort(name, nuclease),
    ),
    screenedSource: screenedDataset.source,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runSanderBenchmark(), null, 2));
}
