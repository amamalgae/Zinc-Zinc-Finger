import archiveData from "../data/coda-2011-units.json" with { type: "json" };
import type { FingerPosition, ZfnArray, ZfnFinger } from "./zfn-array.ts";

export type { FingerPosition } from "./zfn-array.ts";

type CodaUnitKind = "f1" | "f3";

type CodaUnitRow = {
  unit: CodaUnitKind;
  f2Target: string;
  f2Helix: string;
  target: string;
  helix: string;
};

type F2ContextRow = { target: string; helix: string };

export type CodaFinger = ZfnFinger & {
  source: "CoDA F1 unit" | "fixed CoDA F2" | "CoDA F3 unit";
  f2Context: string;
};

export type CodaArray = ZfnArray & {
  method: "coda-2011";
  f2Context: string;
  fingers: readonly [CodaFinger, CodaFinger, CodaFinger];
};

const units = archiveData.units as CodaUnitRow[];
const f2Rows = archiveData.f2Contexts as F2ContextRow[];

function assertTriplet(value: string, label: string): void {
  if (!/^[ACGT]{3}$/.test(value)) throw new Error(`Invalid CoDA ${label}: ${value}`);
}

function assertHelix(value: string, label: string): void {
  if (!/^[ACDEFGHIKLMNPQRSTVWY]{7}$/.test(value)) throw new Error(`Invalid CoDA ${label}: ${value}`);
}

function validateArchive(): void {
  if (f2Rows.length !== 18) throw new Error(`CoDA archive must contain 18 F2 contexts; found ${f2Rows.length}`);
  if (units.filter(({ unit }) => unit === "f1").length !== 319) throw new Error("CoDA archive must contain 319 F1 units");
  if (units.filter(({ unit }) => unit === "f3").length !== 344) throw new Error("CoDA archive must contain 344 F3 units");

  const seenF2 = new Set<string>();
  const f2Helices = new Map<string, string>();
  for (const row of f2Rows) {
    assertTriplet(row.target, "F2 target");
    assertHelix(row.helix, "F2 helix");
    if (seenF2.has(row.target)) throw new Error(`Duplicate CoDA F2 context: ${row.target}`);
    seenF2.add(row.target);
    f2Helices.set(row.target, row.helix);
  }

  const seenUnits = new Set<string>();
  for (const row of units) {
    if (row.unit !== "f1" && row.unit !== "f3") throw new Error(`Invalid CoDA unit kind: ${String(row.unit)}`);
    assertTriplet(row.f2Target, "unit F2 target");
    assertTriplet(row.target, `${row.unit.toUpperCase()} target`);
    assertHelix(row.f2Helix, "unit F2 helix");
    assertHelix(row.helix, `${row.unit.toUpperCase()} helix`);
    if (f2Helices.get(row.f2Target) !== row.f2Helix) {
      throw new Error(`CoDA ${row.unit} unit has inconsistent F2 helix for ${row.f2Target}`);
    }
    const key = `${row.unit}:${row.f2Target}:${row.target}`;
    if (seenUnits.has(key)) throw new Error(`Duplicate CoDA unit: ${key}`);
    seenUnits.add(key);
  }
}

validateArchive();

const f2Contexts = new Map(f2Rows.map(({ target, helix }) => [target, helix]));
const unitIndex = new Map(units.map((unit) => [`${unit.unit}:${unit.f2Target}:${unit.target}`, unit]));

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
export const CODA_FINGER_LINKER = "TGEKP";

export function codaFingerSequence(position: FingerPosition, helix: string): string {
  return `${COMMON_PREFIX}${helix}${POSITION_SUFFIX[position]}`;
}

export function codaArraySequence(fingers: readonly CodaFinger[]): string {
  return fingers
    .map(({ position, helix }) => codaFingerSequence(position, helix))
    .join(CODA_FINGER_LINKER);
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
    { position: 1, triplet: f1Target, helix: f1.helix, source: "CoDA F1 unit", f2Context: f2Target, protein: codaFingerSequence(1, f1.helix) },
    { position: 2, triplet: f2Target, helix: f2Helix, source: "fixed CoDA F2", f2Context: f2Target, protein: codaFingerSequence(2, f2Helix) },
    { position: 3, triplet: f3Target, helix: f3.helix, source: "CoDA F3 unit", f2Context: f2Target, protein: codaFingerSequence(3, f3.helix) },
  ];
  return {
    recognition,
    method: "coda-2011",
    methodLabel: "CoDA 2011",
    assembly: `CoDA shared F2=${f2Target}`,
    f2Context: f2Target,
    fingers,
    linkers: [CODA_FINGER_LINKER, CODA_FINGER_LINKER],
    protein: codaArraySequence(fingers),
  };
}
