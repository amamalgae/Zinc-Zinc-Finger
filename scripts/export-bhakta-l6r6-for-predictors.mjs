#!/usr/bin/env node

import { runBhaktaBenchmark } from "./benchmark-bhakta-2013.mjs";
import { fingersForRecognitionStrand } from "../src/design-engine.ts";

function helicesForRecognition(recognition) {
  const fingers = fingersForRecognitionStrand(recognition);
  if (!fingers) throw new Error(`Cannot reconstruct Bhakta array for ${recognition}`);
  return fingers.map((finger) => finger.helix);
}

const bhakta = runBhaktaBenchmark();
const rows = [
  ...bhakta.rows.exploratoryL6R6,
  ...bhakta.rows.prospective,
].map((row) => ({
  cohort: row.cohort,
  target: row.target,
  active: row.active,
  combinedBScore: row.combinedBScore,
  leftRecognition: row.leftRecognition,
  rightRecognition: row.rightRecognition,
  leftHelicesNtoC: helicesForRecognition(row.leftRecognition),
  rightHelicesNtoC: helicesForRecognition(row.rightRecognition),
}));

console.log(JSON.stringify({
  source: {
    firstAuthor: "Bhakta",
    year: 2013,
    doi: "10.1101/gr.143693.112",
  },
  rows,
}, null, 2));
