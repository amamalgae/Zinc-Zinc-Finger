# Reference workbooks

Human-facing review aids. Nothing in this directory is read by the application,
the build, or the tests; `data/coda-2011-units.json` remains the only archive the
designer uses.

## `coda-2011-units-sander-2011-crosscheck.xlsx`

- SHA-256: `59950ceeb7c061df85ff4d103e79ef5308a53ed61a9498a88ac9d791952517b1`
- Added: 2026-08-18

### What it is

Sander et al. (2011), DOI [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542)
publishes the CoDA F1/F3 unit archive as Supplementary Tables 1 and 2 in PDF, and
in the copy available to this project those tables are images rather than text.
That format cannot be diffed against the repository, so the committed transcription
`data/coda-2011-units.json` was re-laid out into this workbook, using the same row
order (18 fixed F2 contexts) and column order (F1 25 subsite columns, F3 27 subsite
columns) as the published tables, so the two can be compared side by side on screen.

The workbook is therefore **derived from the repository JSON**, not an independent
transcription of the PDF. It is the artifact that was used to review the archive; it
is not a second source, and it cannot confirm the JSON against the paper on its own.

Sheets:

| Sheet | Contents |
|---|---|
| `読み方とメモ` | How to read the tables, colour key, what was and was not confirmed |
| `Supp Table 1 (F1)` | 319 F1 units, 18 F2-context rows x 25 subsite columns |
| `Supp Table 2 (F3)` | 344 F3 units, 18 F2-context rows x 27 subsite columns |

Cell colours: light purple marks a populated cell; orange marks the eight units used
by the `ZFN_Result01` / `ZFN_Result03` worked examples. A blank cell is either `N.F.`
(selection attempted, no unit recovered) or a combination that was never attempted —
the JSON does not distinguish those two cases, and neither does this workbook.

### What the layout confirmed

Re-running the comparison against `data/coda-2011-units.json` reproduces:

- all 663 cells present in both, with 0 cells only in the JSON, 0 cells only in the
  workbook, and 0 differing helices;
- 18 F2 target/helix row labels matching the JSON `f2Contexts` exactly;
- per-row unit counts matching on all 18 rows of both tables (F1 319, F3 344);
- the isolated cells `TCC=DKRSLPH`, `TTA=QQTGLNV`, `TTT=QRNALSG`, and `TCT=QRNTLKG`
  sitting on the expected row x column;
- the assemblable-9-mer total `sum(F1 x F3) = 6,680 = 2.548%` of `4^9`, matching the
  paper's Supplementary Discussion and `npm run audit:coda`.

### Known discrepancy in the paper's own text — do not "fix" the JSON

The Supplementary Discussion of Sander 2011 describes the `GGG` F2 context as
23 F1 units x 20 F3 units. Counting the `GGG` row of the published Supplementary
Tables 1 and 2 gives F1 = 20 and F3 = 23; the prose has the two swapped. The product
is 460 either way and the 6,680 total is unchanged, so no sum-level check can detect
this.

`data/coda-2011-units.json` follows the **tables**, which is correct. Editing it to
agree with the prose would exchange the F1 and F3 helices of all 460 arrays in the
`GGG` context and produce plausible-looking but wrong proteins.

### What is still unverified

Per-character accuracy of the 663 recognition helices is not established. In the PDF
available here the supplementary tables are images, and some cells cannot be resolved
between `R`/`H`, `D`/`Q`, and `S`/`G`. A full character-level audit needs an original
with a text layer. Until then, treat the transcription as structurally audited
(counts, positions, row/column identity) but not character-verified.

### Licensing

The scientific content of the two table sheets originates in the supplementary
material of Sander 2011 and reaches this workbook through `data/coda-2011-units.json`.
It carries the same terms as that file — see
[THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md). The repository's MIT license
covers the layout and notes, not the underlying published data.
