# v3 genome similarity threshold rationale

For Bhakta v3, each monomer recognizes an 18-bp half-site (36 bp total recognition sequence). Requiring both 18-bp half-sites to be simultaneously close makes a practical genome screen nearly silent, especially in compact genomes.

The public v3 search therefore uses either-half anchoring:

- either left or right complete 18-bp half-site may anchor when it has <=3 mismatches;
- after an anchor is found, the partner 18-bp half-site is measured without an arbitrary mismatch cutoff;
- the displayed pair total can therefore be 0-21 mismatches;
- both genomic orientations are searched;
- spacer lengths 5, 6 and 7 bp are searched;
- spacer bases themselves are ignored.

This follows the search principle already implemented and benchmarked in `off-target-engine.ts`. In the reproduced Sander 2013 prospective dataset, a strict both-halves cutoff misses many experimentally observed sites, while either-half <=3 anchoring covers all 52 CCR5/VEGFA prospective rows. Sander JD et al. 2013, DOI `10.1093/nar/gkt716`.

The transfer from those historical ZFNs to Bhakta six-finger arrays is deliberately limited: this is a sequence-similarity discovery rule, not a six-finger cleavage predictor or off-target probability model.

Ranking remains conservative:

- extra exact genomic copies are strongly penalized;
- total 1-2 mismatch alternatives can influence secondary ordering;
- total 3-4 mismatch alternatives are weaker tie-breaks;
- total >=5 alternatives are display-only and do not change rank.

v1/v2 remain at <=4 mismatches per 9-bp half-site and <=5 total because the shorter 18-bp paired recognition sequence otherwise becomes too permissive.

For v3 seed generation, each 18-bp half-site is split into two 9-mers. Any half-site with <=3 mismatches must contain at least one 9-mer with <=1 mismatch, so expanding 9-mer seeds through one mismatch is lossless inside the declared anchor envelope.
