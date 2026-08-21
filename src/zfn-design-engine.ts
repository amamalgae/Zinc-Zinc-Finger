import { buildBhaktaArray, BHAKTA_B_SCORE_CUTOFF, type BhaktaArray } from "./bhakta-module-archive.ts";
import { buildCodaArray } from "./coda-module-archive.ts";
import {
  formatCut,
  parseDNAInput,
  reverseComplement,
  type ParsedDNAInput,
} from "./coda-design-engine.ts";
import { buildGuptaArray } from "./gupta-module-archive.ts";
import type { ZfnArray } from "./zfn-array.ts";

export type DesignProfile = "bhakta-2013" | "bhakta-2013-3xgnn" | "gupta-coda" | "coda-only";

export type ZfnCandidate = {
  id: string;
  profile: DesignProfile;
  start: number;
  cut: number;
  distance: number;
  spacerLength: number;
  spacer: string;
  leftTop: string;
  rightTop: string;
  leftRecognition: string;
  rightRecognition: string;
  leftArray: ZfnArray;
  rightArray: ZfnArray;
  fokILinker: string;
  combinedBScore?: number;
  tsoIssues?: number;
  favorableModules?: number;
  unfavorableModules?: number;
};

export type BhaktaAlternative = {
  leftFingerCount: 3 | 4 | 5 | 6;
  rightFingerCount: 3 | 4 | 5 | 6;
  leftArray: BhaktaArray;
  rightArray: BhaktaArray;
  combinedBScore: number;
  passesBScoreCutoff: boolean;
  tsoIssues: number;
  favorableModules: number;
  unfavorableModules: number;
};

const FOKI_LINKERS: Readonly<Record<number, string>> = {
  5: "TGGS",
  6: "TGAAAR",
  7: "TGPGAAAR",
};

const SPACER_PRIORITY: Readonly<Record<number, number>> = { 6: 0, 5: 1, 7: 2 };
const BHAKTA_FINGER_COUNTS = [3, 4, 5, 6] as const;

export { BHAKTA_B_SCORE_CUTOFF, formatCut, parseDNAInput, reverseComplement };
export type { ParsedDNAInput };

function complement(base: string | undefined): string | undefined {
  if (!base) return undefined;
  const complements: Readonly<Record<string, string>> = { A: "T", C: "G", G: "C", T: "A" };
  return complements[base.toUpperCase()];
}

function isBhaktaProfile(profile: DesignProfile): boolean {
  return profile === "bhakta-2013" || profile === "bhakta-2013-3xgnn";
}

function isThreeGnnRecognition(recognition: string): boolean {
  return /^(G[ACGT]{2}){3}$/.test(recognition);
}

function buildLegacyArray(
  recognition: string,
  profile: Exclude<DesignProfile, "bhakta-2013" | "bhakta-2013-3xgnn">,
): ZfnArray | null {
  if (profile === "coda-only") return buildCodaArray(recognition);
  return buildGuptaArray(recognition) ?? buildCodaArray(recognition);
}

function guptaArmCount(candidate: ZfnCandidate): number {
  return Number(candidate.leftArray.method === "gupta-2012") + Number(candidate.rightArray.method === "gupta-2012");
}

function compareBhaktaFunctional(
  left: Pick<ZfnCandidate, "combinedBScore" | "tsoIssues" | "unfavorableModules" | "favorableModules" | "spacerLength" | "start">,
  right: Pick<ZfnCandidate, "combinedBScore" | "tsoIssues" | "unfavorableModules" | "favorableModules" | "spacerLength" | "start">,
): number {
  return (
    (right.combinedBScore ?? 0) - (left.combinedBScore ?? 0) ||
    (left.tsoIssues ?? 0) - (right.tsoIssues ?? 0) ||
    (left.unfavorableModules ?? 0) - (right.unfavorableModules ?? 0) ||
    (right.favorableModules ?? 0) - (left.favorableModules ?? 0) ||
    (SPACER_PRIORITY[left.spacerLength] ?? Number.MAX_SAFE_INTEGER) -
      (SPACER_PRIORITY[right.spacerLength] ?? Number.MAX_SAFE_INTEGER) ||
    left.start - right.start
  );
}

