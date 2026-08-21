# Zinc Zinc Finger: AI handoff and decision record

Last reconciled: 2026-08-21 for Bhakta 2013 v3 implementation PR #63 plus the optional exact-genome-match addition in PR #64.

This is the current durable specification. The pre-v3 handoff remains recoverable in Git history; `docs/AI_HANDOFF_V2_ARCHIVE.md` records that transition, and `docs/AI_HANDOFF_V3_BHAKTA_2013.md` contains the detailed v3 rationale and validation notes.

## 1. Current product

Zinc Zinc Finger is a static, browser-local React/TypeScript tool for finding paired ZFN sites and emitting a protein-only single-ORF precursor.

Public method profiles:

1. **v3 · Bhakta 2013** — default. Extended modular assembly, six fingers per monomer, combined B-score >=15.
2. **v2 · Gupta + CoDA fallback** — three fingers per monomer. Complete Gupta 2F+1F monomer if possible; otherwise replace that entire monomer with CoDA.
3. **v1 · CoDA only** — exact CoDA shared-F2 assembly, three fingers per monomer.

The public page is <https://amamalgae.github.io/Zinc-Zinc-Finger/>. GitHub Pages deploys from `main` after CI.

Common output architecture:

```text
v3:
NLS-Bhakta ZF-L 6F-FokI ELD-F2A-NLS-Bhakta ZF-R 6F-FokI KKR

v2/v1:
NLS-ZF-L 3F-FokI ELD-F2A-NLS-ZF-R 3F-FokI KKR
```

The site emits amino-acid sequences only as annotated GenPept and protein FASTA. It does not choose codons, emit nucleotide GenBank, or claim a complete expression cassette.

## 2. Product decisions that must survive handoff

### 2.1 Candidate ranking differs by profile

This is deliberate and must not be homogenized.

**v3 Bhakta 2013:** the user's explicit decision is that distance from the requested spacer center must **not** rank candidates. The center and `Range ±bp` define an acceptable search window. Inside that window, candidates are ranked for functional promise:

1. higher combined B-score;
2. fewer TSO/context warnings;
3. fewer historically unfavorable modules;
4. more historically favorable modules;
5. spacer preference 6 bp, then 5 bp, then 7 bp;
6. genomic start only as a deterministic final tie-break.

Distance remains displayed because the user may care where the cut lies, but it is absent from the v3 comparator. `tests/bhakta-v3.test.mjs` contains a regression requiring a B20 candidate 900 bp away to outrank a B16 candidate at distance 0.

**v2/v1:** retain the established distance-first order: distance to requested spacer center, then 6 > 5 >> 7 bp, then method-specific tie-breaking.

No ranking is a candidate-specific probability of editing.

### 2.2 Browser-local sequence handling and optional genome identity check

All target and genome sequence handling stays in the browser. Do not add telemetry or upload sequence data.

`parseDNAInput()` preserves coordinates:

- FASTA headers, whitespace and position digits are ignored;
- A/C/G/T are retained;
- IUPAC ambiguity, `-`, and `.` become `N` rather than being deleted;
- unsupported characters also occupy a blocked coordinate and are counted separately;
- any candidate window containing `N` is unavailable.

Never revert to the old `replace(/[^ACGT]/g, "")` behavior in public design code because it can join bases across an unknown position.

Genome input is **optional**. With no genome file, candidate generation and ranking are exactly the normal v1/v2/v3 workflow. If supplied, the public UI accepts:

- one plain FASTA (`.fa`, `.fasta`, `.fna`, `.fas`);
- the same FASTA formats gzip-compressed;
- one ZIP containing multiple FASTA files, including gzip-compressed FASTA entries.

The feature is deliberately a sequence-identity guardrail, not a restored off-target predictor. For every returned candidate it counts genomic loci where:

1. the complete left physical half-site matches exactly;
2. the complete right physical half-site matches exactly in the paired orientation;
3. the spacer **length** matches the candidate.

Spacer bases themselves are ignored because the zinc-finger arrays do not recognize the spacer sequence. Both genomic orientations are searched. This works for the v3 18-bp half-sites and the v1/v2 9-bp half-sites.

Interpretation is intentionally narrow:

- 0 matches: the candidate pair itself was not found in the supplied genome; do not interpret this as safety;
- 1 match: exact paired recognition geometry is unique in the supplied genome;
- >1 matches: the exact paired recognition geometry is repeated and should be treated as an obvious sequence-identity warning.

