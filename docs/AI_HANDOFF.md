# Zinc Zinc Finger: AI handoff and decision record

Last reconciled: 2026-08-17, for PR #24 based on `main` commit `9889df7`, plus the source files listed in section 10.

This document is the durable context for a new AI or developer who has no access to the prior ChatGPT conversations. Read it before modifying the scientific logic. The current README explains what the public site does; this file also explains what it used to do, why approaches were removed, what the evidence can and cannot support, and which questions remain open.

## 1. Executive summary

Zinc Zinc Finger is a static, browser-local React/TypeScript tool for finding **pairs of 3-finger CoDA ZFNs** around a requested location. Its present public design is deliberately narrow:

```text
top strand 5' -> 3'

left 9 bp half-site | spacer 5-7 bp | right 9 bp half-site
        ZF-L                    ZF-R

protein output:
NLS-CoDA 3F-FokI ELD-F2A-NLS-CoDA 3F-FokI KKR
```

The project began as a broader 3-6-finger extended modular-assembly designer with activity scoring, optional recognition models, genome-wide off-target scanning, base-skipping, assay design, codon optimization, and GenBank export. Those implementations and validation datasets remain for reproducibility, but the public UI was intentionally simplified. The current site uses the complete Sander 2011 CoDA unit archive, produces amino-acid sequences only, and makes no candidate-specific activity claim.

The public page is <https://amamalgae.github.io/Zinc-Zinc-Finger/>. GitHub Pages deploys from `main` after build and tests.

## 2. Product intent and decisions that should survive a handoff

The intended use is practical ZFN site selection for knock-in and related genome-editing work, including microbial or microalgal systems. The user is not asking for an exhaustive general-purpose ZF research platform. Preserve these decisions unless explicitly changed:

1. **Current design method: CoDA, 3 fingers per monomer.** Use the experimentally selected context-dependent F1/F2 and F2/F3 units of Sander 2011. A target-specific selection step is not required during in-silico design, but every finished ZFN still requires experimental validation.
2. **Do not invent archive entries.** An empty CoDA table cell is unavailable, not a value to predict or interpolate.
3. **Protein output only.** The site does not choose codons because the eventual host range is not fixed. Codon optimization and DNA-level QC belong at the synthesis stage for the actual host, organelle, vector, and cloning constraints.
4. **Simple public workflow.** The current UI should remain understandable to a ZFN beginner. Historical research modules can remain in code/tests without being exposed in the main workflow.
5. **KI-oriented search radius.** The search range is a numeric input with default +/-500 bp. It is not a toggle. The requested coordinate is the desired **spacer center**, not a guaranteed FokI phosphodiester-bond cleavage coordinate.
6. **Browser-local processing.** Target and genome sequences must not be uploaded. The site has no API, analytics, or external persistence for sequence input.
7. **Several candidates should be tested.** Archive membership and geometric rank are not activity estimates. A practical experiment should compare multiple candidates in the relevant expression system, ideally with an SSA or another cleavage pre-screen before relying on KI.
8. **No FTO conclusion in the software.** Public disclosure, an expired patent, or an independently written implementation does not by itself establish freedom to operate for a use and jurisdiction.
9. **Future 6-finger work is a separate design decision.** Do not obtain "6F" merely by concatenating two current CoDA 3F arrays without a defined construction rule and supporting validation.
10. **Lead the public page with the user outcome, not the molecular mechanism.** The hero must identify the tool as `SANDER 2011 · CoDA-based ZFN Designer`, explain that it finds a left/right ZFN pair from target DNA and emits complete protein sequences, and place the sequence input immediately after that value proposition. The original-study result may be displayed as **19 of 38 targets (50%) with detected mutations**, with Sander 2011 named and linked, but must be labeled as a cohort result rather than a candidate-specific probability. Finger composition and other technical detail belong after the selected target and protein output, preferably collapsed by default.

### 2.1 Why CoDA was selected after the literature and availability review

The current CoDA choice was not made from one paper in isolation. It followed implementation and quantitative comparison of the approaches below. The decisive question was: **which method can a general browser tool implement reproducibly from inspectable source material, without inventing missing ZFs or redistributing a restricted/unclearly licensed model?**

