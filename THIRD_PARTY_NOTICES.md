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

These legacy modules and their associated analysis remain in the repository for reproducibility, but are not used by the current public 3-finger interface or its complete-ORF exporter.

## CoDA 2011 context-dependent assembly data

`data/coda-2011-units.json` contains 319 F1 units, 18 fixed F2 contexts, and 344 F3 units transcribed from Supplementary Tables 1 and 2 of:

- Sander JD et al. (2011), *Selection-free zinc-finger-nuclease engineering by context-dependent assembly (CoDA)*, DOI: 10.1038/nmeth.1542.

`docs/reference/coda-2011-units-sander-2011-crosscheck.xlsx` is a review aid generated from that same JSON, re-laid out into the row and column order of the published supplementary tables so the transcription can be compared with the PDF by eye. It carries the same terms as the JSON; the repository MIT license covers its layout and notes, not the published data it displays. No code, build step, or test reads it. `docs/reference/README.md` records what the comparison confirmed and what remains unverified.

`src/coda-module-archive.ts` independently implements the exact-F2-context lookup and constructs complete fingers using framework sequences and the canonical TGEKP inter-finger linker described in WO2011017293A2 (SEQ ID NOs: 841–844). Empty table cells remain unavailable and are not predicted or imputed. The repository MIT license does not relicense the article, supplementary material, patent disclosure, extracted scientific data, or sequences.

`data/zhu-2011-ma-zfn-benchmark.json` and its benchmark script remain only as legacy comparative evidence and are not used by the current public designer or sequence exporter.

### Why CoDA is the public implementation

CoDA is included because its finite unit archive and exact shared-F2 assembly rule can be independently transcribed, audited, and implemented without bundling a target-specific selection service or a third-party trained model. This is a reproducibility and distributability decision, not a statement that CoDA is biologically superior at every target or free of intellectual-property restrictions.

The project deliberately does not bundle ZFDesign code/data, DeepZF weights, or the official Persikov model. ZFDesign's article requires an academic material transfer agreement for the selection data and code; the other external model files did not carry redistribution terms sufficiently explicit for this project when reviewed. Their omission avoids representing third-party weights or restricted data as MIT-licensed project assets. CoDA's own patent family, sequence disclosures, and any claims applicable to a country, date, product, or commercial use still require a separate freedom-to-operate review. A public patent document or a ceased PCT application is not, by itself, a worldwide FTO conclusion.

## Spacer priority and ZF-FokI linker mapping

`src/coda-design-engine.ts` keeps requested spacer-center distance as the primary candidate-order criterion. Candidates at equal distance use the coarse preference 6 bp, 5 bp, then 7 bp, and the generated proteins use `TGGS`, `TGAAAR`, and `TGPGAAAR` for 5-, 6-, and 7-bp spacers, respectively. These decisions draw on:

- Händel EM et al. (2009), *Expanding or restricting the target site repertoire of zinc-finger nucleases: the inter-domain linker as a major determinant of target site selectivity*, DOI: 10.1038/mt.2008.233.
- Shimizu Y et al. (2009), *Restricted spacer tolerance of a zinc finger nuclease with a six amino acid linker*, DOI: 10.1016/j.bmcl.2009.02.109.
- Bhakta MS et al. (2013), *Highly active zinc-finger nucleases by extended modular assembly*, DOI: 10.1101/gr.143693.112.
- Chen S et al. (2013), *A large-scale in vivo analysis reveals that TALENs are significantly more mutagenic than ZFNs generated using context-dependent assembly*, DOI: 10.1093/nar/gks1356.

No article code or row-level dataset from these publications is included for this rule. The spacer preference is not an indel-rate model and does not validate the complete CoDA-3F/ELD/F2A/KKR construct.

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

## F2A bicistronic ZFN output

`src/construct-output.ts` and `src/coda-construct-output.ts` join the left FokI-ELD ZFN and right FokI-KKR ZFN in one ORF using the 22-aa FMDV-derived F2A sequence `VKQLLNFDLLKLAGDVESNPGP`. The paired-ZFN architecture is supported by:

- Lei Y et al. (2011), *Gene editing of human embryonic stem cells via an engineered baculoviral vector carrying zinc-finger nucleases*, DOI: 10.1038/mt.2011.12.

Lei expressed the right and left ZFNs from a baculoviral construct with an intervening F2A sequence and demonstrated CCR5 editing in human embryonic stem cells. That paper supports the single-ORF paired-ZFN strategy; this repository does not claim that Lei is the source of the exact 22-aa project constant. Ribosomal skipping is modeled between the terminal glycine and proline, leaving the first 21 residues on the upstream ZFN and proline on the downstream ZFN. The complete CoDA-3F/ELD/F2A/KKR combination generated here is a design proposal and has not itself been experimentally validated.

## Fauser 2024 four-base context data

`src/fauser-context.ts` is an independently written local parser and design comparator for the helix / “Triplet + flanking base” table in Supplementary Data 33 of:

- Fauser F et al. (2024), *A versatile platform for locus-scale genome rewriting and verification*, DOI: 10.1038/s41467-024-45100-w. The article and supplementary material are distributed under CC BY 4.0.

The 182-row workbook is not bundled. Users retrieve it from the publisher and select it locally; the browser does not upload or retain it. Context-derived candidates are kept out of the primary Barbas/B-score ranking and complete-ORF export because framework compatibility and direct ZFN activity have not been established here.

## fflate

The application uses `fflate` 0.8.2 to decompress locally selected `.xlsx` files in the browser. fflate is copyright 2020–2023 Arjun Barrett and is distributed under the MIT License. Its package license text is available in the installed npm distribution and at <https://github.com/101arrowz/fflate>.
