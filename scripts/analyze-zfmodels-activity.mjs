#!/usr/bin/env node

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) throw new Error("Usage: node scripts/analyze-zfmodels-activity.mjs <zfmodels-output.json>");
const input = JSON.parse(readFileSync(path, "utf8"));
const rows = input.rows;

const SCORE_SPECS = [
  { id: "hybrid_mean", status: "predeclared-primary" },
  { id: "one_mean", status: "secondary" },
  { id: "two_mean", status: "secondary" },
  { id: "hybrid_weakest", status: "post-hoc-exploratory" },
  { id: "two_weakest", status: "post-hoc-exploratory" },
  { id: "one_weakest", status: "post-hoc-exploratory" },
];

function rocAuc(items, field) {
  const positives = items.filter((row) => row.active);
  const negatives = items.filter((row) => !row.active);
  if (!positives.length || !negatives.length) return Number.NaN;
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      const delta = Number(positive[field]) - Number(negative[field]);
      credit += delta > 0 ? 1 : delta === 0 ? 0.5 : 0;
    }
  }
  return credit / (positives.length * negatives.length);
}

function averagePrecision(items, field) {
  const sorted = [...items].sort((a, b) => Number(b[field]) - Number(a[field]));
  const positives = sorted.filter((row) => row.active).length;
  if (!positives) return Number.NaN;
  let tp = 0;
  let sum = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    if (!sorted[index].active) continue;
    tp += 1;
    sum += tp / (index + 1);
  }
  return sum / positives;
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return Number.NaN;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function stratifiedBootstrap(items, scoreField, iterations = 20000, seed = 20260821) {
  const positives = items.filter((row) => row.active);
  const negatives = items.filter((row) => !row.active);
  if (!positives.length || !negatives.length) return null;
  const random = mulberry32(seed);
  const scoreAucs = [];
  const baselineAucs = [];
  const deltas = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample = [];
    for (let i = 0; i < positives.length; i += 1) {
      sample.push(positives[Math.floor(random() * positives.length)]);
    }
    for (let i = 0; i < negatives.length; i += 1) {
      sample.push(negatives[Math.floor(random() * negatives.length)]);
    }
    const scoreAuc = rocAuc(sample, scoreField);
    const baselineAuc = rocAuc(sample, "combinedBScore");
    scoreAucs.push(scoreAuc);
    baselineAucs.push(baselineAuc);
    deltas.push(scoreAuc - baselineAuc);
  }
  scoreAucs.sort((a, b) => a - b);
  baselineAucs.sort((a, b) => a - b);
  deltas.sort((a, b) => a - b);
  return {
    iterations,
    scoreAuc95: [percentile(scoreAucs, 0.025), percentile(scoreAucs, 0.975)],
    baselineAuc95: [percentile(baselineAucs, 0.025), percentile(baselineAucs, 0.975)],
    deltaAuc95: [percentile(deltas, 0.025), percentile(deltas, 0.975)],
    pBootstrapDeltaLe0: deltas.filter((value) => value <= 0).length / deltas.length,
  };
}

function summarizeSubset(name, subset) {
  const result = {
    name,
    n: subset.length,
    active: subset.filter((row) => row.active).length,
    baseline: {
      auc: rocAuc(subset, "combinedBScore"),
      averagePrecision: averagePrecision(subset, "combinedBScore"),
    },
    scores: {},
  };
  for (const spec of SCORE_SPECS) {
    const auc = rocAuc(subset, spec.id);
    result.scores[spec.id] = {
      status: spec.status,
      auc,
      deltaAucVsBScore: auc - result.baseline.auc,
      averagePrecision: averagePrecision(subset, spec.id),
      bootstrap: subset.length >= 10 ? stratifiedBootstrap(subset, spec.id) : null,
    };
  }
  return result;
}

const subsets = [
  summarizeSubset("full-21", rows),
  summarizeSubset("v3-eligible-B>=15", rows.filter((row) => Number(row.combinedBScore) >= 15)),
  summarizeSubset("exploratory-L6R6", rows.filter((row) => row.cohort === "exploratory-l6r6")),
  summarizeSubset("prospective-L6R6", rows.filter((row) => row.cohort === "prospective-l6r6")),
];

console.log(JSON.stringify({
  source: input.source,
  cohort: input.cohort,
  interpretationGuardrail: "hybrid_mean was predeclared before activity-label results were inspected; weakest scores are post-hoc exploratory and must not be promoted on this cohort alone.",
  subsets,
}, null, 2));