export function compareZfnCandidates(left: ZfnCandidate, right: ZfnCandidate): number {
  if (isBhaktaProfile(left.profile) && isBhaktaProfile(right.profile)) {
    return compareBhaktaFunctional(left, right);
  }
  return (
    left.distance - right.distance ||
    (SPACER_PRIORITY[left.spacerLength] ?? Number.MAX_SAFE_INTEGER) -
      (SPACER_PRIORITY[right.spacerLength] ?? Number.MAX_SAFE_INTEGER) ||
    guptaArmCount(right) - guptaArmCount(left) ||
    left.start - right.start
  );
}

function bhaktaMetrics(leftArray: BhaktaArray, rightArray: BhaktaArray) {
  return {
    combinedBScore: leftArray.bScore + rightArray.bScore,
    tsoIssues: leftArray.tsoIssues + rightArray.tsoIssues,
    favorableModules: leftArray.favorableModules + rightArray.favorableModules,
    unfavorableModules: leftArray.unfavorableModules + rightArray.unfavorableModules,
  };
}

export function generateZfnCandidates(
  dna: string,
  desiredCut: number,
  maxDistance = 1000,
  profile: DesignProfile = "gupta-coda",
  limit?: number,
): ZfnCandidate[] {
  if (!Number.isFinite(desiredCut) || !Number.isFinite(maxDistance)) return [];
  const searchDistance = Math.max(0, maxDistance);
  const resultLimit = limit === undefined ? null : Math.max(0, Math.floor(limit));
  if (resultLimit === 0) return [];

  const isExtendedBhakta = profile === "bhakta-2013";
  const isGnn3Bhakta = profile === "bhakta-2013-3xgnn";
  const halfSiteLength = isExtendedBhakta ? 18 : 9;
  const candidates: ZfnCandidate[] = [];
  for (const spacerLength of [5, 6, 7]) {
    const footprint = halfSiteLength * 2 + spacerLength;
    const cutOffset = halfSiteLength + spacerLength / 2;
    const firstStart = Math.max(0, Math.ceil(desiredCut - searchDistance - cutOffset));
    const finalStart = Math.min(dna.length - footprint, Math.floor(desiredCut + searchDistance - cutOffset));
    for (let start = firstStart; start <= finalStart; start += 1) {
      const leftTop = dna.slice(start, start + halfSiteLength);
      const spacer = dna.slice(start + halfSiteLength, start + halfSiteLength + spacerLength);
      const rightTop = dna.slice(start + halfSiteLength + spacerLength, start + footprint);
      const leftRecognition = reverseComplement(leftTop);
      const rightRecognition = rightTop;
      let leftArray: ZfnArray | null;
      let rightArray: ZfnArray | null;
      let functionalMetrics: ReturnType<typeof bhaktaMetrics> | undefined;

      if (isBhaktaProfile(profile)) {
        if (isGnn3Bhakta && (!isThreeGnnRecognition(leftRecognition) || !isThreeGnnRecognition(rightRecognition))) continue;
        const leftBhakta = buildBhaktaArray(leftRecognition, complement(dna[start - 1]));
        const rightBhakta = buildBhaktaArray(rightRecognition, dna[start + footprint]);
        if (!leftBhakta || !rightBhakta) continue;
        functionalMetrics = bhaktaMetrics(leftBhakta, rightBhakta);
        // Bhakta et al. prospectively applied B>=15 to the L6+R6 workflow.
        // For the separately exposed 3xGNN 3F mode, retain B-score as a
        // continuous ranking signal rather than importing that 6F eligibility
        // threshold into a configuration for which it was not established.
        if (isExtendedBhakta && functionalMetrics.combinedBScore < BHAKTA_B_SCORE_CUTOFF) continue;
        leftArray = leftBhakta;
        rightArray = rightBhakta;
      } else {
        leftArray = buildLegacyArray(leftRecognition, profile);
        rightArray = buildLegacyArray(rightRecognition, profile);
        if (!leftArray || !rightArray) continue;
      }

      const cut = start + cutOffset;
      const distance = Math.abs(cut - desiredCut);
      if (distance > searchDistance) continue;
      candidates.push({
        id: isExtendedBhakta
          ? `bhakta-${start}-${spacerLength}`
          : isGnn3Bhakta
            ? `bhakta-3xgnn-${start}-${spacerLength}`
            : `${start}-${spacerLength}`,
        profile,
        start,
        cut,
        distance,
        spacerLength,
        spacer,
        leftTop,
        rightTop,
        leftRecognition,
        rightRecognition,
        leftArray,
        rightArray,
        fokILinker: FOKI_LINKERS[spacerLength],
        ...functionalMetrics,
      });
    }
  }
  const sorted = candidates.sort(compareZfnCandidates);
  return resultLimit === null ? sorted : sorted.slice(0, resultLimit);
}

