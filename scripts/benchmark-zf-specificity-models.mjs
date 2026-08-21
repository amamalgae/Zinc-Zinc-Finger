#!/usr/bin/env node

/**
 * Compare orthogonal zinc-finger DNA-specificity scores against the retained
 * Bhakta 2013 exact L6+R6 activity cohort before changing the public v3 ranker.
 *
 * Design rule: this script is intentionally isolated from production ranking.
 * A model should only graduate into v3 after it improves held-out discrimination
 * over B-score on the same activity-labelled cohort and remains biologically
 * interpretable for engineered Sp1C-style 6F arrays.
 *
 * External predictors are represented by adapters that return one scalar
 * cognate-target-fit per ZFN pair. The first adapter implemented in-repo is
 * Persikov & Singh 2014 (official expanded linear SVM); later adapters can add
 * Persikov et al. 2015 B1H nearest-neighbour, Gupta et al. 2014 ZFModels, and
 * DeepZF 2022 without touching production code.
 */

import { runBhaktaBenchmark } from "./benchmark-bhakta-2013.mjs";

function rocAuc(rows, field) {
  const positives = rows.filter((row) => row.active);
  const negatives = rows.filter((row) => !row.active);
  if (!positives.length || !negatives.length) return Number.NaN;
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
  if (!positives) return Number.NaN;
  let tp = 0;
  let sumPrecision = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    if (!sorted[i].active) continue;
    tp += 1;
    sumPrecision += tp / (i + 1);
  }
  return sumPrecision / positives;
}

function topKHit(rows, field, k) {
  return [...rows]
    .sort((a, b) => b[field] - a[field])
    .slice(0, k)
    .some((row) => row.active);
}

function summarize(rows, field) {
  return {
    n: rows.length,
    active: rows.filter((row) => row.active).length,
    rocAuc: rocAuc(rows, field),
    averagePrecision: averagePrecision(rows, field),
    top1Active: topKHit(rows, field, 1),
    top2ContainsActive: topKHit(rows, field, 2),
    top3ContainsActive: topKHit(rows, field, 3),
  };
}

function exactL6R6Rows() {
  const bhakta = runBhaktaBenchmark();
  return [
    ...bhakta.rows.exploratoryL6R6,
    ...bhakta.rows.prospective,
  ].map((row) => ({
    ...row,
    bScore: row.combinedBScore,
  }));
}

const rows = exactL6R6Rows();
const output = {
  cohort: "Bhakta 2013 exact L6+R6 activity-labelled targets",
  citations: [
    { firstAuthor: "Bhakta", year: 2013, doi: "10.1101/gr.143693.112" },
    { firstAuthor: "Persikov", year: 2014, doi: "10.1093/nar/gkt890" },
    { firstAuthor: "Gupta", year: 2014, doi: "10.1093/nar/gku132" },
    { firstAuthor: "Persikov", year: 2015, doi: "10.1093/nar/gku1395" },
    { firstAuthor: "Aizenshtein-Gazit", year: 2022, doi: "10.1093/bioinformatics/btac469" },
  ],
  baseline: {
    bScore: summarize(rows, "bScore"),
  },
  plannedAdapters: [
    {
      id: "persikov-2014-el-svm",
      status: "existing-offline-adapter",
      note: "Use official expanded linear SVM predictor; benchmark script already exists separately.",
    },
    {
      id: "persikov-2015-b1h-nn",
      status: "next",
      note: "Reproduce the published nearest-neighbour decomposition from the downloadable B1H landscape; score each engineered helix against its cognate triplet.",
    },
    {
      id: "gupta-2014-zfmodels",
      status: "blocked-on-reproducible-model-artifact",
      note: "Do not scrape the historical web server. Add only if the underlying RF/model artifact or a fully specified reproducible implementation is obtained.",
    },
    {
      id: "deepzf-2022-pwmpredictor",
      status: "external-validation-only",
      note: "Run the published pretrained PWMpredictor as a research comparator; do not ship TensorFlow/model weights into the browser app without separate licensing and domain-shift review.",
    },
  ],
  graduationRule: {
    primary: "held-out discrimination must exceed B-score baseline",
    metrics: ["ROC-AUC", "average precision", "top-k active recovery"],
    safeguards: [
      "no production-ranker changes from this benchmark script",
      "prefer leave-one-target-out or nested evaluation for any learned combiner",
      "report uncertainty because n=21 is small",
      "reject a predictor that only improves in-sample after fitting a new weight on these 21 labels",
    ],
  },
};

console.log(JSON.stringify(output, null, 2));
