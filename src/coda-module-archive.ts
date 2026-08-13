import archiveData from "../data/coda-2011-units.json" with { type: "json" };

export type FingerPosition = 1 | 2 | 3;

type CodaUnitKind = "f1" | "f3";

type CodaUnitRow = {
  unit: CodaUnitKind;
  f2Target: string;
  f2Helix: string;
  target: string;
  helix: string;
};

export type CodaFinger = {
  position: FingerPosition;
  triplet: string;
  helix: string;
  source: "CoDA F1 unit" | "fixed CoDA F2" | "CoDA F3 unit";
  f2Context: string;
};

export type CodaArray = {
  recognition: string;
  f2Context: string;
  fingers: readonly [CodaFinger, CodaFinger, CodaFinger];
  protein: string;
};

const units = archiveData.units as CodaUnitRow[];
const f2Contexts = new Map(archiveData.f2Contexts.map(({ target, helix }) => [target, helix]));
const unitIndex = new Map(units.map((unit) => [
  `${unit.unit}:${unit.f2Target}:${unit.target}`,
  unit,
]));

export const CODA_F2_CONTEXT_COUNT = f2Contexts.size;
export const CODA_F1_UNIT_COUNT = units.filter(({ unit }) => unit === "f1").length;
export const CODA_F3_UNIT_COUNT = units.filter(({ unit }) => unit === "f3").length;
export const CODA_UNIT_COUNT = CODA_F1_UNIT_COUNT + CODA_F3_UNIT_COUNT;

// WO2011017293A2, SEQ ID NOs 841–844. The three positions use a common
// N-terminal framework and position-specific C-terminal framework segments.
const COMMON_PREFIX = "FQCRICMRNFS";
const POSITION_SUFFIX: Readonly<Record<FingerPosition, string>> = {
  1: "HTRTH",
  2: "HLRTH",
  3: "HLKTH",
};
const CANONICAL_FINGER_LINKER = "TGEKP";

export function codaFingerSequence(position: FingerPosition, helix: string): string {
  return `${COMMON_PREFIX}${helix}${POSITION_SUFFIX[position]}`;
}

export function codaArraySequence(fingers: readonly CodaFinger[]): string {
  return fingers
    .map(({ position, helix }) => codaFingerSequence(position, helix))
    .join(CANONICAL_FINGER_LINKER);
}

/**
 * Finds the context-compatible F1–F2–F3 array for a 5'→3' recognition strand.
 * C2H2 fingers bind antiparallel to DNA, so protein F1 maps to the final 3-mer.
 */
export function buildCodaArray(recognition: string): CodaArray | null {
  if (!/^[ACGT]{9}$/.test(recognition)) return null;
  const dnaTriplets = [recognition.slice(0, 3), recognition.slice(3, 6), recognition.slice(6, 9)];
  const [f1Target, f2Target, f3Target] = [...dnaTriplets].reverse();
  const f2Helix = f2Contexts.get(f2Target);
  if (!f2Helix) return null;
  const f1 = unitIndex.get(`f1:${f2Target}:${f1Target}`);
  const f3 = unitIndex.get(`f3:${f2Target}:${f3Target}`);
  if (!f1 || !f3) return null;

  const fingers: readonly [CodaFinger, CodaFinger, CodaFinger] = [
    { position: 1, triplet: f1Target, helix: f1.helix, source: "CoDA F1 unit", f2Context: f2Target },
    { position: 2, triplet: f2Target, helix: f2Helix, source: "fixed CoDA F2", f2Context: f2Target },
    { position: 3, triplet: f3Target, helix: f3.helix, source: "CoDA F3 unit", f2Context: f2Target },
  ];
  return {
    recognition,
    f2Context: f2Target,
    fingers,
    protein: codaArraySequence(fingers),
  };
}
