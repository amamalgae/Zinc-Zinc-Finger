/// <reference lib="webworker" />

import {
  parseFastaBlob,
  searchGenomeOffTargets,
  type OffTargetCandidateInput,
} from "./off-target-engine.ts";

type StartMessage = {
  type: "start";
  file: File;
  candidates: OffTargetCandidateInput[];
  targetWindow: string;
};

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.addEventListener("message", async (event: MessageEvent<StartMessage>) => {
  if (event.data.type !== "start") return;
  try {
    const { file, candidates, targetWindow } = event.data;
    const contigs = await parseFastaBlob(file, {
      compressed: file.name.toLowerCase().endsWith(".gz"),
      onProgress: (progress) => worker.postMessage({ type: "progress", progress }),
    });
    const result = searchGenomeOffTargets(contigs, candidates, targetWindow, {
      maxMismatchesPerHalfSite: 3,
      maxResultsPerCandidate: 50,
      onProgress: (progress) => worker.postMessage({ type: "progress", progress }),
    });
    worker.postMessage({ type: "result", result });
  } catch (error) {
    worker.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "ゲノム検索に失敗しました。",
    });
  }
});

export {};
