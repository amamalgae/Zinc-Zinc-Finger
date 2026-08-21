import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../src/genome-exact-match.worker.ts", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/genome-exact-match.css", import.meta.url), "utf8");

test("genome picker accepts multiple files and drag-and-drop", () => {
  assert.match(appSource, /id="genome-file"[^>]*type="file"[^>]*multiple/);
  assert.match(appSource, /onDrop=\{\(event\) =>/);
  assert.match(appSource, /event\.dataTransfer\.files/);
  assert.match(appSource, /mergeGenomeFiles/);
});

test("genome worker scans all selected files into one accumulator", () => {
  assert.match(workerSource, /files: File\[\]/);
  assert.match(workerSource, /for \(const file of files\) fastaFileNames\.push\(\.\.\.await scanGenomeFile\(file, matcher\)\)/);
  assert.doesNotMatch(workerSource, /event\.data\.file,/);
});

test("all selected and ZIP-contained FASTA names remain visible", () => {
  assert.match(workerSource, /fastaFileNames\.push\(`\$\{file\.name\} \/ \$\{name\}`\)/);
  assert.match(appSource, /genome-file-list/);
  assert.match(appSource, /visibleGenomeFileNames\.map/);
  assert.match(cssSource, /\.genome-file-list li \{[\s\S]*overflow-wrap: anywhere/);
  assert.doesNotMatch(cssSource, /\.genome-file-list[\s\S]*text-overflow:\s*ellipsis/);
});

test("genome worker returns the first 30 candidates before checking the remainder", () => {
  assert.match(workerSource, /INITIAL_CANDIDATE_BATCH = 30/);
  assert.match(workerSource, /candidates\.slice\(0, INITIAL_CANDIDATE_BATCH\)/);
  assert.match(workerSource, /worker\.postMessage\(\{ type: "result", result: firstResult \}\)/);
  assert.match(workerSource, /candidates\.slice\(INITIAL_CANDIDATE_BATCH\)/);
  assert.match(workerSource, /mergeBatchResults\(firstResult, remainingResult\)/);
});