| Route reviewed | Scientific result in this repository | Availability / IP constraint | Product decision |
|---|---|---|---|
| Barbas one-finger and extended modular assembly (Bhakta 2010/2013) | Transparent modules and useful B-score signal, but context transfer is imperfect; reconstructed AUC varied from 0.656 to 0.875 by cohort. | Published sequences can be audited, but simple independent-triplet assembly does not solve adjacent-finger context. | Retained as benchmark/legacy code, not the public designer. |
| Zhu position-specific 3F modules (Zhu 2011) | Directly tabulated position-specific modules, but only 81 modules; the paper's tested pairs did not map cleanly onto the old Barbas archive. | Inspectable supplement, but narrower target coverage and weaker general basis than the selected CoDA pairs. | Used briefly, then replaced by complete CoDA archive. |
| DeepZF (Aizenshtein-Gazit 2022) | Near-random activity discrimination on the independent Chen cohort: ROC-AUC 0.491; therefore unsuitable as an activity ranker here. | Upstream weights had no explicit redistribution terms when reviewed, so bundling them under this repository's MIT presentation was not justified. | Evaluated, removed, and not redistributed. |
| Persikov expanded linear SVM (Persikov 2014) | Useful as a separate recognition-model comparison, not a validated current ZFN activity score. | Official model is accepted only as a user-supplied local file because explicit redistribution permission was not established. | Legacy optional local comparator only. |
| ZFDesign (Ichikawa 2023) | Stronger modern context-aware design route and scientifically relevant comparison. | The article states that selection data and underlying code require an academic MTA. That is incompatible with silently bundling them in a public general-use MIT repository. | Cited for comparison; code/data excluded. |
| Fauser four-base-context data (Fauser 2024) | Adds context information, but compatibility with the present framework and direct ZFN activity were not established. | Workbook can be user-loaded locally; no basis to merge it into a complete public ORF as if validated. | Legacy experimental comparator only. |
| CoDA (Sander 2011) | 319 F1 units, 18 fixed F2 contexts, and 344 F3 units were selected experimentally; exact shared-F2 joins yield 6,680 auditable 9-mers. No new target-specific selection is required during in-silico design. | The article, supplements, and WO2011017293A2 expose a finite archive and framework that can be independently transcribed and structurally audited. This improves reproducibility, but does **not** establish patent clearance. | Selected for the public 3F designer; missing entries remain unavailable and every completed ZFN still requires experiments. |

This choice therefore has two linked reasons:

1. **Scientific/engineering reason:** CoDA represents experimentally selected adjacent-finger contexts and has an exact finite lookup rule. It is more defensible than independent one-finger concatenation, and unlike a predictive model its available/unavailable boundary can be exhaustively tested over all `4^9` targets.
2. **Availability/IP reason:** the public tool can describe exactly which published rows and patent-disclosed framework sequences it uses, while avoiding redistribution of MTA-controlled code/data or model files without clear redistribution terms. This is a provenance and distribution-risk decision, not a legal opinion that CoDA is unencumbered.

Do not collapse the second reason into “CoDA is patent-free.” WO2011017293A2 and its national family must be analyzed by jurisdiction, legal status, claim scope, date, and intended use. A ceased PCT record, publication of sequences, independently written TypeScript, or the repository's MIT license cannot alone answer FTO. The software should preserve this distinction and direct commercial or regulated users to a current claim-level review.

## 3. Exact current design logic

### 3.1 Input parsing and coordinates

`src/coda-design-engine.ts` accepts plain DNA or FASTA.

- FASTA headers, whitespace, and position digits are ignored.
- `A/C/G/T` are retained.
- IUPAC ambiguous bases, `-`, and `.` become `N`, so coordinates do not collapse.
- Unsupported characters also become `N`, are counted separately, and block design in the UI.
- Any target window containing `N` is unavailable because `buildCodaArray()` accepts only `[ACGT]{9}`.

This behavior was fixed in PR #20. Before that fix, removing ambiguity could concatenate bases from opposite sides of an unknown position and create a target sequence that was not present in the input. Coordinate preservation is therefore a safety invariant, not cosmetic normalization.

### 3.2 Target geometry and strand orientation

For each spacer length `s` in 5, 6, and 7 bp, the scanner considers a footprint of `18 + s` bp:

```text
top strand: 5'-[leftTop:9]-[spacer:s]-[rightTop:9]-3'
```

- Left recognition strand, 5' to 3': `reverseComplement(leftTop)`.
- Right recognition strand, 5' to 3': `rightTop`.
- Displayed spacer center: `start + 9 + s/2`. A 5 or 7 bp spacer therefore has a half-integer center.
- The center is a geometry/ranking coordinate, not an assertion that FokI cleaves one particular bond.

C2H2 fingers bind DNA antiparallel. For recognition sequence `5'-GTG-GGG-GAG-3'`, protein order N to C is:

```text
F1 = GAG, F2 = GGG, F3 = GTG
```

An orientation change here can yield apparently plausible but biologically wrong arrays. The exhaustive and strand-specific tests in `tests/coda-3finger.test.mjs` must continue to pass.

### 3.3 CoDA lookup

Current source: Sander et al. (2011), DOI `10.1038/nmeth.1542`, Supplementary Tables 1-2, checked against WO2011017293A2.

`data/coda-2011-units.json` contains:

