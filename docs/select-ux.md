# SELECT UX contract

- Candidate generation is not truncated to an arbitrary top-30 set. Every designable candidate in the requested range is retained and ranked.
- SELECT reveals candidates progressively in batches of 30 as the user scrolls near the bottom of the list.
- The candidate count and CSV refer to the complete ranked candidate set, not only the currently visible batch.
- Genome similarity checking runs in a Web Worker. Existing candidate rows remain visible, scrollable, copyable and selectable while the genome is being checked.
- SELECT never uses a blocking full-panel genome-check overlay.
- Candidate rows retain compact functional decision cues (method/B-score, distance and spacer).
- Genome badges appear only for alternate sites at 0, 1, 2, 3 or 4 mismatches. They are written explicitly as `0 mismatch` through `4 mismatch`; 5+ mismatch results are not shown in SELECT.
- No row is labelled "recommended". Rank is shown numerically and the user can compare the visible decision cues.
