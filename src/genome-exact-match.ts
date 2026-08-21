export type ExactGenomeCandidate = {
  id: string;
  leftTop: string;
  rightTop: string;
  spacerLength: number;
};

export type GenomeSimilarityHit = {
  leftMismatches: number;
  rightMismatches: number;
  totalMismatches: number;
  spacerLength: number;
};

export type ExactGenomeCandidateSummary = {
  candidateId: string;
  exactPairMatches: number;
  extraExactMatches: number;
  /** Index 0 is exact, 1-4 are exact totals, index 5 is total >=5. */
  alternativeCountsByMismatch: number[];
  closestAlternative: GenomeSimilarityHit | null;
};

export type ExactGenomeMatchResult = {
  genomeBases: number;
  sequenceCount: number;
  fastaFiles: number;
  summaries: ExactGenomeCandidateSummary[];
};

export const GENOME_MAX_HALF_MISMATCHES = 4;
export const GENOME_LEGACY_MAX_TOTAL_MISMATCHES = 5;
/** Bhakta v3 uses a lossless either-half anchor at <=3 mismatches. */
export const GENOME_BHAKTA_ANCHOR_MAX_MISMATCHES = 3;
/** The anchored partner can differ at every base, so the displayed pair total can reach 21. */
export const GENOME_BHAKTA_MAX_TOTAL_MISMATCHES = 21;
export const GENOME_SPACER_LENGTHS = [5, 6, 7] as const;

const DISPLAY_MISMATCH_BUCKET_MAX = 5;
const COMPLEMENT: Readonly<Record<string, string>> = {
  A: "T",
  C: "G",
  G: "C",
  T: "A",
  N: "N",
};
const BASE_BITS: Readonly<Record<string, number>> = { A: 0, C: 1, G: 2, T: 3 };
const NINE_MER_MASK = (1 << 18) - 1;

type Orientation = 0 | 1;

type PreparedCandidate = {
  candidate: ExactGenomeCandidate;
  halfLength: 9 | 18;
  maxTotalMismatches: 5 | 21;
  orientations: readonly [
    { firstHalf: string; secondHalf: string },
    { firstHalf: string; secondHalf: string },
  ];
};

type SeedAnchor = {
  candidateIndex: number;
  orientation: Orientation;
  spacerLength: number;
  offset: number;
};

type CandidateAccumulator = {
  countsByMismatch: number[];
  exactBySpacer: Map<number, number>;
  closestNonExact: GenomeSimilarityHit | null;
};

export function reverseComplementGenomeSequence(value: string): string {
  return [...value.toUpperCase()]
    .reverse()
    .map((base) => COMPLEMENT[base] ?? "N")
    .join("");
}

export function normalizeGenomeSequenceLine(line: string): string {
  return line
    .toUpperCase()
    .replace(/[\s\d]/g, "")
    .replace(/[^ACGTN]/g, "N");
}

function addExactPairStarts(
  sequence: string,
  firstHalf: string,
  secondHalf: string,
  spacerLength: number,
  starts: Set<number>,
): void {
  const secondOffset = firstHalf.length + spacerLength;
  let position = sequence.indexOf(firstHalf);
  while (position >= 0) {
    if (sequence.startsWith(secondHalf, position + secondOffset)) starts.add(position);
    position = sequence.indexOf(firstHalf, position + 1);
  }
}

/** Compatibility helper for exact matching at the candidate's own spacer. */
export function countExactPairMatchesInSequence(
  sequence: string,
  candidate: ExactGenomeCandidate,
): number {
  const normalized = sequence.toUpperCase();
  const starts = new Set<number>();
  const reverseFirst = reverseComplementGenomeSequence(candidate.rightTop);
  const reverseSecond = reverseComplementGenomeSequence(candidate.leftTop);

  addExactPairStarts(
    normalized,
    candidate.leftTop.toUpperCase(),
    candidate.rightTop.toUpperCase(),
    candidate.spacerLength,
    starts,
  );
  addExactPairStarts(
    normalized,
    reverseFirst,
    reverseSecond,
    candidate.spacerLength,
    starts,
  );
  return starts.size;
}

function encodeNineMer(sequence: string): number {
  if (sequence.length !== 9) return -1;
  let code = 0;
  for (const base of sequence) {
    const bits = BASE_BITS[base];
    if (bits === undefined) return -1;
    code = (code << 2) | bits;
  }
  return code;
}

