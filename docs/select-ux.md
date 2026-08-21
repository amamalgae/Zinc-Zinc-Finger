# SELECT UX contract

- Candidate generation is not truncated to an arbitrary top-30 set. Every designable candidate in the requested range is retained and ranked.
- SELECT reveals candidates progressively in batches of 30 as the user scrolls near the bottom of the list.
- The candidate count and CSV refer to the complete ranked candidate set, not only the currently visible batch.
- Adding a genome switches SELECT through a full-panel loading state so stale genome-unaware results are not presented as final.
- Genome-first and target-first input orders are equivalent: once both a genome and designable candidates exist, the same genome check starts.
- The genome transition remains visible until the genome-aware result is ready, with a minimum visible duration of 500 ms.
- After the genome transition completes, SELECT resets to the first 30 candidates; further candidates are revealed in batches of 30 while scrolling.
- Genome similarity computation itself runs in a Web Worker, so the browser UI thread is not blocked by sequence scanning.
- Candidate rows retain compact functional decision cues (method/B-score, distance and spacer).
- Genome badges appear only for alternate sites at 0, 1, 2, 3 or 4 mismatches. They are written explicitly as `0 mismatch` through `4 mismatch`; 5+ mismatch results are not shown in SELECT.
- No row is labelled "recommended". Rank is shown numerically and the user can compare the visible decision cues.
