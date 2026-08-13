import { buildCodaArray, type CodaArray } from "./coda-module-archive.ts";

export type CodaCandidate = {
  id: string;
  start: number;
  cut: number;
  distance: number;
  spacerLength: number;
  spacer: string;
  leftTop: string;
  rightTop: string;
  leftRecognition: string;
  rightRecognition: string;
  leftArray: CodaArray;
  rightArray: CodaArray;
  fokILinker: string;
};

const FOKI_LINKERS: Readonly<Record<number, string>> = {
  5: "TGGS",
  6: "TGAAAR",
  7: "TGPGAAAR",
};

export function cleanDNA(value: string): string {
  return value
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("")
    .toUpperCase()
    .replace(/[^ACGT]/g, "");
}
export function reverseComplement(value: string): string {
  const complement: Record<string, string> = { A: "T", C: "G", G: "C", T: "A" };
  return value.toUpperCase().split("").reverse().map((base) => complement[base] ?? "N").join("");
}

function compareCandidates(left: CodaCandidate, right: CodaCandidate): number {
  return (
    left.distance - right.distance ||
    Math.abs(left.spacerLength - 6) - Math.abs(right.spacerLength - 6) ||
    left.start - right.start
  );
}

export function generateCodaCandidates(
  dna: string,
  desiredCut: number,
  maxDistance = 500,
  limit = 30,
): CodaCandidate[] {
  const candidates: CodaCandidate[] = [];
  for (const spacerLength of [5, 6, 7]) {
    const footprint = 18 + spacerLength;
    for (let start = 0; start + footprint <= dna.length; start += 1) {
      const leftTop = dna.slice(start, start + 9);
      const spacer = dna.slice(start + 9, start + 9 + spacerLength);
      const rightTop = dna.slice(start + 9 + spacerLength, start + footprint);
      const leftRecognition = reverseComplement(leftTop);
      const rightRecognition = rightTop;
      const leftArray = buildCodaArray(leftRecognition);
      const rightArray = buildCodaArray(rightRecognition);
      if (!leftArray || !rightArray) continue;

      const cut = start + 9 + spacerLength / 2;
      const distance = Math.abs(cut - desiredCut);
      if (distance > maxDistance) continue;
      candidates.push({
        id: `${start}-${spacerLength}`,
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
  return candidates.sort(compareCandidates).slice(0, limit);
}

export function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function codaCandidatesToCsv(candidates: readonly CodaCandidate[]): string {
  const header = [
    "rank", "cut_between_bases", "distance", "spacer_bp", "left_half_site_top_5to3",
    "spacer", "right_half_site_top_5to3", "left_f2_context", "right_f2_context",
    "left_fingers_NtoC", "right_fingers_NtoC", "left_coda_array_NtoC", "right_coda_array_NtoC",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    formatCut(candidate.cut),
    candidate.distance.toFixed(1),
    candidate.spacerLength,
    candidate.leftTop,
    candidate.spacer,
    candidate.rightTop,
    candidate.leftArray.f2Context,
    candidate.rightArray.f2Context,
    candidate.leftArray.fingers.map(({ position, triplet, helix }) => `F${position}:${triplet}:${helix}`).join("|"),
    candidate.rightArray.fingers.map(({ position, triplet, helix }) => `F${position}:${triplet}:${helix}`).join("|"),
    candidate.leftArray.protein,
    candidate.rightArray.protein,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}
