import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  reverseComplementDna,
  scorePhysicalPair,
} from "../src/off-target-engine.ts";

const inputUrl = new URL("../data/paschon-2019-trac-specificity.json", import.meta.url);
const outputUrl = new URL("../data/paschon-2019-trac-sequence-scores.json", import.meta.url);
const dataset = JSON.parse(fs.readFileSync(inputUrl, "utf8"));
const WINDOW_BEFORE = 80;
const WINDOW_AFTER = 100;

function halfDefinition(physicalTarget, geometry) {
  return {
    physicalTarget,
    strand: geometry.strand,
    skippedBaseOffsets: geometry.skippedBaseOffsetsPhysical,
    fokIEnd: geometry.fokIEnd,
  };
}

async function fetchSequence(chromosome, start, end) {
  const url = `https://api.genome.ucsc.edu/getData/sequence?genome=hg38;chrom=${chromosome};start=${start};end=${end}`;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (typeof payload.dna !== "string") throw new Error("UCSC response did not contain DNA");
      return { sequence: payload.dna.toUpperCase(), url };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

function bestWindowMatch(site, sequence, windowStart, windowEnd) {
  const leftDefinition = halfDefinition(site.target.left, site.target.geometry.left);
  const rightDefinition = halfDefinition(site.target.right, site.target.geometry.right);
  const leftLength = site.target.left.length;
  const rightLength = site.target.right.length;
  let best = null;

  for (const orientation of ["forward", "reverse"]) {
    const scanSequence = orientation === "forward" ? sequence : reverseComplementDna(sequence);
    for (const spacerLength of [5, 6, 7]) {
      const footprintLength = leftLength + spacerLength + rightLength;
      for (let offset = 0; offset + footprintLength <= scanSequence.length; offset += 1) {
        const leftPhysical = scanSequence.slice(offset, offset + leftLength);
        const spacer = scanSequence.slice(offset + leftLength, offset + leftLength + spacerLength);
        const rightPhysical = scanSequence.slice(
          offset + leftLength + spacerLength,
          offset + footprintLength,
        );
        const score = scorePhysicalPair(
          leftDefinition,
          leftPhysical,
          rightDefinition,
          rightPhysical,
        );
        const start0Based = orientation === "forward"
          ? windowStart + offset
          : windowEnd - offset - footprintLength;
        const distanceFromReported = Math.abs(
          start0Based + leftLength + spacerLength / 2 - site.currentRowLocation,
        );
        const candidate = {
          orientation,
          start0Based,
          spacerLength,
          spacer,
          leftPhysical,
          rightPhysical,
          ...score,
          distanceFromReported,
        };
        if (
          !best ||
          candidate.score > best.score ||
          (candidate.score === best.score && candidate.distanceFromReported < best.distanceFromReported)
        ) {
          best = candidate;
        }
      }
    }
  }
  return best;
}

async function buildRow(site, row) {
  const windowStart = Math.max(0, row.reportedLocation - WINDOW_BEFORE);
  const windowEnd = row.reportedLocation + WINDOW_AFTER;
  const fetched = await fetchSequence(row.chromosome, windowStart, windowEnd);
  const match = bestWindowMatch(
    { ...site, currentRowLocation: row.reportedLocation },
    fetched.sequence,
    windowStart,
    windowEnd,
  );
  return {
    uid: row.uid,
    locus: row.locus,
    chromosome: row.chromosome,
    reportedLocation: row.reportedLocation,
    isOnTarget: row.isOnTarget,
    significantActiveEnrichment: row.significantActiveEnrichment,
    activeIndelPercent: row.activeIndelPercent,
    sequenceSourceUrl: fetched.url,
    match,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export async function buildPaschonSequenceScores() {
  const sites = [];
  for (const site of dataset.sites) {
    const rows = await mapWithConcurrency(site.rows, 6, (row) => buildRow(site, row));
    sites.push({
      site: site.site,
      target: site.target,
      rows,
    });
  }
  return {
    source: {
      citation: dataset.source.citation,
      doi: dataset.source.doi,
      genomeAssembly: "hg38",
      sequenceApi: "https://api.genome.ucsc.edu/getData/sequence",
      retrievalWindow: {
        beforeReportedLocation: WINDOW_BEFORE,
        afterReportedLocation: WINDOW_AFTER,
      },
      scoring: "Maximum masked PROGNOS v2.0 score over both orientations and spacer lengths 5-7 bp; skipped bases are excluded and N-terminal FokI reverses the polarity weights.",
    },
    sites,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await buildPaschonSequenceScores();
  fs.writeFileSync(outputUrl, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Wrote ${fileURLToPath(outputUrl)}`);
}