These counts do **not** alter candidate rank, do not estimate cleavage probability, and do not imply that a unique exact pair is specific or safe. Mismatched sites, chromatin, methylation, expression, cell type and biochemical ZF specificity are outside this check. The legacy PROGNOS implementation remains nonpublic. Its limitations are retained from Fine M et al. (2014), DOI `10.1093/nar/gkt1326`, and Sander JD et al. (2013), DOI `10.1093/nar/gkt716`.

Plain FASTA is read as a stream in a Web Worker. ZIP handling necessarily incurs decompression memory cost; there is no artificial application file-size cap, but device/browser memory is the practical limit, especially on mobile devices.

### 2.3 Simple public workflow

Keep the public path small:

- `01 INPUT`
- `02 SELECT`
- `03 PROTEIN OUTPUT`

The method is chosen from one compact dropdown. Candidate rows stay dense and selectable; sequence text remains mouse-selectable. Do not add duplicate selected-candidate summary panels when the same facts already appear in the candidate row and technical disclosure.

All reader-facing copy belongs in `src/i18n.ts` in both English and Japanese. No readable interface text should be below 13 px outside the fixed-grid mechanism diagram.

### 2.4 Scientific claims

Do not turn cohort-level results into per-candidate probabilities. In particular:

- Bhakta 2013 L6+R6: 15/21 active is not a 71% probability for a new v3 candidate.
- Gupta 2012: 9/11 zebrafish targets above the stated threshold is a small selectively evaluated cohort, not a general probability.
- CoDA archive membership is not a guarantee of function.
- B-score is a useful eligibility/ranking signal, not a calibrated indel predictor.
- an exact-genome-match count is a deterministic sequence identity fact, not an off-target or safety score.

The complete ELD/KKR + F2A constructs emitted by this project combine separately supported parts. They were not tested as exact complete constructs in the Bhakta, Gupta, or CoDA primary studies.

Public-data implementation is not freedom-to-operate clearance.

## 3. v3 Bhakta 2013 exact logic

