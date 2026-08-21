/// <reference lib="webworker" />

import { gunzipSync, strFromU8, unzipSync } from "fflate";
import {
  ExactGenomeMatchAccumulator,
  FastaLineScanner,
  addFastaText,
  type ExactGenomeCandidate,
  type ExactGenomeMatchResult,
} from "./genome-exact-match.ts";

type StartMessage = {
  type: "start";
  files: File[];
  candidates: ExactGenomeCandidate[];
};

const worker = self as unknown as DedicatedWorkerGlobalScope;
const FASTA_PATH = /\.(?:fa|fasta|fna|fas)(?:\.gz)?$/i;
const INITIAL_CANDIDATE_BATCH = 30;

async function scanTextStream(
  stream: ReadableStream<Uint8Array>,
  matcher: ExactGenomeMatchAccumulator,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const scanner = new FastaLineScanner(matcher);
  let pending = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) scanner.addLine(line);
  }

  pending += decoder.decode();
  if (pending) scanner.addLine(pending);
  scanner.finish();
}

async function scanGenomeFile(
  file: File,
  matcher: ExactGenomeMatchAccumulator,
): Promise<number> {
  const lowerName = file.name.toLowerCase();
  let fastaFiles = 0;

  if (lowerName.endsWith(".zip")) {
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
    for (const [name, rawBytes] of Object.entries(entries)) {
      if (!FASTA_PATH.test(name)) continue;
      const bytes = name.toLowerCase().endsWith(".gz") ? gunzipSync(rawBytes) : rawBytes;
      addFastaText(strFromU8(bytes), matcher);
      fastaFiles += 1;
    }
    if (!fastaFiles) throw new Error("NO_FASTA_IN_ZIP");
    return fastaFiles;
  }

  if (lowerName.endsWith(".gz")) {
    addFastaText(strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))), matcher);
    return 1;
  }

  await scanTextStream(file.stream(), matcher);
  return 1;
}

async function scanGenomeFiles(
  files: readonly File[],
  candidates: ExactGenomeCandidate[],
): Promise<ExactGenomeMatchResult> {
  const matcher = new ExactGenomeMatchAccumulator(candidates);
  let fastaFiles = 0;

  for (const file of files) fastaFiles += await scanGenomeFile(file, matcher);

  const result = matcher.result(fastaFiles);
  if (!result.sequenceCount) throw new Error("NO_SEQUENCE");
  return result;
}

function mergeBatchResults(
  first: ExactGenomeMatchResult,
  rest: ExactGenomeMatchResult,
): ExactGenomeMatchResult {
  return {
    genomeBases: first.genomeBases,
    sequenceCount: first.sequenceCount,
    fastaFiles: first.fastaFiles,
    summaries: [...first.summaries, ...rest.summaries],
  };
}

worker.addEventListener("message", async (event: MessageEvent<StartMessage>) => {
  if (event.data.type !== "start") return;
  const { files, candidates } = event.data;
  try {
    const firstCandidates = candidates.slice(0, INITIAL_CANDIDATE_BATCH);
    const firstResult = await scanGenomeFiles(files, firstCandidates);

    // Unblock SELECT as soon as the first visible page has genome annotations.
    worker.postMessage({ type: "result", result: firstResult });

    const remainingCandidates = candidates.slice(INITIAL_CANDIDATE_BATCH);
    if (!remainingCandidates.length) return;

    // Continue the expensive remainder only after the first 30 are usable.
    // This second pass stays in the worker, so SELECT remains interactive.
    try {
      const remainingResult = await scanGenomeFiles(files, remainingCandidates);
      worker.postMessage({ type: "result", result: mergeBatchResults(firstResult, remainingResult) });
    } catch {
      // Keep the already-useful first page rather than replacing it with an
      // error after SELECT has become interactive.
    }
  } catch (error) {
    const code = error instanceof Error && ["NO_FASTA_IN_ZIP", "NO_SEQUENCE"].includes(error.message)
      ? error.message
      : "READ_FAILED";
    worker.postMessage({ type: "error", code });
  }
});

export {};
