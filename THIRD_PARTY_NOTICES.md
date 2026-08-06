# Scientific data and third-party notices

This project combines an independent implementation of published zinc-finger modular-assembly methods with a browser-oriented conversion of the published DeepZF PWMpredictor. It does not include code or data from ZFDesign, PROGNOS, ZFN-Site, or ZiFiT.

## PROGNOS ZFN v2.0

`src/off-target-engine.ts` is an independent TypeScript implementation of the published ZFN v2.0 scoring equations and parameters in:

- Fine EJ et al. (2014), *An online bioinformatics tool predicts zinc finger and TALE nuclease off-target cleavage*, DOI: 10.1093/nar/gkt1326. The article is distributed under CC BY-NC 3.0.

No PROGNOS source code, database, website content, or software assets are included. The repository MIT license applies to the independently written implementation and does not purport to relicense the publication or original PROGNOS software.

## Barbas one-finger module data

The recognition-helix sequences, target triplets, and module recommendations in `src/module-archive.ts` are scientific sequence data reported across the Barbas modular-assembly literature and summarized by:

- Bhakta M, Segal DJ (2010), *The generation of zinc finger proteins by modular assembly*, DOI: 10.1007/978-1-60761-753-2_1.
- Bhakta MS et al. (2013), *Highly active zinc-finger nucleases by extended modular assembly*, DOI: 10.1101/gr.143693.112. The article is distributed under CC BY-NC 3.0.

The code in this repository was written independently. The repository's MIT license applies to that code and does not purport to relicense third-party publications, patents, plasmids, or biological materials.

## Chen 2013 external benchmark data

`data/chen-2013-zfn-benchmark.json` is a machine-readable extraction of ZFN target sites, somatic indel measurements, and the 12 amino acids between Cys2 and His1 for each zinc finger, derived from Supplementary Table S1 of:

- Chen S et al. (2013), *A large-scale in vivo analysis reveals that TALENs are significantly more mutagenic than ZFNs generated using context-dependent assembly*, DOI: 10.1093/nar/gks1356. The article and supplementary data are distributed under CC BY-NC 3.0.

Source workbook: `supp_gks1356_nar-02876-h-2012-File008.xlsx`, SHA-256 `d37402e74baf828d1524daa608d07f57b49dc15cb572773a768775be48305902`, retrieved from the Europe PMC supplementary-files endpoint for PMC3575824. The repository MIT license does not relicense this extracted scientific dataset.

## DeepZF

The DeepZF PWMpredictor is used as an attributed forward-model cross-check:

- Aizenshtein-Gazit S, Orenstein Y (2022), *DeepZF: improved DNA-binding prediction of C2H2-zinc-finger proteins by deep transfer learning*, DOI: 10.1093/bioinformatics/btac469.
- Repository: <https://github.com/OrensteinLab/DeepZF>

Included derivative files:

- `src/deepzf-pwm-weights.ts`: lossless Float32/base64 conversion of the inference weights in upstream `PWMpredictor/code/transfer_model100.h5`.
- `src/deepzf-pwm.ts`: browser inference adapter implementing the published/original one-hot encoding and model architecture.
- `scripts/convert-deepzf-pwm.mjs`: reproducible HDF5-to-TypeScript converter.

Provenance:

- Upstream repository: <https://github.com/OrensteinLab/DeepZF>
- Upstream commit: `351da3013467631ad5390b71648680f34b2634fa`
- Source model SHA-256: `2488eb1f07a26779f03bee946bc958d42213db560de3d9cb05c0ea9cab0e656d`

As checked on 2026-08-06, the upstream repository supplied no LICENSE, COPYING, NOTICE, or other explicit code/model redistribution terms in its current branches, tags, history, or README. The repository MIT license therefore does not purport to license these DeepZF-derived weights. They are included with scientific attribution for research evaluation; users who need commercial redistribution rights should obtain clarification from the DeepZF authors.

## ZFDesign

ZFDesign is cited for comparison only. Its article states that both selection data and code require an academic material transfer agreement:

- Ichikawa DM et al. (2023), *A universal deep-learning model for zinc finger design enables transcription factor reprogramming*, DOI: 10.1038/s41587-022-01624-4.

No ZFDesign code or restricted training data are included here.
