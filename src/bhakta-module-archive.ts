import {
  INTERFINGER_LINKER,
  MODULE_COUNT,
  moduleArchive,
  type ModuleRecommendation,
} from "./module-archive.ts";
import type { ZfnArray, ZfnFinger } from "./zfn-array.ts";

// Bhakta et al. (2013), DOI 10.1101/gr.143693.112, assembled 3-6-finger
// arrays from the public Barbas one-finger archive. The invariant Sp1C
// framework and fixed terminal sequences follow Zinc Finger Tools / Mandell
// & Barbas (2006), DOI 10.1093/nar/gkl209.
export const BHAKTA_MODULE_COUNT = MODULE_COUNT;
export const BHAKTA_B_SCORE_CUTOFF = 15;
export const BHAKTA_N_TERMINAL_FIXED = "LEPGEKP";
export const BHAKTA_N_TERMINAL_BACKBONE = "YKCPECGKSFS";
export const BHAKTA_C_TERMINAL_BACKBONE = "HQRTH";
export const BHAKTA_C_TERMINAL_FIXED = "TGKKTS";
export const BHAKTA_FINGER_LINKER = INTERFINGER_LINKER;

export type BhaktaFinger = ZfnFinger & {
  bScore: number;
  recommendation: ModuleRecommendation;
  requiresTsoContext: boolean;
  tsoCompatible: boolean;
};

export type BhaktaArray = ZfnArray & {
  method: "bhakta-2013";
  fingers: readonly BhaktaFinger[];
  bScore: number;
  tsoIssues: number;
  favorableModules: number;
  unfavorableModules: number;
  nTerminalFixed: string;
  cTerminalFixed: string;
};

function fingerProtein(helix: string): string {
  return `${BHAKTA_N_TERMINAL_BACKBONE}${helix}${BHAKTA_C_TERMINAL_BACKBONE}`;
}

/**
 * Build a 3-6-finger extended modular-assembly array for a 5'->3'
 * recognition strand. C2H2 arrays bind DNA antiparallel, so the protein
 * order is the reverse of the triplet order on the recognition strand.
 */
export function buildBhaktaArray(
  recognition: string,
  threePrimeFlank?: string,
): BhaktaArray | null {
  if (!/^[ACGT]+$/.test(recognition) || recognition.length % 3 !== 0) return null;
  const fingerCount = recognition.length / 3;
  if (fingerCount < 3 || fingerCount > 6) return null;

  const triplets = Array.from({ length: fingerCount }, (_, index) =>
    recognition.slice(index * 3, index * 3 + 3),
  );
  if (triplets.some((triplet) => !moduleArchive[triplet])) return null;

  const recognitionOrder = triplets.map((triplet, index) => {
    const module = moduleArchive[triplet];
    const neighboringBase = triplets[index + 1]?.[0] ?? threePrimeFlank;
    const tsoCompatible =
      !module.requiresTsoContext || neighboringBase === "G" || neighboringBase === "T";
    return {
      triplet,
      helix: module.helix,
      source: `Bhakta/Barbas ${triplet}`,
      protein: fingerProtein(module.helix),
      bScore: module.bScore,
      recommendation: module.recommendation,
      requiresTsoContext: module.requiresTsoContext,
      tsoCompatible,
    };
  });

  const fingers: readonly BhaktaFinger[] = recognitionOrder
    .reverse()
    .map((finger, index) => ({ position: index + 1, ...finger }));
  const bScore = fingers.reduce((sum, finger) => sum + finger.bScore, 0);
  const tsoIssues = fingers.filter((finger) => !finger.tsoCompatible).length;
  const favorableModules = fingers.filter((finger) => finger.recommendation === "favorable").length;
  const unfavorableModules = fingers.filter((finger) => finger.recommendation === "unfavorable").length;
  const linkers = Array.from({ length: fingerCount - 1 }, () => BHAKTA_FINGER_LINKER);
  const protein = `${BHAKTA_N_TERMINAL_FIXED}${fingers
    .map((finger) => finger.protein)
    .join(BHAKTA_FINGER_LINKER)}${BHAKTA_C_TERMINAL_FIXED}`;

  return {
    recognition,
    method: "bhakta-2013",
    methodLabel: "Bhakta 2013",
    assembly: `extended MA ${fingerCount}F · B${bScore}`,
    fingerCount,
    fingers,
    linkers,
    protein,
    bScore,
    tsoIssues,
    favorableModules,
    unfavorableModules,
    nTerminalFixed: BHAKTA_N_TERMINAL_FIXED,
    cTerminalFixed: BHAKTA_C_TERMINAL_FIXED,
  };
}
