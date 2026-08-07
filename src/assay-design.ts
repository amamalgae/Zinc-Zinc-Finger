import { reverseComplement } from "./design-engine.ts";

export type AssayPrimer = {
  name: string;
  sequence: string;
  strand: "+" | "-";
  start: number;
  end: number;
  tmCelsius: number;
  gcPercent: number;
};

export type AmpliconDesign = {
  forward: AssayPrimer;
  reverse: AssayPrimer;
  start: number;
  end: number;
  length: number;
};

export type CleavageAssayDesign = {
  amplicon: AmpliconDesign | null;
  ssaTargetTop: string;
  ssaTargetBottom: string;
};

export function gcPercent(sequence: string): number {
  return sequence.length
    ? 100 * (sequence.match(/[GC]/g)?.length ?? 0) / sequence.length
    : 0;
}

export function approximateTm(sequence: string): number {
  if (!sequence.length) return 0;
  const gcBases = sequence.match(/[GC]/g)?.length ?? 0;
  return 64.9 + 41 * (gcBases - 16.4) / sequence.length;
}

function acceptablePrimer(sequence: string): boolean {
  const gc = gcPercent(sequence);
  const tm = approximateTm(sequence);
  return gc >= 35 && gc <= 65 && tm >= 57 && tm <= 64.5 && !/(A{5}|C{5}|G{5}|T{5})/.test(sequence);
}

function primerScore(sequence: string): number {
  const last = sequence.at(-1);
  return Math.abs(approximateTm(sequence) - 60.5) * 3
    + Math.abs(gcPercent(sequence) - 50) / 5
    + (last === "G" || last === "C" ? 0 : 2);
}

function forwardPrimers(dna: string, cut: number): AssayPrimer[] {
  const result: AssayPrimer[] = [];
  const latestEnd = Math.floor(cut - 55);
  for (let length = 18; length <= 25; length += 1) {
    for (let start = Math.max(0, latestEnd - 330); start + length <= latestEnd; start += 1) {
      const sequence = dna.slice(start, start + length);
      if (!acceptablePrimer(sequence)) continue;
      result.push({
        name: "cleavage_amplicon_F",
        sequence,
        strand: "+",
        start,
        end: start + length,
        tmCelsius: approximateTm(sequence),
        gcPercent: gcPercent(sequence),
      });
    }
  }
  return result.sort((a, b) => primerScore(a.sequence) - primerScore(b.sequence)).slice(0, 100);
}

function reversePrimers(dna: string, cut: number): AssayPrimer[] {
  const result: AssayPrimer[] = [];
  const earliestStart = Math.ceil(cut + 55);
  for (let length = 18; length <= 25; length += 1) {
    for (let start = earliestStart; start + length <= Math.min(dna.length, earliestStart + 330); start += 1) {
      const sequence = reverseComplement(dna.slice(start, start + length));
      if (!acceptablePrimer(sequence)) continue;
      result.push({
        name: "cleavage_amplicon_R",
        sequence,
        strand: "-",
        start,
        end: start + length,
        tmCelsius: approximateTm(sequence),
        gcPercent: gcPercent(sequence),
      });
    }
  }
  return result.sort((a, b) => primerScore(a.sequence) - primerScore(b.sequence)).slice(0, 100);
}

export function designCleavageAssay(
  dna: string,
  cut: number,
  ssaTargetTop: string,
): CleavageAssayDesign {
  let best: { design: AmpliconDesign; score: number } | null = null;
  for (const forward of forwardPrimers(dna, cut)) {
    for (const reverse of reversePrimers(dna, cut)) {
      const length = reverse.end - forward.start;
      if (length < 240 || length > 450) continue;
      const design = {
        forward,
        reverse,
        start: forward.start,
        end: reverse.end,
        length,
      };
      const score = Math.abs(length - 330) / 12
        + Math.abs(forward.tmCelsius - reverse.tmCelsius) * 2
        + primerScore(forward.sequence)
        + primerScore(reverse.sequence);
      if (!best || score < best.score) best = { design, score };
    }
  }
  return {
    amplicon: best?.design ?? null,
    ssaTargetTop,
    ssaTargetBottom: reverseComplement(ssaTargetTop),
  };
}

export function cleavageAssayToCsv(design: CleavageAssayDesign): string {
  const rows = [["item", "sequence_5to3", "tm_c", "gc_percent", "start_0based", "end_0based"]];
  if (design.amplicon) {
    for (const primer of [design.amplicon.forward, design.amplicon.reverse]) {
      rows.push([
        primer.name,
        primer.sequence,
        primer.tmCelsius.toFixed(1),
        primer.gcPercent.toFixed(1),
        String(primer.start),
        String(primer.end),
      ]);
    }
  }
  rows.push(["ssa_target_top", design.ssaTargetTop, "", "", "", ""]);
  rows.push(["ssa_target_bottom", design.ssaTargetBottom, "", "", "", ""]);
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
}
