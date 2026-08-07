import type { Candidate } from "./design-engine.ts";

export type PortfolioChoice = {
  candidate: Candidate;
  sourceRank: number;
  diversityScore: number;
  minimumCutSeparation: number | null;
  maximumModuleOverlap: number | null;
};

function hammingIdentity(left: string, right: string): number {
  if (left.length !== right.length || !left.length) return 0;
  let matches = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) matches += 1;
  }
  return matches / left.length;
}

function multisetOverlap(left: string[], right: string[]): number {
  const remaining = new Map<string, number>();
  for (const value of right) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  let shared = 0;
  for (const value of left) {
    const count = remaining.get(value) ?? 0;
    if (!count) continue;
    shared += 1;
    remaining.set(value, count - 1);
  }
  return shared / Math.max(1, Math.min(left.length, right.length));
}

export function candidateModuleOverlap(left: Candidate, right: Candidate): number {
  const leftHelices = [...left.leftFingers, ...left.rightFingers].map(({ helix }) => helix);
  const rightHelices = [...right.leftFingers, ...right.rightFingers].map(({ helix }) => helix);
  return multisetOverlap(leftHelices, rightHelices);
}

export function candidateDiversity(left: Candidate, right: Candidate): number {
  const cutIndependence = Math.min(1, Math.abs(left.cut - right.cut) / 12);
  const moduleIndependence = 1 - candidateModuleOverlap(left, right);
  const sequenceIdentity = (
    hammingIdentity(left.leftRecognition, right.leftRecognition) +
    hammingIdentity(left.rightRecognition, right.rightRecognition)
  ) / 2;
  const sequenceIndependence = 1 - sequenceIdentity;
  return 0.45 * cutIndependence + 0.35 * moduleIndependence + 0.2 * sequenceIndependence;
}

function portfolioPool(rankedCandidates: Candidate[], size: number): Candidate[] {
  const passing = rankedCandidates.filter(({ passesBScoreCutoff }) => passesBScoreCutoff);
  const noTso = passing.filter(({ tsoIssues }) => tsoIssues === 0);
  const preferred = noTso.length >= size ? noTso : passing.length >= size ? passing : rankedCandidates;
  return preferred.slice(0, Math.max(12, size));
}

export function selectDiversePortfolio(
  rankedCandidates: Candidate[],
  size = 3,
): PortfolioChoice[] {
  if (size <= 0 || !rankedCandidates.length) return [];
  const sourceRank = new Map(rankedCandidates.map((candidate, index) => [candidate.id, index + 1]));
  const pool = portfolioPool(rankedCandidates, size);
  const selected: Candidate[] = [pool[0]];

  while (selected.length < Math.min(size, pool.length)) {
    const remaining = pool.filter((candidate) => !selected.some(({ id }) => id === candidate.id));
    const denominator = Math.max(1, pool.length - 1);
    remaining.sort((left, right) => {
      const leftRankQuality = 1 - ((sourceRank.get(left.id) ?? pool.length) - 1) / denominator;
      const rightRankQuality = 1 - ((sourceRank.get(right.id) ?? pool.length) - 1) / denominator;
      const leftMinimumDiversity = Math.min(...selected.map((value) => candidateDiversity(left, value)));
      const rightMinimumDiversity = Math.min(...selected.map((value) => candidateDiversity(right, value)));
      const leftScore = 0.45 * leftRankQuality + 0.55 * leftMinimumDiversity;
      const rightScore = 0.45 * rightRankQuality + 0.55 * rightMinimumDiversity;
      return rightScore - leftScore || (sourceRank.get(left.id) ?? 0) - (sourceRank.get(right.id) ?? 0);
    });
    selected.push(remaining[0]);
  }

  return selected.map((candidate, index) => {
    const peers = selected.slice(0, index);
    return {
      candidate,
      sourceRank: sourceRank.get(candidate.id) ?? 0,
      diversityScore: peers.length
        ? Math.min(...peers.map((peer) => candidateDiversity(candidate, peer)))
        : 1,
      minimumCutSeparation: peers.length
        ? Math.min(...peers.map((peer) => Math.abs(candidate.cut - peer.cut)))
        : null,
      maximumModuleOverlap: peers.length
        ? Math.max(...peers.map((peer) => candidateModuleOverlap(candidate, peer)))
        : null,
    };
  });
}
