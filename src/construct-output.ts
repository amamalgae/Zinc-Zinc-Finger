import type { Candidate } from "./design-engine.ts";

export type CodonPreset = "auxenochlorella" | "human";
export type FokIVariant = "ELD" | "KKR";

export type ZfnConstruct = {
  name: string;
  arm: "left" | "right";
  fokIVariant: FokIVariant;
  protein: string;
  cds: string;
  gcPercent: number;
};

// UniProt P14870 residues 384-579 (196 aa), matching the residue numbering
// used for the Doyon ELD/KKR substitutions. The older J04623 translation has
// four additional N-terminal residues; its residues 388-583 are equivalent.
export const FOKI_CLEAVAGE_DOMAIN_WT =
  "QLVKSELEEKKSELRHKLKYVPHEYIELIEIARNSTQDRILEMKVMEFFMKVYGYRGKHLGGSRKPDGAIYTVGSPIDYGVIVDTKAYSGGYNLPIGQADEMQRYVEENQTRNKHINPNEWWKVYPSSVTEFKFLFVSGHFKGNYKAQLTRLNHITNCNGAVLSVEELLIGGEMIKAGTLTLEEVRRKFNNGEINF";

export const SV40_NLS_PREFIX = "MAPKKKRKV";

function mutateFokI(mutations: Array<[number, string, string]>): string {
  const sequence = FOKI_CLEAVAGE_DOMAIN_WT.split("");
  for (const [fullLengthPosition, expected, replacement] of mutations) {
    const index = fullLengthPosition - 384;
    if (sequence[index] !== expected) {
      throw new Error(`FokI residue ${fullLengthPosition} is not ${expected}`);
    }
    sequence[index] = replacement;
  }
  return sequence.join("");
}

export const FOKI_ELD = mutateFokI([
  [486, "Q", "E"],
  [496, "N", "D"],
  [499, "I", "L"],
]);

export const FOKI_KKR = mutateFokI([
  [490, "E", "K"],
  [537, "H", "R"],
  [538, "I", "K"],
]);

const CODONS: Record<CodonPreset, Record<string, string[]>> = {
  auxenochlorella: {
    A: ["GCC", "GCA", "GCG"], C: ["TGC"], D: ["GAC", "GAT"], E: ["GAG", "GAA"],
    F: ["TTC", "TTT"], G: ["GGC", "GGG", "GGT"], H: ["CAC", "CAT"], I: ["ATC", "ATT"],
    K: ["AAG"], L: ["CTG", "CTC", "TTG"], M: ["ATG"], N: ["AAC", "AAT"],
    P: ["CCC", "CCA", "CCG"], Q: ["CAG", "CAA"], R: ["CGC", "CGG", "AGG", "AGA", "CGA"],
    S: ["AGC", "TCC", "TCA", "TCT"], T: ["ACC", "ACA", "ACG"], V: ["GTG", "GTC", "GTT"],
    W: ["TGG"], Y: ["TAC", "TAT"], "*": ["TGA"],
  },
  human: {
    A: ["GCC", "GCT", "GCA"], C: ["TGC", "TGT"], D: ["GAC", "GAT"], E: ["GAG", "GAA"],
    F: ["TTC", "TTT"], G: ["GGC", "GGG", "GGA"], H: ["CAC", "CAT"], I: ["ATC", "ATT"],
    K: ["AAG", "AAA"], L: ["CTG", "CTC", "TTG"], M: ["ATG"], N: ["AAC", "AAT"],
    P: ["CCC", "CCT", "CCA"], Q: ["CAG", "CAA"], R: ["CGC", "AGG", "CGG", "AGA"],
    S: ["AGC", "TCC", "TCT"], T: ["ACC", "ACA", "ACT"], V: ["GTG", "GTC", "GTT"],
    W: ["TGG"], Y: ["TAC", "TAT"], "*": ["TGA", "TAA"],
  },
};

const FORBIDDEN_SITES = ["GGTCTC", "GAGACC", "CGTCTC", "GAGACG", "GCTCTTC", "GAAGAGC"];

function sequencePenalty(sequence: string): number {
  let penalty = 0;
  if (/(A{6}|C{6}|G{6}|T{6})/.test(sequence)) penalty += 100;
  if (FORBIDDEN_SITES.some((site) => sequence.endsWith(site))) penalty += 100;
  const suffix = sequence.slice(-15);
  if (suffix.length === 15 && sequence.slice(0, -15).includes(suffix)) penalty += 4;
  return penalty;
}

