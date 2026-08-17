import { useMemo, useState } from "react";
import { APP_VERSION, APP_VERSION_PR_URL } from "./app-version.ts";
import { FMDV_F2A } from "./construct-output.ts";
import {
  codaCandidatesToCsv,
  formatCut,
  generateCodaCandidates,
  parseDNAInput,
  reverseComplement,
  type CodaCandidate,
} from "./coda-design-engine.ts";
import {
  buildCodaBicistronicZfn,
  CODA_ZFN_DONORS,
  codaConstructToProteinFasta,
} from "./coda-construct-output.ts";
import {
  CODA_F1_UNIT_COUNT,
  CODA_F2_CONTEXT_COUNT,
  CODA_F3_UNIT_COUNT,
  CODA_UNIT_COUNT,
  type CodaFinger,
} from "./coda-module-archive.ts";

const EXAMPLE_LEFT_RECOGNITION = "GTGGGGGAG";
const EXAMPLE_RIGHT_RECOGNITION = "GTGGGGGAG";
const EXAMPLE_SEQUENCE = `CAGTCA${reverseComplement(EXAMPLE_LEFT_RECOGNITION)}GATTAC${EXAMPLE_RIGHT_RECOGNITION}TGACGT`;

function downloadText(contents: string, filename: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ArchitectureDiagram({ expressionCassette = false }: { expressionCassette?: boolean }) {
  return (
    <div className="architecture" aria-label="single ORF ZFN construct">
      {expressionCassette && <><div className="arch-block regulatory optional"><span>別途選択</span><strong>Promoter</strong></div><i aria-hidden="true">→</i></>}
      <div className="arch-block nls"><span>核移行</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>9 bp認識</span><strong>ZF-L · 3F</strong></div>
      <div className="arch-block eld"><span>切断</span><strong>FokI ELD</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block f2a"><span>ribosome skip</span><strong>F2A</strong></div>
      <i aria-hidden="true">→</i>
      <div className="arch-block nls"><span>核移行</span><strong>NLS</strong></div>
      <div className="arch-block zf"><span>9 bp認識</span><strong>ZF-R · 3F</strong></div>
      <div className="arch-block kkr"><span>切断</span><strong>FokI KKR</strong></div>
      {expressionCassette && <><i aria-hidden="true">→</i><div className="arch-block regulatory optional"><span>別途選択</span><strong>Terminator</strong></div></>}
    </div>
  );
}

function FingerCard({ finger }: { finger: CodaFinger }) {
  return (
    <article className="finger-card">
      <div><span>F{finger.position}</span><small>N → C</small></div>
      <strong>{finger.triplet}</strong>
      <code>{finger.helix}</code>
      <small>{finger.source}</small>
    </article>
  );
}

function FingerGroup({ title, fingers }: { title: string; fingers: readonly CodaFinger[] }) {
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

function CandidateRow({ candidate, rank, selected, onSelect }: {
  candidate: CodaCandidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`candidate ${selected ? "selected" : ""}`} type="button" onClick={onSelect}>
      <span className="candidate-rank">{String(rank).padStart(2, "0")}</span>
      <span className="candidate-sequence"><b>{candidate.leftTop}</b><i>{candidate.spacer}</i><b>{candidate.rightTop}</b></span>
      <span className="candidate-summary"><strong>F2 {candidate.leftArray.f2Context} / {candidate.rightArray.f2Context}</strong><small>spacer中心 {formatCut(candidate.cut)} · {candidate.spacerLength} bp</small></span>
    </button>
  );
}

export default function Home() {
  const [rawSequence, setRawSequence] = useState(EXAMPLE_SEQUENCE);
  const [desiredCut, setDesiredCut] = useState(18);
  const [maxDistance, setMaxDistance] = useState(500);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const parsedInput = useMemo(() => parseDNAInput(rawSequence), [rawSequence]);
  const { dna, ambiguousBaseCount, invalidCharacterCount } = parsedInput;
  const candidates = useMemo(
    () => invalidCharacterCount ? [] : generateCodaCandidates(dna, desiredCut, maxDistance),
    [dna, desiredCut, maxDistance, invalidCharacterCount],
  );
  const selected = candidates.find(({ id }) => id === selectedId) ?? candidates[0] ?? null;
  const construct = useMemo(() => selected ? buildCodaBicistronicZfn(selected) : null, [selected]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Zinc Zinc Finger home">
          <span className="brand-mark">ZF</span>
          <span><strong>Zinc Zinc Finger</strong><small>3-finger ZFN designer</small></span>
        </a>
        <div className="header-status">
          <a className="version-badge" href={APP_VERSION_PR_URL} target="_blank" rel="noreferrer" aria-label={`${APP_VERSION} — 対応するGitHub PRを開く`}>{APP_VERSION}</a>
          <span className="local-badge"><i />端末内で計算</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">SANDER 2011 · CoDA</span>
          <h1>3つのfingerで、<br />9塩基を認識する。</h1>
          <p>実験選択済みのF1/F2とF2/F3文脈を共通F2で接続し、標的ごとの追加selectionなしで左右3-fingerのZFN候補を探します。</p>
          <div className="hero-stats">
            <span><strong>{CODA_F2_CONTEXT_COUNT}</strong>固定F2 context</span>
            <span><strong>{CODA_UNIT_COUNT}</strong>F1 / F3 units</span>
            <span><strong>3 + 3</strong>左右のfinger</span>
          </div>
        </div>
        <aside className="scope-card">
          <span>今回の設計範囲</span>
          <strong>片側3ZF × 左右2本</strong>
          <div className="target-mini"><b>9 bp</b><i>5–7 bp spacer</i><b>9 bp</b></div>
          <p>F1 {CODA_F1_UNIT_COUNT}件・F3 {CODA_F3_UNIT_COUNT}件の公開archiveで両側を構成できる場所だけを提示し、欠損配列は推測で補いません。</p>
        </aside>
      </section>

      <section className="construct-overview">
        <div className="section-intro"><span>CONSTRUCT OVERVIEW</span><h2>1本のORFから、左右2本のZFNを作る</h2><p>F2Aで翻訳を分け、ELDとKKRが標的上でそろったときにFokI切断ドメインを形成します。サイトは色付き部分のアミノ酸配列だけを出力し、promoter、terminator、コドンは発現系に合わせて別途選びます。</p></div>
        <ArchitectureDiagram expressionCassette />
        <div className="processed-products">
          <span><i className="eld-dot" /><strong>翻訳産物1</strong>NLS–ZF-L–FokI ELD–F2A残基</span>
          <span><i className="kkr-dot" /><strong>翻訳産物2</strong>Pro–NLS–ZF-R–FokI KKR</span>
        </div>
      </section>

      <section className="designer">
        <div className="input-panel">
          <div className="panel-heading"><span>01</span><div><small>INPUT</small><h2>標的周辺配列</h2></div></div>
          <label htmlFor="target-sequence">上鎖 5′→3′（FASTA可）</label>
          <textarea id="target-sequence" value={rawSequence} onChange={(event) => { setRawSequence(event.target.value); setSelectedId(null); }} spellCheck={false} />
          <div className="input-meta"><span>{dna.length} bp</span><span className={ambiguousBaseCount ? "warning" : ""}>{ambiguousBaseCount ? `曖昧塩基 ${ambiguousBaseCount} bp（候補から除外）` : "曖昧塩基なし"}</span><span className={invalidCharacterCount ? "warning" : ""}>{invalidCharacterCount ? `未対応文字 ${invalidCharacterCount}件` : "入力形式OK"}</span></div>
          <div className="simple-controls">
            <label><span>希望スペーサー中心</span><input type="number" min={0} max={dna.length} value={desiredCut} onChange={(event) => { setDesiredCut(Number(event.target.value)); setSelectedId(null); }} /><small>5′端からの塩基間座標</small></label>
            <label><span>探索範囲（±bp）</span><input type="number" min={0} max={100000} step={50} value={maxDistance} onChange={(event) => { setMaxDistance(Math.max(0, Number(event.target.value))); setSelectedId(null); }} /><small>希望位置から。初期値500 bp</small></label>
          </div>
          <button className="example-button" type="button" onClick={() => { setRawSequence(EXAMPLE_SEQUENCE); setDesiredCut(18); setMaxDistance(500); setSelectedId(null); }}>例を復元</button>
          <p className="input-note">候補順位は希望スペーサー中心への近さ、次に6 bp spacerへの近さです。IUPAC曖昧塩基はNとして座標を保持し、その塩基をまたぐ候補を除外します。archive内の候補間に、未測定の活性差は付けていません。</p>
        </div>

        <div className="results-panel">
          <div className="panel-heading"><span>02</span><div><small>RESULTS</small><h2>組めるCoDA ZFNペア</h2></div><button type="button" disabled={!candidates.length} onClick={() => downloadText(codaCandidatesToCsv(candidates), "coda-3finger-zfn-candidates.csv", "text/csv;charset=utf-8")}>CSV</button></div>
          <div className="result-count"><strong>{candidates.length}</strong><span>上位候補</span><small>{candidates.length > 12 ? "このうち12件を表示 · " : ""}spacer 5 / 6 / 7 bpを探索（最大30件）</small></div>
          {candidates.length ? <div className="candidate-list">{candidates.slice(0, 12).map((candidate, index) => <CandidateRow key={candidate.id} candidate={candidate} rank={index + 1} selected={selected?.id === candidate.id} onSelect={() => setSelectedId(candidate.id)} />)}</div> : <div className="empty-state"><strong>{invalidCharacterCount ? "未対応文字があります" : "候補がありません"}</strong><p>{invalidCharacterCount ? "赤字の未対応文字を修正してから設計してください。IUPAC曖昧塩基は入力できます。" : "CoDA archiveで左右9 bpを構成できる部位がありません。探索範囲または入力配列を変更してください。"}</p></div>}
        </div>
      </section>

      {selected && construct && (
        <section className="selected-design">
          <div className="selected-heading"><div><span>03 · SELECTED DESIGN</span><h2>spacer中心 {formatCut(selected.cut)} · {selected.spacerLength} bp</h2></div><div className="gnn-badge"><strong>2/2</strong><small>CoDA arrays</small></div></div>
          <div className="target-layout"><span>5′</span><b>{selected.leftTop}</b><i>{selected.spacer}</i><b>{selected.rightTop}</b><span>3′</span><small>ZF-L half-site</small><small>切断領域</small><small>ZF-R half-site</small></div>
          <div className="strand-row"><span><small>Left recognition strand 5′→3′</small><code>{selected.leftRecognition}</code></span><span><small>Right recognition strand 5′→3′</small><code>{selected.rightRecognition}</code></span></div>
          <div className="finger-pair"><FingerGroup title={`Left ZF · CoDA F2=${selected.leftArray.f2Context}`} fingers={selected.leftArray.fingers} /><FingerGroup title={`Right ZF · CoDA F2=${selected.rightArray.f2Context}`} fingers={selected.rightArray.fingers} /></div>
          <details className="sequence-details"><summary>ZF array全アミノ酸配列を見る</summary><div><span>Left array N→C</span><code>{selected.leftArray.protein}</code></div><div><span>Right array N→C</span><code>{selected.rightArray.protein}</code></div></details>

          <div className="output-card">
            <div className="output-heading"><div><span>04 · AMINO-ACID OUTPUT</span><h2>ELD–F2A–KKR precursor polyprotein</h2></div><span className="protein-only-badge">PROTEIN ONLY</span></div>
            <ArchitectureDiagram />
            <div className="output-stats"><span><strong>{construct.protein.length}</strong>aa precursor</span><span><strong>{construct.processedLeftProtein.length}</strong>aa left product</span><span><strong>{construct.processedRightProtein.length}</strong>aa right product</span><span><strong>{FMDV_F2A.length}</strong>aa F2A</span></div>
            <div className="download-row">
              <button type="button" onClick={() => downloadText(codaConstructToProteinFasta(construct), `${construct.name}-protein.fasta`)}>Protein FASTA（3配列）</button>
            </div>
            <details className="sequence-details compact"><summary>前駆体とF2A処理後の予測産物を見る</summary><div><span>Precursor polyprotein</span><code>{construct.protein}</code></div><div><span>Processed left</span><code>{construct.processedLeftProtein}</code></div><div><span>Processed right</span><code>{construct.processedRightProtein}</code></div></details>
            <p className="output-note">塩基配列は生成しません。DNA合成時に、実際の宿主・オルガネラ・発現ベクターに合わせてコドン最適化と配列QCを行ってください。</p>
          </div>

          <div className="donor-card"><div><span>核酸供与体</span><strong>{CODA_ZFN_DONORS.length}区分</strong></div><ul>{CODA_ZFN_DONORS.map((donor) => <li key={donor.component}><span>{donor.component}</span><i>{donor.scientificName}</i><small>{donor.detail}</small></li>)}</ul></div>
        </section>
      )}

      <section className="evidence">
        <div className="section-intro"><span>EVIDENCE</span><h2>各部品の根拠</h2><p>設計法・FokI・2Aを別々の原著に対応させています。</p></div>
        <div className="reference-grid">
          <article><span>3-FINGER CoDA</span><h3>Sander et al. 2011</h3><p>319 F1 units、18 fixed F2、344 F3 unitsを文脈依存で接続。標的別selectionを不要にした設計法。</p><a href="https://doi.org/10.1038/nmeth.1542" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1542</a></article>
          <article><span>FOKI HETERODIMER</span><h3>Doyon et al. 2011</h3><p>ELD/KKR obligate heterodimerを比較し、高活性とhomodimer抑制を示した研究。</p><a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1539</a></article>
          <article><span>MAMMALIAN F2A–ZFN</span><h3>Lei et al. 2011</h3><p>F2Aで左右ZFNを連結し、ヒト細胞でCCR5編集を実施した先例。</p><a href="https://doi.org/10.1038/mt.2011.12" target="_blank" rel="noreferrer">DOI 10.1038/mt.2011.12</a></article>
        </div>
        <p className="evidence-note">CoDAは設計時の標的別selectionを省けますが、実装後の発現、標的結合、切断効率、毒性、off-targetの検証は省けません。archiveに存在することを個別候補の成功保証として扱わないでください。</p>
      </section>

      <footer><p>Zinc Zinc Finger · 3-finger context-dependent design</p><p>現在: Sander 2011 CoDA · F1 {CODA_F1_UNIT_COUNT} / F3 {CODA_F3_UNIT_COUNT}</p></footer>
    </main>
  );
}
