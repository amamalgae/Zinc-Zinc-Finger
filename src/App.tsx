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
  CODA_F3_UNIT_COUNT,
  type CodaFinger,
} from "./coda-module-archive.ts";
import { buildZfnBindingMap, type ZfnFingerTarget } from "./zfn-binding-map.ts";

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
    <button className={`candidate ${selected ? "selected" : ""}`} type="button" aria-pressed={selected} onClick={onSelect}>
      <span className="candidate-rank">{String(rank).padStart(2, "0")}</span>
      <span className="candidate-sequence"><b>{candidate.leftTop}</b><i>{candidate.spacer}</i><b>{candidate.rightTop}</b></span>
      <span className="candidate-summary"><strong>F2 {candidate.leftArray.f2Context} / {candidate.rightArray.f2Context}</strong><small>spacer中心 {formatCut(candidate.cut)} · {candidate.spacerLength} bp</small></span>
      <span className="candidate-action" aria-hidden="true">{selected ? "✓ 選択中" : "選択 →"}</span>
    </button>
  );
}

function ProteinFinger({ target }: { target: ZfnFingerTarget }) {
  return (
    <span className={`protein-finger ${target.monomer}`}>
      <strong>ZF{target.globalFinger}</strong>
      <small>{target.recognitionTriplet}</small>
    </span>
  );
}