export function optimizeCodingSequence(protein: string, preset: CodonPreset): string {
  const table = CODONS[preset];
  let dna = "";
  for (let index = 0; index < protein.length; index += 1) {
    const aminoAcid = protein[index];
    const options = table[aminoAcid];
    if (!options) throw new Error(`Unsupported amino acid: ${aminoAcid}`);
    const ranked = options.map((codon, optionIndex) => ({
      codon,
      score: optionIndex * 0.35 + sequencePenalty(dna + codon) + ((index + optionIndex) % options.length) * 0.01,
    }));
    ranked.sort((left, right) => left.score - right.score);
    dna += ranked[0].codon;
  }
  return dna;
}

export function translateDna(dna: string): string {
  const geneticCode = Object.fromEntries(
    Object.entries(CODONS.human).flatMap(([aminoAcid, codons]) => codons.map((codon) => [codon, aminoAcid])),
  );
  // Add synonymous codons not selected by the optimization presets.
  Object.assign(geneticCode, {
    GCG: "A", TGT: "C", GAT: "D", GAA: "E", TTT: "F", GGT: "G", GGA: "G",
    CAT: "H", ATT: "I", ATA: "I", AAA: "K", CTT: "L", CTA: "L", TTA: "L",
    AAT: "N", CCG: "P", CCA: "P", CAA: "Q", CGT: "R", CGA: "R", AGA: "R",
    TCG: "S", TCA: "S", AGT: "S", ACT: "T", ACG: "T", GTT: "V", GTA: "V",
    TAT: "Y", TAG: "*", TAA: "*",
  });
  let protein = "";
  for (let index = 0; index + 2 < dna.length; index += 3) {
    protein += geneticCode[dna.slice(index, index + 3)] ?? "X";
  }
  return protein;
}

function gcPercent(dna: string): number {
  return 100 * (dna.match(/[GC]/g)?.length ?? 0) / Math.max(1, dna.length);
}

export function buildZfnPair(candidate: Candidate, preset: CodonPreset): ZfnConstruct[] {
  const rows: Array<["left" | "right", FokIVariant, string, string]> = [
    ["left", "ELD", candidate.leftArrayProtein, FOKI_ELD],
    ["right", "KKR", candidate.rightArrayProtein, FOKI_KKR],
  ];
  return rows.map(([arm, fokIVariant, arrayProtein, fokI]) => {
    const protein = `${SV40_NLS_PREFIX}${arrayProtein}${candidate.fokILinker}${fokI}`;
    const cds = `${optimizeCodingSequence(protein, preset)}${optimizeCodingSequence("*", preset)}`;
    return {
      name: `zfn_${candidate.id}_${arm}_${fokIVariant}`,
      arm,
      fokIVariant,
      protein,
      cds,
      gcPercent: gcPercent(cds),
    };
  });
}

function wrap(value: string, width: number): string[] {
  const rows: string[] = [];
  for (let index = 0; index < value.length; index += width) rows.push(value.slice(index, index + width));
  return rows;
}

export function constructsToFasta(constructs: ZfnConstruct[], kind: "protein" | "cds"): string {
  return constructs.flatMap((construct) => [
    `>${construct.name} ${kind}; FokI-${construct.fokIVariant}; SV40_NLS`,
    ...wrap(construct[kind], 70),
  ]).join("\n");
}

export function constructsToGenBank(constructs: ZfnConstruct[], preset: CodonPreset): string {
  return constructs.map((construct) => {
    const codingEnd = construct.cds.length - 3;
    const origin = wrap(construct.cds.toLowerCase(), 60).map((line, index) => {
      const groups = line.match(/.{1,10}/g)?.join(" ") ?? line;
      return `${String(index * 60 + 1).padStart(9)} ${groups}`;
    });
    return [
      `LOCUS       ${construct.name.slice(0, 16).padEnd(16)} ${String(construct.cds.length).padStart(7)} bp    DNA     linear   SYN 01-JAN-2000`,
      `DEFINITION  Synthetic ${construct.arm} ZFN coding sequence with FokI-${construct.fokIVariant}.`,
      "ACCESSION   .",
      "VERSION     .",
      "KEYWORDS    synthetic construct; zinc finger nuclease.",
      "SOURCE      synthetic DNA construct",
      "  ORGANISM  synthetic DNA construct",
      "FEATURES             Location/Qualifiers",
      `     CDS             1..${codingEnd}`,
      `                     /gene="${construct.name}"`,
      `                     /note="SV40 NLS; Sp1C ZFA; FokI-${construct.fokIVariant}; codon preset ${preset}"`,
      `                     /translation="${construct.protein}"`,
      "ORIGIN",
      ...origin,
      "//",
    ].join("\n");
  }).join("\n");
}