function replaceEncodedBase(code: number, position: number, bits: number): number {
  const shift = (8 - position) * 2;
  return (code & ~(3 << shift)) | (bits << shift);
}

function nineMerVariantCodes(sequence: string, maximumMismatches: 1 | 2): number[] {
  const original = encodeNineMer(sequence);
  if (original < 0) return [];
  const originalBits = [...sequence].map((base) => BASE_BITS[base]);
  const result = new Set<number>([original]);

  for (let first = 0; first < 9; first += 1) {
    for (let firstBits = 0; firstBits < 4; firstBits += 1) {
      if (firstBits === originalBits[first]) continue;
      const oneMismatch = replaceEncodedBase(original, first, firstBits);
      result.add(oneMismatch);
      if (maximumMismatches === 1) continue;

      for (let second = first + 1; second < 9; second += 1) {
        for (let secondBits = 0; secondBits < 4; secondBits += 1) {
          if (secondBits === originalBits[second]) continue;
          result.add(replaceEncodedBase(oneMismatch, second, secondBits));
        }
      }
    }
  }

  return [...result];
}

function hammingDistanceAt(
  sequence: string,
  start: number,
  expected: string,
  maximum: number,
): number | null {
  if (start < 0 || start + expected.length > sequence.length) return null;
  let mismatches = 0;
  for (let index = 0; index < expected.length; index += 1) {
    const observed = sequence[start + index];
    if (observed === "N") return null;
    if (observed !== expected[index]) {
      mismatches += 1;
      if (mismatches > maximum) return null;
    }
  }
  return mismatches;
}

function hitIsBetter(left: GenomeSimilarityHit, right: GenomeSimilarityHit): boolean {
  return (
    left.totalMismatches < right.totalMismatches ||
    (left.totalMismatches === right.totalMismatches
      && Math.max(left.leftMismatches, left.rightMismatches) < Math.max(right.leftMismatches, right.rightMismatches)) ||
    (left.totalMismatches === right.totalMismatches
      && Math.max(left.leftMismatches, left.rightMismatches) === Math.max(right.leftMismatches, right.rightMismatches)
      && left.leftMismatches < right.leftMismatches)
  );
}

function spacerIndex(spacerLength: number): number {
  return GENOME_SPACER_LENGTHS.indexOf(spacerLength as 5 | 6 | 7);
}

function physicalHitKey(start: number, spacerLength: number): number {
  return start * GENOME_SPACER_LENGTHS.length + spacerIndex(spacerLength);
}

function verificationKey(start: number, spacerLength: number, orientation: Orientation): number {
  return physicalHitKey(start, spacerLength) * 2 + orientation;
}

function prepareCandidate(candidate: ExactGenomeCandidate): PreparedCandidate {
  const leftTop = candidate.leftTop.toUpperCase();
  const rightTop = candidate.rightTop.toUpperCase();
  if (leftTop.length !== rightTop.length || ![9, 18].includes(leftTop.length)) {
    throw new Error("UNSUPPORTED_HALF_SITE_LENGTH");
  }
  const halfLength = leftTop.length as 9 | 18;
  return {
    candidate: { ...candidate, leftTop, rightTop },
    halfLength,
    maxTotalMismatches: halfLength === 18
      ? GENOME_BHAKTA_MAX_TOTAL_MISMATCHES
      : GENOME_LEGACY_MAX_TOTAL_MISMATCHES,
    orientations: [
      { firstHalf: leftTop, secondHalf: rightTop },
      {
        firstHalf: reverseComplementGenomeSequence(rightTop),
        secondHalf: reverseComplementGenomeSequence(leftTop),
      },
    ],
  };
}

function addSeedAnchor(index: Map<number, SeedAnchor[]>, code: number, anchor: SeedAnchor): void {
  const anchors = index.get(code);
  if (anchors) anchors.push(anchor);
  else index.set(code, [anchor]);
}

