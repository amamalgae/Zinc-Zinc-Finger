import {
  DUENAS_F2A,
  FOKI_ELD,
  FOKI_KKR,
  SV40_NLS_PREFIX,
  optimizeCodingSequence,
  type CodonPreset,
} from "./construct-output.ts";
import type { ZhuCandidate } from "./zhu-design-engine.ts";

export const ZHU_ZFN_DONORS = [
  { component: "SV40 NLS（左右）", scientificName: "Betapolyomavirus macacae", detail: "核移行配列" },
  { component: "Zif268 3-finger framework（左右）", scientificName: "Mus musculus", detail: "Egr1由来骨格に人工recognition helixを導入" },
  { component: "FokI ELD / KKR", scientificName: "Flavobacterium okeanokoites", detail: "切断ドメインに人工ヘテロ二量体変異" },
  { component: "F2A", scientificName: "Foot-and-mouth disease virus", detail: "Dueñas 2025で使用された2A配列" },
] as const;

export type ZhuZfnMonomer = {
  arm: "left" | "right";
  fokIVariant: "ELD" | "KKR";
  protein: string;
};

export type ZhuBicistronicConstruct = {
  name: string;
  protein: string;
  cds: string;
  gcPercent: number;
  left: ZhuZfnMonomer;
  right: ZhuZfnMonomer;
  processedLeftProtein: string;
  processedRightProtein: string;
};

function gcPercent(dna: string): number {
  return 100 * (dna.match(/[GC]/g)?.length ?? 0) / Math.max(1, dna.length);
}

export function buildZhuBicistronicZfn(
  candidate: ZhuCandidate,
  preset: CodonPreset,
): ZhuBicistronicConstruct {
  const left: ZhuZfnMonomer = {
    arm: "left",
    fokIVariant: "ELD",
    protein: `${SV40_NLS_PREFIX}${candidate.leftArrayProtein}${candidate.fokILinker}${FOKI_ELD}`,
  };
  const right: ZhuZfnMonomer = {
    arm: "right",
    fokIVariant: "KKR",
    protein: `${SV40_NLS_PREFIX}${candidate.rightArrayProtein}${candidate.fokILinker}${FOKI_KKR}`,
  };
  const protein = `${left.protein}${DUENAS_F2A}${right.protein}`;
  const cds = `${optimizeCodingSequence(protein, preset)}${optimizeCodingSequence("*", preset)}`;
  return {
    name: `zfn_zhu3_${candidate.id}_ELD_F2A_KKR`,
    protein,
    cds,
    gcPercent: gcPercent(cds),
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

export function zhuConstructToFasta(
  construct: ZhuBicistronicConstruct,
  kind: "protein" | "cds",
): string {
  return [
    `>${construct.name} ${kind}; Zhu-2011 3-finger Zif268; left FokI-ELD; Dueñas-2025 F2A; right FokI-KKR`,
    ...wrap(construct[kind], 70),
  ].join("\n");
}

export function zhuConstructToGenBank(
  construct: ZhuBicistronicConstruct,
  preset: CodonPreset,
): string {
  const codingEnd = construct.cds.length - 3;
  const leftEnd = construct.left.protein.length * 3;
  const f2aStart = leftEnd + 1;
  const f2aEnd = (construct.left.protein.length + DUENAS_F2A.length) * 3;
  const rightStart = f2aEnd + 1;
  const origin = wrap(construct.cds.toLowerCase(), 60).map((line, index) => {
    const groups = line.match(/.{1,10}/g)?.join(" ") ?? line;
    return `${String(index * 60 + 1).padStart(9)} ${groups}`;
  });
  return [
    `LOCUS       ${construct.name.slice(0, 16).padEnd(16)} ${String(construct.cds.length).padStart(7)} bp    DNA     linear   SYN 01-JAN-2000`,
    "DEFINITION  Single-ORF Zhu 3-finger ZFN pair with ELD/F2A/KKR.",
    "ACCESSION   .",
    "VERSION     .",
    "KEYWORDS    synthetic construct; zinc finger nuclease; F2A.",
    "SOURCE      synthetic DNA construct",
    "  ORGANISM  synthetic DNA construct",
    "FEATURES             Location/Qualifiers",
    `     CDS             1..${codingEnd}`,
    `                     /gene="${construct.name}"`,
    `                     /note="single ORF; Zhu 2011 position-specific Zif268 3-finger arrays; left FokI-ELD; Dueñas 2025 F2A; right FokI-KKR; codon preset ${preset}"`,
    `                     /translation="${construct.protein}"`,
    `     misc_feature    1..${leftEnd}`,
    "                     /note=\"left: SV40 NLS-Zif268 3-finger-FokI ELD\"",
    `     misc_feature    ${f2aStart}..${f2aEnd}`,
    "                     /note=\"Dueñas 2025 F2A; ribosomal skip between terminal Gly and Pro\"",
    `     misc_feature    ${rightStart}..${codingEnd}`,
    "                     /note=\"right: SV40 NLS-Zif268 3-finger-FokI KKR\"",
    "ORIGIN",
    ...origin,
    "//",
  ].join("\n");
}
