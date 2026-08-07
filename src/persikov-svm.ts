import type { Candidate, Finger } from "./design-engine.ts";

const AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY";
const DNA_BASES = ["A", "C", "G", "T"] as const;
const FEATURE_COUNT = 7 * DNA_BASES.length * AMINO_ACIDS.length;
const TEMPERATURE = 0.25;
const JUNCTION_ALPHA = 0.75;

type PwmColumn = readonly [number, number, number, number];

export type PersikovModel = {
  source: "Persikov-Singh-expanded-linear-SVM";
  weights: Float64Array;
};

export function parsePersikovLinearModel(text: string): PersikovModel {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines[0]?.startsWith("SVM-light Version")) {
    throw new Error("SVM-light modelではありません。");
  }
  if (!/^0\s+# kernel type/.test(lines[1] ?? "")) {
    throw new Error("expanded linear model（SVMl7.mod）を選択してください。");
  }

  const supportVectorStart = lines.findIndex((line) =>
    line.includes("# threshold b"),
  ) + 1;
  if (supportVectorStart <= 0) {
    throw new Error("SVM-light headerを解析できません。");
  }

  const weights = new Float64Array(FEATURE_COUNT);
  for (const line of lines.slice(supportVectorStart)) {
    const fields = line.split("#", 1)[0].trim().split(/\s+/);
    const coefficient = Number(fields[0]);
    if (!Number.isFinite(coefficient)) continue;
    for (const field of fields.slice(1)) {
      const [rawIndex, rawValue] = field.split(":");
      const index = Number(rawIndex) - 1;
      const value = Number(rawValue);
      if (index >= 0 && index < weights.length && Number.isFinite(value)) {
        weights[index] += coefficient * value;
      }
    }
  }

  if (!weights.some((value) => value !== 0)) {
    throw new Error("SVM weightが空です。");
  }
  return { source: "Persikov-Singh-expanded-linear-SVM", weights };
}

function softmaxScores(scores: number[]): number[] {
  const maximum = Math.max(...scores);
  const exponentials = scores.map((score) =>
    Math.exp((score - maximum) / TEMPERATURE),
  );
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function fingerPwm(model: PersikovModel, helix: string): PwmColumn[] {
  if (helix.length !== 7 || [...helix].some((aa) => !AMINO_ACIDS.includes(aa))) {
    throw new Error(`Unsupported recognition helix: ${helix}`);
  }
  const contactResidues = [
    helix[6],
    helix[3],
    helix[0],
    helix[2],
    helix[2],
    helix[0],
    helix[6],
  ];
  const sites: string[] = [];
  const scores: number[] = [];

  for (const b1 of DNA_BASES) {
    for (const b2 of DNA_BASES) {
      for (const b3 of DNA_BASES) {
        for (const b4 of DNA_BASES) {
          const site = `${b1}${b2}${b3}${b4}`;
          const contactBases = [b1, b2, b3, b4, b3, b4, b2];
          let score = 0;
          for (let contact = 0; contact < 7; contact += 1) {
            const aminoAcid = AMINO_ACIDS.indexOf(contactResidues[contact]);
            const base = DNA_BASES.indexOf(contactBases[contact]);
            const feature = contact * 80 + aminoAcid * 4 + base;
            score += model.weights[feature];
          }
          sites.push(site);
          scores.push(score);
        }
      }
    }
  }

  const probabilities = softmaxScores(scores);
  return [0, 1, 2, 3].map((position) =>
    DNA_BASES.map((base) =>
      probabilities.reduce(
        (sum, probability, index) =>
          sum + (sites[index][position] === base ? probability : 0),
        0,
      ),
    ) as [number, number, number, number],
  );
}

function mergeJunction(
  nextFingerFirst: PwmColumn,
  previousFingerLast: PwmColumn,
): PwmColumn {
  const values = DNA_BASES.map((_, index) =>
    nextFingerFirst[index] ** JUNCTION_ALPHA *
    previousFingerLast[index] ** (1 - JUNCTION_ALPHA),
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => value / total) as [number, number, number, number];
}

export function predictArrayPwm(
  model: PersikovModel,
  fingersNtoC: readonly Pick<Finger, "helix">[],
): PwmColumn[] {
  const dnaOrder = [...fingersNtoC].reverse();
  const first = dnaOrder[0];
  if (!first) return [];
  const result = fingerPwm(model, first.helix);
  for (const finger of dnaOrder.slice(1)) {
    const next = fingerPwm(model, finger.helix);
    result[result.length - 1] = mergeJunction(next[0], result[result.length - 1]);
    result.push(...next.slice(1));
  }
  return result;
}

export function persikovTargetFit(
  model: PersikovModel,
  fingersNtoC: readonly Pick<Finger, "helix">[],
  target: string,
): number {
  const pwm = predictArrayPwm(model, fingersNtoC);
  if (!target.length || pwm.length < target.length) return 0;
  // The model emits 3n core positions plus the terminal 3′ context base.
  // ZFN half-sites provide the 3n core, so the last PWM column is marginalized.
  let logProbability = 0;
  for (let index = 0; index < target.length; index += 1) {
    const base = DNA_BASES.indexOf(target[index] as (typeof DNA_BASES)[number]);
    if (base < 0) return 0;
    logProbability += Math.log(Math.max(pwm[index][base], 1e-12));
  }
  return Math.exp(logProbability / target.length);
}

export function addPersikovScores(
  candidates: readonly Candidate[],
  model: PersikovModel,
): Candidate[] {
  return candidates.map((candidate) => {
    if (candidate.leftSkipAfterFinger !== null || candidate.rightSkipAfterFinger !== null) {
      return { ...candidate, persikovTargetFit: undefined };
    }
    const left = persikovTargetFit(
      model,
      candidate.leftFingers,
      candidate.leftRecognition,
    );
    const right = persikovTargetFit(
      model,
      candidate.rightFingers,
      candidate.rightRecognition,
    );
    return { ...candidate, persikovTargetFit: Math.sqrt(left * right) };
  });
}
