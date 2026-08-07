import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { prognosPairScore } from "../src/off-target-engine.ts";
import { reverseComplement } from "../src/design-engine.ts";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/fine-2014-zfn-off-targets.json", import.meta.url), "utf8"),
);

function hammingDistance(a, b) {
  return [...a].reduce((sum, base, index) => sum + Number(base !== b[index]), 0);
}

function observedPair(nuclease, site) {
  const [firstArm, , secondArm] = site.matchType.split("-");
  const targets = {
    L: reverseComplement(nuclease.plusTargetPhysical),
    R: nuclease.minusTargetRecognition,
  };
  return {
    firstTarget: targets[firstArm],
    firstObserved: reverseComplement(site.plusHalf),
    secondTarget: targets[secondArm],
    secondObserved: site.minusHalf,
  };
}

function scoreSite(nuclease, site) {
  const pair = observedPair(nuclease, site);
  const firstMismatches = hammingDistance(pair.firstTarget, pair.firstObserved);
  const secondMismatches = hammingDistance(pair.secondTarget, pair.secondObserved);
  return {
    ...site,
    firstMismatches,
    secondMismatches,
    prognosScore: prognosPairScore(
      pair.firstTarget,
      pair.firstObserved,
      pair.secondTarget,
      pair.secondObserved,
    ),
  };
}

function auc(rows, score) {
  const positives = rows.filter(({ status }) => status === "positive");
  const negatives = rows.filter(({ status }) => status === "negative");
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      const positiveScore = score(positive);
      const negativeScore = score(negative);
      if (positiveScore > negativeScore) credit += 1;
      else if (positiveScore === negativeScore) credit += 0.5;
    }
  }
  return credit / (positives.length * negatives.length);
}

function averagePrecision(rows, score) {
  const sorted = [...rows].sort((a, b) => score(b) - score(a));
  const positiveCount = sorted.filter(({ status }) => status === "positive").length;
  let truePositives = 0;
  let precisionSum = 0;
  sorted.forEach((row, index) => {
    if (row.status !== "positive") return;
    truePositives += 1;
    precisionSum += truePositives / (index + 1);
  });
  return precisionSum / positiveCount;
}

function recallAt(rows, score, cutoff) {
  const positives = rows.filter(({ status }) => status === "positive").length;
  const recovered = [...rows]
    .sort((a, b) => score(b) - score(a))
    .slice(0, cutoff)
    .filter(({ status }) => status === "positive").length;
  return { recovered, positives, recall: recovered / positives };
}

function summarizeNuclease(name, nuclease) {
  const rows = nuclease.predictedSites.map((site) => scoreSite(nuclease, site));
  const evaluable = rows.filter(({ status }) => status !== "untested");
  const scoreDefinitions = {
    prognosV2: (row) => -row.ranks.prognosV2,
    homology: (row) => -row.ranks.homology,
    conservedG: (row) => -row.ranks.conservedG,
    totalIdentity: (row) => -row.mismatches[0],
  };
  const metrics = Object.fromEntries(
    Object.entries(scoreDefinitions).map(([metric, score]) => [
      metric,
      {
        rocAuc: auc(evaluable, score),
        averagePrecision: averagePrecision(evaluable, score),
        recallAt5: recallAt(evaluable, score, 5),
        recallAt10: recallAt(evaluable, score, 10),
        recallAt20: recallAt(evaluable, score, 20),
      },
    ]),
  );
  const mismatchCountErrors = rows
    .filter(
      (row) =>
        row.firstMismatches !== row.mismatches[1] ||
        row.secondMismatches !== row.mismatches[2],
    )
    .map(({ gene, mismatches, firstMismatches, secondMismatches }) => ({
      gene,
      published: mismatches.slice(1),
      calculated: [firstMismatches, secondMismatches],
    }));
  const rankingOrderErrors = rows
    .flatMap((left, leftIndex) =>
      rows.slice(leftIndex + 1).flatMap((right) => {
        const publishedComparison = Math.sign(right.ranks.prognosV2 - left.ranks.prognosV2);
        const calculatedComparison = Math.sign(left.prognosScore - right.prognosScore);
        if (calculatedComparison === 0 || calculatedComparison === publishedComparison) return [];
        return [{ left: left.gene, right: right.gene }];
      }),
    );

  return {
    name,
    fingerCount: nuclease.fingerCount,
    assayedOffTargets: evaluable.length,
    positives: evaluable.filter(({ status }) => status === "positive").length,
    negatives: evaluable.filter(({ status }) => status === "negative").length,
    untested: rows.filter(({ status }) => status === "untested").length,
    mismatchCountErrors,
    rankingOrderErrors,
    metrics,
    rows,
  };
}

export function runFineBenchmark() {
  const perNuclease = Object.entries(dataset.nucleases).map(([name, nuclease]) =>
    summarizeNuclease(name, nuclease),
  );
  const threeFinger = perNuclease.find(({ name }) => name === "HBB_3F");
  const fourFinger = perNuclease.find(({ name }) => name === "HBB_4F");
  const retests = dataset.nucleases.HBB_4F.threeFingerPositiveRetests;

  return {
    source: dataset.source,
    scoreReproduction: {
      mismatchRowsExact: perNuclease.reduce(
        (sum, result) => sum + result.rows.length - result.mismatchCountErrors.length,
        0,
      ),
      mismatchRowsTotal: perNuclease.reduce((sum, result) => sum + result.rows.length, 0),
      rankingOrderErrors: perNuclease.flatMap(({ name, rankingOrderErrors }) =>
        rankingOrderErrors.map((error) => ({ nuclease: name, ...error })),
      ),
    },
    perNuclease: perNuclease.map(({ rows: _rows, ...result }) => result),
    matchedHbbComparison: {
      threeFinger: {
        onTargetIndelPercent: dataset.nucleases.HBB_3F.onTarget.indelPercent,
        assayedOffTargets: threeFinger.assayedOffTargets,
        positiveOffTargets: threeFinger.positives,
      },
      fourFinger: {
        onTargetIndelPercent: dataset.nucleases.HBB_4F.onTarget.indelPercent,
        assayedOffTargets: fourFinger.assayedOffTargets,
        positiveOffTargets: fourFinger.positives,
      },
      threeFingerPositiveRetestsWithFourFinger: {
        total: retests.length,
        evaluable: retests.filter(({ status }) => status !== "untested").length,
        significant: retests.filter(({ status }) => status === "positive").length,
      },
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runFineBenchmark(), null, 2));
}
