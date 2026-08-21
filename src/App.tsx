import { useMemo, useState } from "react";
import { APP_VERSION, APP_VERSION_PR_URL } from "./app-version.ts";
import { FMDV_F2A } from "./construct-output.ts";
import {
  formatCut,
  generateZfnCandidates,
  parseDNAInput,
  reverseComplement,
  zfnCandidatesToCsv,
  type DesignProfile,
  type ZfnCandidate,
} from "./zfn-design-engine.ts";
import {
  buildBicistronicZfn,
  constructToProteinGenPept,
  constructToProteinFasta,
  resultFilename,
  ZFN_DONORS,
} from "./zfn-construct-output.ts";
import {
  CODA_F1_UNIT_COUNT,
  CODA_F3_UNIT_COUNT,
} from "./coda-module-archive.ts";
import { GUPTA_MODULE_COUNT, GUPTA_TARGET_COUNT } from "./gupta-module-archive.ts";
import type { ZfnArray, ZfnFinger } from "./zfn-array.ts";
import {
  DEFAULT_DESIRED_CUT_INPUT,
  DEFAULT_MAX_DISTANCE_INPUT,
  desiredCutInputError,
  parseUnsignedIntegerInput,
} from "./manual-numeric-input.ts";
import ZfnOverviewDiagram from "./ZfnOverviewDiagram.tsx";

const EXAMPLE_LEFT_RECOGNITION = "GAAGAAACG";
const EXAMPLE_RIGHT_RECOGNITION = "GAAGAAACG";
const EXAMPLE_SEQUENCE = `CAGTCA${reverseComplement(EXAMPLE_LEFT_RECOGNITION)}GATTAC${EXAMPLE_RIGHT_RECOGNITION}TGACGT`;

