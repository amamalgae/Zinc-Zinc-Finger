import assert from "node:assert/strict";
import test from "node:test";
import archiveData from "../data/coda-2011-units.json" with { type: "json" };

import {
  buildCodaBicistronicZfn,
  CODA_ZFN_DONORS,
  codaConstructToProteinFasta,
} from "../src/coda-construct-output.ts";
import {
  cleanDNA,
  generateCodaCandidates,
  parseDNAInput,
  reverseComplement,
} from "../src/coda-design-engine.ts";
import {
  buildCodaArray,
  CODA_F1_UNIT_COUNT,
  CODA_F2_CONTEXT_COUNT,
  CODA_F3_UNIT_COUNT,
  CODA_UNIT_COUNT,
} from "../src/coda-module-archive.ts";

const recognition = "GTGGGGGAG";
const target = `${reverseComplement(recognition)}GATTAC${recognition}`;

const EXPECTED_F1_TARGET_COUNTS = {
  GGG: 16, GGA: 16, GGC: 17, GGT: 15, GAG: 15, GAA: 17, GAC: 16,
  GCG: 16, GCA: 15, GCC: 16, GCT: 17, GTG: 17, GTA: 15, GTC: 16,
  GTT: 15, AAC: 12, ACG: 12, TGC: 12, TGT: 14, TCG: 3, GAT: 6,
  AGG: 10, TAG: 9, TTC: 1, TCT: 1,
};
const EXPECTED_F3_TARGET_COUNTS = {
  GGG: 16, GGA: 15, GGC: 14, GGT: 16, GAG: 18, GAA: 16, GAC: 17,
  GAT: 15, GCG: 16, GCA: 16, GCC: 16, GCT: 15, GTG: 16, GTA: 16,
  GTC: 16, GTT: 15, TGG: 16, TGC: 11, TGT: 16, TAG: 13, TAA: 13,
  TCG: 16, TTA: 1, TCT: 2, TCC: 1, TTC: 1, TTT: 1,
};

function countByTarget(kind) {
  return Object.fromEntries(
    Object.entries(Object.groupBy(archiveData.units.filter(({ unit }) => unit === kind), ({ target }) => target))
      .map(([triplet, rows]) => [triplet, rows.length]),
  );
}

function expectedRecognitionSet() {
  const result = new Set();
  for (const { target: f2Target } of archiveData.f2Contexts) {
    const f1Targets = archiveData.units.filter(({ unit, f2Target: context }) => unit === "f1" && context === f2Target);
    const f3Targets = archiveData.units.filter(({ unit, f2Target: context }) => unit === "f3" && context === f2Target);
    for (const f1 of f1Targets) for (const f3 of f3Targets) result.add(`${f3.target}${f2Target}${f1.target}`);
  }
  return result;
}

const expectedRecognitions = expectedRecognitionSet();

test("CoDA archive exposes the complete published F1/F2/F3 inventory", () => {
  assert.equal(CODA_F2_CONTEXT_COUNT, 18);
  assert.equal(CODA_F1_UNIT_COUNT, 319);
  assert.equal(CODA_F3_UNIT_COUNT, 344);
  assert.equal(CODA_UNIT_COUNT, 663);
});

