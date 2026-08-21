import assert from "node:assert/strict";
import test from "node:test";
import archiveData from "../data/gupta-2012-two-finger-modules.json" with { type: "json" };

import { buildCodaArray } from "../src/coda-module-archive.ts";
import { buildGuptaArray, GUPTA_MODULE_COUNT, GUPTA_TARGET_COUNT } from "../src/gupta-module-archive.ts";
import { buildBicistronicZfn, constructToProteinGenPept } from "../src/zfn-construct-output.ts";
import { generateZfnCandidates, reverseComplement } from "../src/zfn-design-engine.ts";

const guptaRecognition = "GAAGAAACG";
const codaRecognition = "GTGGGGGAG";
const spacer = "GATTAC";

test("Gupta implementation archive preserves all published target rows without imputation", () => {
  assert.equal(archiveData.metadata.sourceMd5, "1998b2a86b539c624bbb5ee944875530");
  assert.equal(GUPTA_TARGET_COUNT, 162);
  assert.equal(GUPTA_MODULE_COUNT, 87);
  assert.equal(new Set(archiveData.targets.map(({ target }) => target)).size, 162);
  assert.equal(new Set(archiveData.targets.map(({ id }) => id)).size, 87);
});

test("every Gupta 2F target row can be reconstructed in the F2-F3 placement", () => {
  for (const row of archiveData.targets) {
    const array = buildGuptaArray(`${row.target}GAA`);
    assert.ok(array, row.target);
    assert.equal(array.moduleTarget, row.target);
    assert.equal(array.modulePosition, "F2-F3");
    assert.equal(array.moduleId, row.id);
    assert.deepEqual(array.fingers.slice(1).map(({ helix }) => helix), [row.f1Helix, row.f2Helix]);
    assert.equal(array.protein, array.fingers.map(({ protein }) => protein).join(""));
  }
});

test("exhaustive 9-mer coverage is finite and the fallback union expands CoDA", () => {
  let gupta = 0;
  let union = 0;
  for (let value = 0; value < 4 ** 9; value += 1) {
    let encoded = value;
    let sequence = "";
    for (let position = 0; position < 9; position += 1) {
      sequence = "ACGT"[encoded % 4] + sequence;
      encoded = Math.floor(encoded / 4);
    }
    const guptaArray = buildGuptaArray(sequence);
    if (guptaArray) gupta += 1;
    if (guptaArray || buildCodaArray(sequence)) union += 1;
  }
  assert.equal(gupta, 8700);
  assert.equal(union, 13978);
});

test("published dab2ip 3F helix order is reproduced", () => {
  const array = buildGuptaArray("GACATGGAC");
  assert.ok(array);
  assert.equal(array.assembly, "2FM-5 F2-F3 + Zhu 2011 1F");
  assert.deepEqual(array.fingers.map(({ triplet }) => triplet), ["GAC", "ATG", "GAC"]);
  assert.deepEqual(array.fingers.map(({ helix }) => helix), ["LKGNLTR", "RSDTLKQ", "DKGNLTR"]);
});

test("Gupta-first profile falls back only at the complete monomer boundary", () => {
  const target = `${reverseComplement(guptaRecognition)}${spacer}${codaRecognition}`;
  const candidate = generateZfnCandidates(target, 12, 20, "gupta-coda").find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.equal(candidate.leftArray.method, "gupta-2012");
  assert.equal(candidate.rightArray.method, "coda-2011");
  assert.equal(candidate.leftArray.fingers.every(({ source }) => source.startsWith("Gupta") || source.startsWith("Zhu")), true);
  assert.equal(candidate.rightArray.fingers.every(({ source }) => source.startsWith("CoDA") || source.startsWith("fixed CoDA")), true);
});

test("CoDA-only profile reproduces the legacy method choice", () => {
  const target = `${reverseComplement(guptaRecognition)}${spacer}${guptaRecognition}`;
  const candidate = generateZfnCandidates(target, 12, 20, "coda-only").find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.equal(candidate.leftArray.method, "coda-2011");
  assert.equal(candidate.rightArray.method, "coda-2011");
});

test("generic protein output records per-finger provenance and exact coordinates", () => {
  const target = `${reverseComplement(guptaRecognition)}${spacer}${codaRecognition}`;
  const candidate = generateZfnCandidates(target, 12, 20, "gupta-coda").find(({ id }) => id === "0-6");
  assert.ok(candidate);
  const construct = buildBicistronicZfn(candidate);
  assert.equal(construct.features.at(-1).end, construct.protein.length);
  assert.match(construct.methodSummary, /Gupta 2012/);
  assert.match(construct.methodSummary, /CoDA 2011/);
  const genPept = constructToProteinGenPept(construct);
  assert.match(genPept, /Gupta 2FM-/);
  assert.match(genPept, /CoDA F/);
  assert.doesNotMatch(genPept, /^     CDS\s|\/translation=/m);
});
