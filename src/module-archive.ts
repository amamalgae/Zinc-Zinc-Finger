import {
  predictFingerPwm,
  type FingerPwmPrediction,
} from "./deepzf-pwm.ts";

export type ModuleRecommendation = "favorable" | "unfavorable" | "not-evaluated";

export type ZincFingerModule = {
  triplet: string;
  helix: string;
  recommendation: ModuleRecommendation;
  requiresTsoContext: boolean;
  bScore: number;
  deepZf: FingerPwmPrediction;
};

// Experimentally selected Barbas one-finger archive.
// Recognition helices are positions -1, +1, +2, +3, +4, +5, +6.
// Sources: Bhakta & Segal (2010), DOI 10.1007/978-1-60761-753-2_1;
// Bhakta et al. (2013), DOI 10.1101/gr.143693.112.
const archiveRows: Array<[string, string, ModuleRecommendation]> = [
  ["AAA", "QRANLRA", "not-evaluated"],
  ["AAC", "DSGNLRV", "favorable"],
  ["AAG", "RKDNLKN", "not-evaluated"],
  ["AAT", "TTGNLTV", "not-evaluated"],
  ["ACA", "SPADLTR", "favorable"],
  ["ACC", "DKKDLTR", "not-evaluated"],
  ["ACG", "RTDTLRD", "not-evaluated"],
  ["ACT", "THLDLIR", "favorable"],
  ["AGA", "QLAHLRA", "not-evaluated"],
  ["AGG", "RSDHLTN", "not-evaluated"],
  ["AGT", "HRTTLTN", "unfavorable"],
  ["ATA", "QKSSLIA", "not-evaluated"],
  ["ATG", "RRDELNV", "unfavorable"],
  ["ATT", "HKNALQN", "not-evaluated"],
  ["CAA", "QSGNLTE", "not-evaluated"],
  ["CAC", "SKKALTE", "favorable"],
  ["CAG", "RADNLTE", "favorable"],
  ["CAT", "TSGNLTE", "unfavorable"],
  ["CCA", "TSHSLTE", "favorable"],
  ["CCC", "SKKHLAE", "unfavorable"],
  ["CCG", "RNDTLTE", "favorable"],
  ["CCT", "TKNSLTE", "favorable"],
  ["CGA", "QSGHLTE", "not-evaluated"],
  ["CGC", "HTGHLLE", "favorable"],
  ["CGG", "RSDKLTE", "not-evaluated"],
  ["CGT", "SRRTCRA", "favorable"],
  ["CTA", "QNSTLTE", "not-evaluated"],
  ["CTG", "RNDALTE", "unfavorable"],
  ["CTT", "TTGALTE", "unfavorable"],
  ["GAA", "QSSNLVR", "not-evaluated"],
  ["GAC", "DPGNLVR", "not-evaluated"],
  ["GAG", "RSDNLVR", "not-evaluated"],
  ["GAT", "TSGNLVR", "not-evaluated"],
  ["GCA", "QSGDLRR", "not-evaluated"],
  ["GCC", "DCRDLAR", "not-evaluated"],
  ["GCG", "RSDDLVR", "not-evaluated"],
  ["GCT", "TSGELVR", "not-evaluated"],
  ["GGA", "QRAHLER", "not-evaluated"],
  ["GGC", "DPGHLVR", "favorable"],
  ["GGG", "RSDKLVR", "not-evaluated"],
  ["GGT", "TSGHLVR", "not-evaluated"],
  ["GTA", "QSSSLVR", "not-evaluated"],
  ["GTC", "DPGALVR", "not-evaluated"],
  ["GTG", "RSDELVR", "not-evaluated"],
  ["GTT", "TSGSLVR", "not-evaluated"],
  ["TAG", "REDNLHT", "favorable"],
  ["TGA", "QAGHLAS", "not-evaluated"],
  ["TGG", "RSDHLTT", "not-evaluated"],
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
      archiveRows.map(([triplet, helix, recommendation]) => [
        triplet,
        Object.freeze({
          triplet,
          helix,
          recommendation,
          requiresTsoContext: triplet.endsWith("G"),
          bScore: calculateModuleBScore(triplet, helix),
          deepZf: predictFingerPwm(helix, triplet),
        }),
      ]),
    ),
  );

export const MODULE_COUNT = archiveRows.length;
export const SP1C_N_TERMINAL_FRAMEWORK = "YKCPECGKSFS";
export const SP1C_C_TERMINAL_FRAMEWORK = "HQRTH";
export const INTERFINGER_LINKER = "TGEKP";

export function fullFingerSequence(helix: string): string {
  return `${SP1C_N_TERMINAL_FRAMEWORK}${helix}${SP1C_C_TERMINAL_FRAMEWORK}`;
}
