import assert from "node:assert/strict";
import test from "node:test";

import {
  ExactGenomeMatchAccumulator,
  reverseComplementGenomeSequence,
} from "../src/genome-exact-match.ts";

const CANDIDATE = {
  id: "bhakta-property",
  leftTop: "ACGTTGCAAGTCGATCGA",
  rightTop: "TGCACCTAGGATTCGACT",
  spacerLength: 6,
};
const SPACERS = [5, 6, 7];
const SUBSTITUTE = { A: "C", C: "G", G: "T", T: "A" };

function mutate(sequence, positions) {
  return [...sequence].map((base, index) => positions.includes(index) ? SUBSTITUTE[base] : base).join("");
}

function hamming(a, b) {
  let count = 0;
  for (let index = 0; index < a.length; index += 1) count += Number(a[index] !== b[index]);
  return count;
}

function better(left, right) {
  return (
    left.totalMismatches < right.totalMismatches ||
    (left.totalMismatches === right.totalMismatches
      && Math.max(left.leftMismatches, left.rightMismatches) < Math.max(right.leftMismatches, right.rightMismatches)) ||
    (left.totalMismatches === right.totalMismatches
      && Math.max(left.leftMismatches, left.rightMismatches) === Math.max(right.leftMismatches, right.rightMismatches)
      && left.leftMismatches < right.leftMismatches)
  );
}

function bruteForce(contigs) {
  const forward = { first: CANDIDATE.leftTop, second: CANDIDATE.rightTop, reverse: false };
  const reverse = {
    first: reverseComplementGenomeSequence(CANDIDATE.rightTop),
    second: reverseComplementGenomeSequence(CANDIDATE.leftTop),
    reverse: true,
  };
  const physicalHits = new Map();

  contigs.forEach((sequence, contigIndex) => {
    for (const spacerLength of SPACERS) {
      const footprint = 36 + spacerLength;
      for (let start = 0; start + footprint <= sequence.length; start += 1) {
        for (const orientation of [forward, reverse]) {
          const firstObserved = sequence.slice(start, start + 18);
          const secondObserved = sequence.slice(start + 18 + spacerLength, start + 36 + spacerLength);
          if (/[^ACGT]/.test(firstObserved + secondObserved)) continue;
          const first = hamming(firstObserved, orientation.first);
          const second = hamming(secondObserved, orientation.second);
          if (Math.min(first, second) > 3) continue;
          const hit = orientation.reverse
            ? { leftMismatches: second, rightMismatches: first, totalMismatches: first + second, spacerLength }
            : { leftMismatches: first, rightMismatches: second, totalMismatches: first + second, spacerLength };
          const key = `${contigIndex}:${start}:${spacerLength}`;
          const previous = physicalHits.get(key);
          if (!previous || better(hit, previous)) physicalHits.set(key, hit);
        }
      }
    }
  });

  const hits = [...physicalHits.values()];
  const counts = [0, 0, 0, 0, 0, 0];
  const exactBySpacer = new Map(SPACERS.map((spacer) => [spacer, 0]));
  let closestNonExact = null;
  for (const hit of hits) {
    counts[Math.min(hit.totalMismatches, 5)] += 1;
    if (hit.totalMismatches === 0) {
      exactBySpacer.set(hit.spacerLength, exactBySpacer.get(hit.spacerLength) + 1);
    } else if (!closestNonExact || better(hit, closestNonExact)) {
      closestNonExact = hit;
    }
  }

  const exactPairMatches = exactBySpacer.get(CANDIDATE.spacerLength);
  if (exactPairMatches > 0) counts[0] = Math.max(0, counts[0] - 1);
  const extraExactMatches = counts[0];
  let closestAlternative = closestNonExact;
  if (extraExactMatches > 0) {
    closestAlternative = null;
    for (const spacerLength of SPACERS) {
      const remaining = exactBySpacer.get(spacerLength)
        - (spacerLength === CANDIDATE.spacerLength && exactPairMatches > 0 ? 1 : 0);
      if (remaining > 0) {
        closestAlternative = { leftMismatches: 0, rightMismatches: 0, totalMismatches: 0, spacerLength };
        break;
      }
    }
  }
  return { exactPairMatches, extraExactMatches, alternativeCountsByMismatch: counts, closestAlternative };
}

function pair(left, spacerLength, right) {
  return `${left}${"A".repeat(spacerLength)}${right}`;
}

test("optimized Bhakta seed matcher equals exhaustive paired-site enumeration", () => {
  const contigs = [
    pair(CANDIDATE.leftTop, 6, CANDIDATE.rightTop),
    pair(CANDIDATE.leftTop, 5, mutate(CANDIDATE.rightTop, [0, 2, 4, 6, 8, 10, 12, 14, 16])),
    pair(mutate(CANDIDATE.leftTop, [0, 5, 10]), 7, mutate(CANDIDATE.rightTop, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])),
    pair(mutate(CANDIDATE.leftTop, [0, 1, 2, 3]), 6, CANDIDATE.rightTop),
    pair(mutate(CANDIDATE.leftTop, [0, 1, 9, 10]), 6, mutate(CANDIDATE.rightTop, [0, 1, 9, 10])),
    reverseComplementGenomeSequence(
      pair(mutate(CANDIDATE.leftTop, [1, 11]), 5, mutate(CANDIDATE.rightTop, [0, 2, 4, 6, 8, 10, 12])),
    ),
  ];

  const matcher = new ExactGenomeMatchAccumulator([CANDIDATE]);
  for (const contig of contigs) matcher.addSequence(contig);
  const observed = matcher.result(1).summaries[0];
  const expected = bruteForce(contigs);

  assert.deepEqual(
    {
      exactPairMatches: observed.exactPairMatches,
      extraExactMatches: observed.extraExactMatches,
      alternativeCountsByMismatch: observed.alternativeCountsByMismatch,
      closestAlternative: observed.closestAlternative,
    },
    expected,
  );
});
