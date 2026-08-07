import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { runBhaktaBenchmark } from "./benchmark-bhakta-2013.mjs";

const BASES = ["A", "C", "G", "T"];

function parsePwm(text) {
  const result = new Map();
  const blocks = text.split(/^>/m).slice(1);
  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    const id = lines[0].trim().split(/\s+/)[0];
    const rows = lines.slice(1, 5).map((line) =>
      line.trim().split(/\s+/).map(Number),
    );
    if (rows.length !== 4 || rows.some((row) => row.length !== rows[0].length)) {
      throw new Error(`Malformed PWM block: ${id}`);
    }
    result.set(id, rows);
  }
  return result;
}

function alignedTargetFit(rows, target) {
  if (target.length > rows[0].length) return 0;
  // The final PWM column is the terminal 3′ context beyond the 3n half-site.
  let logProbability = 0;
  for (let index = 0; index < target.length; index += 1) {
    const baseIndex = BASES.indexOf(target[index]);
    logProbability += Math.log(Math.max(rows[baseIndex][index], 1e-9));
  }
  return Math.exp(logProbability / target.length);
}

function auc(rows, compare) {
  const positives = rows.filter((row) => row.active);
  const negatives = rows.filter((row) => !row.active);
  let credit = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      const difference = compare(positive, negative);
      credit += difference > 0 ? 1 : difference === 0 ? 0.5 : 0;
    }
  }
  return credit / (positives.length * negatives.length);
}

function scoreRows(rows, pwms, cohort) {
  return rows.map((row, index) => {
    const leftFit = alignedTargetFit(pwms.get(`${cohort}-${index}-L`), row.leftRecognition);
    const rightFit = alignedTargetFit(pwms.get(`${cohort}-${index}-R`), row.rightRecognition);
    return {
      ...row,
      persikovTargetFit: Math.sqrt(leftFit * rightFit),
    };
  });
}

function summarize(rows) {
  const byField = (field) => (left, right) => left[field] - right[field];
  const bThenPersikov = (left, right) =>
    left.combinedBScore - right.combinedBScore ||
    left.persikovTargetFit - right.persikovTargetFit;
  return {
    n: rows.length,
    active: rows.filter((row) => row.active).length,
    bScoreAuc: auc(rows, byField("combinedBScore")),
    persikovAuc: auc(rows, byField("persikovTargetFit")),
    bScoreThenPersikovAuc: auc(rows, bThenPersikov),
  };
}

function main() {
  const executable = process.argv[2];
  if (!executable) {
    throw new Error("Usage: node scripts/benchmark-persikov-2014.mjs /path/to/pwm_predict");
  }

  const bhakta = runBhaktaBenchmark();
  const cohorts = {
    exactL6R6: [
      ...bhakta.rows.exploratoryL6R6,
      ...bhakta.rows.prospective,
    ],
    figureReconstructed92: bhakta.rows.figureReconstructed,
  };
  const fasta = Object.entries(cohorts).flatMap(([cohort, rows]) =>
    rows.flatMap((row, index) => [
      `>${cohort}-${index}-L\n${row.leftArrayProtein}`,
      `>${cohort}-${index}-R\n${row.rightArrayProtein}`,
    ]),
  ).join("\n");

  const work = mkdtempSync(join(tmpdir(), "zfn-persikov-"));
  const input = join(work, "bhakta.fa");
  writeFileSync(input, `${fasta}\n`);
  execFileSync(executable, [input], {
    cwd: dirname(executable),
    stdio: ["ignore", "ignore", "inherit"],
  });
  const pwms = parsePwm(readFileSync(join(work, "bhakta.pwm"), "utf8"));

  const scored = Object.fromEntries(
    Object.entries(cohorts).map(([cohort, rows]) => [
      cohort,
      scoreRows(rows, pwms, cohort),
    ]),
  );
  console.log(JSON.stringify({
    source: {
      citation: "Persikov and Singh (2014)",
      doi: "10.1093/nar/gkt890",
      model: "official expanded linear SVM standalone predictor",
    },
    exactL6R6: {
      exploratory: summarize(scored.exactL6R6.filter((row) => row.cohort === "exploratory-l6r6")),
      prospective: summarize(scored.exactL6R6.filter((row) => row.cohort === "prospective-l6r6")),
      combined: summarize(scored.exactL6R6),
    },
    figureReconstructed92: summarize(scored.figureReconstructed92),
  }, null, 2));
}

main();
