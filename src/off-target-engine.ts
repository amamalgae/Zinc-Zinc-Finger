export type FastaContig = {
  name: string;
  sequence: string;
};

export type OffTargetPairType = "LR" | "RL" | "LL" | "RR";
export type FokIEnd = "N" | "C";
export type RecognitionStrand = "forward" | "reverse";

export type OffTargetCandidateInput = {
  id: string;
  leftRecognition: string;
  rightRecognition: string;
  leftSkippedBaseOffsets?: number[];
  rightSkippedBaseOffsets?: number[];
  spacerLength: number;
  targetStart: number;
  footprintLength: number;
};

export type OffTargetHit = {
  candidateId: string;
  contig: string;
  position: number;
  pairType: OffTargetPairType;
  spacerLength: number;
  leftSite: string;
  rightSite: string;
  leftMismatches: number;
  rightMismatches: number;
  score: number;
  isIntended: boolean;
};

export type CandidateSpecificitySummary = {
  candidateId: string;
  intendedSiteFound: boolean;
  pairHits: number;
  offTargetHits: number;
  perfectPairHits: number;
  perfectOffTargetHits: number;
  highScoreHits: number;
  homodimerHits: number;
  maxOffTargetScore: number;
  topHits: OffTargetHit[];
};

export type GenomeSearchResult = {
  genomeBases: number;
  contigCount: number;
  maxMismatchesPerHalfSite: number;
  targetWindowOccurrenceCount: number;
  targetWindowUniquelyLocated: boolean;
  elapsedMs: number;
  summaries: CandidateSpecificitySummary[];
};

type SearchProgress = {
  phase: "parsing" | "searching";
  fraction: number;
  message: string;
};

type HalfMatch = {
  mismatches: number;
  recognition: string;
  score: number;
};

type CandidateHalfMatches = {
  leftL: Map<number, HalfMatch>;
  leftR: Map<number, HalfMatch>;
  rightL: Map<number, HalfMatch>;
  rightR: Map<number, HalfMatch>;
};

type HalfCategory = keyof CandidateHalfMatches;

type SeedDescriptor = {
  candidateIndex: number;
  category: HalfCategory;
  pattern: string;
  targetRecognition: string;
  seedOffset: number;
  seedPositions: number[];
  fokIEnd: FokIEnd;
};

type SeedIndex = {
  contiguous: Map<number, Map<number, SeedDescriptor[]>>;
  spaced: Map<string, {
    spanLength: number;
    positions: number[];
    codeIndex: Map<number, SeedDescriptor[]>;
  }>;
};

export type PhysicalHalfSite = {
  physicalTarget: string;
  strand: RecognitionStrand;
  skippedBaseOffsets?: number[];
  fokIEnd?: FokIEnd;
};

export type PhysicalPairScore = {
  score: number;
  leftScore: number;
  rightScore: number;
  leftMismatches: number;
  rightMismatches: number;
  leftRecognition: string;
  rightRecognition: string;
};

type TargetWindowOccurrence = {
  contigIndex: number;
  position: number;
  orientation: "forward" | "reverse";
};

const FIRST_PENALTY = 70;
const ADDITIONAL_PENALTY = 65;
const G_BONUS = 17.5;
const DIMER_EXPONENT = 1.75;
const POLARITY = [1, 0.85, 0.8, 0.7] as const;
const HIGH_RISK_SCORE = 50;
const MAX_HALF_HITS_PER_CATEGORY = 250_000;

const BASE_BITS: Record<string, number | undefined> = {
  A: 0,
  C: 1,
  G: 2,
  T: 3,
};

export function reverseComplementDna(value: string): string {
  const complements: Record<string, string> = {
    A: "T",
    C: "G",
    G: "C",
    T: "A",
  };
  return value
    .toUpperCase()
    .split("")
    .reverse()
    .map((base) => complements[base] ?? "N")
    .join("");
}

function normalizeSequenceLine(line: string): string {
  return line
    .toUpperCase()
    .replace(/[\s\d]/g, "")
    .replace(/[^ACGTN]/g, "N");
}