function ZfnBindingDiagram({ candidate }: { candidate: CodaCandidate }) {
  const map = buildZfnBindingMap(candidate);

  return (
    <figure className="binding-figure">
      <figcaption>
        <span>HOW THE SELECTED PAIR BINDS</span>
        <h3>左右それぞれ3本のfingerが、計18 bpを認識</h3>
        <p>候補を選ぶと、ZF1〜ZF6と実際の3塩基配列の対応がここに表示されます。</p>
      </figcaption>

      <div className="monomer-map" aria-label="左右の3ZFとFokI切断ドメインの向き">
        <div className="protein-lane left">
          <span className="terminus">N</span>
          {map.leftProteinOrder.map((finger) => <ProteinFinger key={finger.globalFinger} target={finger} />)}
          <span className="nuclease-domain negative"><small>ヌクレアーゼ</small><strong>FokI · ELD（−）</strong></span>
          <span className="terminus">C</span>
        </div>

        <div className="heterodimer-callout">
          <strong>ELD（−） <b>×</b> KKR（＋）</strong>
          <span>ヘテロ二量体を形成</span>
          <small>逆の電荷をもつ2種類のFokI切断ドメインがspacer上で対になってDNAを切断</small>
        </div>

        <div className="protein-lane right">
          <span className="terminus">C</span>
          <span className="nuclease-domain positive"><small>ヌクレアーゼ</small><strong>FokI · KKR（＋）</strong></span>
          {[...map.rightProteinOrder].reverse().map((finger) => <ProteinFinger key={finger.globalFinger} target={finger} />)}
          <span className="terminus">N</span>
        </div>
        <div className="protein-direction left-direction">protein N → C</div>
        <div className="protein-direction right-direction">protein C ← N</div>
      </div>

      <div className="dna-scroll" tabIndex={0} aria-label="選択配列とZF1からZF6の対応。横にスクロールできます。">
        <div className="dna-map">
          <div className="dna-row dna-labels" aria-hidden="true">
            <span className="strand-name">finger</span><span />
            {map.topStrandOrder.slice(0, 3).map((finger) => <strong className="left" key={finger.globalFinger}>ZF{finger.globalFinger}</strong>)}
            <strong className="spacer-label">spacer</strong>
            {map.topStrandOrder.slice(3).map((finger) => <strong className="right" key={finger.globalFinger}>ZF{finger.globalFinger}</strong>)}
            <span />
          </div>
          <div className="dna-row forward-strand">
            <strong className="strand-name">F</strong><span className="dna-end">5′</span>
            {map.topStrandOrder.slice(0, 3).map((finger) => <code className="left" key={finger.globalFinger}>{finger.topTriplet}</code>)}
            <code className="spacer-sequence">{map.spacerTop}</code>
            {map.topStrandOrder.slice(3).map((finger) => <code className="right" key={finger.globalFinger}>{finger.topTriplet}</code>)}
            <span className="dna-end">3′</span>
          </div>
          <div className="cut-track" aria-hidden="true"><span>FokI切断領域</span></div>
          <div className="dna-row reverse-strand">
            <strong className="strand-name">R</strong><span className="dna-end">3′</span>
            {map.topStrandOrder.slice(0, 3).map((finger) => <code className="left" key={finger.globalFinger}>{finger.bottomTriplet}</code>)}
            <code className="spacer-sequence">{map.spacerBottom}</code>
            {map.topStrandOrder.slice(3).map((finger) => <code className="right" key={finger.globalFinger}>{finger.bottomTriplet}</code>)}
            <span className="dna-end">5′</span>
          </div>
        </div>
      </div>

      <div className="binding-explainer">
        <div><strong>1 finger ≈ 3 bp</strong><p>左3ZFはZF1〜3、右3ZFはZF4〜6です。2本で計6 finger、18 bpを認識します。</p></div>
        <div><strong>右側がZF6 → ZF4に見える理由</strong><p>fingerはDNAと逆平行に結合します。右arrayのprotein順はN→CでZF4→5→6ですが、Fを左から読むとZF6→5→4です。</p></div>
        <div><strong>FokIはDNAを切るヌクレアーゼ</strong><p>ELD（−）とKKR（＋）は界面の電荷が異なるFokI変異型です。異種同士で組む「obligate heterodimer」として、spacerを挟んで切断します。</p></div>
      </div>
      <p className="binding-note">各protein block内の3塩基は、そのfingerが読むrecognition tripletです。ZF1〜ZF6は図の通し番号で、CoDA archive内部では左右ともF1〜F3として扱います。</p>
      <a className="binding-source" href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">FokI ELD/KKR: Doyon et al. 2011 · DOI 10.1038/nmeth.1539 <span aria-hidden="true">↗</span></a>
    </figure>
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
          <a className="version-badge" href={APP_VERSION_PR_URL} target="_blank" rel="noreferrer" aria-label={`${APP_VERSION} — 対応するGitHub PRを開く`}>{APP_VERSION}<span aria-hidden="true">↗</span></a>
          <span className="local-badge"><i />端末内で計算</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">SANDER 2011 · CoDA-based ZFN Designer</span>
          <h1>標的DNAから、<br />ZFNペア候補を設計。</h1>
          <p>標的周辺配列を貼り付けると、CoDAで構成可能な左右ZFNペアを検索し、実験に使う完全アミノ酸配列まで出力します。</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#designer">配列を入力して設計する<span aria-hidden="true">↓</span></a>
            <span className="privacy-note"><i />入力配列は外部へ送信しません</span>
          </div>
          <ul className="hero-benefits" aria-label="ツールの特徴">
            <li>ブラウザ内で処理</li>
            <li>構成可能なペアだけを提示</li>
            <li>Protein FASTA出力</li>
          </ul>
        </div>
        <aside className="study-card">
          <span>CODA ORIGINAL STUDY</span>
          <div className="study-value"><strong>50</strong><small>%</small></div>
          <h2>38標的中19標的で<br />変異導入を検出</h2>
          <p>Sander 2011の実験条件で得られた集団成績です。本サイトが提示する各候補の成功確率ではありません。</p>
          <a href="https://doi.org/10.1038/nmeth.1542" target="_blank" rel="noreferrer">Sander et al. 2011 · DOI 10.1038/nmeth.1542 <span aria-hidden="true">↗</span></a>
        </aside>
      </section>

      <section className="designer" id="designer">
        <div className="input-panel">
          <div className="panel-heading"><span>01</span><div><small>INPUT</small><h2>標的周辺配列を入力</h2></div></div>
          <label htmlFor="target-sequence">上鎖 5′→3′（FASTA可）</label>
          <textarea id="target-sequence" value={rawSequence} onChange={(event) => { setRawSequence(event.target.value); setSelectedId(null); }} spellCheck={false} />
          <div className="input-meta"><span>{dna.length} bp</span><span className={ambiguousBaseCount ? "warning" : ""}>{ambiguousBaseCount ? `曖昧塩基 ${ambiguousBaseCount} bp（候補から除外）` : "曖昧塩基なし"}</span><span className={invalidCharacterCount ? "warning" : ""}>{invalidCharacterCount ? `未対応文字 ${invalidCharacterCount}件` : "入力形式OK"}</span></div>
          <div className="simple-controls">
            <label><span>希望スペーサー中心</span><input type="number" min={0} max={dna.length} value={desiredCut} onChange={(event) => { setDesiredCut(Number(event.target.value)); setSelectedId(null); }} /><small>5′端からの塩基間座標</small></label>
            <label><span>探索範囲（±bp）</span><input type="number" min={0} max={100000} step={50} value={maxDistance} onChange={(event) => { setMaxDistance(Math.max(0, Number(event.target.value))); setSelectedId(null); }} /><small>希望位置から。初期値500 bp</small></label>
          </div>
          <button className="example-button" type="button" onClick={() => { setRawSequence(EXAMPLE_SEQUENCE); setDesiredCut(18); setMaxDistance(500); setSelectedId(null); }}><span aria-hidden="true">↻</span> 例の配列に戻す</button>
          <p className="input-note">候補は希望スペーサー中心への近さで並び、活性予測順ではありません。IUPAC曖昧塩基は座標を保持したまま候補から除外します。</p>
        </div>

        <div className="results-panel">
          <div className="panel-heading"><span>02</span><div><small>RESULTS</small><h2>ZFNペア候補を選択</h2></div><button className="secondary-action" type="button" disabled={!candidates.length} onClick={() => downloadText(codaCandidatesToCsv(candidates), "coda-3finger-zfn-candidates.csv", "text/csv;charset=utf-8")}><span aria-hidden="true">↓</span> CSVを保存</button></div>
          <div className="result-count"><strong>{candidates.length}</strong><span>設計候補</span><small>{candidates.length > 12 ? "12件を表示 · " : ""}希望位置に近い順</small></div>
          {candidates.length ? <p className="selection-help">候補を押すと、下の設計内容とProtein FASTAが切り替わります。</p> : null}
          {candidates.length ? <div className="candidate-list">{candidates.slice(0, 12).map((candidate, index) => <CandidateRow key={candidate.id} candidate={candidate} rank={index + 1} selected={selected?.id === candidate.id} onSelect={() => setSelectedId(candidate.id)} />)}</div> : <div className="empty-state"><strong>{invalidCharacterCount ? "未対応文字があります" : "候補がありません"}</strong><p>{invalidCharacterCount ? "赤字の未対応文字を修正してから設計してください。IUPAC曖昧塩基は入力できます。" : "CoDA archiveで左右9 bpを構成できる部位がありません。探索範囲または入力配列を変更してください。"}</p></div>}
        </div>
      </section>

      {selected && construct && (
        <section className="selected-design">
          <div className="selected-heading"><div><span>03 · SELECTED ZFN PAIR</span><h2>選択したZFNペア · spacer中心 {formatCut(selected.cut)}</h2></div><div className="gnn-badge"><strong>{selected.spacerLength} bp</strong><small>spacer</small></div></div>
          <ZfnBindingDiagram candidate={selected} />

          <div className="output-card">
            <div className="output-heading"><div><span>04 · PROTEIN OUTPUT</span><h2>1本のORFで、左右2本のZFNを発現</h2></div><span className="protein-only-badge">出力形式：Protein FASTA</span></div>
            <p className="output-intro">選択した左右CoDA arrayをFokI ELD/KKRと組み合わせ、F2Aで連結した完全アミノ酸配列を出力します。</p>
            <ArchitectureDiagram />
            <div className="output-stats"><span><strong>{construct.protein.length}</strong>aa precursor</span><span><strong>{construct.processedLeftProtein.length}</strong>aa left product</span><span><strong>{construct.processedRightProtein.length}</strong>aa right product</span><span><strong>{FMDV_F2A.length}</strong>aa F2A</span></div>
            <div className="download-row">
              <button className="primary-action" type="button" onClick={() => downloadText(codaConstructToProteinFasta(construct), `${construct.name}-protein.fasta`)}><span aria-hidden="true">↓</span> Protein FASTAを保存（3配列）</button>
            </div>
            <details className="sequence-details compact"><summary>前駆体とF2A処理後の予測産物を見る</summary><div><span>Precursor polyprotein</span><code>{construct.protein}</code></div><div><span>Processed left</span><code>{construct.processedLeftProtein}</code></div><div><span>Processed right</span><code>{construct.processedRightProtein}</code></div></details>
            <p className="output-note">塩基配列は生成しません。DNA合成時に、実際の宿主・オルガネラ・発現ベクターに合わせてコドン最適化と配列QCを行ってください。</p>
          </div>

          <details className="technical-details">
            <summary>finger構成と設計詳細を見る</summary>
            <div className="technical-details-body">
              <div className="finger-pair"><FingerGroup title={`Left ZF · CoDA F2=${selected.leftArray.f2Context}`} fingers={selected.leftArray.fingers} /><FingerGroup title={`Right ZF · CoDA F2=${selected.rightArray.f2Context}`} fingers={selected.rightArray.fingers} /></div>
              <div className="sequence-details embedded"><div><span>Left array N→C</span><code>{selected.leftArray.protein}</code></div><div><span>Right array N→C</span><code>{selected.rightArray.protein}</code></div></div>
            </div>
          </details>

          <div className="donor-card"><div><span>核酸供与体</span><strong>{CODA_ZFN_DONORS.length} component categories</strong></div><ul>{CODA_ZFN_DONORS.map((donor) => <li key={donor.component}><span>{donor.component}</span><i>{donor.scientificName}</i><small>{donor.detail}</small></li>)}</ul></div>
        </section>
      )}

      <section className="evidence">
        <div className="section-intro"><span>EVIDENCE</span><h2>設計と構成の科学的根拠</h2><p>候補選択、FokI、F2A連結を、それぞれ対応する原著に基づいて構成しています。</p></div>
        <div className="reference-grid">
          <article><span>3-FINGER CoDA</span><h3>Sander et al. 2011</h3><p>319 F1 units、18 fixed F2、344 F3 unitsを文脈依存で接続。標的別selectionを不要にした設計法。</p><a href="https://doi.org/10.1038/nmeth.1542" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1542 <span aria-hidden="true">↗</span></a></article>
          <article><span>FOKI HETERODIMER</span><h3>Doyon et al. 2011</h3><p>ELD/KKR obligate heterodimerを比較し、高活性とhomodimer抑制を示した研究。</p><a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1539 <span aria-hidden="true">↗</span></a></article>
          <article><span>MAMMALIAN F2A–ZFN</span><h3>Lei et al. 2011</h3><p>F2Aで左右ZFNを連結し、ヒト細胞でCCR5編集を実施した先例。</p><a href="https://doi.org/10.1038/mt.2011.12" target="_blank" rel="noreferrer">DOI 10.1038/mt.2011.12 <span aria-hidden="true">↗</span></a></article>
        </div>
        <p className="evidence-note">CoDAは設計時の標的別selectionを省けますが、実装後の発現、標的結合、切断効率、毒性、off-targetの検証は省けません。archiveに存在することを個別候補の成功保証として扱わないでください。</p>
      </section>

      <footer><p>Zinc Zinc Finger · 3-finger context-dependent design</p><p>現在: Sander 2011 CoDA · F1 {CODA_F1_UNIT_COUNT} / F3 {CODA_F3_UNIT_COUNT}</p></footer>
    </main>
  );
}