function downloadText(contents: string, filename: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ArchitectureDiagram() {
  return (
    <div className="architecture" aria-label="single ORF ZFN construct">
      <div className="arch-block nls"><span>nuclear import</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>binds 9 bp</span><strong>ZF-L · 3F</strong></div>
      <div className="arch-block eld"><span>cleavage</span><strong>FokI ELD (−)</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block f2a"><span>ribosome skip</span><strong>F2A</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block nls"><span>nuclear import</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>binds 9 bp</span><strong>ZF-R · 3F</strong></div>
      <div className="arch-block kkr"><span>cleavage</span><strong>FokI KKR (+)</strong></div>
    </div>
  );
}

function FingerCard({ finger }: { finger: ZfnFinger }) {
  return (
    <article className="finger-card">
      <div><span>F{finger.position}</span><small>N → C</small></div>
      <strong>{finger.triplet}</strong>
      <code>{finger.helix}</code>
      <small>{finger.source}</small>
    </article>
  );
}

function FingerGroup({ title, fingers }: { title: string; fingers: readonly ZfnFinger[] }) {
  return (
    <section className="finger-group">
      <div className="finger-title"><h3>{title}</h3><span>protein N→C</span></div>
      <div className="finger-cards">
        {fingers.map((finger) => <FingerCard key={`${title}-${finger.position}`} finger={finger} />)}
      </div>
      <p>On DNA the order runs F3 → F2 → F1.</p>
    </section>
  );
}

function hasTextSelectionWithin(element: HTMLElement): boolean {
  const selection = window.getSelection();
  return Boolean(
    selection
    && !selection.isCollapsed
    && selection.toString()
    && selection.anchorNode
    && selection.focusNode
    && element.contains(selection.anchorNode)
    && element.contains(selection.focusNode),
  );
}

const DESIGN_PROFILE_OPTIONS: ReadonlyArray<{ value: DesignProfile; label: string }> = [
  { value: "gupta-coda", label: "v2 · Gupta + CoDA fallback" },
  { value: "coda-only", label: "v1 · CoDA only" },
];

function methodPairLabel(candidate: ZfnCandidate): string {
  return `${candidate.leftArray.methodLabel} / ${candidate.rightArray.methodLabel}`;
}

function arrayTitle(arm: "Left" | "Right", array: ZfnArray): string {
  return `${arm} ZF · ${array.methodLabel} · ${array.assembly}`;
}

function CandidateRow({ candidate, rank, selected, onSelect }: {
  candidate: ZfnCandidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className={`candidate ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-pressed={selected} onClick={(event) => { if (!hasTextSelectionWithin(event.currentTarget)) onSelect(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}>
      <span className="candidate-rank">{String(rank).padStart(2, "0")}</span>
      <span className="candidate-sequence"><b className="left">{candidate.leftTop}</b><i>{candidate.spacer}</i><b className="right">{candidate.rightTop}</b></span>
      <span className="candidate-summary"><strong>{methodPairLabel(candidate)}</strong><small>±{formatCut(candidate.distance)} bp from center · {candidate.spacerLength} bp spacer</small></span>
      <span className="candidate-action" aria-hidden="true">{selected ? "✓ Selected" : "Select →"}</span>
    </div>
  );
}

export default function Home() {
  const [rawSequence, setRawSequence] = useState(EXAMPLE_SEQUENCE);
  const [desiredCutInput, setDesiredCutInput] = useState(DEFAULT_DESIRED_CUT_INPUT);
  const [maxDistanceInput, setMaxDistanceInput] = useState(DEFAULT_MAX_DISTANCE_INPUT);
  const [designProfile, setDesignProfile] = useState<DesignProfile>("gupta-coda");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const parsedInput = useMemo(() => parseDNAInput(rawSequence), [rawSequence]);
  const { dna, ambiguousBaseCount, invalidCharacterCount } = parsedInput;
  const desiredCut = parseUnsignedIntegerInput(desiredCutInput);
  const maxDistance = parseUnsignedIntegerInput(maxDistanceInput);
  const desiredCutError = desiredCutInputError(desiredCutInput, dna.length);
  const candidates = useMemo(
    () => invalidCharacterCount || desiredCutError || desiredCut === null || maxDistance === null
      ? []
      : generateZfnCandidates(dna, desiredCut, maxDistance, designProfile),
    [dna, desiredCut, desiredCutError, maxDistance, invalidCharacterCount, designProfile],
  );
  const selected = candidates.find(({ id }) => id === selectedId) ?? candidates[0] ?? null;
  const selectedRank = selected ? candidates.findIndex(({ id }) => id === selected.id) + 1 : 0;
  const construct = useMemo(() => selected ? buildBicistronicZfn(selected) : null, [selected]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Zinc Zinc Finger home">
          <span className="brand-mark">ZF</span>
          <span><strong>Zinc Zinc Finger</strong><small>3-finger ZFN designer</small></span>
        </a>
        <div className="header-status">
          <a className="version-badge" href={APP_VERSION_PR_URL} target="_blank" rel="noreferrer" aria-label={`${APP_VERSION} — open the GitHub Code page`}>{APP_VERSION}<span aria-hidden="true">↗</span></a>
          <span className="local-badge" aria-label="Designs are computed in your browser; sequences are never sent to a server"><i />Runs in your browser</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">GUPTA 2012 · 2F MODULE ZFN DESIGNER</span>
          <h1>Design a ZFN pair</h1>
          <p>Paste the sequence around your target. The designer searches the Gupta 2012 two-finger archive first, falls back to CoDA for a monomer it cannot build, and returns the amino acid sequence.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#designer">Enter a sequence<span aria-hidden="true">↓</span></a>
            <span className="privacy-note"><i />Sequences stay on your device</span>
          </div>
          <ul className="hero-benefits" aria-label="What this tool does">
            <li>Runs in the browser</li>
            <li>GenPept / protein FASTA</li>
          </ul>
        </div>
        <aside className="study-card">
          <span>GUPTA ORIGINAL STUDY</span>
          <div className="study-value"><strong>9/11</strong></div>
          <h2>zebrafish targets mutated<br />in Gupta 2012</h2>
          <h2>2F module archive: 87 modules / 162 sites</h2>
          <p>A small, selectively evaluated cohort. It is not the success probability of any candidate on this site.</p>
          <a href="https://doi.org/10.1038/nmeth.1994" target="_blank" rel="noreferrer">Gupta et al. 2012 · DOI 10.1038/nmeth.1994 <span aria-hidden="true">↗</span></a>
        </aside>
      </section>

      <ZfnOverviewDiagram />

      <section className="designer" id="designer">
        <div className="input-panel">
          <div className="panel-heading"><span>01</span><div><small>INPUT</small><h2>Enter the target</h2></div></div>
          <label htmlFor="target-sequence">Target DNA<small>top strand 5′→3′ · FASTA accepted</small></label>
          <textarea id="target-sequence" value={rawSequence} onChange={(event) => { setRawSequence(event.target.value); setSelectedId(null); }} spellCheck={false} />
          <div className="input-meta"><span>{dna.length} bp</span>{ambiguousBaseCount ? <span className="warning">{ambiguousBaseCount} bp ambiguous</span> : null}{invalidCharacterCount ? <span className="warning">{invalidCharacterCount} unsupported characters</span> : null}</div>
          <div className="simple-controls">
            <label className="method-selector" htmlFor="design-profile"><span>Method</span>
              <div className="method-select">
                <select id="design-profile" value={designProfile} onChange={(event) => { setDesignProfile(event.target.value as DesignProfile); setSelectedId(null); }}>
                  {DESIGN_PROFILE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
                <i aria-hidden="true" />
              </div>
            </label>
            <label className={desiredCutError ? "has-error" : undefined}><span>Spacer center</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={desiredCutInput} aria-invalid={Boolean(desiredCutError)} aria-describedby={desiredCutError ? "desired-cut-error" : undefined} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setDesiredCutInput(event.target.value); setSelectedId(null); }} />{desiredCutError ? <small id="desired-cut-error" className="field-error" role="alert"><i aria-hidden="true">!</i>{desiredCutError}</small> : null}</label>
            <label><span>Range ±bp</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={maxDistanceInput} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setMaxDistanceInput(event.target.value); setSelectedId(null); }} /></label>
          </div>
          <button className="example-button" type="button" onClick={() => { setRawSequence(EXAMPLE_SEQUENCE); setDesiredCutInput("18"); setMaxDistanceInput(DEFAULT_MAX_DISTANCE_INPUT); setSelectedId(null); }}><span aria-hidden="true">↻</span> Reset to example</button>
        </div>

        <div className="results-panel">
          <div className="panel-heading"><span>02</span><div><small>SELECT</small><h2>Pick a candidate</h2></div><button className="secondary-action" type="button" disabled={!candidates.length} onClick={() => downloadText(zfnCandidatesToCsv(candidates), "zfn-design-candidates.csv", "text/csv;charset=utf-8")}><span aria-hidden="true">↓</span> CSV</button></div>
          <div className="result-count"><strong>{candidates.length}</strong><span>candidates</span></div>
          {candidates.length ? <p className="selection-help">All candidates, nearest to the requested center first; ties prefer 6 &gt; 5 &gt;&gt; 7 bp spacers.<br />Drag across a sequence to select and copy it.</p> : null}
          {candidates.length ? <div className="candidate-list">{candidates.map((candidate, index) => <CandidateRow key={candidate.id} candidate={candidate} rank={index + 1} selected={selected?.id === candidate.id} onSelect={() => setSelectedId(candidate.id)} />)}</div> : <div className="empty-state"><strong>{desiredCutError ? "Spacer center is out of range" : invalidCharacterCount ? "Unsupported characters in the input" : "No candidates"}</strong><p>{desiredCutError ? "Enter a coordinate inside the input sequence." : invalidCharacterCount ? "Remove the unsupported characters. IUPAC ambiguity codes are allowed." : "No site in this sequence can be built from the selected archive. Widen the range, change the sequence, or switch method."}</p></div>}
        </div>
      </section>

      {selected && construct && (
        <section className="protein-output-section">
          <div className="output-card">
            <div className="output-heading"><div className="panel-heading"><span>03</span><div><small>PROTEIN OUTPUT</small><h2>Get the sequence</h2></div></div><div className="output-stats"><span><strong>{construct.protein.length}</strong>aa precursor</span><span><strong>{FMDV_F2A.length}</strong>aa F2A</span></div></div>
            <p className="output-intro">One precursor polyprotein from the single ORF NLS–ZF-L 3F–FokI ELD–F2A–NLS–ZF-R 3F–FokI KKR. The GenPept file records each finger's method, module ID and recognition helix.</p>
            <div className="download-row">
              <button className="primary-action" type="button" onClick={() => downloadText(constructToProteinGenPept(construct), resultFilename(selectedRank, "gp"))}><span aria-hidden="true">↓</span> GenPept (annotated)</button>
              <button className="secondary-action" type="button" onClick={() => downloadText(constructToProteinFasta(construct), resultFilename(selectedRank, "fasta"))}><span aria-hidden="true">↓</span> FASTA</button>
            </div>
            <div className="protein-sequence" aria-label="Precursor polyprotein amino acid sequence"><div><span>AMINO ACID SEQUENCE</span><strong>Precursor polyprotein</strong></div><code>{construct.protein}</code></div>
            <p className="output-note">No nucleotide sequence is produced. Codon-optimise and QC for your actual host and vector at the synthesis stage.</p>
          </div>

          <details className="technical-details">
            <summary>Finger detail and ORF architecture</summary>
            <div className="technical-details-body">
              <ArchitectureDiagram />
              <div className="finger-pair"><FingerGroup title={arrayTitle("Left", selected.leftArray)} fingers={selected.leftArray.fingers} /><FingerGroup title={arrayTitle("Right", selected.rightArray)} fingers={selected.rightArray.fingers} /></div>
              <div className="sequence-details embedded"><div><span>Left array N→C</span><code>{selected.leftArray.protein}</code></div><div><span>Right array N→C</span><code>{selected.rightArray.protein}</code></div></div>
            </div>
          </details>
        </section>
      )}

      <section className="evidence">
        <div className="section-intro"><span>EVIDENCE</span><h2>Where the design comes from</h2><p>Candidate selection, the FokI variants and the F2A linkage each follow a specific primary source.</p></div>
        <div className="reference-grid">
          <article><span>2F + 1F ASSEMBLY</span><h3>Gupta et al. 2012</h3><p>87 two-finger modules covering 162 six-bp targets. The third finger comes from the position-specific 1F archive of Zhu et al. 2011 (DOI 10.1242/dev.066779).</p><a href="https://doi.org/10.1038/nmeth.1994" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1994 <span aria-hidden="true">↗</span></a></article>
          <article><span>CODA FALLBACK</span><h3>Sander et al. 2011</h3><p>Used only for a monomer Gupta cannot complete, and only where the shared F2 context matches.</p><a href="https://doi.org/10.1038/nmeth.1542" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1542 <span aria-hidden="true">↗</span></a></article>
          <article><span>FOKI HETERODIMER</span><h3>Doyon et al. 2011</h3><p>Compared obligate ELD/KKR heterodimers, showing high activity with homodimer cleavage suppressed.</p><a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1539 <span aria-hidden="true">↗</span></a></article>
          <article><span>MAMMALIAN F2A–ZFN</span><h3>Lei et al. 2011</h3><p>Linked both ZFNs through F2A and edited CCR5 in human cells.</p><a href="https://doi.org/10.1038/mt.2011.12" target="_blank" rel="noreferrer">DOI 10.1038/mt.2011.12 <span aria-hidden="true">↗</span></a></article>
        </div>
        <div className="donor-card"><div><span>SEQUENCE SOURCES</span><strong>{ZFN_DONORS.length} component categories</strong></div><ul>{ZFN_DONORS.map((donor) => <li key={donor.component}><span>{donor.component}</span><i>{donor.scientificName}</i><small>{donor.detail}</small></li>)}</ul></div>
        <p className="evidence-note">The 9 of 11 result is a small, selectively evaluated cohort, not a general success rate. Mixed Gupta/CoDA pairs and the complete ELD/KKR + F2A construct emitted here have not been tested under those conditions. Presence in an archive is not a guarantee that a candidate binds, cleaves or edits.</p>
      </section>

      <footer><p>Zinc Zinc Finger · Gupta-first 3-finger design</p><p>Gupta 2012: {GUPTA_MODULE_COUNT} modules / {GUPTA_TARGET_COUNT} sites · CoDA fallback: F1 {CODA_F1_UNIT_COUNT} / F3 {CODA_F3_UNIT_COUNT}</p></footer>
    </main>
  );
}