function fastaAccumulator() {
  const contigs: FastaContig[] = [];
  let name = "sequence_1";
  let chunks: string[] = [];
  let sequenceIndex = 1;

  const flush = () => {
    const sequence = chunks.join("");
    if (sequence.length) contigs.push({ name, sequence });
    chunks = [];
  };

  return {
    addLine(line: string) {
      if (line.startsWith(">")) {
        flush();
        sequenceIndex += 1;
        name = line.slice(1).trim().split(/\s+/, 1)[0] || `sequence_${sequenceIndex}`;
        return;
      }
      const normalized = normalizeSequenceLine(line);
      if (normalized) chunks.push(normalized);
    },
    finish() {
      flush();
      return contigs;
    },
  };
}

export function parseFastaText(text: string): FastaContig[] {
  const accumulator = fastaAccumulator();
  for (const line of text.split(/\r?\n/)) accumulator.addLine(line);
  return accumulator.finish();
}

export async function parseFastaBlob(
  blob: Blob,
  options: {
    compressed?: boolean;
    onProgress?: (progress: SearchProgress) => void;
  } = {},
): Promise<FastaContig[]> {
  let stream: ReadableStream<Uint8Array> = blob.stream();
  if (options.compressed) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("このブラウザはgzip展開に対応していません。FASTAを展開して選択してください。");
    }
    stream = stream.pipeThrough(
      new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>,
    );
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const accumulator = fastaAccumulator();
  let pending = "";
  let decodedCharacters = 0;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    decodedCharacters += value.byteLength;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) accumulator.addLine(line);
    options.onProgress?.({
      phase: "parsing",
      fraction: options.compressed ? 0 : Math.min(1, decodedCharacters / Math.max(blob.size, 1)),
      message: "FASTAを読み込んでいます",
    });
  }
  pending += decoder.decode();
  if (pending) accumulator.addLine(pending);
  const contigs = accumulator.finish();
  if (!contigs.length) throw new Error("FASTAに検索可能な配列がありません。");
  options.onProgress?.({ phase: "parsing", fraction: 1, message: "FASTAを読み込みました" });
  return contigs;
}

function fingerRawScore(targetTriplet: string, observedTriplet: string): number {
  let mismatches = 0;
  let gBonus = 0;
  for (let index = 0; index < 3; index += 1) {
    if (targetTriplet[index] !== observedTriplet[index]) mismatches += 1;
    if (targetTriplet[index] === "G" && observedTriplet[index] === "G") {
      gBonus += index === 0 ? G_BONUS * 2 : G_BONUS;
    }
  }
  const mismatchPenalty =
    mismatches === 0 ? 0 : FIRST_PENALTY + ADDITIONAL_PENALTY * (mismatches - 1);
  return Math.max(0, 100 - mismatchPenalty + gBonus);
}

function rawHalfSiteScore(target: string, observed: string, fokIEnd: FokIEnd): number {
  let score = 0;
  for (let offset = 0, finger = 0; offset < target.length; offset += 3, finger += 1) {
    const polarityFinger = fokIEnd === "C"
      ? finger
      : target.length / 3 - finger - 1;
    score +=
      fingerRawScore(target.slice(offset, offset + 3), observed.slice(offset, offset + 3)) *
      POLARITY[Math.min(polarityFinger, POLARITY.length - 1)];
  }
  return score;
}

export function prognosHalfSiteScore(
  target: string,
  observed: string,
  fokIEnd: FokIEnd = "C",
): number {
  if (target.length !== observed.length || target.length % 3 !== 0) {
    throw new Error("PROGNOS half-siteには同じ長さの3の倍数配列が必要です。");
  }
  const intended = rawHalfSiteScore(target, target, fokIEnd);
  return intended === 0 ? 0 : (rawHalfSiteScore(target, observed, fokIEnd) / intended) * 100;
}

