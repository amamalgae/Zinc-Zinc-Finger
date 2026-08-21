# ZF specificity benchmark plan

This benchmark is deliberately separate from the public v3 ranker. Its purpose is to test whether an orthogonal DNA-specificity model adds predictive value for the activity-labelled Bhakta 2013 exact L6+R6 cohort before any production ranking change.

## Baseline cohort

- Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`.
- Exact L6+R6 activity-labelled cohort retained by `benchmark-bhakta-2013.mjs`.
- `n = 21`, with 15 active and 6 inactive targets.
- Current reconstructed B-score ROC-AUC is approximately 0.656.

The cohort is small. A single in-sample fitted combination of B-score and a new score is therefore not acceptable evidence. Any learned combination must be evaluated out of sample (preferably leave-one-target-out or nested leave-one-out), and uncertainty must be reported.

## Candidate predictors

### Persikov & Singh 2014 EL-SVM

Persikov AV, Singh M (2014), DOI `10.1093/nar/gkt890`.

The repository already contains an offline adapter and benchmark path for the official expanded linear SVM predictor. It is retained as the historical baseline specificity predictor.

### Persikov et al. 2015 B1H nearest-neighbour

Persikov AV et al. (2015), DOI `10.1093/nar/gku1395`.

Priority implementation. The published B1H landscape contains more than 160,000 experimentally observed ZF-DNA interactions and provides downloadable per-target helix frequencies. The intended adapter will reproduce the paper's nearest-neighbour decomposition rather than fit a new model to the 21 ZFN activity labels.

For each engineered finger, predict a 3-bp specificity distribution from its six recognition-helix residues. Convert that distribution into a cognate-triplet log-likelihood. Aggregate per arm with both:

- mean log-likelihood across six fingers; and
- weakest-finger log-likelihood.

For a ZFN pair, combine left/right arm values symmetrically (for example arithmetic mean in log space). The final aggregation rule must be fixed before inspecting activity-label performance.

### Gupta et al. 2014 ZFModels

Gupta A et al. (2014), DOI `10.1093/nar/gku132`.

Scientifically attractive because its two-finger model explicitly captures junction/context effects. Do not depend on scraping the historical web server. Add this comparator only if the underlying random-forest/model artifact, training data plus fully specified reconstruction, or another reproducible archival implementation is obtained.

### DeepZF 2022 PWMpredictor

Aizenshtein-Gazit S, Orenstein Y (2022), DOI `10.1093/bioinformatics/btac469`.

The authors publish code and pretrained model files. Use it as an external research comparator first. It is trained/fine-tuned substantially on natural multi-ZF proteins, so performance on engineered Sp1C-style 6F arrays must be treated as a domain-transfer test. Do not ship TensorFlow or pretrained model weights into the browser application merely because the benchmark runs.

## Metrics

For every scalar candidate score report at minimum:

1. ROC-AUC on active vs inactive targets.
2. Average precision / PR-AUC-style ranking summary.
3. Whether top 1, top 2, and top 3 contain an active target.
4. Bootstrap confidence intervals for AUC and the delta versus B-score when the predictor adapter is complete.

Also inspect the score distribution and individual discordant targets; a higher AUC caused by one extreme target is not sufficient justification for production ranking.

## Graduation into public v3

A specificity predictor is eligible for public v3 only when all of the following hold:

- It is reproducible from an archived model/data artifact with acceptable redistribution/use terms, or it can run entirely from user-supplied/external artifacts without silently changing scientific claims.
- It improves held-out discrimination over B-score rather than only an in-sample fitted composite.
- The direction of the score has a mechanistic interpretation for engineered ZFs (higher cognate fit should mean the emitted helix is more compatible with the intended DNA site).
- The gain survives sensitivity checks for left/right arm aggregation and is not driven solely by the prospective/exploratory cohort split.

If a model passes, the safest first production use is as a tie-break or secondary ranking term among already eligible high-B-score candidates, not as a replacement for the Bhakta `combined B >= 15` filter.
