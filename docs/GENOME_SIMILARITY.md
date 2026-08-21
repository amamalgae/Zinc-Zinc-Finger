# Genome similarity guardrail

Current public behavior: PR #71.

This feature is a deterministic genomic sequence-similarity check. It is not an off-target cleavage predictor and does not output a safety probability.

## Search window

For each returned ZFN candidate, the browser-local worker searches both genomic orientations, spacer lengths 5, 6 and 7 bp, and ignores spacer bases themselves.

The mismatch window is profile-specific:

- v1/v2 (9-bp half-sites): at most 4 mismatches in either half-site and at most 5 mismatches across both half-sites combined;
- v3 Bhakta (18-bp half-sites): at most 4 mismatches independently in each half-site, with no tighter combined cap, so the maximum accepted total is 8.

`N`/ambiguous reference bases invalidate that comparison window rather than being counted as mismatches.

One exact hit at the candidate's own spacer length is treated as the intended on-target and removed from alternative-site counts. Any remaining 0-mismatch hit is an extra exact genomic copy.

The candidate row reports the closest alternative as `Lx/Ry`, its exact total mismatch count and spacer length. Count bins are 1/2/3/4/5+ mismatches; for v3, the 5+ bin therefore also includes totals 6-8.

## Why 4 mismatches are a primary inspection range

Cui et al. 2021 adapted GUIDE-seq to ZFNs and used a search condition of no more than four mismatches per half-site when assigning ZFN sites. In their retrospective set, 57/58 previously measured three-finger ZFN off-target sites were within that per-half-site window. Primary source: Cui Z et al. (2021), DOI `10.1016/j.omtn.2021.08.008`.

This does not mean every <=4-mismatch half-site pair is cleaved, nor that >4 mismatches are safe. Fine et al. 2014 and Sander et al. 2013 show why sequence similarity alone is not a calibrated cleavage model. References: Fine M et al. (2014), DOI `10.1093/nar/gkt1326`; Sander JD et al. (2013), DOI `10.1093/nar/gkt716`.

For Bhakta v3, applying a total <=5 cap to all 36 recognized bases is overly restrictive for a similarity screen. PR #71 therefore uses the per-half-site <=4 condition directly. This is an engineering guardrail, not a validated six-finger cleavage model.

## Ranking policy

Genome-aware ordering is enabled only when every displayed candidate has at least one exact hit at its intended spacer length in the supplied genome. If that validation fails, similarity annotations are still shown but the normal method ranking is preserved.

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

- every 9-mer seed is expanded through 2 mismatches;
- v1/v2 have two 9-mer half-sites; under a total <=5 condition, at least one must be within 2 mismatches;
- v3 splits its two 18-bp half-sites into four 9-mer chunks; if each 18-bp half-site has <=4 mismatches, each half necessarily contains at least one 9-mer chunk within 2 mismatches;
- only seed-positive coordinates undergo exact left/right Hamming-distance verification.

The widened v3 seed boundary is necessary for cases such as 4+4 mismatches distributed as 2/2 mismatches across both 9-mer chunks of each half-site. PR #71 includes a regression for that boundary.
