export type FastaContig = {
  name: string;
  sequence: string;
};

export type OffTargetPairType = "LR" | "RL" | "LL" | "RR";

export type OffTargetCandidateInput = {
  id: string;
  leftRecognition: string;
  rightRecognition: string;
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
  highRiskHits: number;
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
  offset: number;
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

function reverseComplementDna(value: string): string {
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

function rawHalfSiteScore(target: string, observed: string): number {
  let score = 0;
  for (let offset = 0, finger = 0; offset < target.length; offset += 3, finger += 1) {
    score +=
      fingerRawScore(target.slice(offset, offset + 3), observed.slice(offset, offset + 3)) *
      POLARITY[Math.min(finger, POLARITY.length - 1)];
  }
  return score;
}

export function prognosHalfSiteScore(target: string, observed: string): number {
  if (target.length !== observed.length || target.length % 3 !== 0) {
    throw new Error("PROGNOS half-siteには同じ長さの3の倍数配列が必要です。");
  }
  const intended = rawHalfSiteScore(target, target);
  return intended === 0 ? 0 : (rawHalfSiteScore(target, observed) / intended) * 100;
}

export function prognosPairScore(
  leftTarget: string,
  leftObserved: string,
  rightTarget: string,
  rightObserved: string,
): number {
  const left = prognosHalfSiteScore(leftTarget, leftObserved) / 100;
  const right = prognosHalfSiteScore(rightTarget, rightObserved) / 100;
  return ((left ** DIMER_EXPONENT + right ** DIMER_EXPONENT) / 2) * 100;
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

function hammingDistanceAt(
  sequence: string,
  start: number,
  pattern: string,
  limit: number,
): number | null {
  if (start < 0 || start + pattern.length > sequence.length) return null;
  let mismatches = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const observed = sequence[start + index];
    if (BASE_BITS[observed] === undefined) return null;
    if (observed !== pattern[index]) {
      mismatches += 1;
      if (mismatches > limit) return null;
    }
  }
  return mismatches;
}

function buildSeedIndex(candidates: OffTargetCandidateInput[]) {
  const byLength = new Map<number, Map<number, SeedDescriptor[]>>();

  const addPattern = (
    candidateIndex: number,
    category: HalfCategory,
    pattern: string,
    targetRecognition: string,
  ) => {
    const split = Math.floor(pattern.length / 2);
    for (const offset of [0, split]) {
      const seed = pattern.slice(offset, offset === 0 ? split : pattern.length);
      const lengthIndex = byLength.get(seed.length) ?? new Map<number, SeedDescriptor[]>();
      byLength.set(seed.length, lengthIndex);
      const descriptor: SeedDescriptor = {
        candidateIndex,
        category,
        pattern,
        targetRecognition,
        offset,
      };
      for (const code of hammingOneVariantCodes(seed)) {
        const descriptors = lengthIndex.get(code) ?? [];
        descriptors.push(descriptor);
        lengthIndex.set(code, descriptors);
      }
    }
  };

  candidates.forEach((candidate, candidateIndex) => {
    addPattern(candidateIndex, "leftL", reverseComplementDna(candidate.leftRecognition), candidate.leftRecognition);
    addPattern(candidateIndex, "rightL", candidate.leftRecognition, candidate.leftRecognition);
    addPattern(candidateIndex, "leftR", reverseComplementDna(candidate.rightRecognition), candidate.rightRecognition);
    addPattern(candidateIndex, "rightR", candidate.rightRecognition, candidate.rightRecognition);
  });

  return byLength;
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

  for (const [seedLength, codeIndex] of seedIndex) {
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
      const descriptors = codeIndex.get(code);
      if (!descriptors) continue;

      for (const descriptor of descriptors) {
        const fullStart = seedStart - descriptor.offset;
        const categoryMatches = matches[descriptor.candidateIndex][descriptor.category];
        if (categoryMatches.has(fullStart)) continue;
        const mismatches = hammingDistanceAt(
          sequence,
          fullStart,
          descriptor.pattern,
          maxMismatches,
        );
        if (mismatches === null) continue;
        if (categoryMatches.size >= MAX_HALF_HITS_PER_CATEGORY) {
          throw new Error("half-site候補が多すぎます。4–6 fingerを使用するか、候補数を減らしてください。");
        }
        const physicalSite = sequence.slice(fullStart, fullStart + descriptor.pattern.length);
        const recognition = descriptor.category.startsWith("left")
          ? reverseComplementDna(physicalSite)
          : physicalSite;
        categoryMatches.set(fullStart, {
          mismatches,
          recognition,
          score: prognosHalfSiteScore(descriptor.targetRecognition, recognition),
        });
      }
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
  if (hit.score >= HIGH_RISK_SCORE) summary.highRiskHits += 1;
  if (hit.pairType === "LL" || hit.pairType === "RR") summary.homodimerHits += 1;
  summary.maxOffTargetScore = Math.max(summary.maxOffTargetScore, hit.score);
  insertTopHit(summary, hit, maxResults);
}

function pairMatches(
  candidate: OffTargetCandidateInput,
  contig: FastaContig,
  contigIndex: number,
  leftMatches: Map<number, HalfMatch>,
  rightMatches: Map<number, HalfMatch>,
  pairType: OffTargetPairType,
  leftTarget: string,
  rightTarget: string,
  intended: ReturnType<typeof intendedPairForCandidate>,
  summary: CandidateSpecificitySummary,
  maxResults: number,
) {
  const halfLength = leftTarget.length;
  for (const [position, left] of leftMatches) {
    for (const spacerLength of [5, 6, 7]) {
      const rightPosition = position + halfLength + spacerLength;
      const right = rightMatches.get(rightPosition);
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
          score: prognosPairScore(leftTarget, left.recognition, rightTarget, right.recognition),
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
    const length = candidate.leftRecognition.length;
    if (
      length < 12 ||
      length > 18 ||
      length % 3 !== 0 ||
      candidate.rightRecognition.length !== length ||
      /[^ACGT]/.test(candidate.leftRecognition + candidate.rightRecognition)
    ) {
      throw new Error("ゲノム検索は同じ長さの4–6 finger ZFNペアに対応します。");
    }
  }
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
    highRiskHits: 0,
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
      pairMatches(candidate, contig, contigIndex, matches.leftL, matches.rightR, "LR", candidate.leftRecognition, candidate.rightRecognition, intended, summary, maxResults);
      pairMatches(candidate, contig, contigIndex, matches.leftR, matches.rightL, "RL", candidate.rightRecognition, candidate.leftRecognition, intended, summary, maxResults);
      pairMatches(candidate, contig, contigIndex, matches.leftL, matches.rightL, "LL", candidate.leftRecognition, candidate.leftRecognition, intended, summary, maxResults);
      pairMatches(candidate, contig, contigIndex, matches.leftR, matches.rightR, "RR", candidate.rightRecognition, candidate.rightRecognition, intended, summary, maxResults);
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
