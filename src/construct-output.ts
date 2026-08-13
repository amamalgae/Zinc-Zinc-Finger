import type { Candidate } from "./design-engine.ts";

export type CodonPreset = "auxenochlorella" | "human";
export type FokIVariant = "ELD" | "KKR";

export type NucleicAcidDonor = {
  component: string;
  scientificName: string;
  detail: string;
};

export const ZFN_NUCLEIC_ACID_DONORS: readonly NucleicAcidDonor[] = [
  {
    component: "SV40 NLS（左右）",
    scientificName: "Betapolyomavirus macacae",
    detail: "simian virus 40由来NLS",
  },
  {
    component: "Sp1C ZFA framework（左右）",
    scientificName: "Homo sapiens",
    detail: "SP1由来framework",
  },
  {
    component: "FokI切断ドメイン（ELD / KKR）",
    scientificName: "Flavobacterium okeanokoites",
    detail: "FokI由来。ELD / KKRは人工変異",
  },
  {
    component: "T2A",
    scientificName: "Alphapermutotetravirus thoseae",
    detail: "Thosea asigna virus由来2A。先頭GSGは人工配列",
  },
];

export type ZfnConstruct = {
  name: string;
  arm: "left" | "right";
  fokIVariant: FokIVariant;
  protein: string;
  cds: string;
  gcPercent: number;
};

export type BicistronicZfnConstruct = {
  name: string;
  protein: string;
  cds: string;
  gcPercent: number;
  left: ZfnConstruct;
  right: ZfnConstruct;
  processedLeftProtein: string;
  processedRightProtein: string;
};

// UniProt P14870 residues 384-579 (196 aa), matching the residue numbering
// used for the Doyon ELD/KKR substitutions. The older J04623 translation has
// four additional N-terminal residues; its residues 388-583 are equivalent.
export const FOKI_CLEAVAGE_DOMAIN_WT =
  "QLVKSELEEKKSELRHKLKYVPHEYIELIEIARNSTQDRILEMKVMEFFMKVYGYRGKHLGGSRKPDGAIYTVGSPIDYGVIVDTKAYSGGYNLPIGQADEMQRYVEENQTRNKHINPNEWWKVYPSSVTEFKFLFVSGHFKGNYKAQLTRLNHITNCNGAVLSVEELLIGGEMIKAGTLTLEEVRRKFNNGEINF";

export const SV40_NLS_PREFIX = "MAPKKKRKV";

// Katayama & Yamamoto used a GSG-prefixed Thosea asigna virus 2A peptide
// between two ZFN monomers. Ribosomal skipping occurs between the terminal
// glycine and proline: the upstream product retains the first 20 residues and
// the downstream product starts with proline. DOI: 10.3390/ijms26157602.
export const GSG_T2A = "GSGEGRGSLLTCGDVEENPGP";

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

export function buildBicistronicZfn(candidate: Candidate, preset: CodonPreset): BicistronicZfnConstruct {
  const [left, right] = buildZfnPair(candidate, preset);
  const protein = `${left.protein}${GSG_T2A}${right.protein}`;
  const cds = `${optimizeCodingSequence(protein, preset)}${optimizeCodingSequence("*", preset)}`;
  return {
    name: `zfn_${candidate.id}_left_ELD_T2A_right_KKR`,
    protein,
    cds,
    gcPercent: gcPercent(cds),
    left,
    right,
    processedLeftProtein: `${left.protein}${GSG_T2A.slice(0, -1)}`,
    processedRightProtein: `${GSG_T2A.slice(-1)}${right.protein}`,
  };
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

export function bicistronicConstructsToFasta(
  constructs: BicistronicZfnConstruct[],
  kind: "protein" | "cds",
): string {
  return constructs.flatMap((construct) => [
    `>${construct.name} ${kind}; left FokI-ELD; GSG-T2A; right FokI-KKR; SV40_NLS_each_monomer`,
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

export function bicistronicConstructsToGenBank(
  constructs: BicistronicZfnConstruct[],
  preset: CodonPreset,
): string {
  return constructs.map((construct) => {
    const codingEnd = construct.cds.length - 3;
    const leftEnd = construct.left.protein.length * 3;
    const t2aStart = leftEnd + 1;
    const t2aEnd = (construct.left.protein.length + GSG_T2A.length) * 3;
    const rightStart = t2aEnd + 1;
    const downstreamProductStart = t2aEnd - 2;
    const rightNlsEnd = rightStart + SV40_NLS_PREFIX.length * 3 - 1;
    const origin = wrap(construct.cds.toLowerCase(), 60).map((line, index) => {
      const groups = line.match(/.{1,10}/g)?.join(" ") ?? line;
      return `${String(index * 60 + 1).padStart(9)} ${groups}`;
    });
    return [
      `LOCUS       ${construct.name.slice(0, 16).padEnd(16)} ${String(construct.cds.length).padStart(7)} bp    DNA     linear   SYN 01-JAN-2000`,
      "DEFINITION  Synthetic bicistronic left-ELD/GSG-T2A/right-KKR ZFN coding sequence.",
      "ACCESSION   .",
      "VERSION     .",
      "KEYWORDS    synthetic construct; zinc finger nuclease; T2A.",
      "SOURCE      synthetic DNA construct",
      "  ORGANISM  synthetic DNA construct",
      "FEATURES             Location/Qualifiers",
      `     CDS             1..${codingEnd}`,
      `                     /gene="${construct.name}"`,
      `                     /note="single ORF; SV40 NLS on each monomer; Sp1C ZFA; left FokI-ELD; GSG-T2A; right FokI-KKR; codon preset ${preset}; nucleic-acid donors (4 taxa): Betapolyomavirus macacae, Homo sapiens, Flavobacterium okeanokoites, Alphapermutotetravirus thoseae"`,
      `                     /translation="${construct.protein}"`,
      `     misc_feature    1..${leftEnd}`,
      "                     /note=\"left ZFN: SV40 NLS (Betapolyomavirus macacae)-Sp1C ZFA (Homo sapiens)-linker-FokI ELD (Flavobacterium okeanokoites; engineered ELD mutations)\"",
      `     misc_feature    ${t2aStart}..${t2aEnd}`,
      "                     /note=\"artificial GSG followed by Thosea asigna virus 2A (species Alphapermutotetravirus thoseae); ribosomal skip between terminal Gly and Pro\"",
      `     misc_feature    ${rightStart}..${codingEnd}`,
      "                     /note=\"right ZFN: SV40 NLS (Betapolyomavirus macacae)-Sp1C ZFA (Homo sapiens)-linker-FokI KKR (Flavobacterium okeanokoites; engineered KKR mutations)\"",
      `     mat_peptide     1..${t2aEnd - 3}`,
      "                     /product=\"left ZFN with 20-aa GSG-T2A remnant\"",
      `     mat_peptide     ${downstreamProductStart}..${codingEnd}`,
      "                     /product=\"Pro-right ZFN after T2A ribosomal skipping\"",
      `     misc_feature    ${rightStart}..${rightNlsEnd}`,
      "                     /note=\"downstream SV40 NLS coding region; initiating Met retained after T2A Pro as in Katayama 2025 construct\"",
      "ORIGIN",
      ...origin,
      "//",
    ].join("\n");
  }).join("\n");
}
