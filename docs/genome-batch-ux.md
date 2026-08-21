# Genome-aware SELECT batching

- The initial genome transition must not wait for every designable candidate.
- The first 30 baseline-ranked candidates are checked first. SELECT uses the full-panel loading state only for this first batch.
- Once the first 30 are checked, they are shown immediately with genome mismatch labels.
- Remaining candidates continue in the Web Worker after the first page has become usable. They must not hide or freeze already visible rows.
- SELECT still reveals candidate rows in batches of 30 as the user scrolls.
- Alternate-site labels show the exact nearest mismatch count: `0 mismatch` through `8 mismatch` for Bhakta v3, and through `5 mismatch` for v1/v2. Counts above 4 are reference-only and do not affect ranking.
- A candidate with no alternate site inside the searched mismatch envelope shows no genome badge.
- Input order is irrelevant: target-first and genome-first use the same transition.
