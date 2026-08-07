import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { zipSync, strToU8 } from "fflate";
import {
  generateContextCandidates,
  parseFauserContextWorkbook,
} from "../src/fauser-context.ts";

function workbookWithRows(rows) {
  const strings = rows.flat();
  const shared = `<?xml version="1.0"?><sst>${strings.map((value) => `<si><t>${value}</t></si>`).join("")}</sst>`;
  const sheetRows = rows.map((_, index) => {
    const row = index + 1;
    return `<row r="${row}"><c r="A${row}" t="s"><v>${index * 2}</v></c><c r="B${row}" t="s"><v>${index * 2 + 1}</v></c></row>`;
  }).join("");
  const sheet = `<?xml version="1.0"?><worksheet><sheetData>${sheetRows}</sheetData></worksheet>`;
  return zipSync({
    "xl/sharedStrings.xml": strToU8(shared),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  }).buffer;
}

test("Fauser xlsx parser reads helix and four-base context columns", () => {
  const bases = ["A", "C", "G", "T"];
  const rows = Array.from({ length: 128 }, (_, index) => [
    "QSSNLAR",
    `${bases[Math.floor(index / 64) % 4]}${bases[Math.floor(index / 16) % 4]}${bases[Math.floor(index / 4) % 4]}${bases[index % 4]}`,
  ]);
  const map = parseFauserContextWorkbook(workbookWithRows(rows));
  assert.ok(Object.keys(map).length >= 100);
  assert.equal(map.AAAA, "QSSNLAR");
});

test("context candidates use the next recognition base and reverse helices into N-to-C order", () => {
  const map = {};
  for (const first of "ACGT") {
    for (const second of "ACGT") {
      for (const third of "ACGT") {
        for (const fourth of "ACGT") map[`${first}${second}${third}${fourth}`] = `${first}${second}${third}${fourth}AAA`;
      }
    }
  }
  const candidates = generateContextCandidates("AACCGGTTAACCGGTTAACCGGTTAACCGGTT", 17, 3, 3, 20, map);
  assert.ok(candidates.length > 0);
  const first = candidates[0];
  assert.equal(first.leftHelices.length, 3);
  assert.equal(first.rightHelices.length, 3);
  assert.match(first.id, /^context-/);
});

test("the released Supplementary Data 33 contains 182 context helices when available", async (context) => {
  const path = "/tmp/fauser-sd33.xlsx";
  let file;
  try {
    file = await readFile(path);
  } catch {
    context.skip("research source workbook is not present");
    return;
  }
  const map = parseFauserContextWorkbook(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  assert.equal(Object.keys(map).length, 182);
});
