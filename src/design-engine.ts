import {
  BASE_SKIPPING_LINKER_1C,
  INTERFINGER_LINKER,
  fullFingerSequence,
  moduleArchive,
  type ModuleRecommendation,
} from "./module-archive.ts";

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
  leftFingerCount: number;
  rightFingerCount: number;
  leftSkipAfterFinger: number | null;
  rightSkipAfterFinger: number | null;
  leftSkippedBaseOffset: number | null;
  rightSkippedBaseOffset: number | null;
  leftFingers: Finger[];
  rightFingers: Finger[];
  leftArrayProtein: string;
  rightArrayProtein: string;
  combinedBScore: number;
  passesBScoreCutoff: boolean;
  favorableModules: number;
  unfavorableModules: number;
  persikovTargetFit?: number;
  tsoIssues: number;
  fokILinker: string;
};

export function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    Number(b.passesBScoreCutoff) - Number(a.passesBScoreCutoff) ||
    b.combinedBScore - a.combinedBScore ||
    (b.persikovTargetFit ?? 0) - (a.persikovTargetFit ?? 0) ||
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
  skippedBase?: { offset: number; base: string },
): Finger[] | null {
  const triplets = chunks(recognition, 3);
  if (triplets.some((triplet) => triplet.length !== 3 || !moduleArchive[triplet])) {
    return null;
  }

  const inRecognitionOrder = triplets.map((triplet, index) => {
    const module = moduleArchive[triplet];
    const neighboringBase = skippedBase?.offset === (index + 1) * 3
      ? skippedBase.base
      : triplets[index + 1]?.[0] ?? threePrimeFlank;
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
    };
  });

  return inRecognitionOrder.reverse().map((finger, index) => ({
    finger: index + 1,
    ...finger,
  }));
}

function arrayProtein(fingers: Finger[], skipAfterFinger: number | null): string {
  return fingers
    .map((finger, index) => {
      if (index === fingers.length - 1) return finger.fullSequence;
      const linker = index + 1 === skipAfterFinger
        ? BASE_SKIPPING_LINKER_1C
        : INTERFINGER_LINKER;
      return `${finger.fullSequence}${linker}`;
    })
    .join("");
}

function countRecommendation(fingers: Finger[], value: ModuleRecommendation): number {
  return fingers.filter((finger) => finger.recommendation === value).length;
}

export function generateCandidates(
  dna: string,
  desiredCut: number,
  leftFingerCount: number,
  maxDistance: number,
  options: {
    rightFingerCount?: number;
    leftSkipAfterFinger?: number | null;
    rightSkipAfterFinger?: number | null;
    candidateLimit?: number;
  } = {},
): Candidate[] {
  const rightFingerCount = options.rightFingerCount ?? leftFingerCount;
  const leftSkipAfterFinger = options.leftSkipAfterFinger ?? null;
  const rightSkipAfterFinger = options.rightSkipAfterFinger ?? null;
  const leftRecognitionSkipOffset = leftSkipAfterFinger === null
    ? null
    : (leftFingerCount - leftSkipAfterFinger) * 3;
  const rightRecognitionSkipOffset = rightSkipAfterFinger === null
    ? null
    : (rightFingerCount - rightSkipAfterFinger) * 3;
  const leftLength = leftFingerCount * 3 + Number(leftSkipAfterFinger !== null);
  const rightLength = rightFingerCount * 3 + Number(rightSkipAfterFinger !== null);
  const candidates: Candidate[] = [];

  for (const spacerLength of [5, 6, 7]) {
    const footprint = leftLength + rightLength + spacerLength;
    for (let start = 0; start + footprint <= dna.length; start += 1) {
      const leftTop = dna.slice(start, start + leftLength);
      const spacer = dna.slice(
        start + leftLength,
        start + leftLength + spacerLength,
      );
      const rightTop = dna.slice(
        start + leftLength + spacerLength,
        start + footprint,
      );
      const cut = start + leftLength + spacerLength / 2;
      const distance = Math.abs(cut - desiredCut);
      if (distance > maxDistance) continue;

      const leftRecognitionSpan = reverseComplement(leftTop);
      const rightRecognitionSpan = rightTop;
      const leftRecognition = leftRecognitionSkipOffset === null
        ? leftRecognitionSpan
        : `${leftRecognitionSpan.slice(0, leftRecognitionSkipOffset)}${leftRecognitionSpan.slice(leftRecognitionSkipOffset + 1)}`;
      const rightRecognition = rightRecognitionSkipOffset === null
        ? rightRecognitionSpan
        : `${rightRecognitionSpan.slice(0, rightRecognitionSkipOffset)}${rightRecognitionSpan.slice(rightRecognitionSkipOffset + 1)}`;
      const leftFingers = fingersForRecognitionStrand(
        leftRecognition,
        complement(dna[start - 1]),
        leftRecognitionSkipOffset === null
          ? undefined
          : {
              offset: leftRecognitionSkipOffset,
              base: leftRecognitionSpan[leftRecognitionSkipOffset],
            },
      );
      const rightFingers = fingersForRecognitionStrand(
        rightRecognition,
        dna[start + footprint],
        rightRecognitionSkipOffset === null
          ? undefined
          : {
              offset: rightRecognitionSkipOffset,
              base: rightRecognitionSpan[rightRecognitionSkipOffset],
            },
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
        leftFingerCount,
        rightFingerCount,
        leftSkipAfterFinger,
        rightSkipAfterFinger,
        leftSkippedBaseOffset: leftRecognitionSkipOffset,
        rightSkippedBaseOffset: rightRecognitionSkipOffset,
        leftFingers,
        rightFingers,
        leftArrayProtein: arrayProtein(leftFingers, leftSkipAfterFinger),
        rightArrayProtein: arrayProtein(rightFingers, rightSkipAfterFinger),
        combinedBScore,
        passesBScoreCutoff: combinedBScore >= 15,
        favorableModules: countRecommendation(allFingers, "favorable"),
        unfavorableModules: countRecommendation(allFingers, "unfavorable"),
        tsoIssues: allFingers.filter((finger) => !finger.tsoCompatible).length,
        fokILinker: FOKI_LINKERS[spacerLength],
      });
    }
  }

  return candidates
    .sort(compareCandidates)
    .slice(0, options.candidateLimit ?? 30);
}

export function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function candidatesToCsv(candidates: Candidate[]): string {
  const header = [
    "rank",
    "combined_b_score",
    "b_score_ge_15",
    "persikov_svm_target_fit",
    "tso_warnings",
    "cut_between_bases",
    "distance",
    "left_half_site_top_5to3",
    "spacer",
    "right_half_site_top_5to3",
    "left_finger_count",
    "right_finger_count",
    "left_1c_linker_after_finger",
    "right_1c_linker_after_finger",
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
    candidate.persikovTargetFit?.toFixed(4) ?? "",
    candidate.tsoIssues,
    formatCut(candidate.cut),
    candidate.distance.toFixed(1),
    candidate.leftTop,
    candidate.spacer,
    candidate.rightTop,
    candidate.leftFingerCount,
    candidate.rightFingerCount,
    candidate.leftSkipAfterFinger ?? "",
    candidate.rightSkipAfterFinger ?? "",
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