function buildSeedIndex(candidates: readonly PreparedCandidate[]): Map<number, SeedAnchor[]> {
  const seedIndex = new Map<number, SeedAnchor[]>();

  candidates.forEach((prepared, candidateIndex) => {
    prepared.orientations.forEach((orientationPattern, orientationIndex) => {
      const orientation = orientationIndex as Orientation;
      const seedMismatchLimit: 1 | 2 = prepared.halfLength === 18 ? 1 : 2;
      for (const spacerLength of GENOME_SPACER_LENGTHS) {
        for (const [halfIndex, half] of [orientationPattern.firstHalf, orientationPattern.secondHalf].entries()) {
          for (let chunkStart = 0; chunkStart < prepared.halfLength; chunkStart += 9) {
            const chunk = half.slice(chunkStart, chunkStart + 9);
            const offset = halfIndex === 0
              ? chunkStart
              : prepared.halfLength + spacerLength + chunkStart;
            for (const code of nineMerVariantCodes(chunk, seedMismatchLimit)) {
              addSeedAnchor(seedIndex, code, { candidateIndex, orientation, spacerLength, offset });
            }
          }
        }
      }
    });
  });

  return seedIndex;
}

function verifyHit(
  sequence: string,
  prepared: PreparedCandidate,
  orientation: Orientation,
  spacerLength: number,
  start: number,
): GenomeSimilarityHit | null {
  const pattern = prepared.orientations[orientation];
  const secondStart = start + prepared.halfLength + spacerLength;

  let firstMismatches: number | null;
  let secondMismatches: number | null;
  if (prepared.halfLength === 18) {
    // Sander-style either-half anchoring: one complete 18-bp half-site must be
    // close (<=3 mismatches); the partner half is measured without an
    // arbitrary cutoff. Splitting a <=3-mismatch half into two 9-mers
    // guarantees at least one seed has <=1 mismatch, so this remains lossless
    // inside the declared anchor envelope.
    firstMismatches = hammingDistanceAt(sequence, start, pattern.firstHalf, prepared.halfLength);
    if (firstMismatches === null) return null;
    secondMismatches = hammingDistanceAt(sequence, secondStart, pattern.secondHalf, prepared.halfLength);
    if (secondMismatches === null) return null;
    if (Math.min(firstMismatches, secondMismatches) > GENOME_BHAKTA_ANCHOR_MAX_MISMATCHES) return null;
  } else {
    firstMismatches = hammingDistanceAt(sequence, start, pattern.firstHalf, GENOME_MAX_HALF_MISMATCHES);
    if (firstMismatches === null) return null;
    secondMismatches = hammingDistanceAt(sequence, secondStart, pattern.secondHalf, GENOME_MAX_HALF_MISMATCHES);
    if (secondMismatches === null) return null;
    if (firstMismatches + secondMismatches > prepared.maxTotalMismatches) return null;
  }

  const totalMismatches = firstMismatches + secondMismatches;
  const leftMismatches = orientation === 0 ? firstMismatches : secondMismatches;
  const rightMismatches = orientation === 0 ? secondMismatches : firstMismatches;
  return { leftMismatches, rightMismatches, totalMismatches, spacerLength };
}

function nearestNonExact(left: GenomeSimilarityHit | null, right: GenomeSimilarityHit): GenomeSimilarityHit {
  if (!left || hitIsBetter(right, left)) return right;
  return left;
}

export class ExactGenomeMatchAccumulator {
  private readonly candidates: readonly PreparedCandidate[];
  private readonly seedIndex: ReadonlyMap<number, SeedAnchor[]>;
  private readonly accumulators: CandidateAccumulator[];
  private genomeBasesValue = 0;
  private sequenceCountValue = 0;

  constructor(candidates: readonly ExactGenomeCandidate[]) {
    this.candidates = candidates.map(prepareCandidate);
    this.seedIndex = buildSeedIndex(this.candidates);
    this.accumulators = candidates.map(() => ({
      countsByMismatch: Array.from({ length: DISPLAY_MISMATCH_BUCKET_MAX + 1 }, () => 0),
      exactBySpacer: new Map(GENOME_SPACER_LENGTHS.map((spacer) => [spacer, 0])),
      closestNonExact: null,
    }));
  }

