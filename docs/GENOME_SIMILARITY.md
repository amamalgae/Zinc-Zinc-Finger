# Genome similarity guardrail

Current public behavior: PR #77.

This feature is a deterministic genomic sequence-similarity check. It is not an off-target cleavage predictor and does not output a safety probability.

## Search window

For each returned ZFN candidate, the browser-local worker searches both genomic orientations, spacer lengths 5, 6 and 7 bp, and ignores spacer bases themselves.

The mismatch window is profile-specific:

- v1/v2 (9-bp half-sites): at most 4 mismatches in either half-site and at most 5 mismatches across both half-sites combined;
- v3 Bhakta (18-bp half-sites): either complete 18-bp half-site may anchor the pair when it is within 3 mismatches. Once anchored, the partner 18-bp half-site is measured without an arbitrary mismatch cutoff. A displayed pair total can therefore range from 0 to 21 mismatches.

`N`/ambiguous reference bases invalidate that comparison window rather than being counted as mismatches.

One exact hit at the candidate's own spacer length is treated as the intended on-target and removed from alternative-site counts. Any remaining 0-mismatch hit is an extra exact genomic copy.

The candidate row reports the closest alternative pair as one explicit total mismatch value. Internal count bins remain 1/2/3/4/5+ mismatches so the existing ranking policy can stay conservative; the exact closest total is retained separately for display.

## Why v3 uses either-half anchoring

Requiring both long half-sites to be simultaneously close makes a six-finger genome screen nearly silent in compact genomes. More importantly, Sander et al. 2013 showed that a strict both-halves mismatch cutoff can miss experimentally observed ZFN off-target sites. The repository's reproduced prospective Sander cohort contains only 5 CCR5 rows where both halves are within 3 mismatches, while all 52 CCR5/VEGFA prospective rows have at least one half within 3 mismatches. The existing `off-target-engine.ts` regression suite recovers those sites using either-half anchoring. Primary source: Sander JD et al. (2013), DOI `10.1093/nar/gkt716`.

PR #77 applies the same search principle to Bhakta v3 only: one 18-bp half-site within 3 mismatches is sufficient to inspect the paired genomic position, and the opposite half is then measured exactly. This is a sequence-similarity discovery rule, not evidence that a 6-finger Bhakta ZFN will cleave every returned site.

Cui et al. 2021 used no more than four mismatches per half-site when assigning three-finger ZFN GUIDE-seq sites. That remains useful context but is not a validated six-finger cleavage threshold. Primary source: Cui Z et al. (2021), DOI `10.1016/j.omtn.2021.08.008`.

Fine et al. 2014 and Sander et al. 2013 also show why raw mismatch count alone is not a calibrated cleavage model. Fine M et al. (2014), DOI `10.1093/nar/gkt1326`; Sander JD et al. (2013), DOI `10.1093/nar/gkt716`.

## Ranking policy

Genome-aware ordering is enabled only when every candidate being ranked has at least one exact hit at its intended spacer length in the supplied genome. If that validation fails, similarity annotations can still be shown but the normal method ranking is preserved.

When enabled:

1. an extra 0-mismatch genomic copy is a strong penalty and can override functional rank;
2. otherwise the design method's main functional evidence remains primary;
3. total 1-2 mismatch alternatives are a stronger secondary ranking factor;
4. the established 6 > 5 >> 7 spacer preference remains functionally important;
5. total 3-4 mismatch alternatives are a weaker late tie-break;
6. total >=5 alternatives are display-only and do not alter rank.

For Bhakta v3, combined B-score, TSO/context warnings, unfavorable modules and favorable modules all remain ahead of non-exact genomic similarity. Distance from the requested center remains absent from v3 ranking.

For v1/v2, requested-center distance remains primary. Extra exact copies are still penalized strongly; 1-2 mismatch similarity then enters before lower-priority tie-breaks.

No arithmetic "specificity score" combines B-score and mismatch counts.

## Lossless seed algorithm

The implementation does not compare every candidate against every genomic base directly.

- v1/v2 expand each 9-mer seed through 2 mismatches; under the legacy total <=5 condition, at least one 9-bp half-site must be within 2 mismatches;
- v3 splits each 18-bp half-site into two 9-mer chunks and expands each chunk through 1 mismatch;
- if an 18-bp v3 half-site has <=3 mismatches, at least one of its two 9-mer chunks must have <=1 mismatch, so the anchor search is lossless inside the declared <=3 half-site envelope;
- only seed-positive coordinates undergo full paired Hamming-distance measurement.

The v3 seed index is therefore smaller than the previous <=2-per-9-mer implementation even though the paired-site display is more informative.
