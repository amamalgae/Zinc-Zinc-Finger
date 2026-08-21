export type FingerPosition = 1 | 2 | 3;

export type ZhuModule = {
  triplet: string;
  helix: string;
  source: string;
};

type ModuleRow = {
  triplet: string;
  helices: readonly [string, string, string];
  sources: readonly [string, string, string];
};

// Position-specific Zif268 modules from Zhu et al. 2011, Supplementary Table S1.
// Recognition helices list residues -1, +1, +2, +3, +4, +5 and +6.
// DOI: 10.1242/dev.066779.
const rows: readonly ModuleRow[] = [
  { triplet: "AAG", helices: ["RSDNLTQ", "RSDNLTQ", "RSDNLTQ"], sources: ["Design", "Design", "Design"] },
  { triplet: "ACG", helices: ["RSDTLTQ", "RSDTLKN", "RSDTLKN"], sources: ["Design", "Design", "Design"] },
  { triplet: "AGA", helices: ["QSSHLKQ", "QSSHLKQ", "QSSHLKQ"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "AGG", helices: ["RSDHLTQ", "RSDHLTQ", "RSDHLTQ"], sources: ["Design", "Design", "Design"] },
  { triplet: "ATG", helices: ["RSDALTQ", "RSDALTQ", "RSDALTQ"], sources: ["Design", "Design", "Design"] },
  { triplet: "CAG", helices: ["RSDNLLE", "RSDNLSE", "RSDNLSE"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "CGG", helices: ["RSDHLSD", "RSDHLSD", "RSDHLSD"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GAA", helices: ["QKCNLVR", "QKCNLVR", "QLSNLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GAC", helices: ["LKGNLTR", "LKGNLTR", "LKGNLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GAG", helices: ["RSDNLTR", "RSDNLTR", "RSDNLTR"], sources: ["Sangamo", "Sangamo", "Sangamo"] },
  { triplet: "GAT", helices: ["HRNNLTR", "LSFNLTR", "LSFNLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GCA", helices: ["QSGDLTR", "QSGDLTR", "QRSTRKR"], sources: ["Barbas / Sangamo", "Barbas / Sangamo", "B1H selection"] },
  { triplet: "GCC", helices: ["ERGTLAR", "DRSDLTR", "DRSDLTR"], sources: ["B1H selection", "Sangamo", "Sangamo"] },
  { triplet: "GCG", helices: ["RSDDLTR", "RSDDLTR", "RSDDLTR"], sources: ["Sangamo", "Sangamo", "Sangamo"] },
  { triplet: "GCT", helices: ["HRQSLTR", "HRQSLTR", "HRQSLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GGA", helices: ["QKGHLTR", "QKGHLTR", "QRGHLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GGC", helices: ["EKSHLTR", "DRSHLAR", "DRSHLTR"], sources: ["B1H selection", "Sangamo", "Sangamo"] },
  { triplet: "GGG", helices: ["RSDHLTR", "RSDHLTR", "RSDHLTR"], sources: ["Barbas / Sangamo", "Barbas / Sangamo", "Barbas / Sangamo"] },
  { triplet: "GGT", helices: ["LAHHLTR", "CAHHLTR", "LSHHLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "GTA", helices: ["QSGALTR", "QSGALTR", "QSGALTR"], sources: ["Sangamo", "Sangamo", "Sangamo"] },
  { triplet: "GTC", helices: ["DRSALAR", "DRSALAR", "DRSALAR"], sources: ["Sangamo", "Sangamo", "Sangamo"] },
  { triplet: "GTG", helices: ["RSDALTR", "RSDALTR", "RSDALTR"], sources: ["Sangamo", "Sangamo", "Sangamo"] },
  { triplet: "GTT", helices: ["YRQSLTR", "FKSSLTR", "YRQSLTR"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "TAG", helices: ["RSDNLTK", "RSDNLTK", "RSDNLTK"], sources: ["Design", "Design", "Design"] },
  { triplet: "TGG", helices: ["RSDHLTT", "RSDHLTT", "RSDHLTT"], sources: ["Zif268", "Zif268", "Zif268"] },
  { triplet: "TGT", helices: ["LRHHLVG", "LRHHLVG", "LRHHLTG"], sources: ["B1H selection", "B1H selection", "B1H selection"] },
  { triplet: "TTG", helices: ["RSDALRK", "RSDALRK", "RSDALRK"], sources: ["Design", "Design", "Design"] },
];

export const ZHU_TRIPLET_COUNT = rows.length;
export const ZHU_MODULE_COUNT = rows.length * 3;

export const zhuModuleArchive: Readonly<Record<string, readonly [ZhuModule, ZhuModule, ZhuModule]>> =
  Object.freeze(Object.fromEntries(rows.map((row) => [
    row.triplet,
    Object.freeze(row.helices.map((helix, index) => Object.freeze({
      triplet: row.triplet,
      helix,
      source: row.sources[index],
    }))) as unknown as readonly [ZhuModule, ZhuModule, ZhuModule],
  ])));

export function getZhuModule(triplet: string, position: FingerPosition): ZhuModule | null {
  return zhuModuleArchive[triplet]?.[position - 1] ?? null;
}

// Native mouse Egr1/Zif268 three-finger framework (UniProt P08046).
// Each recognition helix is replaced with the position-specific Zhu module.
const ZIF268_PARTS = {
  1: { prefix: "YACPVESCDRRFS", suffix: "HIRIHTGQKP" },
  2: { prefix: "FQCRICMRNFS", suffix: "HIRTHTGEKP" },
  3: { prefix: "FACDICGRKFA", suffix: "HTKIHLRQK" },
} as const;

export function zif268FingerSequence(position: FingerPosition, helix: string): string {
  const part = ZIF268_PARTS[position];
  return `${part.prefix}${helix}${part.suffix}`;
}

export function zif268ArraySequence(helices: readonly [string, string, string]): string {
  return helices.map((helix, index) => zif268FingerSequence((index + 1) as FingerPosition, helix)).join("");
}
