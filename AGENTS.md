# Instructions for coding agents

Before changing this repository, read [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) in full. It records the scientific rationale, rejected approaches, source provenance, version history, and current product decisions that are not recoverable from the present UI alone.

## Current public scope

- The public designer is the CoDA 3-finger implementation in `src/coda-*.ts` and `src/App.tsx`.
- It must only assemble exact F1-F2-F3 combinations present in the Sander 2011 CoDA archive. Do not impute missing units or silently substitute legacy Barbas/Zhu modules.
- The target geometry is 9 bp + 5-7 bp spacer + 9 bp. Preserve strand orientation, ambiguous-base coordinates, and the meaning of the displayed spacer center.
- The public exporters are protein-only: both annotated GenPept and Protein FASTA contain only the selected precursor polyprotein. Do not emit predicted F2A-processed products or restore codon presets, CDS, or nucleotide GenBank without an explicit product decision.
- Candidate order is not a candidate-specific activity prediction: distance to the requested spacer center remains primary, then the evidence-informed spacer preference is 6 bp, 5 bp, and 7 bp, followed by genomic start.
- Input and optional local files must stay in the browser; do not add telemetry or sequence upload.

## Scientific and regulatory guardrails

- Archive membership does not guarantee binding, cleavage, specificity, or editing. Avoid reporting an unmeasured candidate-specific success probability.
- The current donor display has four component categories but only three named biological source taxa plus a synthetic CoDA C2H2 array. The legacy Sp1C code's `Homo sapiens` donor must not be copied into current CoDA output without evidence.
- The complete CoDA-3F/ELD/F2A/KKR construct is a design proposal assembled from separately supported parts; it has not been tested as a complete construct.
- The public F2A rationale is the mammalian paired-ZFN single-ORF precedent in Lei 2011. Describe the 22-aa project sequence generically as FMDV-derived unless an exact primary sequence source is separately established.
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

Keep the legacy benchmark/data files unless a deliberate archival migration is approved; they preserve why earlier scoring approaches were not promoted into the current designer. Update `docs/AI_HANDOFF.md` whenever a material design decision, dataset, validation result, or limitation changes.
