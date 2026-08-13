import assert from "node:assert/strict";
import test from "node:test";

import { translateDna } from "../src/construct-output.ts";
import {
  generateZhuCandidates,
  reverseComplement,
} from "../src/zhu-design-engine.ts";
import {
  buildZhuBicistronicZfn,
  ZHU_ZFN_DONORS,
  zhuConstructToGenBank,
} from "../src/zhu-construct-output.ts";
import {
  getZhuModule,
  ZHU_MODULE_COUNT,
  ZHU_TRIPLET_COUNT,
} from "../src/zhu-module-archive.ts";

test("Zhu archive exposes 27 triplets at three position-specific modules", () => {
  assert.equal(ZHU_TRIPLET_COUNT, 27);
  assert.equal(ZHU_MODULE_COUNT, 81);
  assert.equal(getZhuModule("GGC", 1)?.helix, "EKSHLTR");
  assert.equal(getZhuModule("GGC", 2)?.helix, "DRSHLAR");
  assert.equal(getZhuModule("GGC", 3)?.helix, "DRSHLTR");
  assert.equal(getZhuModule("AAA", 1), null);
});

test("3-finger mapping follows antiparallel F1/F2/F3 recognition order", () => {
  const leftRecognition = "GGAGATGGC";
  const rightRecognition = "GTGGATGAG";
  const target = `${reverseComplement(leftRecognition)}GATTAC${rightRecognition}`;
  const candidate = generateZhuCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  assert.deepEqual(candidate.leftFingers.map(({ triplet }) => triplet), ["GGC", "GAT", "GGA"]);
  assert.deepEqual(candidate.rightFingers.map(({ triplet }) => triplet), ["GAG", "GAT", "GTG"]);
  assert.match(candidate.leftArrayProtein, /^YACPVESCDRRFS/);
  assert.match(candidate.leftArrayProtein, /GQKPFQCRICMRNFS/);
  assert.match(candidate.leftArrayProtein, /GEKPFACDICGRKFA/);
});

test("Zhu construct uses ELD/F2A/KKR and translates exactly", () => {
  const target = `${reverseComplement("GGAGATGGC")}GATTACGTGGATGAG`;
  const candidate = generateZhuCandidates(target, 12, 20).find(({ id }) => id === "0-6");
  assert.ok(candidate);
  const construct = buildZhuBicistronicZfn(candidate, "auxenochlorella");
  assert.equal(translateDna(construct.cds), `${construct.protein}*`);
  assert.match(construct.processedRightProtein, /^PMAPKKKRKVYACPVESCDRRFS/);
  assert.deepEqual(ZHU_ZFN_DONORS.map(({ scientificName }) => scientificName), [
    "Betapolyomavirus macacae",
    "Mus musculus",
    "Flavobacterium okeanokoites",
    "Foot-and-mouth disease virus",
  ]);
  const genbank = zhuConstructToGenBank(construct, "auxenochlorella");
  assert.match(genbank, /Zhu 2011 position-specific Zif268 3-finger arrays/);
  assert.match(genbank, /Dueñas 2025 F2A/);
});
