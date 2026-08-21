import archiveData from "../data/gupta-2012-two-finger-modules.json" with { type: "json" };
import {
  getZhuModule,
  zif268ArraySequence,
  zif268FingerSequence,
  ZHU_MODULE_COUNT,
} from "./zhu-module-archive.ts";
import type { FingerPosition, ZfnArray, ZfnFinger } from "./zfn-array.ts";

type GuptaArchiveRow = {
  id: string;
  f1Helix: string;
  f2Helix: string;
  origin: string;
  target: string;
};

export type GuptaFinger = ZfnFinger & {
  source: string;
};

export type GuptaArray = ZfnArray & {
  method: "gupta-2012";
  moduleId: string;
  moduleTarget: string;
  modulePosition: "F1-F2" | "F2-F3";
  moduleOrigin: string;
};

const rows = archiveData.targets as GuptaArchiveRow[];

function assertHelix(value: string, label: string): void {
  if (!/^[ACDEFGHIKLMNPQRSTVWY]{7}$/.test(value)) throw new Error(`Invalid Gupta ${label}: ${value}`);
}

function validateArchive(): void {
  if (rows.length !== 162) throw new Error(`Gupta archive must contain 162 target rows; found ${rows.length}`);
  if (new Set(rows.map(({ id }) => id)).size !== 87) throw new Error("Gupta archive must contain 87 unique 2F modules");
  if (new Set(rows.map(({ target }) => target)).size !== rows.length) throw new Error("Gupta archive target sites must be unique");
  for (const row of rows) {
    if (!/^[ACGT]{6}$/.test(row.target)) throw new Error(`Invalid Gupta target: ${row.target}`);
    assertHelix(row.f1Helix, `${row.id} F1 helix`);
    assertHelix(row.f2Helix, `${row.id} F2 helix`);
  }
}

validateArchive();

const targetIndex = new Map(rows.map((row) => [row.target, row]));

export const GUPTA_TARGET_COUNT = rows.length;
export const GUPTA_MODULE_COUNT = new Set(rows.map(({ id }) => id)).size;
export const GUPTA_ONE_FINGER_MODULE_COUNT = ZHU_MODULE_COUNT;

function finger(
  position: FingerPosition,
  triplet: string,
  helix: string,
  source: string,
): GuptaFinger {
  return { position, triplet, helix, source, protein: zif268FingerSequence(position, helix) };
}

function buildOption(
  recognition: string,
  modulePosition: GuptaArray["modulePosition"],
): GuptaArray | null {
  const dnaTriplets = [recognition.slice(0, 3), recognition.slice(3, 6), recognition.slice(6, 9)];
  const proteinTriplets = [...dnaTriplets].reverse();
  const moduleTarget = modulePosition === "F1-F2" ? recognition.slice(3, 9) : recognition.slice(0, 6);
  const module = targetIndex.get(moduleTarget);
  if (!module) return null;

  const singlePosition: FingerPosition = modulePosition === "F1-F2" ? 3 : 1;
  const singleTriplet = proteinTriplets[singlePosition - 1];
  const singleModule = getZhuModule(singleTriplet, singlePosition);
  if (!singleModule) return null;

  const helices: [string, string, string] = modulePosition === "F1-F2"
    ? [module.f1Helix, module.f2Helix, singleModule.helix]
    : [singleModule.helix, module.f1Helix, module.f2Helix];
  const fingers = helices.map((helix, index) => {
    const position = (index + 1) as FingerPosition;
    const isTwoFinger = modulePosition === "F1-F2" ? position <= 2 : position >= 2;
    const moduleFinger = modulePosition === "F1-F2" ? position : position - 1;
    const source = isTwoFinger
      ? `Gupta ${module.id} F${moduleFinger}`
      : `Zhu 2011 1F (${singleModule.source})`;
    return finger(position, proteinTriplets[index], helix, source);
  }) as [GuptaFinger, GuptaFinger, GuptaFinger];

  return {
    recognition,
    method: "gupta-2012",
    methodLabel: "Gupta 2012",
    assembly: `${module.id} ${modulePosition} + Zhu 2011 1F`,
    moduleId: module.id,
    moduleTarget,
    modulePosition,
    moduleOrigin: module.origin,
    fingers,
    linkers: ["", ""],
    protein: zif268ArraySequence(helices),
  };
}

/**
 * Builds a 3F array as one Gupta 2F module plus one position-specific Zhu 1F
 * module. The two possible 2F placements are tested without splitting or
 * interpolating a published 2F module.
 */
export function buildGuptaArray(recognition: string): GuptaArray | null {
  if (!/^[ACGT]{9}$/.test(recognition)) return null;
  return buildOption(recognition, "F2-F3") ?? buildOption(recognition, "F1-F2");
}
