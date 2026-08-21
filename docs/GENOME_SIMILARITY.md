# Genome similarity guardrail

Current public behavior: PR #69.

This feature is a deterministic genomic sequence-similarity check. It is not an off-target cleavage predictor and does not output a safety probability.

## Search window

For each returned ZFN candidate, the browser-local worker searches:

- both genomic orientations;
- spacer lengths 5, 6 and 7 bp;
- at most 4 mismatches in either complete physical half-site;
- at most 5 mismatches across the two half-sites combined;
- spacer bases are ignored.

`N`/ambiguous reference bases invalidate that comparison window rather than being counted as mismatches.

One exact hit at the candidate's own spacer length is treated as the intended on-target and removed from the alternative-site counts. Any remaining 0-mismatch hit is an extra exact genomic copy.

The candidate row reports the closest alternative as `Lx/Ry`, its total mismatch count, its spacer length, and counts for total 1/2/3/4/5 mismatches.

## Why 4 mismatches are a primary inspection range

Cui et al. 2021 adapted GUIDE-seq to ZFNs and used a search condition of no more than four mismatches per half-site when assigning ZFN sites. In their retrospective set, 57/58 previously measured three-finger ZFN off-target sites were within that per-half-site window. Primary source: Cui Z et al. (2021), DOI `10.1016/j.omtn.2021.08.008`.

This does not mean every <=4-mismatch site is cleaved, nor that >4 mismatches are safe. Fine et al. 2014 and Sander et al. 2013 show why sequence similarity alone is not a calibrated cleavage model. References: Fine M et al. (2014), DOI `10.1093/nar/gkt1326`; Sander JD et al. (2013), DOI `10.1093/nar/gkt716`.

Five-total-mismatch alternatives are retained as context because experimentally observed ZFN off-targets can extend into that range, but PR #69 deliberately does not let total-5 sites change candidate order.

## Ranking policy

Genome-aware ordering is enabled only when every displayed candidate has at least one exact hit at its intended spacer length in the supplied genome. If that validation fails, similarity annotations are still shown but the normal method ranking is preserved.

When enabled:

1. an extra 0-mismatch genomic copy is a strong penalty and can override functional rank;
2. otherwise the design method's main functional evidence remains primary;
3. total 1-2 mismatch alternatives are a stronger secondary ranking factor;
4. the established 6 > 5 >> 7 spacer preference remains functionally important;
5. total 3-4 mismatch alternatives are a weaker late tie-break;
6. total 5 mismatch alternatives are display-only and do not alter rank.

For Bhakta v3, combined B-score, TSO/context warnings, unfavorable modules and favorable modules all remain ahead of non-exact genomic similarity. Distance from the requested center remains absent from v3 ranking.

For v1/v2, requested-center distance remains primary. Extra exact copies are still penalized strongly; 1-2 mismatch similarity then enters before lower-priority tie-breaks.

No arithmetic "specificity score" combines B-score and mismatch counts.

## Lossless seed algorithm

The implementation does not compare every candidate against every genomic base directly.

- v1/v2 9-bp half-sites use all 9-mer seeds within 2 mismatches. If the paired site has <=5 total mismatches, at least one of the two 9-mers must have <=2 mismatches, so this seed filter cannot miss an allowed hit.
- v3 18-bp half-sites are split into four 9-mer chunks. With <=5 total mismatches across the 36 recognized bases, at least one chunk must have <=1 mismatch. Those <=1-mismatch seeds therefore provide a lossless filter.
- Only seed-positive coordinates undergo exact left/right Hamming-distance verification.

This keeps the search practical in a browser while preserving complete enumeration inside the declared mismatch window.