export function prognosPairScore(
  leftTarget: string,
  leftObserved: string,
  rightTarget: string,
  rightObserved: string,
  leftFokIEnd: FokIEnd = "C",
  rightFokIEnd: FokIEnd = "C",
): number {
  const left = prognosHalfSiteScore(leftTarget, leftObserved, leftFokIEnd) / 100;
  const right = prognosHalfSiteScore(rightTarget, rightObserved, rightFokIEnd) / 100;
  return ((left ** DIMER_EXPONENT + right ** DIMER_EXPONENT) / 2) * 100;
}

function removeSkippedBases(value: string, skippedBaseOffsets: number[] = []): string {
  const skipped = new Set(skippedBaseOffsets);
  return [...value].filter((_, index) => !skipped.has(index)).join("");
}

function recognitionFromPhysical(
  physical: string,
  strand: RecognitionStrand,
  skippedBaseOffsets: number[] = [],
): string {
  const compactPhysical = removeSkippedBases(physical, skippedBaseOffsets);
  return strand === "forward" ? compactPhysical : reverseComplementDna(compactPhysical);
}

function mismatchCount(target: string, observed: string): number {
  let mismatches = 0;
  for (let index = 0; index < target.length; index += 1) {
    if (target[index] !== observed[index]) mismatches += 1;
  }
  return mismatches;
}

export function scorePhysicalPair(
  leftTarget: PhysicalHalfSite,
  leftObservedPhysical: string,
  rightTarget: PhysicalHalfSite,
  rightObservedPhysical: string,
): PhysicalPairScore {
  if (
    leftTarget.physicalTarget.length !== leftObservedPhysical.length ||
    rightTarget.physicalTarget.length !== rightObservedPhysical.length
  ) {
    throw new Error("物理half-siteの標的と観測配列は同じ長さである必要があります。");
  }
  const leftTargetRecognition = recognitionFromPhysical(
    leftTarget.physicalTarget,
    leftTarget.strand,
    leftTarget.skippedBaseOffsets,
  );
  const rightTargetRecognition = recognitionFromPhysical(
    rightTarget.physicalTarget,
    rightTarget.strand,
    rightTarget.skippedBaseOffsets,
  );
  const leftRecognition = recognitionFromPhysical(
    leftObservedPhysical,
    leftTarget.strand,
    leftTarget.skippedBaseOffsets,
  );
  const rightRecognition = recognitionFromPhysical(
    rightObservedPhysical,
    rightTarget.strand,
    rightTarget.skippedBaseOffsets,
  );
  const leftFokIEnd = leftTarget.fokIEnd ?? "C";
  const rightFokIEnd = rightTarget.fokIEnd ?? "C";
  const leftScore = prognosHalfSiteScore(leftTargetRecognition, leftRecognition, leftFokIEnd);
  const rightScore = prognosHalfSiteScore(rightTargetRecognition, rightRecognition, rightFokIEnd);
  return {
    score: prognosPairScore(
      leftTargetRecognition,
      leftRecognition,
      rightTargetRecognition,
      rightRecognition,
      leftFokIEnd,
      rightFokIEnd,
    ),
    leftScore,
    rightScore,
    leftMismatches: mismatchCount(leftTargetRecognition, leftRecognition),
    rightMismatches: mismatchCount(rightTargetRecognition, rightRecognition),
    leftRecognition,
    rightRecognition,
  };
}

function encodeKmer(value: string): number | null {
  let code = 0;
  for (const base of value) {
    const bits = BASE_BITS[base];
    if (bits === undefined) return null;
    code = (code << 2) | bits;
  }
  return code;
}

function hammingOneVariantCodes(seed: string): number[] {
  const variants = new Set<number>();
  const exact = encodeKmer(seed);
  if (exact === null) return [];
  variants.add(exact);
  const bases = ["A", "C", "G", "T"];
  for (let index = 0; index < seed.length; index += 1) {
    for (const base of bases) {
      if (base === seed[index]) continue;
      const code = encodeKmer(`${seed.slice(0, index)}${base}${seed.slice(index + 1)}`);
      if (code !== null) variants.add(code);
    }
  }
  return [...variants];
}

