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

export type ParsedDNAInput = {
  dna: string;
  ambiguousBaseCount: number;
  invalidCharacterCount: number;
};

const IUPAC_AMBIGUOUS_DNA = new Set("RYSWKMBDHVN");

/**
 * Parses FASTA/plain DNA without collapsing coordinates across unknown bases.
 * Whitespace and position digits are formatting; IUPAC ambiguity/gaps become N.
 * Unsupported characters also become N, and are reported so the UI can block design.
 */
export function parseDNAInput(value: string): ParsedDNAInput {
  let dna = "";
  let ambiguousBaseCount = 0;
  let invalidCharacterCount = 0;

  const sequenceLines = value
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(">"));

  for (const character of sequenceLines.join("")) {
    const base = character.toUpperCase();
    if (/[ACGT]/.test(base)) {
      dna += base;
    } else if (/\s|\d/.test(character)) {
      continue;
    } else if (IUPAC_AMBIGUOUS_DNA.has(base) || character === "-" || character === ".") {
      dna += "N";
      ambiguousBaseCount += 1;
    } else {
      dna += "N";
      invalidCharacterCount += 1;
    }
  }

  return { dna, ambiguousBaseCount, invalidCharacterCount };
}

export function cleanDNA(value: string): string {
  return parseDNAInput(value).dna;
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
  if (!Number.isFinite(desiredCut) || !Number.isFinite(maxDistance) || !Number.isFinite(limit)) return [];
  const searchDistance = Math.max(0, maxDistance);
  const resultLimit = Math.max(0, Math.floor(limit));
  if (resultLimit === 0) return [];

  const candidates: CodaCandidate[] = [];
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
      const leftArray = buildCodaArray(leftRecognition);
      const rightArray = buildCodaArray(rightRecognition);
      if (!leftArray || !rightArray) continue;

      const cut = start + cutOffset;
      const distance = Math.abs(cut - desiredCut);
      if (distance > searchDistance) continue;
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
  return candidates.sort(compareCandidates).slice(0, resultLimit);
}

export function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function codaCandidatesToCsv(candidates: readonly CodaCandidate[]): string {
  const header = [
    "rank", "spacer_center_between_bases", "distance", "spacer_bp", "left_half_site_top_5to3",
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