export function bhaktaAlternativesForCandidate(candidate: ZfnCandidate): BhaktaAlternative[] {
  if (candidate.profile !== "bhakta-2013") return [];
  const alternatives: BhaktaAlternative[] = [];

  for (const leftFingerCount of BHAKTA_FINGER_COUNTS) {
    const leftOffset = candidate.leftTop.length - leftFingerCount * 3;
    const leftRecognition = reverseComplement(candidate.leftTop.slice(leftOffset));
    const leftArray = leftFingerCount === 6
      ? candidate.leftArray as BhaktaArray
      : buildBhaktaArray(leftRecognition, complement(candidate.leftTop[leftOffset - 1]));
    if (!leftArray) continue;

    for (const rightFingerCount of BHAKTA_FINGER_COUNTS) {
      const rightRecognition = candidate.rightTop.slice(0, rightFingerCount * 3);
      const rightArray = rightFingerCount === 6
        ? candidate.rightArray as BhaktaArray
        : buildBhaktaArray(rightRecognition, candidate.rightTop[rightFingerCount * 3]);
      if (!rightArray) continue;
      const metrics = bhaktaMetrics(leftArray, rightArray);
      alternatives.push({
        leftFingerCount,
        rightFingerCount,
        leftArray,
        rightArray,
        combinedBScore: metrics.combinedBScore,
        passesBScoreCutoff: metrics.combinedBScore >= BHAKTA_B_SCORE_CUTOFF,
        tsoIssues: metrics.tsoIssues,
        favorableModules: metrics.favorableModules,
        unfavorableModules: metrics.unfavorableModules,
      });
    }
  }

  return alternatives.sort((left, right) =>
    right.combinedBScore - left.combinedBScore ||
    left.tsoIssues - right.tsoIssues ||
    left.unfavorableModules - right.unfavorableModules ||
    right.favorableModules - left.favorableModules ||
    right.leftFingerCount + right.rightFingerCount - (left.leftFingerCount + left.rightFingerCount) ||
    right.leftFingerCount - left.leftFingerCount,
  );
}

function arraySource(array: ZfnArray): string {
  return `${array.methodLabel}: ${array.assembly}`;
}

export function zfnCandidatesToCsv(candidates: readonly ZfnCandidate[]): string {
  const header = [
    "rank", "design_profile", "combined_b_score", "tso_warnings", "spacer_center_between_bases", "distance", "spacer_bp",
    "left_half_site_top_5to3", "spacer", "right_half_site_top_5to3",
    "left_method", "right_method", "left_assembly", "right_assembly",
    "left_fingers_NtoC", "right_fingers_NtoC", "left_array_NtoC", "right_array_NtoC",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    candidate.profile,
    candidate.combinedBScore ?? "",
    candidate.tsoIssues ?? "",
    formatCut(candidate.cut),
    candidate.distance.toFixed(1),
    candidate.spacerLength,
    candidate.leftTop,
    candidate.spacer,
    candidate.rightTop,
    candidate.leftArray.method,
    candidate.rightArray.method,
    arraySource(candidate.leftArray),
    arraySource(candidate.rightArray),
    candidate.leftArray.fingers.map(({ position, triplet, helix, source }) => `F${position}:${triplet}:${helix}:${source}`).join("|"),
    candidate.rightArray.fingers.map(({ position, triplet, helix, source }) => `F${position}:${triplet}:${helix}:${source}`).join("|"),
    candidate.leftArray.protein,
    candidate.rightArray.protein,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}
