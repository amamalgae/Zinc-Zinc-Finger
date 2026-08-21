# ZF specificity benchmark

This work is deliberately separate from the public v3 ranker. Its purpose is to test whether an orthogonal ZF-DNA specificity model adds predictive value for the activity-labelled Bhakta 2013 exact L6+R6 cohort before any production ranking change.

## Baseline cohort

- Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`.
- Exact L6+R6 activity-labelled cohort retained by `benchmark-bhakta-2013.mjs`.
- `n = 21`, with 15 active and 6 inactive targets.
- Reconstructed B-score ROC-AUC = `0.6556`; average precision = `0.8159`.

The cohort is small. A score fitted to these 21 activity labels and evaluated on the same labels is not acceptable evidence. Candidate specificity models are therefore trained elsewhere; uncertainty and cohort sensitivity are reported explicitly.

## Historical controls already tested in this repository

### Persikov & Singh 2014 EL-SVM

Persikov AV, Singh M (2014), DOI `10.1093/nar/gkt890`.

This was previously run against the exact Bhakta L6+R6 cohort with the authors' expanded linear SVM predictor. Results were:

- B-score AUC: `0.6556`;
- Persikov target-fit alone: `0.6667`;
- B-score then Persikov as a tie-break: approximately `0.656`.

The gain was marginal and did not justify replacing the Bhakta ranker.

### DeepZF 2022 PWMpredictor

Aizenshtein-Gazit S, Orenstein Y (2022), DOI `10.1093/bioinformatics/btac469`.

This was also previously evaluated and did not transfer from PWM prediction to ZFN activity ranking:

- exact Bhakta L6+R6: DeepZF AUC `0.5222`;
- independent Chen ZFN set (`n = 82`): AUC `0.491`, Spearman rho `0.053`.

Chen S et al. (2013), DOI `10.1093/nar/gks1356` supplies that independent ZFN activity set. DeepZF is therefore retained only as a negative/control result, not a production ranker.

## Active candidate: Gupta 2014 ZFModels

Gupta A et al. (2014), DOI `10.1093/nar/gku132`.

The Europe PMC supplementary bundle contains the underlying B1H training set directly: 1209 one-finger modules and 678 two-finger modules with PFMs. The research branch reconstructs the published random-forest specification with R `randomForest`, residues `-1,+2,+3,+6`, 500 trees per output, and overlapping two-finger predictions for longer arrays. This is an independent reimplementation from the published data/specification, not the authors' serialized historical web-server model.

The primary score (`hybrid_mean`) was fixed before inspecting Bhakta activity-label performance. It averages the one-finger and two-finger predicted PFMs and scores the cognate 18-bp half-sites by mean log probability.

### Current activity-ranking result

Full exact L6+R6 cohort (`n = 21`):

| score | ROC-AUC | average precision | delta AUC vs B-score |
|---|---:|---:|---:|
| B-score | 0.6556 | 0.8159 | — |
| ZFModels hybrid mean (predeclared) | 0.7556 | 0.8997 | +0.1000 |
| ZFModels two-finger weakest triplet | 0.8222 | 0.9162 | +0.1667 |

The weakest-triplet result is explicitly **post-hoc exploratory**: several aggregation rules were inspected, so `0.8222` must not be used as a production-selection claim on this cohort alone.

For the predeclared hybrid-mean score, a 20,000-iteration paired stratified bootstrap gave:

- score AUC 95% interval: `0.511–0.956`;
- delta AUC versus B-score 95% interval: `-0.056–+0.272`;
- bootstrap fraction with delta <= 0: `0.119`.

Among current public-v3-eligible targets (`combined B >= 15`, `n = 18`, 13 active):

- B-score AUC: `0.6769`;
- ZFModels hybrid-mean AUC: `0.7846`;
- delta: `+0.1077`;
- paired bootstrap delta 95% interval: `-0.092–+0.315`.

Cohort sensitivity is informative. On the exploratory subset (`n = 10`), hybrid mean was only `0.619` versus B-score `0.595`; on the prospective subset (`n = 11`), hybrid mean was `0.917` versus B-score `0.875`. The direction is favorable in both, but the small sample leaves wide uncertainty.

Interpretation: **promising, not yet enough to change production v3 ranking**. The current evidence is substantially stronger than the historical Persikov 2014 or DeepZF activity-ranking results, but the paired confidence interval still includes no improvement.

`validate-zfmodels-oob.R` separately checks the reconstructed RF on its source B1H training domain using out-of-bag predictions without any Bhakta ZFN activity labels. This prevents a favorable ZFN ranking result from hiding a mis-reconstructed source model.

## Active candidate: Persikov et al. 2015 B1H nearest-neighbour

Persikov AV et al. (2015), DOI `10.1093/nar/gku1395`.

The published B1H landscape contains more than 160,000 experimentally observed ZF-DNA interactions. A research adapter scaffold reproduces the published nearest-neighbour logic at the algorithm level, but the underlying Princeton landscape is not committed. The available download route requests downloader identity/affiliation and carries use/redistribution terms; the project must not fabricate those fields or silently republish the data.

If a legitimate reusable copy of the B1H landscape is obtained, the comparison should be run with an aggregation rule fixed before inspecting activity labels. Until then, Persikov 2015 is not a completed benchmark.

## Metrics and graduation rule

For every candidate score report at minimum:

1. ROC-AUC on active vs inactive targets.
2. Average precision.
3. Paired bootstrap uncertainty for delta AUC versus B-score.
4. exploratory/prospective cohort sensitivity.
5. source-domain validation of any reconstructed binding model.

A specificity predictor is eligible for public v3 only when it is reproducible, has acceptable data/model use terms, and demonstrates a robust activity-ranking gain rather than a post-hoc in-sample improvement. If one passes, the safest first production use is **after the existing Bhakta `combined B >= 15` eligibility filter**, as an orthogonal secondary ranking signal rather than a replacement for Bhakta eligibility.
