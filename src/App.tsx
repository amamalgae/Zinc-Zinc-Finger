import { useEffect, useMemo, useState } from "react";
import { APP_VERSION, APP_VERSION_PR_URL } from "./app-version.ts";
import { BHAKTA_MODULE_COUNT } from "./bhakta-module-archive.ts";
import { FMDV_F2A } from "./construct-output.ts";
import {
  BHAKTA_B_SCORE_CUTOFF,
  bhaktaAlternativesForCandidate,
  formatCut,
  generateZfnCandidatesAcrossSequence,
  parseDNAInput,
  zfnCandidatesToCsv,
  type BhaktaAlternative,
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
import type {
  ExactGenomeCandidateSummary,
  ExactGenomeMatchResult,
} from "./genome-exact-match.ts";
import {
  genomeAwareRankingAvailable,
  rankZfnCandidatesWithGenome,
} from "./genome-ranking.ts";
import type { ZfnArray, ZfnFinger } from "./zfn-array.ts";
import ZfnOverviewDiagram from "./ZfnOverviewDiagram.tsx";
import {
  COPY,
  detectLanguage,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  type Copy,
  type Language,
} from "./i18n.ts";

const EXAMPLE_LEFT_TOP = "TGCAGGGCCTATTGCACC";
const EXAMPLE_SPACER = "AGGCCA";
const EXAMPLE_RIGHT_TOP = "GATGAGAGAACCAAGGGG";
const EXAMPLE_SEQUENCE = `CAGTCA${EXAMPLE_LEFT_TOP}${EXAMPLE_SPACER}${EXAMPLE_RIGHT_TOP}TGACGT`;

type GenomeMatchResultWithFiles = ExactGenomeMatchResult & {
  fastaFileNames?: string[];
};

type GenomeCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ready"; result: GenomeMatchResultWithFiles }
  | { status: "error"; code: string };

function downloadText(contents: string, filename: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function genomeErrorText(copy: Copy, code: string): string {
  if (code === "NO_FASTA_IN_ZIP") return copy.genomeErrorNoFasta;
  if (code === "NO_SEQUENCE") return copy.genomeErrorNoSequence;
  return copy.genomeErrorRead;
}

function mergeGenomeFiles(current: readonly File[], incoming: readonly File[]): File[] {
  const merged = new Map<string, File>();
  for (const file of [...current, ...incoming]) {
    merged.set(`${file.name}\u0000${file.size}\u0000${file.lastModified}`, file);
  }
  return [...merged.values()];
}

function ArchitectureDiagram({ copy, leftCount, rightCount }: { copy: Copy; leftCount: number; rightCount: number }) {
  return (
    <div className="architecture" aria-label="single ORF ZFN construct">
      <div className="arch-block nls"><span>{copy.archNls}</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>{copy.archZf}</span><strong>ZF-L · {leftCount}F</strong></div>
      <div className="arch-block eld"><span>{copy.archCleave}</span><strong>FokI ELD (−)</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block f2a"><span>{copy.archSkip}</span><strong>F2A</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block nls"><span>{copy.archNls}</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>{copy.archZf}</span><strong>ZF-R · {rightCount}F</strong></div>
      <div className="arch-block kkr"><span>{copy.archCleave}</span><strong>FokI KKR (+)</strong></div>
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

function FingerGroup({ title, fingers, copy }: { title: string; fingers: readonly ZfnFinger[]; copy: Copy }) {
  return (
    <section className="finger-group">
      <div className="finger-title"><h3>{title}</h3><span>{copy.fingerDirection}</span></div>
      <div className="finger-cards">
        {fingers.map((finger) => <FingerCard key={`${title}-${finger.position}`} finger={finger} />)}
      </div>
      <p>{copy.fingerOrder}</p>
    </section>
  );
}

function BhaktaAlternativesPanel({ alternatives, copy }: { alternatives: readonly BhaktaAlternative[]; copy: Copy }) {
  return (
    <section className="bhakta-alternatives">
      <div className="finger-title"><h3>{copy.bhaktaAlternativesTitle}</h3><span>{copy.bhaktaThreshold}</span></div>
      <p>{copy.bhaktaAlternativesNote}</p>
      <div className="sequence-details embedded">
        {alternatives.map((alternative) => (
          <div key={`${alternative.leftFingerCount}-${alternative.rightFingerCount}`}>
            <span>L{alternative.leftFingerCount} + R{alternative.rightFingerCount}</span>
            <code>B{alternative.combinedBScore} · {alternative.passesBScoreCutoff ? "B≥15" : "B<15"} · TSO {alternative.tsoIssues}</code>
          </div>
        ))}
      </div>
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
  { value: "bhakta-2013", label: "v3 · Bhakta 2013" },
  { value: "gupta-coda", label: "v2 · Gupta + CoDA fallback" },
  { value: "coda-only", label: "v1 · CoDA only" },
];

function methodPairLabel(candidate: ZfnCandidate): string {
  return `${candidate.leftArray.methodLabel} / ${candidate.rightArray.methodLabel}`;
}

/** Row labels drop the year: each method has exactly one, and the technical
 *  disclosure below the output still carries the full provenance. */
function compactMethodPairLabel(candidate: ZfnCandidate): string {
  return methodPairLabel(candidate).replace(/ \d{4}/g, "");
}

function arrayTitle(arm: "Left" | "Right", array: ZfnArray): string {
  return `${arm} ZF · ${array.methodLabel} · ${array.assembly}`;
}

function genomeSummaryPresentation(copy: Copy, summary: ExactGenomeCandidateSummary): {
  label: string;
  className: string;
  counts: string | null;
} {
  if (summary.exactPairMatches === 0) {
    return { label: copy.genomeTargetMissing, className: "target-missing", counts: null };
  }
  const counts = copy.genomeMismatchCounts(summary.alternativeCountsByMismatch.slice(1, 6));
  if (summary.extraExactMatches > 0) {
    return { label: copy.genomeExactDuplicate(summary.extraExactMatches), className: "exact-duplicate", counts };
  }
  const closest = summary.closestAlternative;
  if (!closest) return { label: copy.genomeNoClose, className: "clear", counts };
  const label = copy.genomeClosest(
    closest.leftMismatches,
    closest.rightMismatches,
    closest.totalMismatches,
    closest.spacerLength,
  );
  const className = closest.totalMismatches <= 2
    ? "near-high"
    : closest.totalMismatches <= 4
      ? "near-mid"
      : "near-weak";
  return { label, className, counts };
}

function CandidateRow({ candidate, rank, selected, onSelect, copy, genomeSummary }: {
  candidate: ZfnCandidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  copy: Copy;
  genomeSummary?: ExactGenomeCandidateSummary;
}) {
  const isBhakta = candidate.profile === "bhakta-2013";
  const functionalScore = candidate.combinedBScore === undefined ? "" : `B${candidate.combinedBScore} · `;
  const genome = genomeSummary ? genomeSummaryPresentation(copy, genomeSummary) : null;
  return (
    <div className={`candidate ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-pressed={selected} onClick={(event) => { if (!hasTextSelectionWithin(event.currentTarget)) onSelect(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}>
      <span className="candidate-rank">{String(rank).padStart(2, "0")}</span>
      <span className={`candidate-sequence ${isBhakta ? "extended" : ""}`}><b className="left">{candidate.leftTop}</b><i>{candidate.spacer}</i><b className="right">{candidate.rightTop}</b></span>
      <span className="candidate-summary">{isBhakta ? null : <strong>{compactMethodPairLabel(candidate)}</strong>}<small>{functionalScore}+{formatCut(candidate.cut)} · {candidate.spacerLength} bp</small>{genome ? <><em className={`genome-match ${genome.className}`}>{genome.label}</em>{genome.counts ? <small className="genome-match-counts">{genome.counts}</small> : null}</> : null}</span>
      <span className="candidate-action" aria-hidden="true">{selected ? `✓ ${copy.selected}` : `${copy.select} →`}</span>
    </div>
  );
}

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

function LanguageSwitch({ language, onChange, copy }: { language: Language; onChange: (next: Language) => void; copy: Copy }) {
  return (
    <div className="language-switch" role="group" aria-label={copy.languageAria}>
      {(["en", "ja"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          onClick={() => onChange(option)}
        >{COPY[option].languageName}</button>
      ))}
    </div>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>(() => readStoredLanguage() ?? detectLanguage(navigator.languages ?? [navigator.language]));
  const [rawSequence, setRawSequence] = useState(EXAMPLE_SEQUENCE);
  const [designProfile, setDesignProfile] = useState<DesignProfile>("bhakta-2013");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [genomeFiles, setGenomeFiles] = useState<File[]>([]);
  const [genomeInputKey, setGenomeInputKey] = useState(0);
  const [genomeDragging, setGenomeDragging] = useState(false);
  const [genomeCheck, setGenomeCheck] = useState<GenomeCheckState>({ status: "idle" });

  const parsedInput = useMemo(() => parseDNAInput(rawSequence), [rawSequence]);
  const { dna, ambiguousBaseCount, invalidCharacterCount } = parsedInput;
  const baselineCandidates = useMemo(
    () => invalidCharacterCount ? [] : generateZfnCandidatesAcrossSequence(dna, designProfile),
    [dna, invalidCharacterCount, designProfile],
  );
  const genomeSummaries = useMemo(
    () => genomeCheck.status === "ready"
      ? new Map(genomeCheck.result.summaries.map((summary) => [summary.candidateId, summary]))
      : new Map<string, ExactGenomeCandidateSummary>(),
    [genomeCheck],
  );
  const genomeRankingActive = genomeCheck.status === "ready"
    && genomeAwareRankingAvailable(baselineCandidates, genomeSummaries);
  const candidates = useMemo(
    () => genomeCheck.status === "ready"
      ? rankZfnCandidatesWithGenome(baselineCandidates, genomeSummaries)
      : baselineCandidates,
    [baselineCandidates, genomeCheck.status, genomeSummaries],
  );
  const selected = candidates.find(({ id }) => id === selectedId) ?? candidates[0] ?? null;
  const selectedRank = selected ? candidates.findIndex(({ id }) => id === selected.id) + 1 : 0;
  const construct = useMemo(() => selected ? buildBicistronicZfn(selected) : null, [selected]);
  const bhaktaAlternatives = useMemo(() => selected ? bhaktaAlternativesForCandidate(selected) : [], [selected]);
  const copy = COPY[language];
  const baseRankingNote = designProfile === "bhakta-2013" ? copy.bhaktaRankingNote : copy.rankingNote;
  const rankingNote = genomeCheck.status === "ready"
    ? `${baseRankingNote} ${genomeRankingActive ? copy.genomeRankingActive : copy.genomeRankingInactive}`
    : baseRankingNote;
  const outputIntro = selected?.profile === "bhakta-2013" ? copy.bhaktaOutputIntro : copy.outputIntro;
  const visibleGenomeFileNames = genomeCheck.status === "ready" && genomeCheck.result.fastaFileNames?.length
    ? genomeCheck.result.fastaFileNames
    : genomeFiles.map(({ name }) => name);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!genomeFiles.length || !baselineCandidates.length) return;

    let worker: Worker | null = null;
    const timer = window.setTimeout(() => {
      worker = new Worker(new URL("./genome-exact-match.worker.ts", import.meta.url), { type: "module" });
      setGenomeCheck({ status: "checking" });
      worker.onmessage = (event: MessageEvent<{ type: "result"; result: GenomeMatchResultWithFiles } | { type: "error"; code: string }>) => {
        if (event.data.type === "result") setGenomeCheck({ status: "ready", result: event.data.result });
        else setGenomeCheck({ status: "error", code: event.data.code });
      };
      worker.postMessage({
        type: "start",
        files: genomeFiles,
        candidates: baselineCandidates.map(({ id, leftTop, rightTop, spacerLength }) => ({ id, leftTop, rightTop, spacerLength })),
      });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [genomeFiles, baselineCandidates]);

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // A blocked storage API only costs the preference, not the switch.
    }
  };

  const resetGenomeCheck = () => setGenomeCheck({ status: "idle" });

  const addGenomeFiles = (incoming: FileList | readonly File[]) => {
    const files = Array.from(incoming);
    if (!files.length) return;
    setGenomeFiles((current) => mergeGenomeFiles(current, files));
    resetGenomeCheck();
  };

  const clearGenome = () => {
    setGenomeFiles([]);
    resetGenomeCheck();
    setGenomeInputKey((value) => value + 1);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Zinc Zinc Finger home">
          <span className="brand-mark">ZF</span>
          <span><strong>Zinc Zinc Finger</strong><small>{copy.tagline}</small></span>
        </a>
        <div className="header-status">
          <LanguageSwitch language={language} onChange={chooseLanguage} copy={copy} />
          <a className="version-badge" href={APP_VERSION_PR_URL} target="_blank" rel="noreferrer" aria-label={`${APP_VERSION} — ${copy.versionAria}`}>{APP_VERSION}<span aria-hidden="true">↗</span></a>
          <span className="local-badge" aria-label={copy.localBadgeAria}><i />{copy.localBadge}</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">BHAKTA 2013 · EXTENDED MA ZFN DESIGNER</span>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroBody}</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#designer">{copy.heroCta}<span aria-hidden="true">↓</span></a>
            <span className="privacy-note"><i />{copy.heroPrivacy}</span>
          </div>
          <ul className="hero-benefits" aria-label={copy.heroBenefitsAria}>
            <li>{copy.heroBenefitBrowser}</li>
            <li>{copy.heroBenefitFormats}</li>
          </ul>
        </div>
        <aside className="study-card">
          <span>BHAKTA ORIGINAL STUDY</span>
          <div className="study-value"><strong>15/21</strong></div>
          <h2>Bhakta et al. 2013</h2>
          <p>{copy.evidenceBhakta}</p>
          <a href="https://doi.org/10.1101/gr.143693.112" target="_blank" rel="noreferrer">Bhakta et al. 2013 · DOI 10.1101/gr.143693.112 <span aria-hidden="true">↗</span></a>
        </aside>
      </section>

      <ZfnOverviewDiagram copy={copy} />

      <section className="designer" id="designer">
        <div className="input-panel">
          <div className="panel-heading"><span>01</span><h2>INPUT</h2></div>
          <label htmlFor="target-sequence">{copy.targetLabel}<small>{copy.targetHint}</small></label>
          <textarea id="target-sequence" value={rawSequence} onChange={(event) => { setRawSequence(event.target.value); setSelectedId(null); resetGenomeCheck(); }} spellCheck={false} />
          <div className="input-meta"><span>{dna.length} bp</span>{ambiguousBaseCount ? <span className="warning">{ambiguousBaseCount} {copy.ambiguous}</span> : null}{invalidCharacterCount ? <span className="warning">{invalidCharacterCount} {copy.unsupported}</span> : null}</div>
          <div className="simple-controls">
            <label className="method-selector" htmlFor="design-profile"><span>{copy.methodLabel}</span>
              <div className="method-select">
                <select id="design-profile" value={designProfile} onChange={(event) => { setDesignProfile(event.target.value as DesignProfile); setSelectedId(null); resetGenomeCheck(); }}>
                  {DESIGN_PROFILE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
                <i aria-hidden="true" />
              </div>
            </label>
          </div>
          <label htmlFor="genome-file">{copy.genomeLabel}<small>{copy.genomeHint}</small></label>
          <div
            className={`genome-drop-zone ${genomeDragging ? "dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setGenomeDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setGenomeDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setGenomeDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setGenomeDragging(false); addGenomeFiles(event.dataTransfer.files); }}
          >
            <div className="genome-file-control">
              <input key={genomeInputKey} id="genome-file" type="file" multiple accept=".fa,.fasta,.fna,.fas,.fa.gz,.fasta.gz,.fna.gz,.fas.gz,.zip,application/zip" onChange={(event) => addGenomeFiles(event.target.files ?? [])} />
              {genomeFiles.length ? <button type="button" onClick={clearGenome}>{copy.genomeClear}</button> : null}
            </div>
            <span className="genome-drop-hint">{copy.genomeHint}</span>
          </div>
          {genomeFiles.length ? <div className={`genome-file-status ${genomeCheck.status === "error" ? "error" : ""}`}><ul className="genome-file-list">{visibleGenomeFileNames.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul><span>{genomeCheck.status === "checking" ? copy.genomeChecking : genomeCheck.status === "ready" ? copy.genomeReady(genomeCheck.result.fastaFiles, genomeCheck.result.sequenceCount, genomeCheck.result.genomeBases) : genomeCheck.status === "error" ? genomeErrorText(copy, genomeCheck.code) : ""}</span></div> : null}
          <button className="example-button" type="button" onClick={() => { setRawSequence(EXAMPLE_SEQUENCE); setSelectedId(null); resetGenomeCheck(); }}><span aria-hidden="true">↻</span> {copy.resetExample}</button>
        </div>

        <div className="results-panel">
          <div className="panel-heading"><span>02</span><h2>SELECT</h2><button className="secondary-action" type="button" disabled={!candidates.length} onClick={() => downloadText(zfnCandidatesToCsv(candidates), "zfn-design-candidates.csv", "text/csv;charset=utf-8")}><span aria-hidden="true">↓</span> CSV</button></div>
          <div className="result-count"><strong>{candidates.length}</strong><span>{copy.candidates}</span></div>
          {candidates.length ? <p className="selection-help">{rankingNote}<br />{copy.copyHint}</p> : null}
          {genomeCheck.status === "ready" ? <p className="genome-scope-note">{copy.genomeScope}</p> : null}
          {candidates.length ? <div className="candidate-list">{candidates.map((candidate, index) => <CandidateRow key={candidate.id} candidate={candidate} rank={index + 1} selected={selected?.id === candidate.id} onSelect={() => setSelectedId(candidate.id)} copy={copy} genomeSummary={genomeSummaries.get(candidate.id)} />)}</div> : <div className="empty-state"><strong>{invalidCharacterCount ? copy.emptyCharsTitle : copy.emptyNoneTitle}</strong><p>{invalidCharacterCount ? copy.emptyCharsBody : copy.emptyNoneBody}</p></div>}
        </div>
      </section>

      {selected && construct && (
        <section className="protein-output-section">
          <div className="output-card">
            <div className="output-heading"><div className="panel-heading"><span>03</span><h2>PROTEIN OUTPUT</h2></div><div className="output-stats"><span><strong>{construct.protein.length}</strong>{copy.precursorStat}</span><span><strong>{FMDV_F2A.length}</strong>{copy.f2aStat}</span></div></div>
            <p className="output-intro">{outputIntro}</p>
            <div className="download-row">
              <button className="primary-action" type="button" onClick={() => downloadText(constructToProteinGenPept(construct), resultFilename(selectedRank, "gp"))}><span aria-hidden="true">↓</span> {copy.downloadGenPept}</button>
              <button className="secondary-action" type="button" onClick={() => downloadText(constructToProteinFasta(construct), resultFilename(selectedRank, "fasta"))}><span aria-hidden="true">↓</span> {copy.downloadFasta}</button>
            </div>
            <div className="protein-sequence" aria-label="Precursor polyprotein amino acid sequence"><div><span>{copy.sequenceLabel}</span><strong>{copy.sequenceName}</strong></div><code>{construct.protein}</code></div>
            <p className="output-note">{copy.outputNote}</p>
          </div>

          <details className="technical-details">
            <summary>{copy.technicalSummary}</summary>
            <div className="technical-details-body">
              <ArchitectureDiagram copy={copy} leftCount={selected.leftArray.fingers.length} rightCount={selected.rightArray.fingers.length} />
              <div className="finger-pair"><FingerGroup title={arrayTitle("Left", selected.leftArray)} fingers={selected.leftArray.fingers} copy={copy} /><FingerGroup title={arrayTitle("Right", selected.rightArray)} fingers={selected.rightArray.fingers} copy={copy} /></div>
              <div className="sequence-details embedded"><div><span>Left array N→C</span><code>{selected.leftArray.protein}</code></div><div><span>Right array N→C</span><code>{selected.rightArray.protein}</code></div></div>
              {selected.profile === "bhakta-2013" ? <BhaktaAlternativesPanel alternatives={bhaktaAlternatives} copy={copy} /> : null}
            </div>
          </details>
        </section>
      )}

      <section className="evidence">
        <div className="section-intro"><span>EVIDENCE</span><h2>{copy.evidenceTitle}</h2><p>{copy.evidenceBody}</p></div>
        <div className="reference-grid">
          <article><span>EXTENDED MODULAR ASSEMBLY</span><h3>Bhakta et al. 2013</h3><p>{copy.evidenceBhakta}</p><a href="https://doi.org/10.1101/gr.143693.112" target="_blank" rel="noreferrer">DOI 10.1101/gr.143693.112 <span aria-hidden="true">↗</span></a></article>
          <article><span>2F + 1F ASSEMBLY</span><h3>Gupta et al. 2012</h3><p>{copy.evidenceGupta}</p><a href="https://doi.org/10.1038/nmeth.1994" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1994 <span aria-hidden="true">↗</span></a></article>
          <article><span>CODA FALLBACK</span><h3>Sander et al. 2011</h3><p>{copy.evidenceSander}</p><a href="https://doi.org/10.1038/nmeth.1542" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1542 <span aria-hidden="true">↗</span></a></article>
          <article><span>FOKI HETERODIMER</span><h3>Doyon et al. 2011</h3><p>{copy.evidenceDoyon}</p><a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1539 <span aria-hidden="true">↗</span></a></article>
          <article><span>MAMMALIAN F2A–ZFN</span><h3>Lei et al. 2011</h3><p>{copy.evidenceLei}</p><a href="https://doi.org/10.1038/mt.2011.12" target="_blank" rel="noreferrer">DOI 10.1038/mt.2011.12 <span aria-hidden="true">↗</span></a></article>
        </div>
        <div className="donor-card"><div><span>{copy.sequenceSources}</span><strong>{ZFN_DONORS.length} {copy.componentCategories}</strong></div><ul>{ZFN_DONORS.map((donor) => <li key={donor.component}><span>{donor.component}</span><i>{donor.scientificName}</i><small>{copy[donor.detailKey]}</small></li>)}</ul></div>
        <p className="evidence-note">{copy.evidenceNote}</p>
      </section>

      <footer><p>Zinc Zinc Finger · Bhakta extended-MA / Gupta / CoDA design</p><p>Bhakta 2013: {BHAKTA_MODULE_COUNT} modules · cutoff B≥{BHAKTA_B_SCORE_CUTOFF} · Gupta 2012: {GUPTA_MODULE_COUNT} modules / {GUPTA_TARGET_COUNT} sites · CoDA: F1 {CODA_F1_UNIT_COUNT} / F3 {CODA_F3_UNIT_COUNT}</p></footer>
    </main>
  );
}
