import type { ExactGenomeCandidateSummary } from "./genome-exact-match.ts";
import { compareZfnCandidates, type ZfnCandidate } from "./zfn-design-engine.ts";

const SPACER_PRIORITY: Readonly<Record<number, number>> = { 6: 0, 5: 1, 7: 2 };

export type GenomeSummaryMap = ReadonlyMap<string, ExactGenomeCandidateSummary>;

function guptaArmCount(candidate: ZfnCandidate): number {
  return Number(candidate.leftArray.method === "gupta-2012") + Number(candidate.rightArray.method === "gupta-2012");
}

function countAt(summary: ExactGenomeCandidateSummary, mismatch: number): number {
  return summary.alternativeCountsByMismatch[mismatch] ?? 0;
}

function compareExactDuplicates(left: ExactGenomeCandidateSummary, right: ExactGenomeCandidateSummary): number {
  const leftHas = Number(left.extraExactMatches > 0);
  const rightHas = Number(right.extraExactMatches > 0);
  return leftHas - rightHas || left.extraExactMatches - right.extraExactMatches;
}

function compareMismatchBand(
  left: ExactGenomeCandidateSummary,
  right: ExactGenomeCandidateSummary,
  mismatches: readonly number[],
): number {
  const noHitRank = Math.max(...mismatches) + 1;
  const leftClosest = mismatches.find((mismatch) => countAt(left, mismatch) > 0) ?? noHitRank;
  const rightClosest = mismatches.find((mismatch) => countAt(right, mismatch) > 0) ?? noHitRank;
  if (leftClosest !== rightClosest) return rightClosest - leftClosest;
  if (leftClosest === noHitRank) return 0;

  const atClosest = countAt(left, leftClosest) - countAt(right, rightClosest);
  if (atClosest) return atClosest;
  const leftTotal = mismatches.reduce((sum, mismatch) => sum + countAt(left, mismatch), 0);
  const rightTotal = mismatches.reduce((sum, mismatch) => sum + countAt(right, mismatch), 0);
  return leftTotal - rightTotal;
}

function compareBhaktaFunctionalCore(left: ZfnCandidate, right: ZfnCandidate): number {
  return (
    (right.combinedBScore ?? 0) - (left.combinedBScore ?? 0) ||
    (left.tsoIssues ?? 0) - (right.tsoIssues ?? 0) ||
    (left.unfavorableModules ?? 0) - (right.unfavorableModules ?? 0) ||
    (right.favorableModules ?? 0) - (left.favorableModules ?? 0)
  );
}

function compareSpacer(left: ZfnCandidate, right: ZfnCandidate): number {
  return (
    (SPACER_PRIORITY[left.spacerLength] ?? Number.MAX_SAFE_INTEGER) -
    (SPACER_PRIORITY[right.spacerLength] ?? Number.MAX_SAFE_INTEGER)
  );
}

export function genomeAwareRankingAvailable(
  candidates: readonly ZfnCandidate[],
  summaries: GenomeSummaryMap,
): boolean {
  return candidates.length > 0 && candidates.every(({ id }) => (summaries.get(id)?.exactPairMatches ?? 0) > 0);
}

export function compareGenomeAwareZfnCandidates(
  left: ZfnCandidate,
  right: ZfnCandidate,
  summaries: GenomeSummaryMap,
): number {
  const leftSummary = summaries.get(left.id);
  const rightSummary = summaries.get(right.id);
  if (!leftSummary || !rightSummary || leftSummary.exactPairMatches < 1 || rightSummary.exactPairMatches < 1) {
    return compareZfnCandidates(left, right);
  }

  const exactDuplicateOrder = compareExactDuplicates(leftSummary, rightSummary);
  if (exactDuplicateOrder) return exactDuplicateOrder;

  const severeSimilarityOrder = () => compareMismatchBand(leftSummary, rightSummary, [1, 2]);
  const moderateSimilarityOrder = () => compareMismatchBand(leftSummary, rightSummary, [3, 4]);

  if (left.profile === "bhakta-2013" && right.profile === "bhakta-2013") {
    return (
      compareBhaktaFunctionalCore(left, right) ||
      severeSimilarityOrder() ||
      compareSpacer(left, right) ||
      moderateSimilarityOrder() ||
      left.start - right.start
    );
  }

  return (
    left.distance - right.distance ||
    severeSimilarityOrder() ||
    compareSpacer(left, right) ||
    guptaArmCount(right) - guptaArmCount(left) ||
    moderateSimilarityOrder() ||
    left.start - right.start
  );
}

export function rankZfnCandidatesWithGenome(
  candidates: readonly ZfnCandidate[],
  summaries: GenomeSummaryMap,
): ZfnCandidate[] {
  if (!genomeAwareRankingAvailable(candidates, summaries)) {
    return [...candidates].sort(compareZfnCandidates);
  }
  return [...candidates].sort((left, right) => compareGenomeAwareZfnCandidates(left, right, summaries));
}
