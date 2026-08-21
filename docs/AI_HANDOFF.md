# Zinc Zinc Finger: AI handoff and decision record

Last reconciled: 2026-08-21 for PR #78, which removes public center/range controls, searches the complete submitted target DNA, keeps compact integer coordinates, and exposes all genome filenames.

Read this together with `docs/AI_HANDOFF_V3_BHAKTA_2013.md`. The pre-v3 state remains recoverable through Git history and `docs/AI_HANDOFF_V2_ARCHIVE.md`.

## 1. Current product

Zinc Zinc Finger is a static browser-local React/TypeScript ZFN designer.

Public profiles:

1. `v3 · Bhakta 2013` — default, 6F per monomer, combined B-score >=15.
2. `v2 · Gupta + CoDA fallback` — 3F per monomer.
3. `v1 · CoDA only` — 3F per monomer.

Public workflow:

```text
01 INPUT -> 02 SELECT -> 03 PROTEIN OUTPUT
```

Protein output:

```text
v3:    NLS-ZF-L 6F-FokI ELD-F2A-NLS-ZF-R 6F-FokI KKR
v2/v1: NLS-ZF-L 3F-FokI ELD-F2A-NLS-ZF-R 3F-FokI KKR
```

Only annotated protein GenPept and protein FASTA are emitted. No codon choice, nucleotide GenBank, promoter, terminator, or complete expression cassette is generated.

## 2. Public search-window invariant

The submitted target DNA itself is the complete public search window.

Do not restore separate requested spacer-center or `Range ±bp` controls unless explicitly requested in a later product decision.

Every candidate footprint that fits wholly inside the parsed target DNA is eligible for archive evaluation.

Candidate rows retain a compact location coordinate from the beginning of the submitted target sequence. Internally, spacer centers can be integer or half-integer between-bases positions. Public display uses the **earlier integer** for a half-integer center:

```text
64.5 -> +64
65.0 -> +65
```

The coordinate is location information only. It is not a distance score and must not affect v3 ranking.

`src/zfn-design-engine.ts` keeps legacy `generateZfnCandidates()` for existing scientific fixtures that explicitly use a center/range. The public UI calls `generateZfnCandidatesAcrossSequence()` instead.

## 3. Candidate ranking

### v3 Bhakta 2013

Public order:

1. higher combined B-score;
2. fewer TSO/context warnings;
3. fewer historically unfavorable modules;
4. more historically favorable modules;
5. spacer `6 > 5 >> 7`;
6. genomic start only as deterministic final tie-break.

Position coordinate is not a functional ranking factor.

### v2 Gupta + CoDA fallback

Without genome-aware ordering:

1. spacer `6 > 5 >> 7`;
2. more Gupta-completed arms;
3. genomic start.

### v1 CoDA only

Without genome-aware ordering:

1. spacer `6 > 5 >> 7`;
2. genomic start.

No ranking is a candidate-specific probability of editing.

## 4. Input parsing and browser-local handling

All target and genome sequence handling stays in the browser. Do not add sequence upload, analytics, or telemetry.

`parseDNAInput()` preserves coordinate structure:

- FASTA headers, whitespace, and position digits are ignored;
- A/C/G/T are retained;
- IUPAC ambiguity, `-`, and `.` become `N` rather than being deleted;
- unsupported characters occupy a blocked coordinate and are counted;
- candidate windows containing `N` are unavailable.

Do not replace this with a filter that simply deletes non-ACGT characters, because that can join bases across unknown positions.

## 5. Optional genome similarity screen

Genome input is optional. The UI accepts multiple files by picker or drag/drop:

- `.fa`, `.fasta`, `.fna`, `.fas`;
- gzip-compressed versions;
- ZIP archives containing FASTA or FASTA.gz entries.

All selected top-level filenames must remain visible without ellipsis. After ZIP parsing, every recognized FASTA entry must also be shown as:

```text
archive.zip / path/to/entry.fa
```

The feature is a deterministic sequence-similarity guardrail, not an off-target predictor.

Search envelope:

- v1/v2: each 9-bp half-site <=4 mismatches and <=5 total;
- v3: each 18-bp half-site <=4 mismatches independently, up to 8 total;
- both genomic orientations;
- spacer lengths 5, 6, and 7 bp;
- spacer bases themselves are ignored.

Genome-aware ordering:

- extra exact copies are strongly penalized;
- for v3, functional evidence remains primary for non-exact sites;
- 1-2 total mismatches are a stronger secondary factor;
- 3-4 mismatches are weaker tie-break evidence;
- >=5 mismatches are display/reference data and do not alter rank;
- genome-aware ordering is disabled when the intended exact target is not confirmed for every candidate in the supplied genome.

The screen does not model chromatin, methylation, cell type, ZF biochemical specificity, or cleavage probability. Legacy PROGNOS research code remains nonpublic. Fine M et al. (2014), DOI `10.1093/nar/gkt1326`; Sander JD et al. (2013), DOI `10.1093/nar/gkt716`.

## 6. v3 Bhakta 2013