| Record type | Count |
|---|---:|
| Fixed F2 contexts | 18 |
| F1 units | 319 |
| F3 units | 344 |
| F1 + F3 units | 663 |

For a 9-mer, `buildCodaArray()` reverses the three DNA triplets into protein order. It then requires all of the following:

1. the middle triplet is one of the 18 fixed F2 contexts;
2. an F1 unit exists for the `(F2 context, F1 target)` composite key;
3. an F3 unit exists for the `(F2 context, F3 target)` composite key;
4. the F1 and F3 rows declare the exact recognition helix of that fixed F2.

The number of assemblable recognition 9-mers is the sum, over F2 contexts, of `F1_count x F3_count`: **6,680 of 262,144 possible 9-mers (2.548%)**. A valid ZFN pair requires both 9-mer half-sites to be assemblable.

The array framework comes from WO2011017293A2, SEQ ID NOs 841-844:

- common prefix: `FQCRICMRNFS`;
- position suffixes: F1 `HTRTH`, F2 `HLRTH`, F3 `HLKTH`;
- inter-finger linker: `TGEKP`;
- each complete 3F array is 79 aa.

### 3.4 Candidate order

Candidates are sorted by:

1. absolute distance from the requested spacer center;
2. absolute difference of spacer length from 6 bp;
3. lower genomic start coordinate.

The scanner returns at most 30 candidates; the UI shows the first 12 and CSV can contain the returned set. No B-score, PWM, SVM, predicted affinity, predicted indel percentage, or off-target score is used in current ranking.

### 3.5 ZF-FokI linkers

The current spacer-dependent linker map is:

| Spacer | ZF-FokI linker |
|---:|---|
| 5 bp | `TGGS` |
| 6 bp | `TGAAAR` |
| 7 bp | `TGPGAAAR` |

These were inherited from the extended-MA implementation. Treat them as a design choice, not as a measurement that uniquely determines the exact cleavage position.

## 4. Exact current protein construct

### 4.1 Architecture

For every selected site:

```text
MAPKKKRKV-CoDA-left3F-linker-FokI_ELD-
VKQLLNFDLLKLAGDVESNPGP-
MAPKKKRKV-CoDA-right3F-linker-FokI_KKR
```

- `MAPKKKRKV` is the current SV40 NLS prefix, including the leading Met.
- FokI is UniProt P14870 residues 384-579, 196 aa.
- ELD mutations: Q486E, N496D, I499L.
- KKR mutations: E490K, H537R, I538K.
- F2A is the current 22-aa FMDV-derived project sequence `VKQLLNFDLLKLAGDVESNPGP`.
- Ribosomal skipping is modeled between the terminal Gly and Pro. The upstream product retains the first 21 F2A residues; the downstream product begins with Pro, followed by the right monomer's `MAPKKKRKV`.

For spacer lengths 5/6/7 bp, respectively, the expected lengths are:

| Spacer | Each unprocessed monomer | Precursor | Predicted left product | Predicted right product |
|---:|---:|---:|---:|---:|
| 5 bp | 288 aa | 598 aa | 309 aa | 289 aa |
| 6 bp | 290 aa | 602 aa | 311 aa | 291 aa |
| 7 bp | 292 aa | 606 aa | 313 aa | 293 aa |

The FASTA exporter emits three sequences: precursor, predicted processed-left, and predicted processed-right. It emits no CDS, stop codon, promoter, terminator, UTR, marker, or vector backbone.

### 4.2 Evidence and limits of the combined construct

- Doyon et al. (2011), DOI `10.1038/nmeth.1539`, directly supports ELD/KKR as an improved obligate-heterodimer FokI architecture. The supplied full paper confirms the substitutions above and reports activity improvement while retaining homodimer suppression.
- Lei et al. (2011), DOI `10.1038/mt.2011.12`, is a mammalian precedent for expressing a ZFN pair from one F2A-linked ORF.

These papers support separate components or strategies. Lei 2011 supports the paired-ZFN F2A architecture; it is not claimed here as the primary source of the exact 22-aa project constant. **No cited experiment tests this exact CoDA-3F/ELD/F2A/KKR construct.** Expression, F2A processing, localization, cleavage, toxicity, on-target editing, and off-target activity all remain experimental questions.

### 4.3 Nucleic-acid donor/provenance nuance

The current UI intentionally says **four component categories**, not four biological taxa:

| Current component | Current display | Interpretation |
|---|---|---|
| SV40 NLS | *Betapolyomavirus macacae* | biological source taxon |
| CoDA 3F framework and selected helices | `synthetic C2H2 array` | synthetic/patent-disclosed framework; no source organism is asserted by current code |
| FokI ELD/KKR | *Flavobacterium okeanokoites* | biological source plus engineered mutations |
| F2A | Foot-and-mouth disease virus | biological source taxon |

