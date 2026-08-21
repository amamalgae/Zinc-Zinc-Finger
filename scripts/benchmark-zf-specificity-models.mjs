#!/usr/bin/env node

/**
 * Research-only entry point for ZF-DNA specificity predictors evaluated against
 * the retained Bhakta 2013 exact L6+R6 activity cohort. Production v3 ranking
 * is intentionally unchanged until a predictor clears the documented evidence
 * threshold.
 */

import { runBhaktaBenchmark } from "./benchmark-bhakta-2013.mjs";

function rocAuc(rows, field) {
  const positives = rows.filter((row) => row.active);
  const negatives = rows.filter((row) => !row.active);
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      const delta = positive[field] - negative[field];
      credit += delta > 0 ? 1 : delta === 0 ? 0.5 : 0;
    }
  }
  return credit / (positives.length * negatives.length);
}

function averagePrecision(rows, field) {
  const sorted = [...rows].sort((a, b) => b[field] - a[field]);
  const positives = sorted.filter((row) => row.active).length;
  let tp = 0;
  let sumPrecision = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    if (!sorted[i].active) continue;
    tp += 1;
    sumPrecision += tp / (i + 1);
  }
  return sumPrecision / positives;
}

function summarize(rows, field) {
  return {
    n: rows.length,
    active: rows.filter((row) => row.active).length,
    rocAuc: rocAuc(rows, field),
    averagePrecision: averagePrecision(rows, field),
  };
}

const bhakta = runBhaktaBenchmark();
const rows = [...bhakta.rows.exploratoryL6R6, ...bhakta.rows.prospective].map((row) => ({
  ...row,
  bScore: row.combinedBScore,
}));

console.log(JSON.stringify({
  cohort: "Bhakta 2013 exact L6+R6 activity-labelled targets",
  citations: [
    { firstAuthor: "Bhakta", year: 2013, doi: "10.1101/gr.143693.112" },
    { firstAuthor: "Persikov", year: 2014, doi: "10.1093/nar/gkt890" },
    { firstAuthor: "Gupta", year: 2014, doi: "10.1093/nar/gku132" },
    { firstAuthor: "Persikov", year: 2015, doi: "10.1093/nar/gku1395" },
    { firstAuthor: "Aizenshtein-Gazit", year: 2022, doi: "10.1093/bioinformatics/btac469" },
    { firstAuthor: "Chen", year: 2013, doi: "10.1093/nar/gks1356" },
  ],
  baseline: { bScore: summarize(rows, "bScore") },
  historicalControls: [
    {
      id: "persikov-2014-el-svm",
      status: "already-benchmarked-not-promoted",
      exactL6R6Auc: 0.6666666667,
      bScoreAucSameCohort: 0.6555555556,
      note: "Only marginal gain on exact L6+R6; B-score->SVM tie-break AUC was 0.656. Retained as historical control, not a new candidate.",
    },
    {
      id: "deepzf-2022-pwmpredictor",
      status: "already-benchmarked-rejected-for-activity-ranking",
      exactL6R6Auc: 0.5222222222,
      independentChen82Auc: 0.491,
      independentChen82Spearman: 0.053,
      note: "Did not transfer from PWM prediction to ZFN activity ranking; retained only as negative control/history.",
    },
  ],
  activeResearchCandidates: [
    {
      id: "gupta-2014-zfmodels",
      status: "implemented-research-benchmark",
      note: "Reconstructed from the published 1209 one-finger and 678 two-finger supplementary B1H training set using R randomForest, 500 trees.",
    },
    {
      id: "persikov-2015-b1h-nn",
      status: "data-access-review-needed",
      note: "Exact nearest-neighbour landscape remains research-only until the authors' B1H data can be used without fabricating downloader identity and with acceptable redistribution/use terms.",
    },
  ],
  graduationRule: {
    primary: "predeclared score must improve discrimination over B-score with uncertainty reported; post-hoc best-of-many scores cannot graduate on n=21 alone",
    safeguards: [
      "no production-ranker changes from research scripts",
      "do not fit activity labels to tune a score and evaluate on the same 21 targets",
      "check exploratory and prospective cohorts separately",
      "validate any reconstructed binding model against its source paper before production use",
    ],
  },
}, null, 2));
