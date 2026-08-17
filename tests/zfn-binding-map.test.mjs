import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function loadBindingMapModule() {
  const source = readFileSync(new URL("../src/zfn-binding-map.ts", import.meta.url), "utf8")
    .replace(/^import type .*?;\n/m, "");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Error });
  return module.exports;
}

const { buildZfnBindingMap, complementDna } = loadBindingMapModule();

test("DNA complement preserves the displayed left-to-right coordinates", () => {
  assert.equal(complementDna("ACGTTG"), "TGCAAC");
});

test("six global ZF numbers map to the two antiparallel 3ZF monomers", () => {
  const map = buildZfnBindingMap({
    leftTop: "AAACCCGGG",
    spacer: "GATTA",
    rightTop: "TTTGGGCCC",
  });

  assert.deepEqual(
    Array.from(map.leftProteinOrder, ({ globalFinger, localFinger, topTriplet }) => [globalFinger, localFinger, topTriplet]),
    [[1, 1, "AAA"], [2, 2, "CCC"], [3, 3, "GGG"]],
  );
  assert.deepEqual(
    Array.from(map.rightProteinOrder, ({ globalFinger, localFinger, topTriplet }) => [globalFinger, localFinger, topTriplet]),
    [[4, 1, "CCC"], [5, 2, "GGG"], [6, 3, "TTT"]],
  );
  assert.deepEqual(
    Array.from(map.topStrandOrder, ({ globalFinger, topTriplet, bottomTriplet, recognitionTriplet }) => [globalFinger, topTriplet, bottomTriplet, recognitionTriplet]),
    [
      [1, "AAA", "TTT", "TTT"],
      [2, "CCC", "GGG", "GGG"],
      [3, "GGG", "CCC", "CCC"],
      [6, "TTT", "AAA", "TTT"],
      [5, "GGG", "CCC", "GGG"],
      [4, "CCC", "GGG", "CCC"],
    ],
  );
  assert.equal(map.spacerBottom, "CTAAT");
});