The legacy extended-MA code in `src/construct-output.ts` lists a human Sp1C framework and therefore four taxa including *Homo sapiens*. That legacy map is not the provenance map of the current CoDA output. A future agent must not reintroduce *Homo sapiens* into current regulatory output simply because it remains in legacy code.

Open regulatory question: determine how the relevant Japanese recombinant-DNA paperwork wants a synthetic/patent-disclosed C2H2 framework recorded, and whether a defensible organismal antecedent can be documented. Until that provenance is established, report the CoDA array as synthetic rather than inventing a donor organism.

## 5. Repository map: current versus retained legacy code

### 5.1 Current public execution path

| Path | Role |
|---|---|
| `src/App.tsx` | Entire current UI and download actions |
| `src/coda-design-engine.ts` | input parsing, reverse complement, geometry scan, ordering, CSV |
| `src/coda-module-archive.ts` | archive validation, exact CoDA lookup, full 3F sequence construction |
| `src/coda-construct-output.ts` | current ELD/F2A/KKR protein construct and Protein FASTA |
| `data/coda-2011-units.json` | complete transcribed CoDA F1/F2/F3 archive |
| `src/index.css` | current presentation |
| `src/app-version.ts` | visible `ver.N (PR #N)` label and link to the implementation PR |
| `tests/coda-3finger.test.mjs` | archive, exhaustive lookup, orientation, parsing, scanner, output tests |
| `tests/app-version.test.mjs` | version label/PR-link regression test |
| `scripts/audit-coda-archive.mjs` | independent archive counts and coverage report |

### 5.2 Legacy/reproducibility path, not used by current `App.tsx`

| Path group | Historical purpose |
|---|---|
| `src/design-engine.ts`, `src/module-archive.ts` | Barbas extended modular assembly, 3-6F/asymmetric arrays, B-score, TSO, 1c base-skipping |
| `src/off-target-engine.ts`, `src/off-target.worker.ts` | browser-local genome scan, LR/RL/LL/RR enumeration, PROGNOS ZFN v2.0 scoring |
| `src/persikov-svm.ts` | optional local parser/evaluator for official Persikov `SVMl7.mod` |
| `src/fauser-context.ts` | local parser for Fauser 2024 Supplementary Data 33 four-base context data |
| `src/assay-design.ts`, `src/portfolio.ts` | independent-candidate portfolio, SSA duplex and simple amplicon-primer suggestions |
| `src/construct-output.ts` | legacy Sp1C ZFN pair, codon presets, CDS and GenBank exporters |
| `data/*benchmark*.json`, `scripts/benchmark-*.mjs` | reproducible historical benchmarks and reasons not to overclaim scoring |

Do not delete these merely because the current page does not import them. They are the audit trail for discarded product directions. Conversely, do not assume that a passing legacy test means a feature is public.

`fflate` remains a dependency because the retained Fauser workbook parser reads `.xlsx` files. It is not needed by the current CoDA UI path.

## 6. What is actually validated

### 6.1 Current CoDA validation

The current archive/selection tests establish implementation consistency, not biological efficacy:

- exact counts: 18 F2, 319 F1, 344 F3;
- valid triplets and 7-aa helices;
- no duplicate `(unit, F2 target, outer target)` keys;
- every unit's F2 helix equals its fixed F2 declaration;
- F1/F3 target-count distributions match independently encoded patent totals;
- all `4^9 = 262,144` 9-mers are enumerated, and exactly the F1-by-F3 combinations sharing a fixed F2 assemble;
- scanner order equals an independent exhaustive oracle for both strands, all 5-7 bp spacers, distance bounds, and tie-breaks;
- ambiguity does not join separated sequence fragments;
- unsupported characters block design;
- current output contains full arrays, ELD, F2A, and KKR but no generated CDS.

The tests do **not** reproduce all 181 B2H array measurements from Sander 2011, nor do they convert the paper's population results into a probability for each new candidate.

Sander 2011 reports that 139/181 arrays (76.8%) exceeded threefold B2H activity and 14/181 (7.7%) were below 1.57-fold; ZFN-induced mutation was detected for 19/38 sites (50%). These are cohort-level results under the paper's conditions, not the success probability of an arbitrary archive-compatible site from this application.

### 6.2 Historical activity and specificity benchmarks

These results explain past decisions. They are not current CoDA candidate scores.

#### Bhakta extended MA

Bhakta et al. (2013), DOI `10.1101/gr.143693.112`:

- 21 tabulated L6+R6 cases, 15 active: combined B-score ROC-AUC 0.656.
- Prospective subset, 11 cases/8 active: B-score ROC-AUC 0.875.
- Figure-2 reconstruction, 92 array variants/41 active: B-score ROC-AUC 0.834; threshold B-score >=15 had sensitivity 0.732, specificity 0.804, precision 0.750.
- Calculated B-score matched 20/21 tabulated values. CS7-3 calculates to 20 from module values while Table 1 prints 21; this discrepancy is kept, not silently corrected.

