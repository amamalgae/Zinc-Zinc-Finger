import { strFromU8, unzipSync } from "fflate";
import { complement, reverseComplement } from "./design-engine.ts";

export type FauserContextMap = Record<string, string>;

export type ContextCandidate = {
  id: string;
  start: number;
  cut: number;
  distance: number;
  spacerLength: number;
  spacer: string;
  leftTop: string;
  rightTop: string;
  leftRecognition: string;
  rightRecognition: string;
  leftHelices: string[];
  rightHelices: string[];
  repeatedHelices: number;
};

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function textNodes(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)]
    .map((match) => textNodes(match[1]));
}

function workbookCells(sheetXml: string, strings: string[]): Map<string, string> {
  const cells = new Map<string, string>();
  for (const match of sheetXml.matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attributes = match[1];
    const body = match[2];
    const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1];
    if (!reference) continue;
    const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    if (/\bt="s"/.test(attributes) && value !== undefined) {
      cells.set(reference, strings[Number(value)] ?? "");
    } else if (/\bt="inlineStr"/.test(attributes)) {
      cells.set(reference, textNodes(body));
    } else if (value !== undefined) {
      cells.set(reference, decodeXml(value));
    }
  }
  return cells;
}

export function parseFauserContextWorkbook(buffer: ArrayBuffer): FauserContextMap {
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error("xlsxを展開できません。Supplementary Data 33の元ファイルを選択してください。");
  }
  const sheet = files["xl/worksheets/sheet1.xml"];
  if (!sheet) throw new Error("sheet1.xmlがないためxlsxを解析できません。");
  const stringsFile = files["xl/sharedStrings.xml"];
  const strings = stringsFile ? sharedStrings(strFromU8(stringsFile)) : [];
  const cells = workbookCells(strFromU8(sheet), strings);
  const result: FauserContextMap = {};

  for (let row = 1; row <= 10_000; row += 1) {
    const helix = cells.get(`A${row}`)?.trim().toUpperCase();
    const context = cells.get(`B${row}`)?.trim().toUpperCase();
    if (/^[ACDEFGHIKLMNPQRSTVWY]{7}$/.test(helix ?? "") && /^[ACGT]{4}$/.test(context ?? "")) {
      result[context!] = helix!;
    }
  }
  if (Object.keys(result).length < 100) {
    throw new Error(`4塩基contextを${Object.keys(result).length}件しか読めませんでした（期待値182件）。`);
  }
  return result;
}

function contextHelices(
  recognition: string,
  threePrimeFlank: string | undefined,
  contextMap: FauserContextMap,
): string[] | null {
  const triplets = recognition.match(/.{3}/g) ?? [];
  if (triplets.join("") !== recognition) return null;
  const recognitionOrder = triplets.map((triplet, index) => {
    const neighbor = triplets[index + 1]?.[0] ?? threePrimeFlank;
    return neighbor ? contextMap[`${triplet}${neighbor}`] : undefined;
  });
  if (recognitionOrder.some((helix) => !helix)) return null;
  return recognitionOrder.reverse() as string[];
}

export function generateContextCandidates(
  dna: string,
  desiredCut: number,
  leftFingerCount: number,
  rightFingerCount: number,
  maxDistance: number,
  contextMap: FauserContextMap,
  candidateLimit = 30,
): ContextCandidate[] {
  const leftLength = leftFingerCount * 3;
  const rightLength = rightFingerCount * 3;
  const candidates: ContextCandidate[] = [];

  for (const spacerLength of [5, 6, 7]) {
    const footprint = leftLength + spacerLength + rightLength;
    for (let start = 0; start + footprint <= dna.length; start += 1) {
      const cut = start + leftLength + spacerLength / 2;
      const distance = Math.abs(cut - desiredCut);
      if (distance > maxDistance) continue;
      const leftTop = dna.slice(start, start + leftLength);
      const spacer = dna.slice(start + leftLength, start + leftLength + spacerLength);
      const rightTop = dna.slice(start + leftLength + spacerLength, start + footprint);
      const leftRecognition = reverseComplement(leftTop);
      const rightRecognition = rightTop;
      const leftHelices = contextHelices(leftRecognition, complement(dna[start - 1]), contextMap);
      const rightHelices = contextHelices(rightRecognition, dna[start + footprint], contextMap);
      if (!leftHelices || !rightHelices) continue;
      const helices = [...leftHelices, ...rightHelices];
      candidates.push({
        id: `context-${start}-${spacerLength}`,
        start,
        cut,
        distance,
        spacerLength,
        spacer,
        leftTop,
        rightTop,
        leftRecognition,
        rightRecognition,
        leftHelices,
        rightHelices,
        repeatedHelices: helices.length - new Set(helices).size,
      });
    }
  }
  return candidates
    .sort((a, b) => (
      a.distance - b.distance ||
      Math.abs(a.spacerLength - 6) - Math.abs(b.spacerLength - 6) ||
      a.repeatedHelices - b.repeatedHelices ||
      a.start - b.start
    ))
    .slice(0, candidateLimit);
}
