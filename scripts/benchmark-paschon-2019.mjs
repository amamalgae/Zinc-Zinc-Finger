import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/paschon-2019-trac-specificity.json", import.meta.url), "utf8"),
);

function rocAuc(rows) {
  const positives = rows.filter(({ significantActiveEnrichment }) => significantActiveEnrichment);
  const negatives = rows.filter(({ significantActiveEnrichment }) => !significantActiveEnrichment);
  if (!positives.length || !negatives.length) return null;
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive.captureEvents > negative.captureEvents) credit += 1;
      else if (positive.captureEvents === negative.captureEvents) credit += 0.5;
    }
  }
  return credit / (positives.length * negatives.length);
}

function averagePrecision(rows) {
  const positiveCount = rows.filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
  if (!positiveCount) return null;
  const groups = Map.groupBy(rows, ({ captureEvents }) => captureEvents);
  let seen = 0;
  let truePositives = 0;
  let result = 0;
  for (const [, group] of [...groups].sort(([left], [right]) => right - left)) {
    const groupPositives = group.filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
    seen += group.length;
    truePositives += groupPositives;
    result += (groupPositives / positiveCount) * (truePositives / seen);
  }
  return result;
}

function recallAt(rows, cutoff) {
  const positives = rows.filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
  const recovered = [...rows]
    .sort((left, right) => right.captureEvents - left.captureEvents)
    .slice(0, cutoff)
    .filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
  return { recovered, positives, recall: positives ? recovered / positives : null };
}

function analyzeSite(site) {
  const onTarget = site.rows.find(({ isOnTarget }) => isOnTarget);
  const offTargets = site.rows.filter(({ isOnTarget }) => !isOnTarget);
  const captureTotal = site.rows.reduce((sum, { captureEvents }) => sum + captureEvents, 0);
  const hasSkippedBases = site.target.baseSkipping.some((count) => count > 0);
  const armsHaveEqualRecognitionLength =
    site.target.left.length - site.target.baseSkipping[0] ===
    site.target.right.length - site.target.baseSkipping[1];
  return {
    site: site.site,
    architecture: site.target.architecture,
    baseSkipping: site.target.baseSkipping,
    assayedOffTargets: offTargets.length,
    positiveOffTargets: offTargets.filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length,
    onTargetIndelPercent: onTarget.activeIndelPercent,
    onTargetCaptureFraction: onTarget.captureEvents / captureTotal,
    captureEventRanking: {
      rocAuc: rocAuc(offTargets),
      averagePrecision: averagePrecision(offTargets),
      recallAt10: recallAt(offTargets, 10),
      recallAt20: recallAt(offTargets, 20),
    },
    contiguousEqualArmPrognosCompatible: !hasSkippedBases && armsHaveEqualRecognitionLength,
    incompatibility: [
      ...(hasSkippedBases ? ["base-skipping linker"] : []),
      ...(!armsHaveEqualRecognitionLength ? ["unequal recognition-arm lengths"] : []),
    ],
  };
}

export function runPaschonBenchmark() {
  const perSite = dataset.sites.map(analyzeSite);
  return {
    source: dataset.source,
    perSite,
    pooled: {
      assayedOffTargets: perSite.reduce((sum, site) => sum + site.assayedOffTargets, 0),
      positiveOffTargets: perSite.reduce((sum, site) => sum + site.positiveOffTargets, 0),
      directlyPrognosCompatiblePairs: perSite.filter(({ contiguousEqualArmPrognosCompatible }) =>
        contiguousEqualArmPrognosCompatible,
      ).length,
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runPaschonBenchmark(), null, 2));
}
