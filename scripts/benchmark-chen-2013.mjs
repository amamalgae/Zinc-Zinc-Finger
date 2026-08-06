import { fileURLToPath } from "node:url";

import chenData from "../data/chen-2013-zfn-benchmark.json" with { type: "json" };
import {
  meanDeepZfTargetFit,
  predictFingerPwm,
  predictFingerPwmFromTwelveResidues,
} from "../src/deepzf-pwm.ts";
import { reverseComplement } from "../src/design-engine.ts";

function triplets(value) {
  return value.match(/.{3}/g) ?? [];
}

function targetTriplets(targetSite) {
  const match = targetSite.match(/^([ACGT]{9})([acgt]+)([ACGT]{9})$/);
  if (!match) throw new Error(`Unsupported Chen target site: ${targetSite}`);
  return {
    left: triplets(reverseComplement(match[1])).reverse(),
    right: triplets(match[3]).reverse(),
  };
}

function pairPredictions(record, actualTwelveResidues) {
  const targets = targetTriplets(record.targetSite);
  const predict = actualTwelveResidues
    ? predictFingerPwmFromTwelveResidues
    : (residues, target) => predictFingerPwm(residues.slice(-7), target);
  return [
    ...record.leftCys2ToHis1.map((residues, index) =>
      predict(residues, targets.left[index]),
    ),
    ...record.rightCys2ToHis1.map((residues, index) =>
      predict(residues, targets.right[index]),
    ),
  ];
}

function scoreRecord(record) {
  if (!record.leftCys2ToHis1 || !record.rightCys2ToHis1) return null;
  const actual = pairPredictions(record, true);
  const standardizedFramework = pairPredictions(record, false);
  return {
    ...record,
    active: record.somaticIndelRatePercent > 0.27,
    actualTwelveResidueFit: meanDeepZfTargetFit(actual),
    standardizedFrameworkFit: meanDeepZfTargetFit(standardizedFramework),
    exactFingerTargets: actual.filter(({ targetRank }) => targetRank === 1).length,
    top3FingerTargets: actual.filter(({ targetRank }) => targetRank <= 3).length,
    minimumFingerFit: Math.min(
      ...actual.map(({ targetMeanProbability }) => targetMeanProbability),
    ),
    minimumMonomerFit: Math.min(
      meanDeepZfTargetFit(actual.slice(0, 3)),
      meanDeepZfTargetFit(actual.slice(3)),
    ),
  };
}

function ranks(values) {
  const indexed = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const result = Array(values.length);
  for (let start = 0; start < indexed.length; ) {
    let end = start + 1;
    while (end < indexed.length && indexed[end].value === indexed[start].value) {
      end += 1;
    }
    const rank = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) {
      result[indexed[index].index] = rank;
    }
    start = end;
  }
  return result;
}

function pearson(left, right) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquares += leftDelta * leftDelta;
    rightSquares += rightDelta * rightDelta;
  }
  return numerator / Math.sqrt(leftSquares * rightSquares);
}

function spearman(rows, field) {
  return pearson(
    ranks(rows.map((row) => row[field])),
    ranks(rows.map((row) => row.somaticIndelRatePercent)),
  );
}

function auc(rows, field) {
  const positives = rows.filter(({ active }) => active);
  const negatives = rows.filter(({ active }) => !active);
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive[field] > negative[field]) credit += 1;
      else if (positive[field] === negative[field]) credit += 0.5;
    }
  }
  return credit / (positives.length * negatives.length);
}

function summarize(rows, field) {
  return {
    spearman: spearman(rows, field),
    auc: auc(rows, field),
  };
}

export function runChenBenchmark() {
  const scored = chenData.records.map(scoreRecord).filter(Boolean);
  const unscorable = chenData.records
    .filter((record) => !record.leftCys2ToHis1 || !record.rightCys2ToHis1)
    .map(({ sourceRow, gene, somaticIndelRatePercent }) => ({
      sourceRow,
      gene,
      somaticIndelRatePercent,
      reason: "Supplementary Table S1 gives Addgene IDs instead of coding sequence",
    }));

  return {
    source: chenData.source,
    fullCohort: {
      n: chenData.records.length,
      active: chenData.records.filter(
        ({ somaticIndelRatePercent }) => somaticIndelRatePercent > 0.27,
      ).length,
    },
    sequenceScorable: {
      n: scored.length,
      genes: new Set(scored.map(({ gene }) => gene)).size,
      active: scored.filter(({ active }) => active).length,
      actualTwelveResidueFit: summarize(scored, "actualTwelveResidueFit"),
      standardizedFrameworkFit: summarize(scored, "standardizedFrameworkFit"),
      minimumFingerFit: summarize(scored, "minimumFingerFit"),
      minimumMonomerFit: summarize(scored, "minimumMonomerFit"),
      exactFingerTargets: summarize(scored, "exactFingerTargets"),
      top3FingerTargets: summarize(scored, "top3FingerTargets"),
    },
    unscorable,
    conclusion: {
      useDeepZfForActivityRanking: false,
      reason:
        "Actual-sequence DeepZF fit is near random for Chen 2013 CoDA ZFN activity; retain it only as an unranked recognition diagnostic.",
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runChenBenchmark(), null, 2));
}
