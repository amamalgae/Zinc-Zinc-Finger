import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Bhakta candidate rows omit redundant method text and keep long targets inside the card", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const patch = readFileSync(new URL("../src/ui-patch.css", import.meta.url), "utf8");

  assert.match(app, /const isBhakta = candidate\.profile === "bhakta-2013"/);
  assert.match(app, /candidate-sequence \$\{isBhakta \? "extended" : ""\}/);
  assert.match(app, /\{isBhakta \? null : <strong>\{compactMethodPairLabel\(candidate\)\}<\/strong>\}/);
  assert.match(patch, /\.candidate \{[\s\S]*grid-template-areas:[\s\S]*"rank seq action"[\s\S]*"rank summary action"/);
  assert.match(patch, /\.candidate-sequence\.extended \{[\s\S]*white-space: normal;[\s\S]*font-size: 13px;/);
  assert.match(patch, /\.candidate-sequence\.extended \{[\s\S]*word-break: break-all;/);
});
