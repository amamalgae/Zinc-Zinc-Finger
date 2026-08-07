export type ModuleRecommendation = "favorable" | "unfavorable" | "not-evaluated";

export type ZincFingerModule = {
  triplet: string;
  helix: string;
  recommendation: ModuleRecommendation;
  requiresTsoContext: boolean;
  bScore: number;
};

// Experimentally selected Barbas one-finger archive.
// Recognition helices are positions -1, +1, +2, +3, +4, +5, +6.
// Sources: Bhakta & Segal (2010), DOI 10.1007/978-1-60761-753-2_1;
// Bhakta et al. (2013), DOI 10.1101/gr.143693.112.
// B-scores are the published per-module values in Bhakta et al. Fig. 4A /
// Supplemental Table S2. They are explicit because four module scores differ
// from the otherwise useful simple contact-counting rule; ATC is also present
// in the 2010 archive but was absent from the earlier 2006 ZF Tools set.
const archiveRows: Array<[string, string, ModuleRecommendation, number]> = [
  ["AAA", "QRANLRA", "not-evaluated", 2],
  ["AAC", "DSGNLRV", "favorable", 1],
  ["AAG", "RKDNLKN", "not-evaluated", 2],
  ["AAT", "TTGNLTV", "not-evaluated", 1],
  ["ACA", "SPADLTR", "favorable", 0],
  ["ACC", "DKKDLTR", "not-evaluated", 0],
  ["ACG", "RTDTLRD", "not-evaluated", 1],
  ["ACT", "THLDLIR", "favorable", 0],
  ["AGA", "QLAHLRA", "not-evaluated", 1],
  ["AGG", "RSDHLTN", "not-evaluated", 1],
  ["AGT", "HRTTLTN", "unfavorable", 0],
  ["ATA", "QKSSLIA", "not-evaluated", 1],
  ["ATC", "DPGALRV", "not-evaluated", 0],
  ["ATG", "RRDELNV", "unfavorable", 1],
  ["ATT", "HKNALQN", "not-evaluated", 0],
  ["CAA", "QSGNLTE", "not-evaluated", 2],
  ["CAC", "SKKALTE", "favorable", 0],
  ["CAG", "RADNLTE", "favorable", 2],
  ["CAT", "TSGNLTE", "unfavorable", 1],
  ["CCA", "TSHSLTE", "favorable", 0],
  ["CCC", "SKKHLAE", "unfavorable", 0],
  ["CCG", "RNDTLTE", "favorable", 1],
  ["CCT", "TKNSLTE", "favorable", 0],
  ["CGA", "QSGHLTE", "not-evaluated", 1],
  ["CGC", "HTGHLLE", "favorable", 0],
  ["CGG", "RSDKLTE", "not-evaluated", 1],
  ["CGT", "SRRTCRA", "favorable", 0],
  ["CTA", "QNSTLTE", "not-evaluated", 1],
  ["CTG", "RNDALTE", "unfavorable", 1],
  ["CTT", "TTGALTE", "unfavorable", 0],
  ["GAA", "QSSNLVR", "not-evaluated", 3],
  ["GAC", "DPGNLVR", "not-evaluated", 2],
  ["GAG", "RSDNLVR", "not-evaluated", 3],
  ["GAT", "TSGNLVR", "not-evaluated", 2],
  ["GCA", "QSGDLRR", "not-evaluated", 2],
  ["GCC", "DCRDLAR", "not-evaluated", 1],
  ["GCG", "RSDDLVR", "not-evaluated", 2],
  ["GCT", "TSGELVR", "not-evaluated", 1],
  ["GGA", "QRAHLER", "not-evaluated", 2],
  ["GGC", "DPGHLVR", "favorable", 1],
  ["GGG", "RSDKLVR", "not-evaluated", 2],
  ["GGT", "TSGHLVR", "not-evaluated", 1],
  ["GTA", "QSSSLVR", "not-evaluated", 2],
  ["GTC", "DPGALVR", "not-evaluated", 1],
  ["GTG", "RSDELVR", "not-evaluated", 2],
  ["GTT", "TSGSLVR", "not-evaluated", 1],
  ["TAG", "REDNLHT", "favorable", 2],
  ["TGA", "QAGHLAS", "not-evaluated", 1],
  ["TGG", "RSDHLTT", "not-evaluated", 1],
];

function bivalentContact(base: string, residue: string): number {
  if (base === "G" && residue === "R") return 1;
  if (base === "A" && (residue === "Q" || residue === "N")) return 1;
  return 0;
}

export function calculateModuleBScore(triplet: string, helix: string): number {
  return (
    bivalentContact(triplet[0], helix[6]) +
    bivalentContact(triplet[1], helix[3]) +
    bivalentContact(triplet[2], helix[0])
  );
}

export const moduleArchive: Readonly<Record<string, ZincFingerModule>> =
  Object.freeze(
    Object.fromEntries(
      archiveRows.map(([triplet, helix, recommendation, publishedBScore]) => [
        triplet,
        Object.freeze({
          triplet,
          helix,
          recommendation,
          requiresTsoContext:
            triplet[0] === "G" && triplet[2] === "G" && helix[2] === "D",
          bScore: publishedBScore,
        }),
      ]),
    ),
  );

export const MODULE_COUNT = archiveRows.length;
export const SP1C_N_TERMINAL_FRAMEWORK = "YKCPECGKSFS";
export const SP1C_C_TERMINAL_FRAMEWORK = "HQRTH";
export const INTERFINGER_LINKER = "TGEKP";
// Paschon et al. 2019 selected this linker ("1c") to bridge one
// unrecognized base between adjacent fingers. DOI: 10.1038/s41467-019-08867-x.
export const BASE_SKIPPING_LINKER_1C = "THPRAPIPKP";

export function fullFingerSequence(helix: string): string {
  return `${SP1C_N_TERMINAL_FRAMEWORK}${helix}${SP1C_C_TERMINAL_FRAMEWORK}`;
}
