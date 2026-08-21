# Instructions for coding agents

Before changing this repository, read [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) in full and then read [docs/AI_HANDOFF_V3_BHAKTA_2013.md](docs/AI_HANDOFF_V3_BHAKTA_2013.md). The latter is the current addendum where it supersedes older v2-default product decisions.

## Current public scope

- The public designer exposes three profiles: `v3 · Bhakta 2013` (default), `v2 · Gupta + CoDA fallback`, and `v1 · CoDA only`.
- v3 uses Bhakta 2013 extended modular assembly with 6 fingers per monomer, exact public Barbas/Bhakta one-finger modules, 18-bp half-sites, 5-7-bp spacers, and combined B-score >=15. Do not impute missing modules.
- v3 candidate order is functional rather than positional: combined B-score first, then context/module evidence and spacer preference. Distance from the requested spacer center only bounds the acceptable search window and is displayed; it must not affect v3 rank.
- v2/v1 remain 3-finger methods and retain their existing distance-first ranking. Do not split Gupta 2F modules, mix methods inside one 3F monomer, or invent missing CoDA rows.
- Preserve strand orientation, ambiguous-base coordinates, and the meaning of the displayed spacer center for every profile.
- The public exporters are protein-only: annotated GenPept and Protein FASTA contain only the selected precursor polyprotein. Do not emit predicted F2A-processed products or restore codon presets, CDS, or nucleotide GenBank without an explicit product decision.
- Input and optional local files must stay in the browser; do not add telemetry or sequence upload.

## Scientific and regulatory guardrails

- Archive membership, B-score, or cohort-level activity does not guarantee binding, cleavage, specificity, or editing. Avoid reporting an unmeasured candidate-specific success probability.
- Bhakta 2013 reported activity for 15/21 tested L6+R6 target sites; this is not a 71% probability for a new v3 candidate. Primary source: Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`.
- The v3 Sp1C-style framework implementation follows the public Barbas/Bhakta module archive and the framework description in Mandell JG & Barbas CF III (2006), DOI `10.1093/nar/gkl209`. The exact Bhakta Supplemental Appendices XLS is not bundled; do not claim every emitted array was copied verbatim from that workbook.
- The complete Bhakta-6F/ELD/F2A/KKR construct is a design proposal assembled from separately supported parts; Bhakta 2013 did not test this exact complete construct. The same separation-of-evidence warning applies to v1/v2 complete outputs.
- The public F2A rationale is the mammalian paired-ZFN single-ORF precedent in Lei Y et al. (2011), DOI `10.1038/mt.2011.12`. Describe the 22-aa project sequence generically as FMDV-derived unless an exact primary sequence source is separately established.
- Public-data implementation is not freedom-to-operate clearance. Do not state or imply otherwise.
- When citing a paper in project documentation, give the year, first author, and DOI.

## Verification and documentation

Run, at minimum:

```bash
npm ci
npm run lint
npm run build
npm run audit:coda
npm test
```

Keep the legacy benchmark/data files unless a deliberate archival migration is approved; they preserve why earlier scoring approaches were or were not promoted. Update the durable handoff documents whenever a material design decision, dataset, validation result, or limitation changes.