function patternFromRecognition(
  recognition: string,
  skippedBaseOffsets: number[] = [],
): string {
  const offsets = [...skippedBaseOffsets].sort((a, b) => a - b);
  let pattern = recognition;
  let inserted = 0;
  for (const offset of offsets) {
    pattern = `${pattern.slice(0, offset + inserted)}.${pattern.slice(offset + inserted)}`;
    inserted += 1;
  }
  return pattern;
}

function reversePattern(pattern: string): string {
  return pattern
    .split("")
    .reverse()
    .map((base) => base === "." ? "." : reverseComplementDna(base))
    .join("");
}

function patternHammingDistanceAt(
  sequence: string,
  start: number,
  pattern: string,
  limit: number,
): number | null {
  if (start < 0 || start + pattern.length > sequence.length) return null;
  let mismatches = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index];
    const observed = sequence[start + index];
    if (BASE_BITS[observed] === undefined) return null;
    if (expected !== "." && observed !== expected) {
      mismatches += 1;
      if (mismatches > limit) return null;
    }
  }
  return mismatches;
}

function recognitionFromPatternAt(
  sequence: string,
  start: number,
  pattern: string,
  reversePhysical: boolean,
): string | null {
  if (start < 0 || start + pattern.length > sequence.length) return null;
  const compact = [...pattern]
    .map((expected, index) => expected === "." ? "" : sequence[start + index])
    .join("");
  if (/[^ACGT]/.test(compact)) return null;
  return reversePhysical ? reverseComplementDna(compact) : compact;
}

function seedPartitions(pattern: string) {
  const recognizedPositions = [...pattern]
    .map((base, index) => base === "." ? null : index)
    .filter((index): index is number => index !== null);
  const split = Math.floor(recognizedPositions.length / 2);
  return [recognizedPositions.slice(0, split), recognizedPositions.slice(split)];
}

function buildSeedIndex(candidates: OffTargetCandidateInput[]): SeedIndex {
  const seedIndex: SeedIndex = {
    contiguous: new Map(),
    spaced: new Map(),
  };

  const addPattern = (
    candidateIndex: number,
    category: HalfCategory,
    pattern: string,
    targetRecognition: string,
    fokIEnd: FokIEnd = "C",
  ) => {
    for (const absolutePositions of seedPartitions(pattern)) {
      const seedOffset = absolutePositions[0];
      const seedPositions = absolutePositions.map((position) => position - seedOffset);
      const seed = absolutePositions.map((position) => pattern[position]).join("");
      const descriptor: SeedDescriptor = {
        candidateIndex,
        category,
        pattern,
        targetRecognition,
        seedOffset,
        seedPositions,
        fokIEnd,
      };
      const spanLength = seedPositions.at(-1)! + 1;
      const contiguous = seedPositions.every((position, index) => position === index);
      let codeIndex: Map<number, SeedDescriptor[]>;
      if (contiguous) {
        codeIndex = seedIndex.contiguous.get(spanLength) ?? new Map();
        seedIndex.contiguous.set(spanLength, codeIndex);
      } else {
        const key = `${spanLength}:${seedPositions.join(",")}`;
        const group = seedIndex.spaced.get(key) ?? {
          spanLength,
          positions: seedPositions,
          codeIndex: new Map<number, SeedDescriptor[]>(),
        };
        seedIndex.spaced.set(key, group);
        codeIndex = group.codeIndex;
      }
      for (const code of hammingOneVariantCodes(seed)) {
        const descriptors = codeIndex.get(code) ?? [];
        descriptors.push(descriptor);
        codeIndex.set(code, descriptors);
      }
    }
  };

  candidates.forEach((candidate, candidateIndex) => {
    const leftPattern = patternFromRecognition(
      candidate.leftRecognition,
      candidate.leftSkippedBaseOffsets,
    );
    const rightPattern = patternFromRecognition(
      candidate.rightRecognition,
      candidate.rightSkippedBaseOffsets,
    );
    addPattern(candidateIndex, "leftL", reversePattern(leftPattern), candidate.leftRecognition);
    addPattern(candidateIndex, "rightL", leftPattern, candidate.leftRecognition);
    addPattern(candidateIndex, "leftR", reversePattern(rightPattern), candidate.rightRecognition);
    addPattern(candidateIndex, "rightR", rightPattern, candidate.rightRecognition);
  });

  return seedIndex;
}