  addSequence(sequence: string): void {
    if (!sequence.length) return;
    const normalized = sequence.toUpperCase();
    this.genomeBasesValue += normalized.length;
    this.sequenceCountValue += 1;

    const hits = this.candidates.map(() => new Map<number, GenomeSimilarityHit>());
    const verified = this.candidates.map(() => new Set<number>());
    let code = 0;
    let validBases = 0;

    for (let position = 0; position < normalized.length; position += 1) {
      const bits = BASE_BITS[normalized[position]];
      if (bits === undefined) {
        code = 0;
        validBases = 0;
        continue;
      }
      code = ((code << 2) | bits) & NINE_MER_MASK;
      validBases += 1;
      if (validBases < 9) continue;

      const anchors = this.seedIndex.get(code);
      if (!anchors) continue;
      const nineMerStart = position - 8;

      for (const anchor of anchors) {
        const start = nineMerStart - anchor.offset;
        if (start < 0) continue;
        const checkedKey = verificationKey(start, anchor.spacerLength, anchor.orientation);
        const candidateVerified = verified[anchor.candidateIndex];
        if (candidateVerified.has(checkedKey)) continue;
        candidateVerified.add(checkedKey);

        const hit = verifyHit(
          normalized,
          this.candidates[anchor.candidateIndex],
          anchor.orientation,
          anchor.spacerLength,
          start,
        );
        if (!hit) continue;

        const key = physicalHitKey(start, anchor.spacerLength);
        const existing = hits[anchor.candidateIndex].get(key);
        if (!existing || hitIsBetter(hit, existing)) hits[anchor.candidateIndex].set(key, hit);
      }
    }

    hits.forEach((candidateHits, candidateIndex) => {
      const accumulator = this.accumulators[candidateIndex];
      for (const hit of candidateHits.values()) {
        const bucket = Math.min(hit.totalMismatches, DISPLAY_MISMATCH_BUCKET_MAX);
        accumulator.countsByMismatch[bucket] += 1;
        if (hit.totalMismatches === 0) {
          accumulator.exactBySpacer.set(hit.spacerLength, (accumulator.exactBySpacer.get(hit.spacerLength) ?? 0) + 1);
        } else {
          accumulator.closestNonExact = nearestNonExact(accumulator.closestNonExact, hit);
        }
      }
    });
  }

  result(fastaFiles: number): ExactGenomeMatchResult {
    return {
      genomeBases: this.genomeBasesValue,
      sequenceCount: this.sequenceCountValue,
      fastaFiles,
      summaries: this.candidates.map(({ candidate }, index) => {
        const accumulator = this.accumulators[index];
        const exactPairMatches = accumulator.exactBySpacer.get(candidate.spacerLength) ?? 0;
        const alternativeCountsByMismatch = [...accumulator.countsByMismatch];
        if (exactPairMatches > 0) alternativeCountsByMismatch[0] = Math.max(0, alternativeCountsByMismatch[0] - 1);
        const extraExactMatches = alternativeCountsByMismatch[0];
        let closestAlternative: GenomeSimilarityHit | null = null;

        if (extraExactMatches > 0) {
          for (const spacerLength of GENOME_SPACER_LENGTHS) {
            const rawCount = accumulator.exactBySpacer.get(spacerLength) ?? 0;
            const remaining = rawCount - (spacerLength === candidate.spacerLength && exactPairMatches > 0 ? 1 : 0);
            if (remaining > 0) {
              closestAlternative = { leftMismatches: 0, rightMismatches: 0, totalMismatches: 0, spacerLength };
              break;
            }
          }
        } else {
          closestAlternative = accumulator.closestNonExact;
        }

        return {
          candidateId: candidate.id,
          exactPairMatches,
          extraExactMatches,
          alternativeCountsByMismatch,
          closestAlternative,
        };
      }),
    };
  }
}

export class FastaLineScanner {
  private readonly matcher: ExactGenomeMatchAccumulator;
  private chunks: string[] = [];

  constructor(matcher: ExactGenomeMatchAccumulator) {
    this.matcher = matcher;
  }

  private flush(): void {
    if (!this.chunks.length) return;
    this.matcher.addSequence(this.chunks.join(""));
    this.chunks = [];
  }

  addLine(line: string): void {
    if (line.startsWith(">")) {
      this.flush();
      return;
    }
    const normalized = normalizeGenomeSequenceLine(line);
    if (normalized) this.chunks.push(normalized);
  }

  finish(): void {
    this.flush();
  }
}

export function addFastaText(
  text: string,
  matcher: ExactGenomeMatchAccumulator,
): void {
  const scanner = new FastaLineScanner(matcher);
  for (const line of text.split(/\r?\n/)) scanner.addLine(line);
  scanner.finish();
}
