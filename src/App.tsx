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
const LISTED_CANDIDATE_LIMIT = 12;

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
      <div className="arch-block nls"><span>核移行</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>9 bp認識</span><strong>ZF-L · 3F</strong></div>
      <div className="arch-block eld"><span>切断</span><strong>FokI ELD（−）</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block f2a"><span>ribosome skip</span><strong>F2A</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block nls"><span>核移行</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>9 bp認識</span><strong>ZF-R · 3F</strong></div>
      <div className="arch-block kkr"><span>切断</span><strong>FokI KKR（＋）</strong></div>
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
      <p>DNA上ではF3 → F2 → F1の順に対応します。</p>
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
      <span className="candidate-summary"><strong>{methodPairLabel(candidate)}</strong><small>希望位置 ±{formatCut(candidate.distance)} bp · spacer {candidate.spacerLength} bp</small></span>
      <span className="candidate-action" aria-hidden="true">{selected ? "✓ 選択中" : "選択 →"}</span>
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
  const listedCandidates = candidates.slice(0, LISTED_CANDIDATE_LIMIT);
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
          <a className="version-badge" href={APP_VERSION_PR_URL} target="_blank" rel="noreferrer" aria-label={`${APP_VERSION} — GitHub Codeページを開く`}>{APP_VERSION}<span aria-hidden="true">↗</span></a>
          <span className="local-badge" aria-label="設計計算は端末内のブラウザで実行され、入力配列はサーバーへ送信されません"><i />端末内で計算（ローカル処理）</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">GUPTA 2012 · 2F MODULE ZFN DESIGNER</span>
          <h1>ZFNペアを設計</h1>
          <p>標的周辺配列を貼り付けると、Gupta 2012の2F archiveを優先して左右ZFNペアを検索し、アミノ酸配列を出力します。構成できない片側だけCoDAへ戻せます。</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#designer">配列を入力して設計する<span aria-hidden="true">↓</span></a>
            <span className="privacy-note"><i />入力配列は外部へ送信しません</span>
          </div>
          <ul className="hero-benefits" aria-label="ツールの特徴">
            <li>ブラウザ内で処理</li>
            <li>GenPept / Protein FASTA出力</li>
          </ul>
        </div>
        <aside className="study-card">
          <span>GUPTA ORIGINAL STUDY</span>
          <div className="study-value"><strong>9/11</strong></div>
          <h2>11標的中9標的で<br />ゼブラフィッシュ変異導入</h2>
          <h2>2F module archive：87 modules / 162 sites</h2>
          <p>Gupta 2012で選択的に評価された小規模cohortの成績です。本サイトの各候補の成功確率ではありません。</p>
          <a href="https://doi.org/10.1038/nmeth.1994" target="_blank" rel="noreferrer">Gupta et al. 2012 · DOI 10.1038/nmeth.1994 <span aria-hidden="true">↗</span></a>
        </aside>
      </section>

      <ZfnOverviewDiagram />

      <section className="designer" id="designer">
        <div className="input-panel">
          <div className="panel-heading"><span>01</span><div><small>INPUT</small><h2>標的周辺配列を入力</h2></div></div>
          <label htmlFor="target-sequence">上鎖 5′→3′（FASTA可）</label>
          <textarea id="target-sequence" value={rawSequence} onChange={(event) => { setRawSequence(event.target.value); setSelectedId(null); }} spellCheck={false} />
          <div className="input-meta"><span>{dna.length} bp</span><span className={ambiguousBaseCount ? "warning" : ""}>{ambiguousBaseCount ? `曖昧塩基 ${ambiguousBaseCount} bp（候補から除外）` : "曖昧塩基なし"}</span><span className={invalidCharacterCount ? "warning" : ""}>{invalidCharacterCount ? `未対応文字 ${invalidCharacterCount}件` : "入力形式OK"}</span></div>
          <fieldset className="method-selector">
            <legend>設計法</legend>
            <label className={designProfile === "gupta-coda" ? "active" : undefined}><input type="radio" name="design-profile" value="gupta-coda" checked={designProfile === "gupta-coda"} onChange={() => { setDesignProfile("gupta-coda"); setSelectedId(null); }} /><span><strong>Design v2 · Gupta + CoDA fallback</strong><small>デフォルト · Gupta 2012を優先し、片側モノマー単位でfallback</small></span></label>
            <label className={designProfile === "coda-only" ? "active" : undefined}><input type="radio" name="design-profile" value="coda-only" checked={designProfile === "coda-only"} onChange={() => { setDesignProfile("coda-only"); setSelectedId(null); }} /><span><strong>Design v1 · CoDA only</strong><small>従来方式 · Sander 2011</small></span></label>
          </fieldset>
          <div className="simple-controls">
            <label className={desiredCutError ? "has-error" : undefined}><span>希望スペーサー中心</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={desiredCutInput} aria-invalid={Boolean(desiredCutError)} aria-describedby={desiredCutError ? "desired-cut-error" : "desired-cut-help"} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setDesiredCutInput(event.target.value); setSelectedId(null); }} />{desiredCutError ? <small id="desired-cut-error" className="field-error" role="alert"><i aria-hidden="true">!</i>{desiredCutError}</small> : <small id="desired-cut-help">5′端からの塩基間座標</small>}</label>
            <label><span>探索範囲（±bp）</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={maxDistanceInput} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setMaxDistanceInput(event.target.value); setSelectedId(null); }} /><small>希望位置から</small></label>
          </div>
          <button className="example-button" type="button" onClick={() => { setRawSequence(EXAMPLE_SEQUENCE); setDesiredCutInput("18"); setMaxDistanceInput(DEFAULT_MAX_DISTANCE_INPUT); setSelectedId(null); }}><span aria-hidden="true">↻</span> 例の配列に戻す</button>
          <p className="input-note">IUPAC曖昧塩基は座標を保持したまま候補から除外します。</p>
        </div>

        <div className="results-panel">
          <div className="panel-heading"><span>02</span><div><small>SELECT</small><h2>ZFNペア候補を選択</h2></div><button className="secondary-action" type="button" disabled={!candidates.length} onClick={() => downloadText(zfnCandidatesToCsv(candidates), "zfn-design-candidates.csv", "text/csv;charset=utf-8")}><span aria-hidden="true">↓</span> CSVを保存</button></div>
          <div className="result-count"><strong>{candidates.length}</strong><span>設計候補</span><small>{candidates.length > LISTED_CANDIDATE_LIMIT ? `${LISTED_CANDIDATE_LIMIT}件を表示 · ` : ""}希望位置優先 · 同距離6 &gt; 5 &gt;&gt; 7 bp · 同条件ではGupta優先</small></div>
          {candidates.length ? <p className="selection-help">候補を押すと設計内容が切り替わります。塩基配列はドラッグして選択・コピーできます。</p> : null}
          {candidates.length ? <div className="candidate-list">{listedCandidates.map((candidate, index) => <CandidateRow key={candidate.id} candidate={candidate} rank={index + 1} selected={selected?.id === candidate.id} onSelect={() => setSelectedId(candidate.id)} />)}</div> : <div className="empty-state"><strong>{desiredCutError ? "希望スペーサー中心を訂正してください" : invalidCharacterCount ? "未対応文字があります" : "候補がありません"}</strong><p>{desiredCutError ? "入力欄の赤いメッセージに従い、入力配列内の座標を指定してください。" : invalidCharacterCount ? "赤字の未対応文字を修正してから設計してください。IUPAC曖昧塩基は入力できます。" : "選択中のarchiveで左右9 bpを構成できる部位がありません。探索範囲、入力配列、または設計法を変更してください。"}</p></div>}
        </div>
      </section>

      {selected && construct && (
        <section className="protein-output-section">
          <div className="output-card">
            <div className="output-heading"><div className="panel-heading"><span>03</span><div><small>PROTEIN OUTPUT</small><h2>1本のORFで、左右2本のZFNを発現</h2></div></div><span className="protein-only-badge">出力形式：GenPept / Protein FASTA</span></div>
            <p className="output-intro">選択した左右array（{methodPairLabel(selected)}）をFokI ELD/KKRと組み合わせ、F2Aで連結した前駆体polyprotein 1配列を出力します。GenPeptには各fingerの設計法、module ID、認識helixを記録します。</p>
            <div className="output-stats"><span><strong>{construct.protein.length}</strong>aa precursor</span><span><strong>{FMDV_F2A.length}</strong>aa F2A</span></div>
            <div className="download-row">
              <button className="primary-action" type="button" onClick={() => downloadText(constructToProteinGenPept(construct), resultFilename(selectedRank, "gp"))}><span aria-hidden="true">↓</span> Download (GenPept: featureあり)</button>
              <button className="secondary-action" type="button" onClick={() => downloadText(constructToProteinFasta(construct), resultFilename(selectedRank, "fasta"))}><span aria-hidden="true">↓</span> Download (fasta)</button>
            </div>
            <div className="protein-sequence" aria-label="Precursor polyprotein amino acid sequence"><div><span>AMINO ACID SEQUENCE</span><strong>Precursor polyprotein</strong></div><code>{construct.protein}</code></div>
            <p className="output-note">塩基配列は生成しません。DNA合成時に、実際の宿主・オルガネラ・発現ベクターに合わせてコドン最適化と配列QCを行ってください。</p>
          </div>

          <details className="technical-details">
            <summary>finger構成と単一ORFの構成を見る</summary>
            <div className="technical-details-body">
              <ArchitectureDiagram />
              <div className="finger-pair"><FingerGroup title={arrayTitle("Left", selected.leftArray)} fingers={selected.leftArray.fingers} /><FingerGroup title={arrayTitle("Right", selected.rightArray)} fingers={selected.rightArray.fingers} /></div>
              <div className="sequence-details embedded"><div><span>Left array N→C</span><code>{selected.leftArray.protein}</code></div><div><span>Right array N→C</span><code>{selected.rightArray.protein}</code></div></div>
            </div>
          </details>
        </section>
      )}

      <section className="evidence">
        <div className="section-intro"><span>EVIDENCE</span><h2>設計と構成の科学的根拠</h2><p>候補選択、FokI、F2A連結を、それぞれ対応する原著に基づいて構成しています。</p></div>
        <div className="reference-grid">
          <article><span>2F + 1F ASSEMBLY</span><h3>Gupta et al. 2012</h3><p>87個の2F modulesが162個の6 bp標的を認識。3FではZhu et al. 2011（DOI 10.1242/dev.066779）の位置別1F moduleと組み合わせます。</p><a href="https://doi.org/10.1038/nmeth.1994" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1994 <span aria-hidden="true">↗</span></a></article>
          <article><span>CODA FALLBACK</span><h3>Sander et al. 2011</h3><p>Guptaで完成3Fを組めない片側に限り、共有F2文脈が一致するCoDA 3Fへfallbackします。</p><a href="https://doi.org/10.1038/nmeth.1542" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1542 <span aria-hidden="true">↗</span></a></article>
          <article><span>FOKI HETERODIMER</span><h3>Doyon et al. 2011</h3><p>ELD/KKR obligate heterodimerを比較し、高活性とhomodimer抑制を示した研究。</p><a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1539 <span aria-hidden="true">↗</span></a></article>
          <article><span>MAMMALIAN F2A–ZFN</span><h3>Lei et al. 2011</h3><p>F2Aで左右ZFNを連結し、ヒト細胞でCCR5編集を実施した先例。</p><a href="https://doi.org/10.1038/mt.2011.12" target="_blank" rel="noreferrer">DOI 10.1038/mt.2011.12 <span aria-hidden="true">↗</span></a></article>
        </div>
        <div className="donor-card"><div><span>核酸供与体</span><strong>{ZFN_DONORS.length} component categories</strong></div><ul>{ZFN_DONORS.map((donor) => <li key={donor.component}><span>{donor.component}</span><i>{donor.scientificName}</i><small>{donor.detail}</small></li>)}</ul></div>
        <p className="evidence-note">Guptaの9/11は選択的な小規模cohortで、一般的な成功率ではありません。Gupta/CoDA混成ペアと、現在出力するELD/KKR + F2A完全構成は同一条件で検証されていません。archiveに存在することを候補固有の成功保証として扱わないでください。</p>
      </section>

      <footer><p>Zinc Zinc Finger · Gupta-first 3-finger design</p><p>Gupta 2012: {GUPTA_MODULE_COUNT} modules / {GUPTA_TARGET_COUNT} sites · CoDA fallback: F1 {CODA_F1_UNIT_COUNT} / F3 {CODA_F3_UNIT_COUNT}</p></footer>
    </main>
  );
}
