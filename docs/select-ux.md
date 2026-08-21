# SELECT UX contract

- Candidate generation is not truncated to an arbitrary top-30 set. Every designable candidate in the requested range is retained and ranked.
- SELECT reveals candidates progressively in batches of 30 as the user scrolls near the bottom of the list.
- The candidate count and CSV refer to the complete ranked candidate set, not only the currently visible batch.
- Adding a genome switches SELECT through a full-panel loading state so stale genome-unaware results are not presented as final.
- Genome-first and target-first input orders are equivalent: once both a genome and designable candidates exist, the same genome check starts.
- The initial transition waits only for the first 30 baseline-ranked candidates, not the complete candidate set.
- The genome transition has a minimum visible duration of 500 ms. Once the first 30 genome summaries are ready, SELECT becomes usable immediately.
- Remaining candidates continue to be checked in the Web Worker after the first page is visible; they must not hide or freeze the already usable SELECT list.
- After the transition completes, SELECT shows the first 30 candidates; further candidates are requested in batches of 30 while scrolling.
- A genome-backed row is never revealed before its genome summary exists. If the user reaches a page before its summaries arrive, existing rows remain usable and only a small spinner appears at the list tail.
- Candidate rows retain compact functional decision cues (method/B-score, distance and spacer).
- Genome badges show the nearest alternate paired site as an explicit mismatch count.
- Bhakta v3 uses lossless either-half anchoring: if either complete 18-bp half-site is within 3 mismatches, the partner 18-bp half-site is measured without an arbitrary mismatch cutoff. The displayed total can therefore range from `0 mismatch` through `21 mismatch`.
- v1/v2 retain the bounded three-finger search: each 9-bp half-site <=4 mismatches and pair total <=5.
- Mismatch counts above 4 are reference-only and do not affect candidate ranking. They are visually subdued rather than omitted.
- If no alternate site exists inside the searched envelope, no genome badge is shown.
- No row is labelled "recommended". Rank is shown numerically and the user can compare the visible decision cues.
