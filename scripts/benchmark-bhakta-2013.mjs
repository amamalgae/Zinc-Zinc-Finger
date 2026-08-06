import { fileURLToPath } from "node:url";

import {
  complement,
  fingersForRecognitionStrand,
  reverseComplement,
} from "../src/design-engine.ts";
import { meanDeepZfTargetFit } from "../src/deepzf-pwm.ts";

const COMBINATIONS = [3, 4, 5, 6].flatMap((left) =>
  [3, 4, 5, 6].map((right) => ({ left, right })),
);

const ALL = COMBINATIONS.map((_, index) => index + 1);

// Reconstructed from Bhakta et al. 2013 Fig. 2 and its stated totals:
// 92 tested array-length variants, 41 with >=8% control SSA activity.
// Exact L6+R6 activities are independently printed in Table 1 / thesis Table 3.2.
const EXPLORATORY_TARGETS = [
  {
    name: "CS2-1",
    leftTop: "CACAGCTCGATCAGCCTA",
    spacer: "TATTTA",
    rightTop: "GATGTTTGGGGTGGAGAA",
    publishedL6R6BScore: 19,
    l6r6SsaPercent: 22,
    tested: ALL,
    active: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },
  {
    name: "CS3-1",
    leftTop: "GCCTATGTGTGTTTCTGC",
    spacer: "ACATG",
    rightTop: "GTGATGGGAGGTACTGGT",
    publishedL6R6BScore: 14,
    l6r6SsaPercent: 8,
    tested: [7, 8, 11, 12, 13, 14, 15, 16],
    active: [16],
  },
  {
    name: "CS5-1",
    leftTop: "TTGTGCCTCAGTTTCCTC",
    spacer: "ATTCAAT",
    rightTop: "ATGGGTGTAATAACTGTG",
    publishedL6R6BScore: 20,
    l6r6SsaPercent: 0.3,
    tested: [6, 16],
    active: [],
  },
  {
    name: "CS6-1",
    leftTop: "CATACTAACCATATGATC",
    spacer: "AACAGT",
    rightTop: "TGAAAAGCAGCCACTCGC",
    publishedL6R6BScore: 12,
    l6r6SsaPercent: 15,
    tested: [6, 16],
    active: [16],
  },
  {
    name: "CS6-2",
    leftTop: "AACTAGAGGTAGTCCTGG",
    spacer: "CTACTTG",
    rightTop: "GGAACAGCGTGGAGTCTA",
    publishedL6R6BScore: 11,
    l6r6SsaPercent: 6,
    tested: ALL,
    active: [],
  },
  {
    name: "CS7-1",
    leftTop: "TTCCATGTCTCATTCCGC",
    spacer: "TCATCTG",
    rightTop: "GAAAATGATGATCATACT",
    publishedL6R6BScore: 21,
    l6r6SsaPercent: 81,
    tested: ALL,
    active: [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16],
  },
  {
    name: "CS7-2",
    leftTop: "GGGTTTTCTCACTCCAAG",
    spacer: "GATAAG",
    rightTop: "AAGGTGGGGGTGATGGAG",
    publishedL6R6BScore: 19,
    l6r6SsaPercent: 9,
    tested: ALL,
    active: [14, 15, 16],
  },
  {
    name: "CS7-3",
    leftTop: "GTCTGGGTTTTCTCACTC",
    spacer: "CAAGGAT",
    rightTop: "AAGAAGGTGGGGGTGATC",
    publishedL6R6BScore: 21,
    l6r6SsaPercent: 27,
    tested: ALL,
    active: [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16],
  },
];