Primary source: Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`.

Framework source: Mandell JG, Barbas CF III (2006), DOI `10.1093/nar/gkl209`.

Geometry:

```text
[leftTop 18] [spacer 5-7] [rightTop 18]
```

- left recognition strand = reverse complement of `leftTop`;
- right recognition strand = `rightTop`;
- each side has six triplets / six fingers;
- protein N-to-C finger order is antiparallel to recognition DNA 5'-to-3'.

The v3 builder uses only exact public Barbas/Bhakta one-finger archive entries. Missing triplets are not predicted or imputed.

Current Sp1C-style framework:

```text
LEPGEKP
[YKCPECGKSFS + 7-aa recognition helix + HQRTH]
TGEKP
...
[YKCPECGKSFS + 7-aa recognition helix + HQRTH]
TGKKTS
```

Combined B-score:

```text
sum(left 6 modules) + sum(right 6 modules)
```

Primary v3 candidates require `B >= 15`.

Published production fixtures:

- HIV992 reconstructs L6+R6 at B=17;
- CS3-1 is constructible at B=14 and must be excluded.

For a selected site, `bhaktaAlternativesForCandidate()` exposes L3-L6 x R3-R6 = 16 spacer-proximal alternatives. These are empirical alternatives, not measured activity predictions.

The exact Bhakta Supplemental Appendices XLS is not bundled. Do not claim emitted arrays are verbatim rows from that workbook.

Bhakta 2013 reported 15 active L6+R6 sites among 21 tested sites. This is not a 71% success probability for a new candidate. The retained exact-L6+R6 reconstructed B-score ROC-AUC is about 0.656, so fine score differences must not be treated as calibrated activity predictions.

## 7. v2 Gupta 2012 + CoDA fallback

Primary sources:

- Gupta A et al. (2012), DOI `10.1038/nmeth.1994`;
- Zhu C et al. (2011), DOI `10.1242/dev.066779`;
- Sander JD et al. (2011), DOI `10.1038/nmeth.1542`.

`buildGuptaArray()` uses intact Gupta 2F modules plus the appropriate Zhu position-specific 1F module. Do not split a Gupta 2F module.

If a complete Gupta 3F cannot be built, v2 replaces the entire monomer with exact CoDA. Do not mix Gupta and CoDA fingers inside one 3F monomer.

## 8. v1 CoDA

`data/coda-2011-units.json` retains:

- 319 F1 units;
- 18 fixed F2 contexts;
- 344 F3 units.

Only exact shared-F2 joins are allowed. Missing cells remain unavailable.

## 9. Spacer/linker mapping

| spacer | ZF-FokI linker |
|---:|---|
| 5 bp | `TGGS` |
| 6 bp | `TGAAAR` |
| 7 bp | `TGPGAAAR` |

Evidence includes Shimizu Y et al. (2009), DOI `10.1016/j.bmcl.2009.02.109`; Händel EM et al. (2009), DOI `10.1038/mt.2008.233`; Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`; Chen S et al. (2013), DOI `10.1093/nar/gks1356`.

`6 > 5 >> 7` is a discrete preference, not a predicted activity ratio.

## 10. Nuclease and single-ORF output

FokI ELD/KKR source: Doyon Y et al. (2011), DOI `10.1038/nmeth.1539`.

Current mutations:

- ELD: Q486E / N496D / I499L;
- KKR: E490K / H537R / I538K.

Paired-ZFN F2A single-ORF precedent: Lei Y et al. (2011), DOI `10.1038/mt.2011.12`.

The exact Bhakta-6F/ELD/F2A/KKR complete construct emitted here was not tested as such in Bhakta 2013. The same separation-of-evidence warning applies to v1/v2 complete outputs.

## 11. Regression and acceptance requirements

Important regression coverage includes:

- Bhakta module count and B>=15 cutoff;
- HIV992 B=17 and CS3-1 B=14 exclusion;
- 16 Bhakta 3-6F alternatives;
- v3 functional ranking independent of arbitrary center distance;
- complete target-DNA public search;
- absence of public center/range controls;
- earlier-integer public spacer coordinate convention;
- exact Gupta/CoDA finite lookup rules;
- ambiguous-base coordinate preservation;
- genome mismatch envelope;
- multiple genome file input and drag/drop;
- all selected/ZIP-contained FASTA filenames visible;
- protein feature coordinates through ZF1-ZF12 for v3.

Run at minimum:

```bash
npm ci
npm run lint
npm run build
npm run audit:coda
npm test
```

Run `npm run audit:gupta` when Gupta data changes.

## 12. Repository map

Public-path files:

- `src/App.tsx` — public workflow;
- `src/i18n.ts` — English/Japanese public copy;
- `src/zfn-design-engine.ts` — profile scanner, full-target public helper, profile ordering;
- `src/genome-ranking.ts` — genome-aware ranking;
- `src/genome-exact-match.ts` — paired-half-site similarity search core;
- `src/genome-exact-match.worker.ts` — FASTA/FASTA.gz/ZIP reader, filename inventory, worker scan;
- `src/bhakta-module-archive.ts` — v3 arrays;
- `src/gupta-module-archive.ts` — Gupta arrays;
- `src/zhu-module-archive.ts` — Zhu 1F archive;
- `src/coda-module-archive.ts` — CoDA arrays;
- `src/zfn-construct-output.ts` — protein-only output.

Legacy research code and benchmark/data files should remain unless an explicit archival migration is approved.

## 13. Scientific and regulatory limits

Do not state or imply:

- archive membership guarantees activity;
- B-score is a calibrated indel predictor;
- Bhakta 15/21 is a per-candidate probability;
- genome similarity output is an off-target safety score;
- the emitted complete constructs were validated exactly as assembled here;
- public implementation establishes freedom to operate.

FTO remains jurisdiction- and use-specific.
