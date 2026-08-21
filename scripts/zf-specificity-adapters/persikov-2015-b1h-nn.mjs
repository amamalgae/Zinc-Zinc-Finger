// Research-only adapter scaffold for Persikov et al. 2015.
// DOI: 10.1093/nar/gku1395
//
// The published nearest-neighbour algorithm predicts each DNA base position
// independently from a six-residue ZF core (-1, +1, +2, +3, +5, +6). For a
// query core C it first uses exact observations when available; otherwise it
// considers Hamming-distance-1 neighbours, ranking which residue is allowed to
// differ according to structural evidence for the DNA position, then by PAM30
// substitution similarity. The top 25 neighbours are combined with
// similarity-derived weights.
//
// This file intentionally does not embed the B1H frequency tables. The public
// Princeton download requires the downloader to provide name, affiliation and
// email and states non-commercial-use terms. Those data must therefore be
// obtained and reviewed explicitly before they are committed or redistributed.

export const PERSIKOV_2015_DOI = "10.1093/nar/gku1395";
export const CORE_RESIDUE_POSITIONS = [-1, 1, 2, 3, 5, 6];
export const MAX_NEIGHBORS = 25;

// Published order in which a Hamming-distance-1 substitution is relaxed for
// each DNA base position (Persikov et al. 2015 Methods).
export const RELAXATION_ORDER = Object.freeze({
  0: Object.freeze([-1, 2, 3]),
  1: Object.freeze([2, -1, 6]),
  2: Object.freeze([6, 3, 2]),
});

export function recognitionCoreFromHelix(helix) {
  if (typeof helix !== "string" || helix.length !== 7) {
    throw new Error("Expected a 7-aa recognition helix.");
  }
  // Recognition helix string is -1,+1,+2,+3,+4,+5,+6.
  return `${helix[0]}${helix[1]}${helix[2]}${helix[3]}${helix[5]}${helix[6]}`;
}

export function hammingDistance(left, right) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let i = 0; i < left.length; i += 1) {
    distance += Number(left[i] !== right[i]);
  }
  return distance;
}

export function cognateTripletLogLikelihood(pwm, triplet, floor = 1e-12) {
  if (!Array.isArray(pwm) || pwm.length !== 3 || typeof triplet !== "string" || triplet.length !== 3) {
    throw new Error("Expected a 3-position PWM and 3-bp triplet.");
  }
  const bases = "ACGT";
  let value = 0;
  for (let i = 0; i < 3; i += 1) {
    const baseIndex = bases.indexOf(triplet[i]);
    if (baseIndex < 0) throw new Error(`Unsupported DNA base: ${triplet[i]}`);
    value += Math.log(Math.max(Number(pwm[i][baseIndex]) || 0, floor));
  }
  return value / 3;
}

export function aggregateFingerFits(logFits) {
  if (!logFits.length) return { mean: Number.NaN, weakest: Number.NaN };
  return {
    mean: logFits.reduce((sum, value) => sum + value, 0) / logFits.length,
    weakest: Math.min(...logFits),
  };
}
