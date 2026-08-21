/// <reference lib="webworker" />

import { gunzipSync, strFromU8, unzipSync } from "fflate";
import {
  ExactGenomeMatchAccumulator,
  FastaLineScanner,
  addFastaText,
  type ExactGenomeCandidate,
} from "./genome-exact-match.ts";

type StartMessage = {
  type: "start";
  file: File;
  candidates: ExactGenomeCandidate[];
};

const worker = self as unknown as DedicatedWorkerGlobalScope;
const FASTA_PATH = /\.(?:fa|fasta|fna|fas)(?:\.gz)?$/i;

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
  candidates: ExactGenomeCandidate[],
) {
  const matcher = new ExactGenomeMatchAccumulator(candidates);
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
  } else if (lowerName.endsWith(".gz")) {
    addFastaText(strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))), matcher);
    fastaFiles = 1;
  } else {
    await scanTextStream(file.stream(), matcher);
    fastaFiles = 1;
  }

  const result = matcher.result(fastaFiles);
  if (!result.sequenceCount) throw new Error("NO_SEQUENCE");
  return result;
}

worker.addEventListener("message", async (event: MessageEvent<StartMessage>) => {
  if (event.data.type !== "start") return;
  try {
    const result = await scanGenomeFile(event.data.file, event.data.candidates);
    worker.postMessage({ type: "result", result });
  } catch (error) {
    const code = error instanceof Error && ["NO_FASTA_IN_ZIP", "NO_SEQUENCE"].includes(error.message)
      ? error.message
      : "READ_FAILED";
    worker.postMessage({ type: "error", code });
  }
});

export {};
