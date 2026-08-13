import {
  getZhuModule,
  zif268ArraySequence,
  type FingerPosition,
  type ZhuModule,
} from "./zhu-module-archive.ts";

export type ZhuFinger = ZhuModule & {
  position: FingerPosition;
};

export type ZhuCandidate = {
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
  leftFingers: readonly [ZhuFinger, ZhuFinger, ZhuFinger];
  rightFingers: readonly [ZhuFinger, ZhuFinger, ZhuFinger];
  leftArrayProtein: string;
  rightArrayProtein: string;
  gnnModules: number;
  robustModules: number;
  contextWarnings: number;
  fokILinker: string;
};

const ROBUST_TRIPLETS = new Set(["GAG", "GAT", "GGG", "GGT"]);
const CONTEXT_WARNING_TRIPLETS = new Set(["TTG"]);

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

function fingersForRecognitionStrand(recognition: string): readonly [ZhuFinger, ZhuFinger, ZhuFinger] | null {
  if (recognition.length !== 9) return null;
  const recognitionTriplets = [recognition.slice(0, 3), recognition.slice(3, 6), recognition.slice(6, 9)];
  const proteinTriplets = recognitionTriplets.reverse();
  const fingers = proteinTriplets.map((triplet, index) => {
    const position = (index + 1) as FingerPosition;
    const module = getZhuModule(triplet, position);
    return module ? { ...module, position } : null;
  });
  if (fingers.some((finger) => finger === null)) return null;
  return fingers as [ZhuFinger, ZhuFinger, ZhuFinger];
}

function compareCandidates(left: ZhuCandidate, right: ZhuCandidate): number {
  return (
    right.gnnModules - left.gnnModules ||
    right.robustModules - left.robustModules ||
    left.contextWarnings - right.contextWarnings ||
    left.distance - right.distance ||
    Math.abs(left.spacerLength - 6) - Math.abs(right.spacerLength - 6)
  );
}

export function generateZhuCandidates(
  dna: string,
  desiredCut: number,
  maxDistance = 500,
  limit = 30,
): ZhuCandidate[] {
  const candidates: ZhuCandidate[] = [];
  for (const spacerLength of [5, 6, 7]) {
    const footprint = 18 + spacerLength;
    for (let start = 0; start + footprint <= dna.length; start += 1) {
      const leftTop = dna.slice(start, start + 9);
      const spacer = dna.slice(start + 9, start + 9 + spacerLength);
      const rightTop = dna.slice(start + 9 + spacerLength, start + footprint);
      const leftRecognition = reverseComplement(leftTop);
      const rightRecognition = rightTop;
      const leftFingers = fingersForRecognitionStrand(leftRecognition);
      const rightFingers = fingersForRecognitionStrand(rightRecognition);
      if (!leftFingers || !rightFingers) continue;

      const cut = start + 9 + spacerLength / 2;
      const distance = Math.abs(cut - desiredCut);
      if (distance > maxDistance) continue;
      const allFingers = [...leftFingers, ...rightFingers];
      const helices = (fingers: readonly [ZhuFinger, ZhuFinger, ZhuFinger]) =>
        fingers.map((finger) => finger.helix) as [string, string, string];

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
        leftFingers,
        rightFingers,
        leftArrayProtein: zif268ArraySequence(helices(leftFingers)),
        rightArrayProtein: zif268ArraySequence(helices(rightFingers)),
        gnnModules: allFingers.filter(({ triplet }) => triplet.startsWith("G")).length,
        robustModules: allFingers.filter(({ triplet }) => ROBUST_TRIPLETS.has(triplet)).length,
        contextWarnings: allFingers.filter(({ triplet }) => CONTEXT_WARNING_TRIPLETS.has(triplet)).length,
        fokILinker: FOKI_LINKERS[spacerLength],
      });
    }
  }
  return candidates.sort(compareCandidates).slice(0, limit);
}

export function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function zhuCandidatesToCsv(candidates: readonly ZhuCandidate[]): string {
  const header = [
    "rank", "cut_between_bases", "distance", "spacer_bp", "left_half_site_top_5to3",
    "spacer", "right_half_site_top_5to3", "gnn_modules", "robust_modules", "context_warnings",
    "left_fingers_NtoC", "right_fingers_NtoC", "left_zif268_array_NtoC", "right_zif268_array_NtoC",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    formatCut(candidate.cut),
    candidate.distance.toFixed(1),
    candidate.spacerLength,
    candidate.leftTop,
    candidate.spacer,
    candidate.rightTop,
    candidate.gnnModules,
    candidate.robustModules,
    candidate.contextWarnings,
    candidate.leftFingers.map(({ position, triplet, helix }) => `F${position}:${triplet}:${helix}`).join("|"),
    candidate.rightFingers.map(({ position, triplet, helix }) => `F${position}:${triplet}:${helix}`).join("|"),
    candidate.leftArrayProtein,
    candidate.rightArrayProtein,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}
