import {
  DUENAS_F2A,
  FOKI_ELD,
  FOKI_KKR,
  SV40_NLS_PREFIX,
} from "./construct-output.ts";
import type { CodaCandidate } from "./coda-design-engine.ts";

export const CODA_ZFN_DONORS = [
  { component: "SV40 NLS（左右）", scientificName: "Betapolyomavirus macacae", detail: "核移行配列" },
  { component: "CoDA 3-finger framework（左右）", scientificName: "synthetic C2H2 array", detail: "Sander 2011のF1–F2–F3 context-compatible archive" },
  { component: "FokI ELD / KKR", scientificName: "Flavobacterium okeanokoites", detail: "切断ドメインに人工ヘテロ二量体変異" },
  { component: "F2A", scientificName: "Foot-and-mouth disease virus", detail: "Dueñas 2025で使用された2A配列" },
] as const;

export type CodaZfnMonomer = {
  arm: "left" | "right";
  fokIVariant: "ELD" | "KKR";
  protein: string;
};

export type CodaBicistronicConstruct = {
  name: string;
  protein: string;
  left: CodaZfnMonomer;
  right: CodaZfnMonomer;
  processedLeftProtein: string;
  processedRightProtein: string;
};

export function buildCodaBicistronicZfn(
  candidate: CodaCandidate,
): CodaBicistronicConstruct {
  const left: CodaZfnMonomer = {
    arm: "left",
    fokIVariant: "ELD",
    protein: `${SV40_NLS_PREFIX}${candidate.leftArray.protein}${candidate.fokILinker}${FOKI_ELD}`,
  };
  const right: CodaZfnMonomer = {
    arm: "right",
    fokIVariant: "KKR",
    protein: `${SV40_NLS_PREFIX}${candidate.rightArray.protein}${candidate.fokILinker}${FOKI_KKR}`,
  };
  const protein = `${left.protein}${DUENAS_F2A}${right.protein}`;
  return {
    name: `zfn_coda3_${candidate.id}_ELD_F2A_KKR`,
    protein,
    left,
    right,
    processedLeftProtein: `${left.protein}${DUENAS_F2A.slice(0, -1)}`,
    processedRightProtein: `${DUENAS_F2A.slice(-1)}${right.protein}`,
  };
}

function wrap(value: string, width: number): string[] {
  const rows: string[] = [];
  for (let index = 0; index < value.length; index += width) rows.push(value.slice(index, index + width));
  return rows;
}

export function codaConstructToProteinFasta(
  construct: CodaBicistronicConstruct,
): string {
  return [
    `>${construct.name} precursor_polyprotein; CoDA-2011 3-finger; left FokI-ELD; Dueñas-2025 F2A; right FokI-KKR`,
    ...wrap(construct.protein, 70),
    `>${construct.name}_processed_left predicted_product; F2A upstream product`,
    ...wrap(construct.processedLeftProtein, 70),
    `>${construct.name}_processed_right predicted_product; F2A downstream product`,
    ...wrap(construct.processedRightProtein, 70),
  ].join("\n");
}
