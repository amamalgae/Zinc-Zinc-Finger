# v3 Bhakta 2013 implementation addendum

Status: implemented in PR #63 on 2026-08-21. Read this together with `docs/AI_HANDOFF.md`; where the older handoff describes v2 as the public default, this addendum supersedes that product decision.

## Public profiles

The public method selector now exposes:

1. `v3 · Bhakta 2013` — default.
2. `v2 · Gupta + CoDA fallback` — unchanged 3-finger logic.
3. `v1 · CoDA only` — unchanged 3-finger logic.

v3 is an independent design route. It does not concatenate CoDA arrays, split Gupta 2F modules, or mix Gupta/CoDA fingers into a Bhakta array.

Primary source: Bhakta MS et al. (2013), *Highly active zinc-finger nucleases by extended modular assembly*, DOI `10.1101/gr.143693.112`.
Framework/assembly source: Mandell JG, Barbas CF III (2006), *Zinc Finger Tools: custom DNA-binding domains for transcription factors and nucleases*, DOI `10.1093/nar/gkl209`.

## v3 candidate definition

Each v3 candidate is:

```text
top strand 5' -> 3'
[left 18 bp] [spacer 5-7 bp] [right 18 bp]
      6F                         6F
```

The left recognition strand is the reverse complement of the left top-strand 18-mer. The right recognition strand is the right top-strand 18-mer. Each recognition strand is divided into six 3-bp modules and reversed into protein N-to-C order because C2H2 fingers bind DNA antiparallel.

Only exact triplets present in the public Barbas/Bhakta one-finger archive are assembled. Missing triplets are unavailable; there is no interpolation or predicted substitute.

The current archive contains 49 triplet/helix modules in `src/module-archive.ts`. v3 wraps those data in `src/bhakta-module-archive.ts` and constructs the complete Sp1C-style array with:

- fixed N-terminal sequence `LEPGEKP`;
- per-finger framework `YKCPECGKSFS` + 7-aa recognition helix + `HQRTH`;
- inter-finger linker `TGEKP`;
- fixed C-terminal sequence `TGKKTS`.

The exact Supplemental Appendices XLS distributed with Bhakta 2013 was not directly bundled into the repository. The implementation therefore remains auditable against the public module archive, the published full-array B-scores, the existing Bhakta benchmark reconstruction, and the published framework description. Do not state that every emitted full array was copied verbatim from the Bhakta Supplemental Appendices.

## B-score eligibility and ranking

Bhakta 2013 used a combined B-score based on favorable bivalent ZF-DNA contacts and prospectively selected L6+R6 target sites with combined B-score >=15. v3 therefore requires:

```text
combined B-score = left 6F B-score + right 6F B-score
combined B-score >= 15
```

A site below 15 is not returned by v3 even if all twelve one-finger modules exist.

The user's product decision for v3 is explicit: **distance from the requested spacer center must not rank candidates.** The requested center and range define the search window and distance remains displayed, but any site inside that acceptable window may be chosen on functional grounds.

v3 ordering is therefore:

1. higher combined B-score;
2. fewer TSO/context warnings;
3. fewer modules carrying an unfavorable historical recommendation;
4. more modules carrying a favorable historical recommendation;
5. spacer preference 6 bp, then 5 bp, then 7 bp;
6. genomic start only as a deterministic final tie-break.

Distance is deliberately absent from the v3 comparator. A regression test requires a B20 candidate 900 bp from the requested center to outrank a B16 candidate at distance 0.

This ranking is a heuristic ordering of published evidence, not an indel probability. The existing exact L6+R6 benchmark contains 21 targets with 15 active and reconstructs 20/21 published B-scores; the retained CS7-3 discrepancy is paper B=21 versus module-sum B=20. Across those 21 exact L6+R6 cases the reconstructed B-score ROC-AUC is about 0.656, so do not overstate fine-grained score differences.

## 3-6F alternatives

The main search returns L6+R6 candidates, matching the Bhakta 2013 recommended first-pass workflow. Once a v3 site is selected, the technical disclosure computes all 16 spacer-proximal combinations:

```text
L3..L6 x R3..R6
```

The shorter arrays use the triplets closest to the spacer. They are displayed as empirical alternatives with B-score/context information. They are not promoted into the primary candidate list, and the ordering among those alternatives is not a measured activity prediction.

## Linkers and nuclease architecture

v3 uses the Bhakta 2013 spacer-dependent ZF-FokI linkers:

| Spacer | ZF-FokI linker |
|---:|---|
| 5 bp | `TGGS` |
| 6 bp | `TGAAAR` |
| 7 bp | `TGPGAAAR` |

The emitted complete construct uses the project's existing protein-only architecture:

```text
NLS-Bhakta left 6F-linker-FokI ELD-F2A-NLS-Bhakta right 6F-linker-FokI KKR
```

Bhakta 2013 did not test this exact ELD/KKR + F2A complete construct. Doyon Y et al. (2011), DOI `10.1038/nmeth.1539`, supports the ELD/KKR FokI architecture separately; Lei Y et al. (2011), DOI `10.1038/mt.2011.12`, supports a paired-ZFN F2A-linked ORF separately. The UI and exports must keep this distinction explicit.

## Validation fixtures

`tests/bhakta-v3.test.mjs` adds production-path checks in addition to the retained `tests/bhakta-benchmark.test.mjs`:

- archive count = 49 modules;
- B-score eligibility cutoff = 15;
- published HIV992 L6+R6 site reconstructs at combined B=17;
- published CS3-1 L6+R6 site reconstructs at B=14 but is excluded by v3;
- six-finger antiparallel order and complete terminal sequences are checked;
- all 16 L3..L6 x R3..R6 alternatives are generated for HIV992;
- protein export annotates ZF1 through ZF12 and reaches the precursor terminus exactly;
- the v3 comparator is explicitly tested to ignore distance in favor of B-score.

The full repository acceptance commands remain:

```bash
npm ci
npm run lint
npm run build
npm run audit:coda
npm test
```

## Claims that remain prohibited

Do not state any of the following without new experimental evidence:

- “B-score 20 means a specific percent chance of editing.”
- “15/21 means every v3 candidate has a 71% success probability.”
- “v3 is experimentally proven superior to Gupta 2012 or CoDA for arbitrary new targets.”
- “The exact Bhakta-6F/ELD/F2A/KKR construct emitted here has been validated.”
- “The implementation or public sequence disclosure establishes freedom to operate.”
