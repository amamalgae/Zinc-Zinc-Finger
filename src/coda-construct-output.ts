import {
  FMDV_F2A,
  FOKI_ELD,
  FOKI_KKR,
  SV40_NLS_PREFIX,
} from "./construct-output.ts";
import type { CodaCandidate } from "./coda-design-engine.ts";
import {
  CODA_FINGER_LINKER,
  codaFingerSequence,
  type CodaArray,
} from "./coda-module-archive.ts";

export const CODA_ZFN_DONORS = [
  { component: "SV40 NLS（左右）", scientificName: "Betapolyomavirus macacae", detail: "核移行配列" },
  { component: "CoDA 3-finger framework（左右）", scientificName: "synthetic C2H2 array", detail: "Sander 2011のF1–F2–F3 context-compatible archive" },
  { component: "FokI ELD / KKR", scientificName: "Flavobacterium okeanokoites", detail: "切断ドメインに人工ヘテロ二量体変異" },
  { component: "F2A", scientificName: "Foot-and-mouth disease virus", detail: "FMDV由来2A peptide。左右ZFN単一ORFの先例はLei 2011" },
] as const;

export type CodaZfnMonomer = {
  arm: "left" | "right";
  fokIVariant: "ELD" | "KKR";
  protein: string;
};

export type CodaProteinFeature = {
  name: `ZF${1 | 2 | 3 | 4 | 5 | 6}` | "FokI (ELD)" | "F2A" | "FokI (KKR)";
  start: number;
  end: number;
  note: string;
};

export type CodaBicistronicConstruct = {
  name: string;
  protein: string;
  left: CodaZfnMonomer;
  right: CodaZfnMonomer;
  processedLeftProtein: string;
  processedRightProtein: string;
  features: readonly CodaProteinFeature[];
};

function buildProteinFeatures(candidate: CodaCandidate): CodaProteinFeature[] {
  const features: CodaProteinFeature[] = [];
  let cursor = 0;
  const addFeature = (name: CodaProteinFeature["name"], sequence: string, note: string): void => {
    const start = cursor + 1;
    cursor += sequence.length;
    features.push({ name, start, end: cursor, note });
  };
  const addArray = (array: CodaArray, firstGlobalFinger: 1 | 4): void => {
    array.fingers.forEach((finger, index) => {
      const globalFinger = firstGlobalFinger + index as 1 | 2 | 3 | 4 | 5 | 6;
      addFeature(
        `ZF${globalFinger}`,
        codaFingerSequence(finger.position, finger.helix),
        `CoDA F${finger.position}; target=${finger.triplet}; helix=${finger.helix}`,
      );
      if (index < array.fingers.length - 1) cursor += CODA_FINGER_LINKER.length;
    });
  };

  cursor += SV40_NLS_PREFIX.length;
  addArray(candidate.leftArray, 1);
  cursor += candidate.fokILinker.length;
  addFeature("FokI (ELD)", FOKI_ELD, "FokI nuclease; ELD: Q486E/N496D/I499L");
  addFeature("F2A", FMDV_F2A, "FMDV-derived F2A; Gly-Pro ribosomal skip");
  cursor += SV40_NLS_PREFIX.length;
  addArray(candidate.rightArray, 4);
  cursor += candidate.fokILinker.length;
  addFeature("FokI (KKR)", FOKI_KKR, "FokI nuclease; KKR: E490K/H537R/I538K");
  return features;
}

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
  const protein = `${left.protein}${FMDV_F2A}${right.protein}`;
  const features = buildProteinFeatures(candidate);
  if (features.at(-1)?.end !== protein.length) throw new Error("Protein feature coordinates do not cover the construct terminus");
  return {
    name: `zfn_coda3_${candidate.id}_ELD_F2A_KKR`,
    protein,
    left,
    right,
    processedLeftProtein: `${left.protein}${FMDV_F2A.slice(0, -1)}`,
    processedRightProtein: `${FMDV_F2A.slice(-1)}${right.protein}`,
    features,
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
    `>${construct.name} precursor_polyprotein; CoDA-2011 3-finger; left FokI-ELD; FMDV F2A; right FokI-KKR`,
    ...wrap(construct.protein, 70),
    `>${construct.name}_processed_left predicted_product; F2A upstream product`,
    ...wrap(construct.processedLeftProtein, 70),
    `>${construct.name}_processed_right predicted_product; F2A downstream product`,
    ...wrap(construct.processedRightProtein, 70),
  ].join("\n");
}

function genPeptOrigin(protein: string): string[] {
  return wrap(protein.toLowerCase(), 60).map((line, index) => {
    const groups = line.match(/.{1,10}/g)?.join(" ") ?? line;
    return `${String(index * 60 + 1).padStart(9)} ${groups}`;
  });
}

function escapeQualifier(value: string): string {
  return value.replaceAll('"', "'");
}

export function codaConstructToProteinGenPept(
  construct: CodaBicistronicConstruct,
): string {
  const locus = construct.name.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 16);
  const featureRows = construct.features.flatMap((feature) => [
    `     Region          ${feature.start}..${feature.end}`,
    `                     /region_name="${escapeQualifier(feature.name)}"`,
    `                     /note="${escapeQualifier(feature.note)}"`,
  ]);
  return [
    `LOCUS       ${locus.padEnd(16)} ${String(construct.protein.length).padStart(7)} aa            linear   SYN 18-AUG-2026`,
    `DEFINITION  Synthetic CoDA-3F ZFN precursor ${construct.name}.`,
    "ACCESSION   .",
    "VERSION     .",
    "KEYWORDS    synthetic construct; zinc finger nuclease; F2A.",
    "SOURCE      synthetic protein construct",
    "  ORGANISM  synthetic protein construct",
    "COMMENT     Protein-only design; no nucleotide sequence or codon choice is implied.",
    "FEATURES             Location/Qualifiers",
    `     source          1..${construct.protein.length}`,
    "                     /organism=\"synthetic protein construct\"",
    ...featureRows,
    "ORIGIN",
    ...genPeptOrigin(construct.protein),
    "//",
  ].join("\n");
}