test("archive rows are unique, share the declared F2 helix, and match the patent target totals", () => {
  assert.deepEqual(countByTarget("f1"), EXPECTED_F1_TARGET_COUNTS);
  assert.deepEqual(countByTarget("f3"), EXPECTED_F3_TARGET_COUNTS);
  const f2Helices = new Map(archiveData.f2Contexts.map(({ target, helix }) => [target, helix]));
  const keys = archiveData.units.map(({ unit, f2Target, target }) => `${unit}:${f2Target}:${target}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const row of archiveData.units) assert.equal(row.f2Helix, f2Helices.get(row.f2Target));
});

test("every and only context-compatible 9-mer in the archive can be assembled", () => {
  let observed = 0;
  const bases = "ACGT";
  for (let value = 0; value < 4 ** 9; value += 1) {
    let encoded = value;
    let sequence = "";
    for (let position = 0; position < 9; position += 1) {
      sequence = bases[encoded % 4] + sequence;
      encoded = Math.floor(encoded / 4);
    }
    const array = buildCodaArray(sequence);
    assert.equal(Boolean(array), expectedRecognitions.has(sequence), sequence);
    if (array) {
      observed += 1;
      assert.equal(array.recognition, sequence);
      assert.deepEqual(array.fingers.map(({ triplet }) => triplet), [sequence.slice(6), sequence.slice(3, 6), sequence.slice(0, 3)]);
    }
  }
  assert.equal(observed, expectedRecognitions.size);
});

test("FASTA parsing preserves ambiguous-base coordinates instead of joining across them", () => {
  const parsed = parseDNAInput(">sample ACGT in header\nAC GT 12\nRYSWKMBDHVN-.\n");
  assert.equal(parsed.dna, `ACGT${"N".repeat(13)}`);
  assert.equal(parsed.ambiguousBaseCount, 13);
  assert.equal(parsed.invalidCharacterCount, 0);
  assert.equal(cleanDNA("ACGNTA"), "ACGNTA");

  const interruptedTarget = `${target.slice(0, 4)}N${target.slice(4)}`;
  assert.equal(generateCodaCandidates(cleanDNA(interruptedTarget), 12, 20).length, 0);
});

test("unsupported characters are retained as blocked coordinates and reported", () => {
  assert.deepEqual(parseDNAInput("ACGT@AC"), {
    dna: "ACGTNAC",
    ambiguousBaseCount: 0,
    invalidCharacterCount: 1,
  });
});

test("CoDA joins context-compatible outer fingers around the same fixed F2", () => {
  const array = buildCodaArray(recognition);
  assert.ok(array);
  assert.equal(array.f2Context, "GGG");
  assert.deepEqual(array.fingers.map(({ triplet }) => triplet), ["GAG", "GGG", "GTG"]);
  assert.deepEqual(array.fingers.map(({ helix }) => helix), ["RNTNLTR", "RREHLVR", "RPDALPR"]);
  assert.equal(array.protein.length, 79);
  assert.match(array.protein, /^FQCRICMRNFSRNTNLTRHTRTHTGEKPFQCRICMRNFS/);
  assert.match(array.protein, /HLRTHTGEKPFQCRICMRNFSRPDALPRHLKTH$/);
});

test("CoDA does not impute absent context combinations", () => {
  assert.equal(buildCodaArray("AAAAAAAAA"), null);
  assert.equal(buildCodaArray("NNNNNNNNN"), null);
});

test("ZFN scanning preserves strand orientation and 5-7 bp spacer geometry", () => {
  const candidate = generateCodaCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.equal(candidate.leftRecognition, recognition);
  assert.equal(candidate.rightRecognition, recognition);
  assert.equal(candidate.spacer, "GATTAC");
  assert.deepEqual(candidate.leftArray.fingers.map(({ triplet }) => triplet), ["GAG", "GGG", "GTG"]);
  assert.deepEqual(candidate.rightArray.fingers.map(({ triplet }) => triplet), ["GAG", "GGG", "GTG"]);
});

test("bounded scanner has the same ordering as an independent exhaustive oracle", () => {
  const dna = `${target}ACGT${target}GGGG${target}`;
  const desiredCut = 38.5;
  const maxDistance = 35;
  const oracle = [];
  for (const spacerLength of [5, 6, 7]) {
    const footprint = 18 + spacerLength;
    for (let start = 0; start + footprint <= dna.length; start += 1) {
      const leftTop = dna.slice(start, start + 9);
      const rightTop = dna.slice(start + 9 + spacerLength, start + footprint);
      const cut = start + 9 + spacerLength / 2;
      const distance = Math.abs(cut - desiredCut);
      if (distance <= maxDistance && expectedRecognitions.has(reverseComplement(leftTop)) && expectedRecognitions.has(rightTop)) {
        oracle.push({ id: `${start}-${spacerLength}`, distance, spacerLength, start });
      }
    }
  }
  oracle.sort((left, right) => left.distance - right.distance || Math.abs(left.spacerLength - 6) - Math.abs(right.spacerLength - 6) || left.start - right.start);
  const actual = generateCodaCandidates(dna, desiredCut, maxDistance, 30)
    .map(({ id, distance, spacerLength, start }) => ({ id, distance, spacerLength, start }));
  assert.deepEqual(actual, oracle.slice(0, 30));
});

test("distance boundary and invalid numeric controls do not admit out-of-range candidates", () => {
  assert.ok(generateCodaCandidates(target, 12, 0).some(({ id }) => id === "0-6"));
  assert.equal(generateCodaCandidates(target, 12, -1).some(({ id }) => id === "0-6"), true);
  assert.deepEqual(generateCodaCandidates(target, Number.NaN, 20), []);
  assert.deepEqual(generateCodaCandidates(target, 12, 20, 0), []);
});

test("CoDA output contains complete protein arrays, ELD/F2A/KKR, and no generated CDS", () => {
  const candidate = generateCodaCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  const construct = buildCodaBicistronicZfn(candidate);
  assert.equal("cds" in construct, false);
  assert.equal("gcPercent" in construct, false);
  assert.match(construct.processedLeftProtein, /^MAPKKKRKVFQCRICMRNFS/);
  assert.match(construct.processedRightProtein, /^PMAPKKKRKVFQCRICMRNFS/);
  assert.equal(CODA_ZFN_DONORS.length, 4);
  const fasta = codaConstructToProteinFasta(construct);
  assert.match(fasta, /precursor_polyprotein/);
  assert.match(fasta, /processed_left/);
  assert.match(fasta, /processed_right/);
  assert.doesNotMatch(fasta, /\bCDS\b|codon|GenBank/i);
});