These data supported the earlier extended-MA prototype but do not validate the present CoDA protein sequences.

#### DeepZF evaluation and removal

DeepZF was initially embedded as a PWM cross-check. On 49 Barbas modules, the nominal triplet was top-1 for 16/49 and top-3 for 25/49. In 21 Bhakta L6+R6 cases, DeepZF alone was near random (AUC 0.522). An independent Chen 2013 CoDA cohort with extractable sequences had 82 pairs (32 active, 50 inactive); DeepZF fit versus somatic indel had Spearman rho 0.053 and activity ROC-AUC 0.491. It was therefore removed rather than promoted to an activity ranker. The bundled weights were also removed because the upstream repository did not provide explicit redistribution terms.

Relevant sources: Aizenshtein-Gazit et al. (2022), DOI `10.1093/bioinformatics/btac469`; Chen et al. (2013), DOI `10.1093/nar/gks1356`.

#### Zhu position-specific 3F library

Zhu et al. (2011), DOI `10.1242/dev.066779`:

- 29 tested ZFN pairs; 8 reached the paper's >=1% somatic-lesion criterion.
- Of 174 used module positions, only 4 recognition helices matched the then-current Barbas archive; exact protein pairs matched 0/29.
- Transferring only target-sequence composition to the 25 scorable cases gave B-score ROC-AUC 0.585 and the old combined ranking AUC 0.570. This was not a direct protein-level validation.
- Table S5/S7 identifiers for `sbno2`, `sgk`, and `spon1b` are shifted; the repository maps by gene and recognition sequences and preserves the discrepancy in tests.

The site briefly switched to the 81 Zhu position-specific modules because they were directly tabulated for 3F arrays, then switched again to the fuller and selection-free CoDA archive.

#### PROGNOS and genome-wide off-target work

Fine et al. (2014), DOI `10.1093/nar/gkt1326`, was independently implemented. All 46 published half-site mismatch counts and the relative ZFN-v2.0 order were reproduced.

| Dataset | Evaluated sites | Positives | PROGNOS ROC-AUC | Average precision |
|---|---:|---:|---:|---:|
| Fine HBB 3F | 22 | 6 | 0.698 | 0.399 |
| Fine HBB 4F | 22 | 1 | 0.524 | 0.091 |
| Sander CCR5 screened cohort | 137 | 22 | 0.642 | 0.338 |
| Sander VEGFA screened cohort | 158 | 34 | 0.677 | 0.428 |
| Paschon TRAC 1-5 pooled | 122 | 16 | 0.759 | 0.369 |

Sander et al. (2013), DOI `10.1093/nar/gkt716`, showed that requiring both half-sites to be within three mismatches recovered only 30/51 independent positive loci, while allowing either half-site to anchor within three mismatches recovered 51/51. However, PROGNOS score correlated poorly with measured indel fraction (pooled Spearman rho approximately -0.076), and a fixed score >=50 behaved inconsistently. The score was therefore treated only as a relative ranking, never a cleavage-probability threshold.

Paschon et al. (2019), DOI `10.1038/s41467-019-08867-x`, motivated base-skipping and asymmetric/N-terminal-FokI geometry support in the old research UI. All five TRAC pairs required geometry outside the older contiguous equal-arm assumption: four used 1c base-skipping and TRAC 5 used unequal 6F/5F arms. These features remain legacy and are not part of current CoDA 3F output.

#### Persikov and Fauser auxiliary approaches

- Persikov and Singh (2014), DOI `10.1093/nar/gkt890`: an optional locally supplied expanded linear SVM was allowed only as a limited tie-break in the extended-MA phase. The model is not redistributed.
- Fauser et al. (2024), DOI `10.1038/s41467-024-45100-w`: 182 four-base-context rows could be loaded locally and compared separately. They were kept out of the primary rank and complete ORF because framework compatibility and ZFN activity were not established.

## 7. Development history and why the architecture changed

### 7.1 Scientific/product phases