// The prospective study selected all sites at B >= 15 before testing. Success is
// the paper's composite experimental endpoint (>8% SSA or >0.5% genomic indels,
// including the stated Surveyor results).
const PROSPECTIVE_TARGETS = [
  ["HIV992", "TGCAGGGCCTATTGCACC", "AGGCCA", "GATGAGAGAACCAAGGGG", 17, true],
  ["HIV3693", "TGGCATGGGTACCAGCAC", "ACAAA", "GGAATTGGAGGAAATGAA", 16, false],
  ["HIV5499", "AGCCTTAGGCATCTCCTA", "TGGCAG", "GAAGAAGCGGAGACAGCG", 22, true],
  ["HIV7533", "AGGATCAACAGCTCCTGG", "GGATTT", "GGGGTTGCTCTGGAAAAC", 15, false],
  ["Dys5", "AATGGCTTCAACTATCTG", "AGTGAC", "ACTGTGAAGGAGATGGCC", 17, true],
  ["Neo2", "CGCAGGTTCTCCGGCCGC", "TTGGGT", "GGAGAGGCTATTCGGCTA", 18, true],
  ["Neo3", "CTTTTTGTCAAGACCGAC", "CTGTCC", "GGTGCCCTGAATGAACTG", 16, true],
  ["DZF17", "ATGATCATCAAGCAGAAG", "GTATGA", "GAAAAAATGATAAAAGTT", 16, false],
  ["DZF24", "CTTTACCACTTCCACAAT", "GTATATG", "ATTGTTACTGAGAAGGCT", 18, true],
  ["DZF34", "AGGTTCAAGAACAGCTGC", "AGAACAG", "GAGATAACAGTTGAATGA", 16, true],
  ["DZF35", "ATGAGGTTCAAGAACAGC", "TGCAGAA", "CAGGAGATAACAGTTGAA", 16, true],
].map(([name, leftTop, spacer, rightTop, publishedBScore, active]) => ({
  name,
  leftTop,
  spacer,
  rightTop,
  publishedBScore,
  active,
}));

const EXPLORATORY_L6R6_TARGETS = [
  ...EXPLORATORY_TARGETS.map((target) => ({
    ...target,
    publishedBScore: target.publishedL6R6BScore,
    active: ["CS2-1", "CS3-1", "CS6-1", "CS7-1", "CS7-2", "CS7-3"].includes(
      target.name,
    ),
  })),
  {
    name: "T2-X1",
    leftTop: "TCTACGCTTCGCCGCCGC",
    spacer: "GGCTAGC",
    rightTop: "TGGCAGGTTGTGCGCGGA",
    publishedBScore: 17,
    active: false,
  },
  {
    name: "T2-X6",
    leftTop: "AAGAGTCCATGCCAGACC",
    spacer: "CTGGGG",
    rightTop: "GGAAGGGCTCTGAAGGAG",
    publishedBScore: 15,
    active: true,
  },
];

function scoreArrayPair(target, leftLength, rightLength) {
  const leftStart = target.leftTop.length - leftLength * 3;
  const leftRecognition = reverseComplement(target.leftTop.slice(leftStart));
  const rightRecognition = target.rightTop.slice(0, rightLength * 3);
  const leftFingers = fingersForRecognitionStrand(
    leftRecognition,
    complement(target.leftTop[leftStart - 1]),
  );
  const rightFingers = fingersForRecognitionStrand(
    rightRecognition,
    target.rightTop[rightLength * 3],
  );
  if (!leftFingers || !rightFingers) {
    throw new Error(`${target.name} L${leftLength}+R${rightLength} cannot be assembled`);
  }
  const fingers = [...leftFingers, ...rightFingers];
  return {
    combinedBScore: fingers.reduce((sum, finger) => sum + finger.bScore, 0),
    deepZfTargetFit: meanDeepZfTargetFit(fingers.map((finger) => finger.deepZf)),
    tsoIssues: fingers.filter((finger) => !finger.tsoCompatible).length,
    unfavorableModules: fingers.filter(
      (finger) => finger.recommendation === "unfavorable",
    ).length,
    favorableModules: fingers.filter(
      (finger) => finger.recommendation === "favorable",
    ).length,
  };
}

function auc(rows, compare) {
  const positives = rows.filter((row) => row.active);
  const negatives = rows.filter((row) => !row.active);
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      const result = compare(positive, negative);
      credit += result > 0 ? 1 : result === 0 ? 0.5 : 0;
    }
  }
  return credit / (positives.length * negatives.length);
}