function emptyHalfMatches(): CandidateHalfMatches {
  return {
    leftL: new Map(),
    leftR: new Map(),
    rightL: new Map(),
    rightR: new Map(),
  };
}

function findHalfMatches(
  sequence: string,
  candidates: OffTargetCandidateInput[],
  seedIndex: ReturnType<typeof buildSeedIndex>,
  maxMismatches: number,
): CandidateHalfMatches[] {
  const matches = candidates.map(() => emptyHalfMatches());

  const registerDescriptors = (
    descriptors: SeedDescriptor[] | undefined,
    seedStart: number,
  ) => {
    if (!descriptors) return;
    for (const descriptor of descriptors) {
      const fullStart = seedStart - descriptor.seedOffset;
      const categoryMatches = matches[descriptor.candidateIndex][descriptor.category];
      if (categoryMatches.has(fullStart)) continue;
      const mismatches = patternHammingDistanceAt(
        sequence,
        fullStart,
        descriptor.pattern,
        maxMismatches,
      );
      if (mismatches === null) continue;
      if (categoryMatches.size >= MAX_HALF_HITS_PER_CATEGORY) {
        throw new Error("half-site候補が多すぎます。4–6 fingerを使用するか、候補数を減らしてください。");
      }
      const recognition = recognitionFromPatternAt(
        sequence,
        fullStart,
        descriptor.pattern,
        descriptor.category.startsWith("left"),
      );
      if (!recognition) continue;
      categoryMatches.set(fullStart, {
        mismatches,
        recognition,
        score: prognosHalfSiteScore(
          descriptor.targetRecognition,
          recognition,
          descriptor.fokIEnd,
        ),
      });
    }
  };

  for (const [seedLength, codeIndex] of seedIndex.contiguous) {
    const mask = (1 << (seedLength * 2)) - 1;
    let code = 0;
    let validLength = 0;

    for (let position = 0; position < sequence.length; position += 1) {
      const bits = BASE_BITS[sequence[position]];
      if (bits === undefined) {
        code = 0;
        validLength = 0;
        continue;
      }
      code = ((code << 2) | bits) & mask;
      validLength += 1;
      if (validLength < seedLength) continue;
      const seedStart = position - seedLength + 1;
      registerDescriptors(codeIndex.get(code), seedStart);
    }
  }

  for (const { spanLength, positions, codeIndex } of seedIndex.spaced.values()) {
    for (let seedStart = 0; seedStart + spanLength <= sequence.length; seedStart += 1) {
      let code = 0;
      let valid = true;
      for (const position of positions) {
        const bits = BASE_BITS[sequence[seedStart + position]];
        if (bits === undefined) {
          valid = false;
          break;
        }
        code = (code << 2) | bits;
      }
      if (valid) registerDescriptors(codeIndex.get(code), seedStart);
    }
  }

  return matches;
}

function findTargetWindowOccurrences(
  contigs: FastaContig[],
  targetWindow: string,
): { count: number; unique: TargetWindowOccurrence | null } {
  if (!targetWindow || /[^ACGT]/.test(targetWindow)) return { count: 0, unique: null };
  const reverse = reverseComplementDna(targetWindow);
  const occurrences: TargetWindowOccurrence[] = [];

  const collect = (sequence: string, query: string, contigIndex: number, orientation: "forward" | "reverse") => {
    let from = 0;
    while (occurrences.length < 2) {
      const position = sequence.indexOf(query, from);
      if (position < 0) break;
      occurrences.push({ contigIndex, position, orientation });
      from = position + 1;
    }
  };

  contigs.forEach((contig, contigIndex) => {
    if (occurrences.length >= 2) return;
    collect(contig.sequence, targetWindow, contigIndex, "forward");
    if (occurrences.length < 2 && reverse !== targetWindow) {
      collect(contig.sequence, reverse, contigIndex, "reverse");
    }
  });

  return {
    count: occurrences.length,
    unique: occurrences.length === 1 ? occurrences[0] : null,
  };
}