1. **Initial prototype (2026-08-06):** a lightweight browser ZFN designer was created and published with GitHub Pages.
2. **Extended MA and scoring phase:** Barbas modules, B-score/TSO, 3-6F arrays, DeepZF, then independent activity benchmarks were added. DeepZF did not generalize as an activity predictor and was removed.
3. **Off-target research phase:** local genome scanning, PROGNOS, asymmetric anchoring, screened-cohort validation, Paschon base-skipping, and asymmetric arrays were added. Results supported relative triage but not a universal safety threshold.
4. **Experiment-output phase:** candidate portfolios, SSA/amplicon suggestions, ELD/KKR full constructs, 2A-linked single ORFs, codon presets, donor mapping, and GenBank were added.
5. **Simplification phase:** the product goal was narrowed to a beginner-readable 3F tool. The site briefly used Zhu's 81 position-specific modules.
6. **Current CoDA phase:** Zhu modules were replaced with the complete Sander 2011 CoDA archive; output was reduced to amino acids; input/archive/scanner validation was hardened after an ambiguity-coordinate bug was identified.
7. **Value-first UI phase:** the landing page was reorganized around the practical outcome: target DNA in, CoDA-compatible paired ZFNs and complete amino-acid output out. Sander's 19/38 cohort result became the prominent evidence hook with an explicit non-probability qualification; sequence input now follows the hero directly, and finger-level detail is collapsed below protein output.

### 7.2 Complete main-branch commit/PR ledger through PR #24

| Date | Commit / PR | Change and significance |
|---|---|---|
| 2026-08-06 | `e811739` | Repository initialization. |
| 2026-08-06 | `f64b976` | First React/Vite prototype, tests, MIT license, and Pages workflow. |
| 2026-08-06 | `99df09c` | Pages deployment fix after enabling Pages. |
| 2026-08-06 | `d9eaa1f` / #1 | Extended MA archive and embedded DeepZF PWM cross-check. |
| 2026-08-07 | `f1347c7` / #2 | Bhakta activity benchmark; B-score/TSO alignment and regression tests. |
| 2026-08-07 | `f5f65f6` | Deployment trigger for benchmark release. |
| 2026-08-07 | `51f5c1f` | One-time Pages bootstrap. |
| 2026-08-07 | `3ef7921` | Allowed a successful Pages run to bootstrap current `main`. |
| 2026-08-07 | `4f41bd4` | Scheduled one-time current Pages deployment. |
| 2026-08-07 | `91ec3fb` | Scheduled deployment at a specific minute. |
| 2026-08-07 | `ee3b187` | Temporary retry logic for Pages recovery. |
| 2026-08-07 | `4631359` | Restored the standard Pages workflow. |
| 2026-08-07 | `6130e6a` / #3 | Chen external validation; DeepZF removed from activity ranking after near-random validation. |
| 2026-08-07 | `cb73422` / #4 | Browser-local genome-wide search and PROGNOS implementation. |
| 2026-08-07 | `c7a5702` / #5 | Triggered deployment of off-target release. |
| 2026-08-07 | `dfbbaa8` / #6 | Sander/Fine specificity reconstruction; asymmetric half-site anchoring. |
| 2026-08-07 | `80a1201` / #7 | Full screened cohorts; removed unsupported fixed PROGNOS threshold from ranking; added Paschon data. |
| 2026-08-07 | `14e93a8` / #8 | Independent arm lengths, Paschon 1c base-skipping, masked search, TRAC validation. |
| 2026-08-07 | `fb22460` / #9 | Zhu 2011 applicability benchmark without mixing its modules into Barbas ranking. |
| 2026-08-07 | `4776779` / #10 | Removed bundled DeepZF files; added optional local Persikov SVM evaluator. |
| 2026-08-07 | `68041d3` / #11 | Candidate portfolio, full ELD/KKR constructs, Fauser comparison, SSA/amplicon outputs. |
| 2026-08-07 | `15efb97` / #12 | Single-ORF 2A-linked left/right ZFN output; initially GSG-T2A. |
| 2026-08-13 | `4308f91` / #13 | Displayed four donor taxa for the then-current Sp1C/T2A construct. |
| 2026-08-13 | `ba6ba30` / #14 | Replaced the complex public UI with a simple Zhu 3F designer; switched to the current 22-aa FMDV-derived F2A. |
| 2026-08-13 | `f25f045` / #15 | Updated 3F page metadata. |
| 2026-08-13 | `6688248` / #16 | Updated rendered-title regression test. |
| 2026-08-13 | `b4c2ae0` / #17 | Replaced search-range toggle with numeric +/-bp input, default 500 bp. |
| 2026-08-13 | `56e0e7e` / #18 | Replaced Zhu modules with complete Sander CoDA archive and exact F2-context assembly. |
| 2026-08-14 | `cde821f` / #19 | Removed CoDA codon presets, CDS FASTA, and GenBank; standardized on protein output. |
| 2026-08-17 | `b36fa2b` / #20 | Preserved ambiguity coordinates, blocked unsupported characters, validated archive at startup, exhaustively tested lookup and scanner order, and added CI. |
| 2026-08-17 | `56dd4a8` / #21 | Added the visible `ver.21 (PR #21)` badge, linked it to the implementation PR, and added a regression test. |
| 2026-08-17 | `a4d78f9` / #22 | Added this durable AI handoff, repository agent instructions, literature ledger, source hashes, and full historical decision record. |
| 2026-08-17 | `9889df7` / #23 | Removed host-specific F2A evidence from the general tool, retained Lei 2011 as the paired-ZFN F2A precedent, and made the scientific plus IP/availability rationale for CoDA explicit. |
| 2026-08-17 | PR #24 | Rebuilt the public landing flow around the user's goal, fixed the hero label as `SANDER 2011 · CoDA-based ZFN Designer`, displayed the Sander 19/38 cohort result with its scientific limitation, moved input directly below the hero, and deferred finger-level technical details until after protein output. |

