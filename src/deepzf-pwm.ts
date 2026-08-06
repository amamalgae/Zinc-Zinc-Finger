import { deepZfPwmWeights } from "./deepzf-pwm-weights.ts";

const AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY";
const DNA_BASES = ["A", "C", "G", "T"] as const;

type DnaBase = (typeof DNA_BASES)[number];
export type PwmRow = readonly [number, number, number, number];
export type FingerPwmPrediction = {
  pwm: readonly [PwmRow, PwmRow, PwmRow];
  topTriplet: string;
  targetJointProbability: number;
  targetMeanProbability: number;
  targetRank: number;
};

type Tensor = { shape: readonly number[]; base64: string };
type DecodedModel = {
  dense1Kernel: Float32Array;
  dense1Bias: Float32Array;
  dense2Kernel: Float32Array;
  dense2Bias: Float32Array;
  positionKernels: readonly [Float32Array, Float32Array, Float32Array];
  positionBiases: readonly [Float32Array, Float32Array, Float32Array];
};

let decodedModel: DecodedModel | undefined;

function decodeTensor(tensor: Tensor): Float32Array {
  const binary = atob(tensor.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const view = new DataView(bytes.buffer);
  const values = new Float32Array(bytes.byteLength / 4);
  for (let index = 0; index < values.length; index += 1) {
    values[index] = view.getFloat32(index * 4, true);
  }
  return values;
}

function model(): DecodedModel {
  if (decodedModel) return decodedModel;

  decodedModel = {
    dense1Kernel: decodeTensor(deepZfPwmWeights.dense1Kernel),
    dense1Bias: decodeTensor(deepZfPwmWeights.dense1Bias),
    dense2Kernel: decodeTensor(deepZfPwmWeights.dense2Kernel),
    dense2Bias: decodeTensor(deepZfPwmWeights.dense2Bias),
    positionKernels: [
      decodeTensor(deepZfPwmWeights.position1Kernel),
      decodeTensor(deepZfPwmWeights.position2Kernel),
      decodeTensor(deepZfPwmWeights.position3Kernel),
    ],
    positionBiases: [
      decodeTensor(deepZfPwmWeights.position1Bias),
      decodeTensor(deepZfPwmWeights.position2Bias),
      decodeTensor(deepZfPwmWeights.position3Bias),
    ],
  };
  return decodedModel;
}

function oneHotEncode(sequence: string): Float32Array {
  const encoded = new Float32Array(sequence.length * AMINO_ACIDS.length);
  for (let position = 0; position < sequence.length; position += 1) {
    const aminoAcidIndex = AMINO_ACIDS.indexOf(sequence[position]);
    if (aminoAcidIndex < 0) {
      throw new Error(`Unsupported amino acid in DeepZF input: ${sequence[position]}`);
    }
    encoded[position * AMINO_ACIDS.length + aminoAcidIndex] = 1;
  }
  return encoded;
}

function dense(
  input: Float32Array,
  kernel: Float32Array,
  bias: Float32Array,
  activation: (value: number) => number,
): Float32Array {
  const output = new Float32Array(bias.length);
  for (let outputIndex = 0; outputIndex < bias.length; outputIndex += 1) {
    let value = bias[outputIndex];
    for (let inputIndex = 0; inputIndex < input.length; inputIndex += 1) {
      value += input[inputIndex] * kernel[inputIndex * bias.length + outputIndex];
    }
    output[outputIndex] = activation(value);
  }
  return output;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function softmax(values: Float32Array): PwmRow {
  const maximum = Math.max(...values);
  const exponentials = Array.from(values, (value) => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total) as [
    number,
    number,
    number,
    number,
  ];
}

function predictPwmFromTwelveResidues(
  twelveResidues: string,
): readonly [PwmRow, PwmRow, PwmRow] {
  if (twelveResidues.length !== 12) {
    throw new Error(
      `DeepZF requires the 12 residues between Cys2 and His1, received ${twelveResidues}`,
    );
  }

  const input = oneHotEncode(twelveResidues);
  const weights = model();
  const hidden1 = dense(
    input,
    weights.dense1Kernel,
    weights.dense1Bias,
    sigmoid,
  );
  const hidden2 = dense(
    hidden1,
    weights.dense2Kernel,
    weights.dense2Bias,
    sigmoid,
  );

  return [0, 1, 2].map((position) => {
    const positionInput = hidden2.slice(position * 4, position * 4 + 4);
    return softmax(
      dense(
        positionInput,
        weights.positionKernels[position],
        weights.positionBiases[position],
        (value) => value,
      ),
    );
  }) as unknown as readonly [PwmRow, PwmRow, PwmRow];
}

function tripletProbability(
  pwm: readonly [PwmRow, PwmRow, PwmRow],
  triplet: string,
): number {
  return Array.from(triplet).reduce((probability, base, position) => {
    const baseIndex = DNA_BASES.indexOf(base as DnaBase);
    if (baseIndex < 0) throw new Error(`Unsupported DNA base: ${base}`);
    return probability * pwm[position][baseIndex];
  }, 1);
}

export function predictFingerPwm(
  helix: string,
  targetTriplet: string,
): FingerPwmPrediction {
  // In the Sp1C framework, the 12 residues between Cys2 and His1 are
  // GKSFS followed by the seven-residue recognition helix.
  return predictFingerPwmFromTwelveResidues(`GKSFS${helix}`, targetTriplet);
}

export function predictFingerPwmFromTwelveResidues(
  twelveResidues: string,
  targetTriplet: string,
): FingerPwmPrediction {
  const pwm = predictPwmFromTwelveResidues(twelveResidues);
  const rankedTriplets: Array<{ triplet: string; probability: number }> = [];

  for (const first of DNA_BASES) {
    for (const second of DNA_BASES) {
      for (const third of DNA_BASES) {
        const triplet = `${first}${second}${third}`;
        rankedTriplets.push({
          triplet,
          probability: tripletProbability(pwm, triplet),
        });
      }
    }
  }
  rankedTriplets.sort((left, right) => right.probability - left.probability);

  const targetJointProbability = tripletProbability(pwm, targetTriplet);
  return {
    pwm,
    topTriplet: rankedTriplets[0].triplet,
    targetJointProbability,
    targetMeanProbability: Math.cbrt(targetJointProbability),
    targetRank:
      rankedTriplets.findIndex(({ triplet }) => triplet === targetTriplet) + 1,
  };
}

export function meanDeepZfTargetFit(
  predictions: readonly FingerPwmPrediction[],
): number {
  if (!predictions.length) return 0;
  const meanLogProbability =
    predictions.reduce(
      (sum, prediction) =>
        sum + Math.log(Math.max(prediction.targetJointProbability, 1e-12)),
      0,
    ) /
    (predictions.length * 3);
  return Math.exp(meanLogProbability);
}
