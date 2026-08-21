export type ExactGenomeCandidate = {
  id: string;
  leftTop: string;
  rightTop: string;
  spacerLength: number;
};

export type ExactGenomeCandidateSummary = {
  candidateId: string;
  exactPairMatches: number;
};

export type ExactGenomeMatchResult = {
  genomeBases: number;
  sequenceCount: number;
  fastaFiles: number;
  summaries: ExactGenomeCandidateSummary[];
};

const COMPLEMENT: Readonly<Record<string, string>> = {
  A: "T",
  C: "G",
  G: "C",
  T: "A",
  N: "N",
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

/**
 * Counts physical loci where both complete half-sites occur in the intended
 * orientation with the same spacer length. Spacer bases are deliberately
 * ignored because they are not zinc-finger recognition sequence.
 */
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

export class ExactGenomeMatchAccumulator {
  private readonly candidates: readonly ExactGenomeCandidate[];
  private readonly counts: Map<string, number>;
  private genomeBasesValue = 0;
  private sequenceCountValue = 0;

  constructor(candidates: readonly ExactGenomeCandidate[]) {
    this.candidates = candidates;
    this.counts = new Map(candidates.map(({ id }) => [id, 0]));
  }

  addSequence(sequence: string): void {
    if (!sequence.length) return;
    this.genomeBasesValue += sequence.length;
    this.sequenceCountValue += 1;
    for (const candidate of this.candidates) {
      const matches = countExactPairMatchesInSequence(sequence, candidate);
      this.counts.set(candidate.id, (this.counts.get(candidate.id) ?? 0) + matches);
    }
  }

  result(fastaFiles: number): ExactGenomeMatchResult {
    return {
      genomeBases: this.genomeBasesValue,
      sequenceCount: this.sequenceCountValue,
      fastaFiles,
      summaries: this.candidates.map(({ id }) => ({
        candidateId: id,
        exactPairMatches: this.counts.get(id) ?? 0,
      })),
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