The abandoned T2A stage cited Katayama and Yamamoto (2025), DOI `10.3390/ijms26157602`, as a GSG-T2A ZFN precedent. It is historical only: current output uses an FMDV-derived F2A sequence without the old GSG-T2A implementation.

## 8. Reference ledger

Every paper DOI needed to understand the current implementation, retained validation, and rejected routes through 2026-08-17 is listed here. “Current” means it directly informs the present UI/output; “legacy” means it explains retained code, validation, or a rejected route.

| Status | First author, year, DOI | Role in this project |
|---|---|---|
| Current | Sander, 2011, `10.1038/nmeth.1542` | CoDA method and F1/F2/F3 unit archive. |
| Current | Doyon, 2011, `10.1038/nmeth.1539` | FokI ELD/KKR mutations and obligate-heterodimer evidence. |
| Current | Lei, 2011, `10.1038/mt.2011.12` | Prior ZFN pair expressed from an F2A-linked ORF in mammalian cells. |
| Context | Zhang, 2024, `10.1016/j.sbi.2024.102836` | Review of the updated C2H2 ZF-DNA recognition code; guided caution about simple triplet independence. |
| Legacy | Bhakta, 2010, `10.1007/978-1-60761-753-2_1` | Barbas one-finger modular-assembly sequences/framework summary. |
| Legacy | Bhakta, 2013, `10.1101/gr.143693.112` | Extended MA, B-score, linkers, and activity benchmarks. |
| Legacy | Zhu, 2011, `10.1242/dev.066779` | Position-specific 3F modules and zebrafish lesion data; temporary public design basis. |
| Legacy | Chen, 2013, `10.1093/nar/gks1356` | Independent CoDA ZFN activity cohort used to reject DeepZF as an activity ranker. |
| Legacy | Sander, 2013, `10.1093/nar/gkt716` | Prospective and screened off-target cohorts; asymmetric anchor validation. |
| Legacy | Fine, 2014, `10.1093/nar/gkt1326` | PROGNOS ZFN v2.0 equations, parameters, and HBB 3F/4F validation. |
| Legacy | Persikov, 2014, `10.1093/nar/gkt890` | Expanded linear SVM and overlapping four-base recognition model. |
| Legacy | Paschon, 2019, `10.1038/s41467-019-08867-x` | 1c base-skipping, asymmetric arm lengths, NC architecture, TRAC off-target data. |
| Legacy | Aizenshtein-Gazit, 2022, `10.1093/bioinformatics/btac469` | DeepZF forward PWM model; evaluated and removed. |
| Comparison only | Ichikawa, 2023, `10.1038/s41587-022-01624-4` | ZFDesign comparison; code/selection data require academic MTA and are not included. |
| Legacy/experimental | Fauser, 2024, `10.1038/s41467-024-45100-w` | Four-base context table loaded locally; not promoted into main rank/output. |
| Historical construct | Katayama, 2025, `10.3390/ijms26157602` | Earlier GSG-T2A ZFN construct rationale; superseded by current F2A decision. |

Patent/data references without a DOI:

- WO2011017293A2: CoDA disclosure, archive totals, and SEQ ID NOs 841-844 used for current framework verification.
- UniProt P14870: FokI reference protein; current cleavage domain is residues 384-579.
- ENA/GenBank J04623: original FokI coding-sequence reference.
- NCBI BioProject PRJNA179355: Bhakta T2-X6 sequencing data; it is **not** a missing row-by-row table of all 268 SSA constructs.

## 9. Known gaps, risks, and recommended next work

### Highest priority scientific gaps

1. **No individual CoDA activity model.** Current candidates are archive-compatible, not activity-ranked. If the full 181-array B2H sequence/measurement table can be obtained, first audit whether it truly maps each complete protein to a quantitative measurement before adding any ranker.
2. **No current off-target workflow.** The old scanner and benchmark evidence remain, but the current 3F UI does not expose genome-wide search. Reintroducing it is nontrivial because 3F anchors generate many hits and mobile performance can be poor. A lightweight exact/near-match report should be specified and benchmarked separately.
3. **Regulatory provenance of the CoDA framework.** Resolve the synthetic framework's reporting category before claiming four biological donor species.
4. **Complete-construct validation.** Test expression, F2A processing, nuclear localization, and paired nuclease activity of the exact CoDA-3F/ELD/F2A/KKR architecture in the target organism.
5. **Experimental candidate portfolio.** The practical output should encourage 2-3 spatially independent candidate pairs rather than treating rank 1 as uniquely optimal.

