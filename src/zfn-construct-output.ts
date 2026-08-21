import { FMDV_F2A, FOKI_ELD, FOKI_KKR, SV40_NLS_PREFIX } from "./construct-output.ts";
import type { ZfnCandidate } from "./zfn-design-engine.ts";
import type { ZfnArray } from "./zfn-array.ts";

export const ZFN_DONORS = [
  { component: "SV40 NLS", scientificName: "Betapolyomavirus macacae", detailKey: "donorNls" },
  { component: "3-finger framework", scientificName: "synthetic C2H2 array", detailKey: "donorFramework" },
  { component: "FokI ELD / KKR", scientificName: "Flavobacterium okeanokoites", detailKey: "donorFokI" },
  { component: "F2A", scientificName: "Foot-and-mouth disease virus", detailKey: "donorF2A" },
] as const;

export type ZfnMonomer = { arm: "left" | "right"; fokIVariant: "ELD" | "KKR"; protein: string };
export type ProteinFeature = {
  name: `ZF${1 | 2 | 3 | 4 | 5 | 6}` | "FokI (ELD)" | "F2A" | "FokI (KKR)";
  start: number;
  end: number;
  note: string;
};
export type BicistronicConstruct = {
  name: string;
  protein: string;
  left: ZfnMonomer;
  right: ZfnMonomer;
  features: readonly ProteinFeature[];
  methodSummary: string;
};

function buildProteinFeatures(candidate: ZfnCandidate): ProteinFeature[] {
  const features: ProteinFeature[] = [];
  let cursor = 0;
  const addFeature = (name: ProteinFeature["name"], sequence: string, note: string): void => {
    const start = cursor + 1;
    cursor += sequence.length;
    features.push({ name, start, end: cursor, note });
  };
  const addArray = (array: ZfnArray, firstGlobalFinger: 1 | 4): void => {
    array.fingers.forEach((finger, index) => {
      const globalFinger = (firstGlobalFinger + index) as 1 | 2 | 3 | 4 | 5 | 6;
      addFeature(`ZF${globalFinger}`, finger.protein, `${finger.source}; target=${finger.triplet}; helix=${finger.helix}; assembly=${array.assembly}`);
      if (index < array.linkers.length) cursor += array.linkers[index].length;
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

function methodSummary(candidate: ZfnCandidate): string {
  return `left ${candidate.leftArray.methodLabel}; right ${candidate.rightArray.methodLabel}`;
}

export function buildBicistronicZfn(candidate: ZfnCandidate): BicistronicConstruct {
  const left: ZfnMonomer = { arm: "left", fokIVariant: "ELD", protein: `${SV40_NLS_PREFIX}${candidate.leftArray.protein}${candidate.fokILinker}${FOKI_ELD}` };
  const right: ZfnMonomer = { arm: "right", fokIVariant: "KKR", protein: `${SV40_NLS_PREFIX}${candidate.rightArray.protein}${candidate.fokILinker}${FOKI_KKR}` };
  const protein = `${left.protein}${FMDV_F2A}${right.protein}`;
  const features = buildProteinFeatures(candidate);
  if (features.at(-1)?.end !== protein.length) throw new Error("Protein feature coordinates do not cover the construct terminus");
  return {
    name: `zfn_${candidate.profile.replaceAll("-", "_")}_${candidate.id}_ELD_F2A_KKR`,
    protein,
    left,
    right,
    features,
    methodSummary: methodSummary(candidate),
  };
}

export function resultFilename(rank: number, extension: "gp" | "fasta"): string {
  if (!Number.isInteger(rank) || rank < 1) throw new Error("Result rank must be a positive integer");
  return `ZFN_Result${String(rank).padStart(2, "0")}.${extension}`;
}

function wrap(value: string, width: number): string[] {
  const rows: string[] = [];
  for (let index = 0; index < value.length; index += width) rows.push(value.slice(index, index + width));
  return rows;
}

export function constructToProteinFasta(construct: BicistronicConstruct): string {
  return [`>${construct.name} precursor_polyprotein; ${construct.methodSummary}; left FokI-ELD; FMDV F2A; right FokI-KKR`, ...wrap(construct.protein, 70)].join("\n");
}

function genPeptOrigin(protein: string): string[] {
  return wrap(protein.toLowerCase(), 60).map((line, index) => `${String(index * 60 + 1).padStart(9)} ${line.match(/.{1,10}/g)?.join(" ") ?? line}`);
}

function escapeQualifier(value: string): string {
  return value.replaceAll('"', "'");
}

export function constructToProteinGenPept(construct: BicistronicConstruct): string {
  const locus = construct.name.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 16);
  const featureRows = construct.features.flatMap((feature) => [
    `     Region          ${feature.start}..${feature.end}`,
    `                     /region_name="${escapeQualifier(feature.name)}"`,
    `                     /note="${escapeQualifier(feature.note)}"`,
  ]);
  return [
    `LOCUS       ${locus.padEnd(16)} ${String(construct.protein.length).padStart(7)} aa            linear   SYN 21-AUG-2026`,
    `DEFINITION  Synthetic ZFN precursor ${construct.name}.`,
    "ACCESSION   .",
    "VERSION     .",
    "KEYWORDS    synthetic construct; zinc finger nuclease; F2A.",
    "SOURCE      synthetic protein construct",
    "  ORGANISM  synthetic protein construct",
    "COMMENT     Protein-only design; no nucleotide sequence or codon choice is implied.",
    `COMMENT     Design provenance: ${construct.methodSummary}.`,
    "FEATURES             Location/Qualifiers",
    `     source          1..${construct.protein.length}`,
    "                     /organism=\"synthetic protein construct\"",
    ...featureRows,
    "ORIGIN",
    ...genPeptOrigin(construct.protein),
    "//",
  ].join("\n");
}
