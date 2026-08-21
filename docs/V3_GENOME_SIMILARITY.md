# v3 genome similarity threshold rationale

For Bhakta v3, each monomer recognizes an 18-bp half-site (36 bp total recognition sequence). Applying the v1/v2 total-mismatch cap of five across all 36 bp is too restrictive for a practical similarity screen: in a random 100 Mb genome the expected number of <=5-mismatch 36-bp sites is ~2e-6 per candidate.

The public v3 search therefore uses a per-half-site condition instead:

- left 18-bp half-site: <=4 mismatches;
- right 18-bp half-site: <=4 mismatches;
- no additional total-mismatch cap (maximum total = 8);
- both genomic orientations;
- spacer lengths 5, 6 and 7 bp.

This is a sequence-similarity guardrail, not a cleavage predictor. There is not a sufficiently validated six-finger ZFN model to convert these mismatch counts into an off-target probability.

Ranking remains conservative:

- extra exact genomic copies are strongly penalized;
- total 1-2 mismatch alternatives can influence secondary ordering;
- total 3-4 mismatch alternatives are weaker tie-breaks;
- total >=5 alternatives (including v3-only totals 6-8) are display-only and do not change rank.

v1/v2 remain at <=4 mismatches per 9-bp half-site and <=5 total because the shorter 18-bp paired recognition sequence otherwise becomes too permissive.