function intendedPairForCandidate(
  occurrence: TargetWindowOccurrence | null,
  candidate: OffTargetCandidateInput,
  targetWindowLength: number,
) {
  if (!occurrence) return null;
  if (occurrence.orientation === "forward") {
    return {
      contigIndex: occurrence.contigIndex,
      position: occurrence.position + candidate.targetStart,
      pairType: "LR" as const,
    };
  }
  return {
    contigIndex: occurrence.contigIndex,
    position:
      occurrence.position + targetWindowLength - candidate.targetStart - candidate.footprintLength,
    pairType: "RL" as const,
  };
}

function insertTopHit(summary: CandidateSpecificitySummary, hit: OffTargetHit, limit: number) {
  summary.topHits.push(hit);
  if (summary.topHits.length > limit * 2) {
    summary.topHits.sort((a, b) => b.score - a.score || a.position - b.position);
    summary.topHits.length = limit;
  }
}

function registerHit(
  summary: CandidateSpecificitySummary,
  hit: OffTargetHit,
  maxResults: number,
) {
  summary.pairHits += 1;
  if (
    (hit.pairType === "LR" || hit.pairType === "RL") &&
    hit.leftMismatches === 0 &&
    hit.rightMismatches === 0
  ) {
    summary.perfectPairHits += 1;
  }
  if (hit.isIntended) return;

  summary.offTargetHits += 1;
  if (
    (hit.pairType === "LR" || hit.pairType === "RL") &&
    hit.leftMismatches === 0 &&
    hit.rightMismatches === 0
  ) {
    summary.perfectOffTargetHits += 1;
  }
  if (hit.score >= HIGH_RISK_SCORE) summary.highScoreHits += 1;
  if (hit.pairType === "LL" || hit.pairType === "RR") summary.homodimerHits += 1;
  summary.maxOffTargetScore = Math.max(summary.maxOffTargetScore, hit.score);
  insertTopHit(summary, hit, maxResults);
}

type SearchHalfDefinition = {
  targetRecognition: string;
  pattern: string;
  reversePhysical: boolean;
  fokIEnd: FokIEnd;
};

function observeHalf(
  sequence: string,
  start: number,
  definition: SearchHalfDefinition,
): HalfMatch | null {
  const recognition = recognitionFromPatternAt(
    sequence,
    start,
    definition.pattern,
    definition.reversePhysical,
  );
  if (!recognition) return null;
  return {
    mismatches: mismatchCount(definition.targetRecognition, recognition),
    recognition,
    score: prognosHalfSiteScore(
      definition.targetRecognition,
      recognition,
      definition.fokIEnd,
    ),
  };
}

