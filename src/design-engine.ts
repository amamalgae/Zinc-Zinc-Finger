import {
  INTERFINGER_LINKER,
  fullFingerSequence,
  moduleArchive,
  type ModuleRecommendation,
} from "./module-archive.ts";
import {
  meanDeepZfTargetFit,
  type FingerPwmPrediction,
} from "./deepzf-pwm.ts";

export type Base = "A" | "C" | "G" | "T";

export type Finger = {
  finger: number;
  triplet: string;
  helix: string;
  fullSequence: string;
  bScore: number;
  recommendation: ModuleRecommendation;
  requiresTsoContext: boolean;
  tsoCompatible: boolean;
  deepZf: FingerPwmPrediction;
};

export type Candidate = {
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
  leftFingers: Finger[];
  rightFingers: Finger[];
  leftArrayProtein: string;
  rightArrayProtein: string;
  combinedBScore: number;
  passesBScoreCutoff: boolean;
  favorableModules: number;
  unfavorableModules: number;
  deepZfTargetFit: number;
  deepZfExactModules: number;
  deepZfTop3Modules: number;
  tsoIssues: number;
  fokILinker: string;
};

export function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    Number(b.passesBScoreCutoff) - Number(a.passesBScoreCutoff) ||
    b.combinedBScore - a.combinedBScore ||
    a.tsoIssues - b.tsoIssues ||
    a.unfavorableModules - b.unfavorableModules ||
    b.favorableModules - a.favorableModules ||
    a.distance - b.distance ||
    Math.abs(a.spacerLength - 6) - Math.abs(b.spacerLength - 6)
  );
}

const FOKI_LINKERS: Record<number, string> = {
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

export function complement(base: string | undefined): string | undefined {
  if (!base) return undefined;
  const complements: Record<string, string> = {
    A: "T",
    C: "G",
    G: "C",
    T: "A",
  };
  return complements[base.toUpperCase()];
}

export function reverseComplement(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .reverse()
    .map((base) => complement(base) ?? "N")
    .join("");
}

function chunks(value: string, size: number): string[] {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    result.push(value.slice(index, index + size));
  }
  return result;
}

export function fingersForRecognitionStrand(
  recognition: string,
  threePrimeFlank?: string,
): Finger[] | null {
  const triplets = chunks(recognition, 3);
  if (triplets.some((triplet) => triplet.length !== 3 || !moduleArchive[triplet])) {
    return null;
  }

  const inRecognitionOrder = triplets.map((triplet, index) => {
    const module = moduleArchive[triplet];
    const neighboringBase = triplets[index + 1]?.[0] ?? threePrimeFlank;
    const tsoCompatible =
      !module.requiresTsoContext || neighboringBase === "G" || neighboringBase === "T";

    return {
      triplet,
      helix: module.helix,
      fullSequence: fullFingerSequence(module.helix),
      bScore: module.bScore,
      recommendation: module.recommendation,
      requiresTsoContext: module.requiresTsoContext,
      tsoCompatible,
      deepZf: module.deepZf,
    };
  });

  return inRecognitionOrder.reverse().map((finger, index) => ({
    finger: index + 1,
    ...finger,
  }));
}

function arrayProtein(fingers: Finger[]): string {
  return fingers.map((finger) => finger.fullSequence).join(INTERFINGER_LINKER);
}

function countRecommendation(fingers: Finger[], value: ModuleRecommendation): number {
  return fingers.filter((finger) => finger.recommendation === value).length;
}

export function generateCandidates(
  dna: string,
  desiredCut: number,
  fingerCount: number,
  maxDistance: number,
): Candidate[] {
  const halfLength = fingerCount * 3;
  const candidates: Candidate[] = [];

  for (const spacerLength of [5, 6, 7]) {
    const footprint = halfLength * 2 + spacerLength;
    for (let start = 0; start + footprint <= dna.length; start += 1) {
      const leftTop = dna.slice(start, start + halfLength);
      const spacer = dna.slice(
        start + halfLength,
        start + halfLength + spacerLength,
      );
      const rightTop = dna.slice(
        start + halfLength + spacerLength,
        start + footprint,
      );
      const cut = start + halfLength + spacerLength / 2;
      const distance = Math.abs(cut - desiredCut);
      if (distance > maxDistance) continue;

      const leftRecognition = reverseComplement(leftTop);
      const rightRecognition = rightTop;
      const leftFingers = fingersForRecognitionStrand(
        leftRecognition,
        complement(dna[start - 1]),
      );
      const rightFingers = fingersForRecognitionStrand(
        rightRecognition,
        dna[start + footprint],
      );
      if (!leftFingers || !rightFingers) continue;

      const allFingers = [...leftFingers, ...rightFingers];
      const combinedBScore = allFingers.reduce(
        (sum, finger) => sum + finger.bScore,
        0,
      );

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
        leftArrayProtein: arrayProtein(leftFingers),
        rightArrayProtein: arrayProtein(rightFingers),
        combinedBScore,
        passesBScoreCutoff: combinedBScore >= 15,
        favorableModules: countRecommendation(allFingers, "favorable"),
        unfavorableModules: countRecommendation(allFingers, "unfavorable"),
        deepZfTargetFit: meanDeepZfTargetFit(
          allFingers.map((finger) => finger.deepZf),
        ),
        deepZfExactModules: allFingers.filter(
          (finger) => finger.deepZf.targetRank === 1,
        ).length,
        deepZfTop3Modules: allFingers.filter(
          (finger) => finger.deepZf.targetRank <= 3,
        ).length,
        tsoIssues: allFingers.filter((finger) => !finger.tsoCompatible).length,
        fokILinker: FOKI_LINKERS[spacerLength],
      });
    }
  }

  return candidates.sort(compareCandidates).slice(0, 30);
}

export function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function candidatesToCsv(candidates: Candidate[]): string {
  const header = [
    "rank",
    "combined_b_score",
    "b_score_ge_15",
    "deepzf_mean_target_fit",
    "deepzf_exact_modules",
    "deepzf_top3_modules",
    "tso_warnings",
    "cut_between_bases",
    "distance",
    "left_half_site_top_5to3",
    "spacer",
    "right_half_site_top_5to3",
    "zfa_foki_linker",
    "left_recognition_strand_5to3",
    "right_recognition_strand_5to3",
    "left_fingers_NtoC",
    "right_fingers_NtoC",
    "left_zfa_protein_NtoC",
    "right_zfa_protein_NtoC",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    candidate.combinedBScore,
    candidate.passesBScoreCutoff,
    candidate.deepZfTargetFit.toFixed(4),
    candidate.deepZfExactModules,
    candidate.deepZfTop3Modules,
    candidate.tsoIssues,
    formatCut(candidate.cut),
    candidate.distance.toFixed(1),
    candidate.leftTop,
    candidate.spacer,
    candidate.rightTop,
    candidate.fokILinker,
    candidate.leftRecognition,
    candidate.rightRecognition,
    candidate.leftFingers
      .map((finger) => `${finger.triplet}:${finger.helix}:B${finger.bScore}`)
      .join("|"),
    candidate.rightFingers
      .map((finger) => `${finger.triplet}:${finger.helix}:B${finger.bScore}`)
      .join("|"),
    candidate.leftArrayProtein,
    candidate.rightArrayProtein,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
