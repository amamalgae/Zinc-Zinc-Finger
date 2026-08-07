# Scientific data and third-party notices

This project contains independent implementations of published zinc-finger modular-assembly, specificity-scoring, and recognition-scoring methods. It does not include code or data from ZFDesign, PROGNOS, ZFN-Site, or ZiFiT.

## PROGNOS ZFN v2.0

`src/off-target-engine.ts` is an independent TypeScript implementation of the published ZFN v2.0 scoring equations and parameters in:

- Fine EJ et al. (2014), *An online bioinformatics tool predicts zinc finger and TALE nuclease off-target cleavage*, DOI: 10.1093/nar/gkt1326. The article is distributed under CC BY-NC 3.0.

No PROGNOS source code, database, website content, or software assets are included. The repository MIT license applies to the independently written implementation and does not purport to relicense the publication or original PROGNOS software.

## Sander 2013 external specificity data

`data/sander-2013-zfn-off-targets.json` and `data/sander-2013-zfn-screened-sites.json` are machine-readable transcriptions of the prospective positive loci in main-text Tables 3–4 and the positive/negative candidate cohorts in Supplementary Tables 3 and 6 of:

- Sander JD et al. (2013), *In silico abstraction of zinc finger nuclease cleavage profiles reveals an expanded landscape of off-target sites*, DOI: 10.1093/nar/gkt716.

The full screened cohort was retrieved from the supplementary workbook archived by CDC STACKS at <https://stacks.cdc.gov/view/cdc/22560/cdc_22560_DS11.xlsx>. The repository MIT license does not relicense the article or extracted scientific data.

## Paschon 2019 external specificity data

`data/paschon-2019-trac-specificity.json` is a machine-readable transcription of TRAC 1–5 target architectures and cellular off-target measurements from Supplementary Figure 21 and Figure 5 Source Data of:

- Paschon DE et al. (2019), *Diversifying the structure of zinc finger nucleases for high-precision genome editing*, DOI: 10.1038/s41467-019-08867-x. The article is distributed under CC BY 4.0.

Source data and supplementary material were retrieved from the article's Springer Nature downloads. The repository MIT license does not relicense the extracted scientific dataset.

## Barbas one-finger module data

The recognition-helix sequences, target triplets, and module recommendations in `src/module-archive.ts` are scientific sequence data reported across the Barbas modular-assembly literature and summarized by:

- Bhakta M, Segal DJ (2010), *The generation of zinc finger proteins by modular assembly*, DOI: 10.1007/978-1-60761-753-2_1.
- Bhakta MS et al. (2013), *Highly active zinc-finger nucleases by extended modular assembly*, DOI: 10.1101/gr.143693.112. The article is distributed under CC BY-NC 3.0.

The code in this repository was written independently. The repository's MIT license applies to that code and does not purport to relicense third-party publications, patents, plasmids, or biological materials.

## Zhu 2011 modular-assembly applicability data

`data/zhu-2011-ma-zfn-benchmark.json` is a machine-readable transcription of target sites, recognition helices, bacterial one-hybrid measurements, somatic lesion measurements, and founder rates from Supplementary Tables S1, S5, and S7 of:

- Zhu C et al. (2011), *Evaluation and application of modularly assembled zinc-finger nucleases in zebrafish*, DOI: 10.1242/dev.066779.

The data are used only to test whether this different, position-specific three-finger module archive can directly validate the Barbas extended-MA proteins generated here. The repository MIT license does not relicense the article, its supplementary workbooks, or the extracted scientific data.

## Persikov–Singh expanded linear SVM

`src/persikov-svm.ts` is an independent TypeScript implementation of the published seven-contact expanded linear SVM and overlapping four-base recognition model described in:

- Persikov AV, Singh M (2014), *De novo prediction of DNA-binding specificities for Cys2His2 zinc finger proteins*, DOI: 10.1093/nar/gkt890.
- Official download page: <https://zf.princeton.edu/download.php>

The implementation parses an official `SVMl7.mod` file supplied locally by the user. No pretrained model, standalone predictor executable, source archive, or training dataset from the official distribution is included in this repository. The model is processed only in the browser session and is not uploaded or persisted by the application.

As checked on 2026-08-07, the official download and help pages requested citation of the associated papers but did not state an MTA requirement or an explicit software/model redistribution license. This project therefore does not redistribute those files or purport to grant rights in them. Public download availability is not itself a patent clearance or a license grant; users remain responsible for the terms applicable to their own use.

## ZFDesign

ZFDesign is cited for comparison only. Its article states that both selection data and code require an academic material transfer agreement:

- Ichikawa DM et al. (2023), *A universal deep-learning model for zinc finger design enables transcription factor reprogramming*, DOI: 10.1038/s41587-022-01624-4.

No ZFDesign code or restricted training data are included here.

## FokI ELD/KKR coding constructs

`src/construct-output.ts` uses the FokI cleavage-domain amino-acid sequence from UniProt P14870, residues 384–579, and applies the published ELD (Q486E, N496D, I499L) or KKR (E490K, H537R, I538K) substitutions described in:

- Doyon Y et al. (2011), *Enhancing zinc-finger-nuclease activity with improved obligate heterodimeric architectures*, DOI: 10.1038/nmeth.1539.
- UniProt P14870, Type II restriction enzyme FokI from *Flavobacterium okeanokoites*.
- ENA/GenBank J04623, the original FokI coding sequence.

The generated DNA is a computed synthetic coding sequence, not a plasmid or expression cassette copied from a repository. No Addgene plasmid sequence or biological material is included. Sequence output does not grant patent, material-transfer, biosafety, or freedom-to-operate rights.

## Fauser 2024 four-base context data

`src/fauser-context.ts` is an independently written local parser and design comparator for the helix / “Triplet + flanking base” table in Supplementary Data 33 of:

- Fauser F et al. (2024), *A versatile platform for locus-scale genome rewriting and verification*, DOI: 10.1038/s41467-024-45100-w. The article and supplementary material are distributed under CC BY 4.0.

The 182-row workbook is not bundled. Users retrieve it from the publisher and select it locally; the browser does not upload or retain it. Context-derived candidates are kept out of the primary Barbas/B-score ranking and complete-ORF export because framework compatibility and direct ZFN activity have not been established here.

## Codon-use presets

The optional *Auxenochlorella protothecoides* preset is derived from the Kazusa Codon Usage Database species entry 3075. That entry contains only 5 CDS and 1,056 codons and is therefore exposed with an explicit small-sample warning. The human preset uses standard high-frequency human codon choices. Neither preset is a validated expression model for a particular strain, compartment, vector, or culture condition.

## fflate

The application uses `fflate` 0.8.2 to decompress locally selected `.xlsx` files in the browser. fflate is copyright 2020–2023 Arjun Barrett and is distributed under the MIT License. Its package license text is available in the installed npm distribution and at <https://github.com/101arrowz/fflate>.