function pairMatchesFromEitherAnchor(
  candidate: OffTargetCandidateInput,
  contig: FastaContig,
  contigIndex: number,
  leftAnchors: Map<number, HalfMatch>,
  rightAnchors: Map<number, HalfMatch>,
  pairType: OffTargetPairType,
  leftDefinition: SearchHalfDefinition,
  rightDefinition: SearchHalfDefinition,
  intended: ReturnType<typeof intendedPairForCandidate>,
  summary: CandidateSpecificitySummary,
  maxResults: number,
) {
  const leftSpanLength = leftDefinition.pattern.length;
  for (const [position, left] of leftAnchors) {
    for (const spacerLength of [5, 6, 7]) {
      const rightPosition = position + leftSpanLength + spacerLength;
      const right = rightAnchors.get(rightPosition) ?? observeHalf(
        contig.sequence,
        rightPosition,
        rightDefinition,
      );
      if (!right) continue;
      const isIntended =
        intended?.contigIndex === contigIndex &&
        intended.position === position &&
        intended.pairType === pairType &&
        spacerLength === candidate.spacerLength;
      registerHit(
        summary,
        {
          candidateId: candidate.id,
          contig: contig.name,
          position,
          pairType,
          spacerLength,
          leftSite: left.recognition,
          rightSite: right.recognition,
          leftMismatches: left.mismatches,
          rightMismatches: right.mismatches,
          score: prognosPairScore(
            leftDefinition.targetRecognition,
            left.recognition,
            rightDefinition.targetRecognition,
            right.recognition,
            leftDefinition.fokIEnd,
            rightDefinition.fokIEnd,
          ),
          isIntended,
        },
        maxResults,
      );
    }
  }

  for (const [rightPosition, right] of rightAnchors) {
    for (const spacerLength of [5, 6, 7]) {
      const position = rightPosition - leftSpanLength - spacerLength;
      if (leftAnchors.has(position)) continue;
      const left = observeHalf(contig.sequence, position, leftDefinition);
      if (!left) continue;
      const isIntended =
        intended?.contigIndex === contigIndex &&
        intended.position === position &&
        intended.pairType === pairType &&
        spacerLength === candidate.spacerLength;
      registerHit(
        summary,
        {
          candidateId: candidate.id,
          contig: contig.name,
          position,
          pairType,
          spacerLength,
          leftSite: left.recognition,
          rightSite: right.recognition,
          leftMismatches: left.mismatches,
          rightMismatches: right.mismatches,
          score: prognosPairScore(
            leftDefinition.targetRecognition,
            left.recognition,
            rightDefinition.targetRecognition,
            right.recognition,
            leftDefinition.fokIEnd,
            rightDefinition.fokIEnd,
          ),
          isIntended,
        },
        maxResults,
      );
    }
  }
}

function validateCandidates(candidates: OffTargetCandidateInput[], maxMismatches: number) {
  if (!candidates.length) throw new Error("検索するZFN候補がありません。");
  if (maxMismatches !== 3) throw new Error("現在の完全列挙はhalf-siteあたり3 mismatchに対応します。");
  for (const candidate of candidates) {
    const lengths = [candidate.leftRecognition.length, candidate.rightRecognition.length];
    const leftSkipped = candidate.leftSkippedBaseOffsets ?? [];
    const rightSkipped = candidate.rightSkippedBaseOffsets ?? [];
    if (
      lengths.some((length) => length < 12 || length > 18 || length % 3 !== 0) ||
      leftSkipped.some((offset) => !Number.isInteger(offset) || offset < 3 || offset > lengths[0] - 3 || offset % 3 !== 0) ||
      rightSkipped.some((offset) => !Number.isInteger(offset) || offset < 3 || offset > lengths[1] - 3 || offset % 3 !== 0) ||
      leftSkipped.length > 1 ||
      rightSkipped.length > 1 ||
      /[^ACGT]/.test(candidate.leftRecognition + candidate.rightRecognition)
    ) {
      throw new Error("ゲノム検索は4–6 finger、左右非対称、片側1個までの1-bp base-skippingに対応します。");
    }
  }
}

function candidateSearchDefinitions(candidate: OffTargetCandidateInput) {
  const leftDirectPattern = patternFromRecognition(
    candidate.leftRecognition,
    candidate.leftSkippedBaseOffsets,
  );
  const rightDirectPattern = patternFromRecognition(
    candidate.rightRecognition,
    candidate.rightSkippedBaseOffsets,
  );
  const leftDirect: SearchHalfDefinition = {
    targetRecognition: candidate.leftRecognition,
    pattern: leftDirectPattern,
    reversePhysical: false,
    fokIEnd: "C",
  };
  const leftReverse: SearchHalfDefinition = {
    ...leftDirect,
    pattern: reversePattern(leftDirectPattern),
    reversePhysical: true,
  };
  const rightDirect: SearchHalfDefinition = {
    targetRecognition: candidate.rightRecognition,
    pattern: rightDirectPattern,
    reversePhysical: false,
    fokIEnd: "C",
  };
  const rightReverse: SearchHalfDefinition = {
    ...rightDirect,
    pattern: reversePattern(rightDirectPattern),
    reversePhysical: true,
  };
  return { leftDirect, leftReverse, rightDirect, rightReverse };
}