Primary source: Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`.

Framework source: Mandell JG, Barbas CF III (2006), DOI `10.1093/nar/gkl209`.

### 3.1 Geometry

v3 scans:

```text
top strand 5' -> 3'
[leftTop:18] [spacer:5-7] [rightTop:18]
```

- left recognition strand = reverse complement of `leftTop`;
- right recognition strand = `rightTop`;
- each 18-mer is six target triplets;
- C2H2 fingers bind antiparallel, so protein N-to-C finger order is the reverse of 5'-to-3' target-triplet order.

### 3.2 Module archive and framework

`src/module-archive.ts` contains the retained 49-entry Barbas/Bhakta one-finger archive with:

- target triplet;
- 7-aa recognition helix;
- published module B-score;
- historical favorable/unfavorable/not-evaluated recommendation;
- TSO-context flag.

`src/bhakta-module-archive.ts` constructs 3-6F arrays with:

```text
N-terminal fixed       LEPGEKP
finger framework       YKCPECGKSFS + helix + HQRTH
inter-finger linker    TGEKP
C-terminal fixed       TGKKTS
```

Only exact archive triplets are available. No missing module is predicted or substituted.

The exact Bhakta 2013 Supplemental Appendices XLS is not bundled in the repository and was not directly used as a redistributed source file. Do not claim that every emitted array is a verbatim copy of an appendix row. The implementation is audited using the public module archive, published target sequences/B-scores, benchmark reconstruction, and the published framework description.

### 3.3 Eligibility

For L6+R6:

```text
combined B-score = sum(left six module B-scores) + sum(right six module B-scores)
```

v3 returns the site only if:

```text
combined B-score >= 15
```

A site can be fully assemblable but absent from v3 because B <15. Published CS3-1 is the regression fixture for this: it reconstructs at B=14 and must be excluded.

Published HIV992 is the positive production fixture: L6+R6 reconstructs at B=17.

### 3.4 3-6F alternatives

Primary search is L6+R6, matching the Bhakta first-pass workflow. For a selected v3 site, `bhaktaAlternativesForCandidate()` generates all 16 spacer-proximal combinations:

```text
L3,L4,L5,L6 x R3,R4,R5,R6
```

These are displayed in technical details. They are empirical alternatives, not independent primary candidate sites and not measured activity predictions.

### 3.5 Spacer-dependent ZF-FokI linkers

v3 uses the Bhakta 2013 mapping:

| spacer | linker |
|---:|---|
| 5 bp | `TGGS` |
| 6 bp | `TGAAAR` |
| 7 bp | `TGPGAAAR` |

The broader 6 > 5 >> 7 preference also draws on Shimizu Y et al. (2009), DOI `10.1016/j.bmcl.2009.02.109`; Händel EM et al. (2009), DOI `10.1038/mt.2008.233`; and Chen S et al. (2013), DOI `10.1093/nar/gks1356`.

For v3, spacer is a late tie-break after B-score/context evidence. For v2/v1, spacer is a tie-break after requested-center distance.

## 4. v2 Gupta 2012 + CoDA fallback

Primary sources:

- Gupta A et al. (2012), DOI `10.1038/nmeth.1994`.
- Zhu C et al. (2011), DOI `10.1242/dev.066779`.
- Sander JD et al. (2011), DOI `10.1038/nmeth.1542`.

`data/gupta-2012-two-finger-modules.json` contains 162 unique 6-bp targets and 87 unique 2F module identifiers from the Gupta implementation workbook.

For a 9-mer, `buildGuptaArray()` tests intact 2F placement as F2-F3 or F1-F2 and fills only the remaining position with the corresponding Zhu position-specific 1F module. Do not split a Gupta 2F unit or substitute one helix.

If a complete Gupta 3F cannot be made, v2 replaces the entire monomer with an exact CoDA 3F. Mixing Gupta and CoDA fingers inside one 3F is prohibited.

## 5. v1 CoDA

`data/coda-2011-units.json` contains:

- 319 F1 units;
- 18 fixed F2 contexts;
- 344 F3 units.

`buildCodaArray()` joins outer fingers only where the same fixed F2 context is present. The exact finite archive produces 6,680 assemblable 9-mers out of 4^9 possible sequences. Missing cells remain unavailable.

C2H2 orientation example:

```text
recognition DNA 5'-GTG-GGG-GAG-3'
protein N->C: F1=GAG, F2=GGG, F3=GTG
```

## 6. Nuclease and single-ORF output

FokI ELD/KKR source: Doyon Y et al. (2011), DOI `10.1038/nmeth.1539`.

The project uses:

- ELD: Q486E / N496D / I499L;
- KKR: E490K / H537R / I538K.

F2A paired-ZFN precedent: Lei Y et al. (2011), DOI `10.1038/mt.2011.12`.

The project constant is the 22-aa FMDV-derived sequence `VKQLLNFDLLKLAGDVESNPGP`. Describe it generically as FMDV-derived unless a primary source for that exact constant is separately established.

Protein features must account for variable v3 array length. v3 output has ZF1-ZF12; v2/v1 have ZF1-ZF6. Fixed Bhakta terminal sequences are part of the array protein and must be counted in feature-coordinate cursors even though they are not labeled as separate ZF regions.

## 7. Validation evidence retained in the repository

### Bhakta

`scripts/benchmark-bhakta-2013.mjs` and `tests/bhakta-benchmark.test.mjs` retain:

- 92 reconstructed 3-6F array variants, 41 active;
- exact L6+R6 exploratory cohort: 10 sites, 7 active;
- prospective L6+R6 cohort: 11 sites, 8 active;
- combined exact L6+R6: 21 sites, 15 active;
- published full-array B-score reproduced for 20/21 sites;
- known CS7-3 discrepancy: published 21 vs calculated 20;
- combined exact-L6+R6 B-score ROC-AUC about 0.656.

`tests/bhakta-v3.test.mjs` additionally checks the current production path, eligibility cutoff, distance-free v3 rank, all 16 alternatives, complete terminal sequences, and ZF1-ZF12 output coordinates.

### Gupta / CoDA

Retain the exhaustive Gupta and CoDA archive tests. v3 must not weaken v1/v2 invariants.

- Gupta workbook rows are finite and non-imputed.
- CoDA 319/18/344 inventory is audited.
- all 4^9 recognition 9-mers are exhaustively checked against exact CoDA assembly rules.
- ambiguous-base coordinates remain preserved.

### Exact genome matching

`tests/genome-exact-match.test.mjs` checks that the optional genome feature:

- ignores spacer bases while requiring the candidate spacer length;
- finds both genomic orientations;
- counts repeated physical loci;
- parses multiline/multirecord FASTA without joining contigs;
- does not let ambiguous genome bases create an exact match;
- supports the longer v3 Bhakta half-sites as well as v1/v2 9-bp half-sites.

This validation establishes sequence-counting behavior only. It does not validate off-target cleavage prediction.

## 8. Repository map

Current public-path files:

- `src/App.tsx` — public workflow and profile selector.
- `src/i18n.ts` — all public English/Japanese copy.
- `src/zfn-design-engine.ts` — shared profile scanner and profile-specific ordering.
- `src/zfn-array.ts` — variable-length common ZF-array type.
- `src/bhakta-module-archive.ts` — current v3 array builder.
- `src/module-archive.ts` — 49-entry Barbas/Bhakta one-finger scientific archive retained from the earlier research implementation.
- `src/gupta-module-archive.ts` — v2 Gupta 2F+1F builder.
- `src/zhu-module-archive.ts` — position-specific Zhu 1F archive.
- `src/coda-module-archive.ts` — exact CoDA builder.
- `src/zfn-construct-output.ts` — current variable-length protein-only exporter.
- `src/genome-exact-match.ts` — deterministic exact paired-half-site counter and FASTA record parser.
- `src/genome-exact-match.worker.ts` — browser-local FASTA/FASTA.gz/ZIP reader and background genome scan.
- `src/ZfnOverviewDiagram.tsx` — conventional 3F paired-ZFN teaching diagram; copy explicitly notes that v3 extends each monomer to 6F.

Scientific/legacy analysis code remains because it preserves validation history. In particular, `src/off-target-engine.ts` and `src/off-target.worker.ts` remain legacy PROGNOS research code and are not the public exact-match feature. Do not delete legacy code merely because the current public UI does not render it.

## 9. Acceptance commands

Run at minimum:

```bash
npm ci
npm run lint
npm run build
npm run audit:coda
npm test
```

`npm run audit:gupta` is also useful when Gupta data changes.

A dependency audit warning is not the same as a scientific-design failure, but dependency security findings should be reported and addressed separately rather than silently ignored.

## 10. Primary-source ledger for current output

| Component / decision | Primary source |
|---|---|
| Bhakta extended modular assembly, B-score threshold, 3-6F evaluation | Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112` |
| Sp1C/Zinc Finger Tools framework | Mandell JG, Barbas CF III (2006), DOI `10.1093/nar/gkl209` |
| public modular-assembly archive summary | Bhakta M, Segal DJ (2010), DOI `10.1007/978-1-60761-753-2_1` |
| Gupta 2F archive | Gupta A et al. (2012), DOI `10.1038/nmeth.1994` |
| Zhu position-specific 1F modules | Zhu C et al. (2011), DOI `10.1242/dev.066779` |
| CoDA | Sander JD et al. (2011), DOI `10.1038/nmeth.1542` |
| ELD/KKR | Doyon Y et al. (2011), DOI `10.1038/nmeth.1539` |
| paired-ZFN F2A precedent | Lei Y et al. (2011), DOI `10.1038/mt.2011.12` |
| spacer/linker evidence | Händel EM et al. (2009), DOI `10.1038/mt.2008.233`; Shimizu Y et al. (2009), DOI `10.1016/j.bmcl.2009.02.109`; Chen S et al. (2013), DOI `10.1093/nar/gks1356` |
| reason not to treat legacy PROGNOS as a safety score | Fine M et al. (2014), DOI `10.1093/nar/gkt1326`; Sander JD et al. (2013), DOI `10.1093/nar/gkt716` |

## 11. Open scientific limitations

1. The exact Bhakta Supplemental Appendices XLS has not been bundled or used as a verbatim sequence table. If obtained with suitable redistribution/provenance terms, use it to add exact full-array sequence cross-checks rather than to replace the independent archive logic blindly.
2. B-score is not a calibrated activity model. The current v3 rank is evidence-informed, not probabilistic.
3. Historical TSO and module recommendation fields are secondary tie-break evidence. If future validation shows they do not improve independent performance, remove them from ranking rather than retaining them for tradition.
4. The exact Bhakta-6F/ELD/F2A/KKR complete construct needs experimental validation in the intended host.
5. The optional genome identity check does not enumerate mismatched binding sites and cannot establish specificity or safety; experimentally important off-targets can therefore be absent from its report.
6. FokI variants such as the attenuated Miller 2019 designs remain a separate future architecture decision and should not be silently substituted into v3.
7. FTO remains outside the scope of software logic and requires jurisdiction/use-specific review.
