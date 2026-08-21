# Genome-aware SELECT batching

- The initial genome transition must not wait for every designable candidate.
- The first 30 baseline-ranked candidates are checked first. SELECT uses the full-panel loading state only for this first batch.
- Once the first 30 are checked, they are shown immediately with genome mismatch labels.
- Remaining candidates are checked in subsequent 30-candidate batches without blocking or hiding already visible rows.
- Reaching the end of the visible list requests the next checked batch; already visible rows remain interactive.
- Candidate rows render genome labels directly in React. No MutationObserver or post-render text rewriting is used.
- Alternate-site labels are explicit: `0 mismatch`, `1 mismatch`, `2 mismatch`, `3 mismatch`, or `4 mismatch`. Results at 5+ mismatches are not shown in SELECT.
- Input order is irrelevant: target-first and genome-first use the same batching state.
