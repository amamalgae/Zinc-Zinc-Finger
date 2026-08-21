import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compareZfnCandidates,
  generateZfnCandidates,
  generateZfnCandidatesAcrossSequence,
  zfnCandidatesToCsv,
} from "../src/zfn-design-engine.ts";

const TARGET = "TGCAGGGCCTATTGCACCAGGCCAGATGAGAGAACCAAGGGG";

test("public full-sequence helper finds candidates across the submitted target DNA", () => {
  const padded = `${"A".repeat(120)}${TARGET}${"A".repeat(120)}`;
  const candidates = generateZfnCandidatesAcrossSequence(padded, "bhakta-2013");
  assert.ok(candidates.some(({ start, spacerLength }) => start === 120 && spacerLength === 6));
});

test("legacy v1/v2 ordering no longer uses an arbitrary requested center", () => {
  const common = {
    profile: "coda-only",
    spacerLength: 6,
    start: 0,
    leftArray: { method: "coda-2011" },
    rightArray: { method: "coda-2011" },
  };
  const nearOldCenter = { ...common, id: "near", distance: 0, start: 10 };
  const farOldCenter = { ...common, id: "far", distance: 1000, start: 1 };
  assert.ok(compareZfnCandidates(farOldCenter, nearOldCenter) < 0);
});

test("public UI removes center/range inputs and shows the spacer-center coordinate", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const engine = await readFile(new URL("../src/zfn-design-engine.ts", import.meta.url), "utf8");
  assert.match(app, /generateZfnCandidatesAcrossSequence\(dna, designProfile\)/);
  assert.doesNotMatch(app, /desiredCutInput|desired-cut-error|maxDistanceInput/);
  assert.doesNotMatch(app, /copy\.spacerCenterLabel|copy\.rangeLabel/);
  assert.match(app, /\+\{formatCut\(candidate\.cut\)\}/);
  assert.match(engine, /cut: Math\.floor\(candidate\.cut\)/);
});

test("CSV keeps an integer spacer-center coordinate and drops center-distance output", () => {
  const candidates = generateZfnCandidates(TARGET, 21, 0, "bhakta-2013", 30);
  assert.ok(candidates.length);
  const csv = zfnCandidatesToCsv(candidates);
  assert.match(csv, /spacer_center_coordinate/);
  assert.doesNotMatch(csv.split("\n", 1)[0], /distance/);
});