const byNumber = (field) => (left, right) => left[field] - right[field];

function byCurrentRanking(left, right) {
  return (
    left.combinedBScore - right.combinedBScore ||
    left.deepZfTargetFit - right.deepZfTargetFit ||
    right.tsoIssues - left.tsoIssues ||
    right.unfavorableModules - left.unfavorableModules ||
    left.favorableModules - right.favorableModules
  );
}

function thresholdMetrics(rows, cutoff = 15) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const row of rows) {
    const predicted = row.combinedBScore >= cutoff;
    if (predicted && row.active) tp += 1;
    else if (predicted) fp += 1;
    else if (row.active) fn += 1;
    else tn += 1;
  }
  return {
    cutoff,
    tp,
    fp,
    tn,
    fn,
    sensitivity: tp / (tp + fn),
    specificity: tn / (tn + fp),
    precision: tp / (tp + fp),
    accuracy: (tp + tn) / rows.length,
  };
}

function summary(rows) {
  return {
    n: rows.length,
    active: rows.filter((row) => row.active).length,
    bScoreAuc: auc(rows, byNumber("combinedBScore")),
    deepZfAuc: auc(rows, byNumber("deepZfTargetFit")),
    currentRankingAuc: auc(rows, byCurrentRanking),
    bScore15: thresholdMetrics(rows),
  };
}

export function runBhaktaBenchmark() {
  const figureReconstructed = EXPLORATORY_TARGETS.flatMap((target) =>
    target.tested.map((combinationIndex) => {
      const { left, right } = COMBINATIONS[combinationIndex - 1];
      return {
        cohort: "exploratory-ssa",
        target: target.name,
        leftLength: left,
        rightLength: right,
        active: target.active.includes(combinationIndex),
        ...scoreArrayPair(target, left, right),
      };
    }),
  );

  const prospective = PROSPECTIVE_TARGETS.map((target) => ({
    cohort: "prospective-l6r6",
    target: target.name,
    leftLength: 6,
    rightLength: 6,
    active: target.active,
    publishedBScore: target.publishedBScore,
    ...scoreArrayPair(target, 6, 6),
  }));

  const exploratoryL6R6 = EXPLORATORY_L6R6_TARGETS.map((target) => ({
    cohort: "exploratory-l6r6",
    target: target.name,
    leftLength: 6,
    rightLength: 6,
    active: target.active,
    publishedBScore: target.publishedBScore,
    ...scoreArrayPair(target, 6, 6),
  }));
  const allExactL6R6 = [...exploratoryL6R6, ...prospective];

  const fullScoreChecks = [
    ...EXPLORATORY_TARGETS.map((target) => ({
      target: target.name,
      published: target.publishedL6R6BScore,
      calculated: scoreArrayPair(target, 6, 6).combinedBScore,
    })),
    ...allExactL6R6.slice(8).map((row) => ({
      target: row.target,
      published: row.publishedBScore,
      calculated: row.combinedBScore,
    })),
  ];

  return {
    source: {
      citation: "Bhakta et al. (2013)",
      doi: "10.1101/gr.143693.112",
      note:
        "The 21 L6+R6 outcomes and full-array scores are tabulated values. The separate 92-variant analysis reconstructs binary labels from Fig. 2 and is lower-confidence.",
    },
    scoreReproduction: {
      exact: fullScoreChecks.filter((row) => row.published === row.calculated).length,
      total: fullScoreChecks.length,
      mismatches: fullScoreChecks.filter((row) => row.published !== row.calculated),
    },
    exactL6R6: {
      exploratory: summary(exploratoryL6R6),
      prospective: summary(prospective),
      combined: summary(allExactL6R6),
    },
    figureReconstructed92: summary(figureReconstructed),
    rows: { exploratoryL6R6, prospective, figureReconstructed },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runBhaktaBenchmark(), null, 2));
}
