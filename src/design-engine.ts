export type Base = "A" | "C" | "G" | "T";

export type Finger = {
  finger: number;
  triplet: string;
  minus7: string;
  minus4: string;
  minus1: string;
  signature: string;
  certainty: number;
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
  score: number;
  evidence: number;
};

export const contactCode: Record<
  Base,
  { primary: string; alternatives: string; certainty: number }
> = {
  G: { primary: "R", alternatives: "K/H", certainty: 1 },
  A: { primary: "Q", alternatives: "N", certainty: 0.86 },
  T: { primary: "E", alternatives: "—", certainty: 0.82 },
  C: { primary: "D", alternatives: "—", certainty: 0.78 },
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
  const complement: Record<string, string> = {
    A: "T",
    C: "G",
    G: "C",
    T: "A",
  };

  return value
    .toUpperCase()
    .split("")
    .reverse()
    .map((base) => complement[base] ?? "N")
    .join("");
}

function chunks(value: string, size: number): string[] {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    result.push(value.slice(index, index + size));
  }
  return result;
}

export function fingersForRecognitionStrand(recognition: string): Finger[] {
  return chunks(recognition, 3)
    .reverse()
    .map((triplet, index) => {
      const b1 = triplet[0] as Base;
      const b2 = triplet[1] as Base;
      const b3 = triplet[2] as Base;
      const minus7 = contactCode[b3];
      const minus4 = contactCode[b2];
      const minus1 = contactCode[b1];
      const certainty =
        (minus7.certainty + minus4.certainty + minus1.certainty) / 3;

      return {
        finger: index + 1,
        triplet,
        minus7: minus7.primary,
        minus4: minus4.primary,
        minus1: minus1.primary,
        signature: `${minus7.primary}${minus4.primary}${minus1.primary}`,
        certainty,
      };
    });
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
      const leftFingers = fingersForRecognitionStrand(leftRecognition);
      const rightFingers = fingersForRecognitionStrand(rightRecognition);
      const allFingers = [...leftFingers, ...rightFingers];
      const evidence =
        allFingers.reduce((sum, finger) => sum + finger.certainty, 0) /
        allFingers.length;
      const positionScore =
        50 * Math.max(0, 1 - distance / Math.max(maxDistance, 1));
      const evidenceScore = evidence * 40;
      const spacerScore = spacerLength === 6 ? 10 : 8;
      const score =
        Math.round((positionScore + evidenceScore + spacerScore) * 10) / 10;

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
        score,
        evidence,
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, 30);
}

export function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function candidatesToCsv(candidates: Candidate[]): string {
  const header = [
    "rank",
    "score",
    "cut_between_bases",
    "distance",
    "left_half_site_top_5to3",
    "spacer",
    "right_half_site_top_5to3",
    "left_recognition_strand_5to3",
    "right_recognition_strand_5to3",
    "left_fingers_NtoC",
    "right_fingers_NtoC",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    candidate.score,
    formatCut(candidate.cut),
    candidate.distance.toFixed(1),
    candidate.leftTop,
    candidate.spacer,
    candidate.rightTop,
    candidate.leftRecognition,
    candidate.rightRecognition,
    candidate.leftFingers
      .map((finger) => `${finger.triplet}:${finger.signature}`)
      .join("|"),
    candidate.rightFingers
      .map((finger) => `${finger.triplet}:${finger.signature}`)
      .join("|"),
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
