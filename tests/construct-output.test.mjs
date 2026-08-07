import assert from "node:assert/strict";
import test from "node:test";

import { generateCandidates, reverseComplement } from "../src/design-engine.ts";
import {
  FOKI_CLEAVAGE_DOMAIN_WT,
  FOKI_ELD,
  FOKI_KKR,
  buildZfnPair,
  constructsToGenBank,
  translateDna,
} from "../src/construct-output.ts";

const leftRecognition = "GACGAAGATGCAGCCGGT";
const rightRecognition = "GGAGGCGGTGACGAACTA";
const target = `${reverseComplement(leftRecognition)}GATTAC${rightRecognition}`;

function residue(sequence, fullPosition) {
  return sequence[fullPosition - 384];
}

test("FokI domain and ELD/KKR residue numbering match Doyon", () => {
  assert.equal(FOKI_CLEAVAGE_DOMAIN_WT.length, 196);
  assert.equal(residue(FOKI_ELD, 486), "E");
  assert.equal(residue(FOKI_ELD, 496), "D");
  assert.equal(residue(FOKI_ELD, 499), "L");
  assert.equal(residue(FOKI_KKR, 490), "K");
  assert.equal(residue(FOKI_KKR, 537), "R");
  assert.equal(residue(FOKI_KKR, 538), "K");
});

test("complete ZFN CDS translates back to the designed protein and stop", () => {
  const candidate = generateCandidates(target, 21, 6, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  for (const preset of ["auxenochlorella", "human"]) {
    const constructs = buildZfnPair(candidate, preset);
    assert.equal(constructs.length, 2);
    assert.match(constructs[0].protein, /^MAPKKKRKVYKCPECGKSFS/);
    assert.equal(translateDna(constructs[0].cds), `${constructs[0].protein}*`);
    assert.equal(translateDna(constructs[1].cds), `${constructs[1].protein}*`);
    assert.ok(constructs.every(({ cds }) => cds.length % 3 === 0));
  }
});

test("GenBank output contains two complete CDS records", () => {
  const candidate = generateCandidates(target, 21, 6, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  const genbank = constructsToGenBank(buildZfnPair(candidate, "auxenochlorella"), "auxenochlorella");
  assert.equal(genbank.match(/^LOCUS/gm)?.length, 2);
  assert.equal(genbank.match(/^\/\//gm)?.length, 2);
  assert.match(genbank, /FokI-ELD/);
  assert.match(genbank, /FokI-KKR/);
});