### Engineering risks

- Never sanitize ambiguity by deletion; preserve coordinates.
- Never reverse only one of the two left-arm operations; the left top-strand half-site must become its reverse complement before CoDA lookup.
- Do not equate spacer center with an exact cut bond.
- Do not make a missing unit available through a predictive model without labeling it as a different, unvalidated design method.
- Do not let legacy `construct-output.ts` reintroduce DNA output or the Sp1C donor map into current CoDA exports.
- If the CoDA JSON is edited, require archive audit plus exhaustive 9-mer test; a count-only check is insufficient.
- Preserve GitHub Pages base path `/Zinc-Zinc-Finger/` and the rendered HTML test.

### Claims that must not appear without new evidence

- “CoDA candidate X has a 50% success probability.”
- “PROGNOS score is the probability of cleavage” or “score >=50 is safe/unsafe.”
- “ELD/KKR + F2A + CoDA 3F has been validated as one construct.”
- “The software is patent-clear” or “commercial use is cleared.”
- “Four current donor taxa” while the CoDA framework is still labeled synthetic.

## 10. Source files supplied during development

The following files were inspected directly on 2026-08-17. They are not committed because they are third-party papers/supplements; only transformed data and provenance notes belong in this repository. A future AI will need the user to reattach them if it must re-audit raw rows.

| Supplied file | SHA-256 | Identification and use |
|---|---|---|
| `document(1).xls` | `b11b2f30c9156fc18cf420ebb507fe704da3f84155e2d5ffdf4eae46538f919d` | Zhu 2011 Supplementary Table S1; 82 rows, position-specific module/plasmid inventory. |
| `document (1)(1).xls` | `904a443d00d909894d3169999207ddf15ed578198fa9e751aa0042a8f8d9874b` | Zhu 2011 Supplementary Table S5; 76 rows, ZFP names, target triplets, B2H 3-AT and PWM columns. |
| `document (2)(1).xls` | `c4bf085d2da80c342eb6d3b3642897479f47172ca88fd8f41a71b66bdf6495c4` | Zhu 2011 Supplementary Table S7; 30 rows, target sites and lesion frequencies. |
| `nar_42_6_e42_s0(2).zip` | `4a2fd52af04e135c83e4e331372a9c477d51304ff0c2fc8a327a001be25824f6` | ZIP containing Fine 2014 79-page supplement `nar-02842-met-h-2013-File002.pdf`; inner PDF SHA-256 `dbf9d5e05fa081e9754ef96df34be1fd30bef1844e3707371b86af730675e1b5`. Tables 8-9 support the committed HBB data. |
| `2011_...FokI...ELDKKR(1).pdf` | `12ff798e84585f6db18afac8d115aace15ae3ca3db7f59e5590c0c98ecaffc7d` | Full 8-page Doyon 2011 paper; confirms ELD/KKR substitutions and activity/specificity interpretation. |

The three Zhu workbook hashes exactly match the hashes already recorded in `data/zhu-2011-ma-zfn-benchmark.json`. The Fine inner-PDF hash exactly matches `data/fine-2014-zfn-off-targets.json`. This is a source-identity check, not an independent verification of every transformed JSON field.

Full-text availability note: the Doyon paper and Fine supplement above were available and read locally. The three Zhu supplementary workbooks were read directly. This reconciliation did not have a separate local full-text PDF for every paper in section 8; conclusions about those works rely on the repository's prior full-text/supplement analyses and retained provenance. Obtain the paper/supplement before changing a claim that depends on an unreviewed table or sequence.

## 11. Commands and acceptance checklist

Requirements: Node.js 22 or newer; CI currently uses Node 24.

```bash
npm ci
npm run lint
npm run build
npm run audit:coda
npm test
```

Optional historical benchmarks:

```bash
npm run benchmark
node scripts/benchmark-persikov-2014.mjs /path/to/pwm_predict
```

The Persikov benchmark requires the official external predictor and is intentionally not part of the normal CI command.

Before merging a scientific change, confirm:

- current versus legacy scope is explicit;
- source row/table and DOI are recorded;
- the algorithm has an independent oracle or fixture, not only snapshot tests;
- strand orientation and ambiguity coordinates are tested;
- quantitative results state `n`, endpoint, and whether analysis is prospective, retrospective, reconstructed, or transferred across protein archives;
- cohort performance is not restated as candidate-specific probability;
- protein/DNA provenance and third-party licensing are updated in `THIRD_PARTY_NOTICES.md` where applicable;
- this handoff is updated with the decision and the reason.