export function searchGenomeOffTargets(
  contigs: FastaContig[],
  candidates: OffTargetCandidateInput[],
  targetWindow: string,
  options: {
    maxMismatchesPerHalfSite?: number;
    maxResultsPerCandidate?: number;
    onProgress?: (progress: SearchProgress) => void;
  } = {},
): GenomeSearchResult {
  const started = performance.now();
  const maxMismatches = options.maxMismatchesPerHalfSite ?? 3;
  const maxResults = options.maxResultsPerCandidate ?? 50;
  validateCandidates(candidates, maxMismatches);
  const normalizedWindow = targetWindow.toUpperCase();
  const occurrence = findTargetWindowOccurrences(contigs, normalizedWindow);
  const seedIndex = buildSeedIndex(candidates);
  const summaries = candidates.map<CandidateSpecificitySummary>((candidate) => ({
    candidateId: candidate.id,
    intendedSiteFound: occurrence.unique !== null,
    pairHits: 0,
    offTargetHits: 0,
    perfectPairHits: 0,
    perfectOffTargetHits: 0,
    highScoreHits: 0,
    homodimerHits: 0,
    maxOffTargetScore: 0,
    topHits: [],
  }));
  const intendedPairs = candidates.map((candidate) =>
    intendedPairForCandidate(occurrence.unique, candidate, normalizedWindow.length),
  );
  const totalBases = contigs.reduce((sum, contig) => sum + contig.sequence.length, 0);
  let searchedBases = 0;

  contigs.forEach((contig, contigIndex) => {
    const halfMatches = findHalfMatches(contig.sequence, candidates, seedIndex, maxMismatches);
    candidates.forEach((candidate, candidateIndex) => {
      const matches = halfMatches[candidateIndex];
      const summary = summaries[candidateIndex];
      const intended = intendedPairs[candidateIndex];
      const definitions = candidateSearchDefinitions(candidate);
      pairMatchesFromEitherAnchor(candidate, contig, contigIndex, matches.leftL, matches.rightR, "LR", definitions.leftReverse, definitions.rightDirect, intended, summary, maxResults);
      pairMatchesFromEitherAnchor(candidate, contig, contigIndex, matches.leftR, matches.rightL, "RL", definitions.rightReverse, definitions.leftDirect, intended, summary, maxResults);
      pairMatchesFromEitherAnchor(candidate, contig, contigIndex, matches.leftL, matches.rightL, "LL", definitions.leftReverse, definitions.leftDirect, intended, summary, maxResults);
      pairMatchesFromEitherAnchor(candidate, contig, contigIndex, matches.leftR, matches.rightR, "RR", definitions.rightReverse, definitions.rightDirect, intended, summary, maxResults);
    });
    searchedBases += contig.sequence.length;
    options.onProgress?.({
      phase: "searching",
      fraction: searchedBases / Math.max(totalBases, 1),
      message: `${contig.name}を検索しました`,
    });
  });

  for (const summary of summaries) {
    summary.topHits.sort((a, b) => b.score - a.score || a.position - b.position);
    summary.topHits.length = Math.min(summary.topHits.length, maxResults);
  }

  return {
    genomeBases: totalBases,
    contigCount: contigs.length,
    maxMismatchesPerHalfSite: maxMismatches,
    targetWindowOccurrenceCount: occurrence.count,
    targetWindowUniquelyLocated: occurrence.unique !== null,
    elapsedMs: performance.now() - started,
    summaries,
  };
}
