import { buildCodaArray } from "./coda-module-archive.ts";
import {
  formatCut,
  parseDNAInput,
  reverseComplement,
  type ParsedDNAInput,
} from "./coda-design-engine.ts";
import { buildGuptaArray } from "./gupta-module-archive.ts";
import type { ZfnArray } from "./zfn-array.ts";

export type DesignProfile = "gupta-coda" | "coda-only";

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
};

const FOKI_LINKERS: Readonly<Record<number, string>> = {
  5: "TGGS",
  6: "TGAAAR",
  7: "TGPGAAAR",
};

const SPACER_PRIORITY: Readonly<Record<number, number>> = { 6: 0, 5: 1, 7: 2 };

export { formatCut, parseDNAInput, reverseComplement };
export type { ParsedDNAInput };

function buildArray(recognition: string, profile: DesignProfile): ZfnArray | null {
  if (profile === "coda-only") return buildCodaArray(recognition);
  return buildGuptaArray(recognition) ?? buildCodaArray(recognition);
}

function guptaArmCount(candidate: ZfnCandidate): number {
  return Number(candidate.leftArray.method === "gupta-2012") + Number(candidate.rightArray.method === "gupta-2012");
}

export function compareZfnCandidates(left: ZfnCandidate, right: ZfnCandidate): number {
  return (
    left.distance - right.distance ||
    (SPACER_PRIORITY[left.spacerLength] ?? Number.MAX_SAFE_INTEGER) -
      (SPACER_PRIORITY[right.spacerLength] ?? Number.MAX_SAFE_INTEGER) ||
    guptaArmCount(right) - guptaArmCount(left) ||
    left.start - right.start
  );
}

export function generateZfnCandidates(
  dna: string,
  desiredCut: number,
  maxDistance = 1000,
  profile: DesignProfile = "gupta-coda",
  limit = 30,
): ZfnCandidate[] {
  if (!Number.isFinite(desiredCut) || !Number.isFinite(maxDistance) || !Number.isFinite(limit)) return [];
  const searchDistance = Math.max(0, maxDistance);
  const resultLimit = Math.max(0, Math.floor(limit));
  if (resultLimit === 0) return [];

  const candidates: ZfnCandidate[] = [];
  for (const spacerLength of [5, 6, 7]) {
    const footprint = 18 + spacerLength;
    const cutOffset = 9 + spacerLength / 2;
    const firstStart = Math.max(0, Math.ceil(desiredCut - searchDistance - cutOffset));
    const finalStart = Math.min(dna.length - footprint, Math.floor(desiredCut + searchDistance - cutOffset));
    for (let start = firstStart; start <= finalStart; start += 1) {
      const leftTop = dna.slice(start, start + 9);
      const spacer = dna.slice(start + 9, start + 9 + spacerLength);
      const rightTop = dna.slice(start + 9 + spacerLength, start + footprint);
      const leftRecognition = reverseComplement(leftTop);
      const rightRecognition = rightTop;
      const leftArray = buildArray(leftRecognition, profile);
      const rightArray = buildArray(rightRecognition, profile);
      if (!leftArray || !rightArray) continue;

      const cut = start + cutOffset;
      const distance = Math.abs(cut - desiredCut);
      if (distance > searchDistance) continue;
      candidates.push({
        id: `${start}-${spacerLength}`,
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
      });
    }
  }
  return candidates.sort(compareZfnCandidates).slice(0, resultLimit);
}

function arraySource(array: ZfnArray): string {
  return `${array.methodLabel}: ${array.assembly}`;
}

export function zfnCandidatesToCsv(candidates: readonly ZfnCandidate[]): string {
  const header = [
    "rank", "design_profile", "spacer_center_between_bases", "distance", "spacer_bp",
    "left_half_site_top_5to3", "spacer", "right_half_site_top_5to3",
    "left_method", "right_method", "left_assembly", "right_assembly",
    "left_fingers_NtoC", "right_fingers_NtoC", "left_array_NtoC", "right_array_NtoC",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    candidate.profile,
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
