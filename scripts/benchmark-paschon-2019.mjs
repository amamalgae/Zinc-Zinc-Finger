import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/paschon-2019-trac-specificity.json", import.meta.url), "utf8"),
);
const sequenceScores = JSON.parse(
  fs.readFileSync(new URL("../data/paschon-2019-trac-sequence-scores.json", import.meta.url), "utf8"),
);

function rocAuc(rows, scoreOf) {
  const positives = rows.filter(({ significantActiveEnrichment }) => significantActiveEnrichment);
  const negatives = rows.filter(({ significantActiveEnrichment }) => !significantActiveEnrichment);
  if (!positives.length || !negatives.length) return null;
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (scoreOf(positive) > scoreOf(negative)) credit += 1;
      else if (scoreOf(positive) === scoreOf(negative)) credit += 0.5;
    }
  }
  return credit / (positives.length * negatives.length);
}

function averagePrecision(rows, scoreOf) {
  const positiveCount = rows.filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
  if (!positiveCount) return null;
  const groups = Map.groupBy(rows, scoreOf);
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

function recallAt(rows, cutoff, scoreOf) {
  const positives = rows.filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
  const recovered = [...rows]
    .sort((left, right) => scoreOf(right) - scoreOf(left))
    .slice(0, cutoff)
    .filter(({ significantActiveEnrichment }) => significantActiveEnrichment).length;
  return { recovered, positives, recall: positives ? recovered / positives : null };
}

function analyzeSite(site) {
  const scoredSite = sequenceScores.sites.find(({ site: siteNumber }) => siteNumber === site.site);
  const scoreByUid = new Map(scoredSite.rows.map((row) => [row.uid, row.match.score]));
  const rows = site.rows.map((row) => ({ ...row, prognosScore: scoreByUid.get(row.uid) }));
  const onTarget = rows.find(({ isOnTarget }) => isOnTarget);
  const offTargets = rows.filter(({ isOnTarget }) => !isOnTarget);
  const captureTotal = rows.reduce((sum, { captureEvents }) => sum + captureEvents, 0);
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
    onTargetMaskedPrognosScore: onTarget.prognosScore,
    onTargetCaptureFraction: onTarget.captureEvents / captureTotal,
    captureEventRanking: {
      rocAuc: rocAuc(offTargets, ({ captureEvents }) => captureEvents),
      averagePrecision: averagePrecision(offTargets, ({ captureEvents }) => captureEvents),
      recallAt10: recallAt(offTargets, 10, ({ captureEvents }) => captureEvents),
      recallAt20: recallAt(offTargets, 20, ({ captureEvents }) => captureEvents),
    },
    maskedPrognosRanking: {
      rocAuc: rocAuc(offTargets, ({ prognosScore }) => prognosScore),
      averagePrecision: averagePrecision(offTargets, ({ prognosScore }) => prognosScore),
      recallAt10: recallAt(offTargets, 10, ({ prognosScore }) => prognosScore),
      recallAt20: recallAt(offTargets, 20, ({ prognosScore }) => prognosScore),
    },
    sequenceGeometrySupported: true,
    legacyContiguousEqualArmCompatible: !hasSkippedBases && armsHaveEqualRecognitionLength,
    incompatibility: [
      ...(hasSkippedBases ? ["base-skipping linker"] : []),
      ...(!armsHaveEqualRecognitionLength ? ["unequal recognition-arm lengths"] : []),
    ],
  };
}

export function runPaschonBenchmark() {
  const perSite = dataset.sites.map(analyzeSite);
  const pooledOffTargets = dataset.sites.flatMap((site) => {
    const scoredSite = sequenceScores.sites.find(({ site: siteNumber }) => siteNumber === site.site);
    const scoreByUid = new Map(scoredSite.rows.map((row) => [row.uid, row.match.score]));
    return site.rows
      .filter(({ isOnTarget }) => !isOnTarget)
      .map((row) => ({ ...row, prognosScore: scoreByUid.get(row.uid) }));
  });
  return {
    source: dataset.source,
    perSite,
    pooled: {
      assayedOffTargets: perSite.reduce((sum, site) => sum + site.assayedOffTargets, 0),
      positiveOffTargets: perSite.reduce((sum, site) => sum + site.positiveOffTargets, 0),
      sequenceGeometrySupportedPairs: perSite.filter(({ sequenceGeometrySupported }) =>
        sequenceGeometrySupported,
      ).length,
      legacyContiguousEqualArmCompatiblePairs: perSite.filter(({ legacyContiguousEqualArmCompatible }) =>
        legacyContiguousEqualArmCompatible,
      ).length,
      maskedPrognosRanking: {
        rocAuc: rocAuc(pooledOffTargets, ({ prognosScore }) => prognosScore),
        averagePrecision: averagePrecision(pooledOffTargets, ({ prognosScore }) => prognosScore),
        recallAt20: recallAt(pooledOffTargets, 20, ({ prognosScore }) => prognosScore),
        recallAt50: recallAt(pooledOffTargets, 50, ({ prognosScore }) => prognosScore),
      },
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runPaschonBenchmark(), null, 2));
}
