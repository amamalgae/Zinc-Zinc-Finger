import type { CodaCandidate } from "./coda-design-engine.ts";

export type ZfnMonomerSide = "left" | "right";

export interface ZfnFingerTarget {
  globalFinger: 1 | 2 | 3 | 4 | 5 | 6;
  localFinger: 1 | 2 | 3;
  monomer: ZfnMonomerSide;
  topTriplet: string;
  bottomTriplet: string;
  recognitionTriplet: string;
}

export interface ZfnBindingMap {
  leftProteinOrder: readonly ZfnFingerTarget[];
  rightProteinOrder: readonly ZfnFingerTarget[];
  topStrandOrder: readonly ZfnFingerTarget[];
  spacerTop: string;
  spacerBottom: string;
}

const COMPLEMENT: Readonly<Record<string, string>> = {
  A: "T",
  C: "G",
  G: "C",
  T: "A",
};

export function complementDna(sequence: string): string {
  return sequence.replace(/[ACGT]/g, (base) => COMPLEMENT[base]);
}

function splitTriplets(sequence: string): [string, string, string] {
  if (!/^[ACGT]{9}$/.test(sequence)) {
    throw new Error(`Expected a 9 bp DNA half-site, received ${sequence.length} bp.`);
  }
  return [sequence.slice(0, 3), sequence.slice(3, 6), sequence.slice(6, 9)];
}

function target(
  globalFinger: ZfnFingerTarget["globalFinger"],
  localFinger: ZfnFingerTarget["localFinger"],
  monomer: ZfnMonomerSide,
  topTriplet: string,
): ZfnFingerTarget {
  return {
    globalFinger,
    localFinger,
    monomer,
    topTriplet,
    bottomTriplet: complementDna(topTriplet),
    recognitionTriplet: monomer === "left" ? complementDna(topTriplet) : topTriplet,
  };
}

export function buildZfnBindingMap(
  candidate: Pick<CodaCandidate, "leftTop" | "spacer" | "rightTop">,
): ZfnBindingMap {
  const [left1, left2, left3] = splitTriplets(candidate.leftTop);
  const [right6, right5, right4] = splitTriplets(candidate.rightTop);

  const zf1 = target(1, 1, "left", left1);
  const zf2 = target(2, 2, "left", left2);
  const zf3 = target(3, 3, "left", left3);
  const zf4 = target(4, 1, "right", right4);
  const zf5 = target(5, 2, "right", right5);
  const zf6 = target(6, 3, "right", right6);

  return {
    leftProteinOrder: [zf1, zf2, zf3],
    rightProteinOrder: [zf4, zf5, zf6],
    topStrandOrder: [zf1, zf2, zf3, zf6, zf5, zf4],
    spacerTop: candidate.spacer,
    spacerBottom: complementDna(candidate.spacer),
  };
}
