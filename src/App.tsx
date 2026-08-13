import { useMemo, useState } from "react";
import { DUENAS_F2A, type CodonPreset } from "./construct-output.ts";
import {
  cleanDNA,
  formatCut,
  generateZhuCandidates,
  reverseComplement,
  zhuCandidatesToCsv,
  type ZhuCandidate,
  type ZhuFinger,
} from "./zhu-design-engine.ts";
import {
  buildZhuBicistronicZfn,
  ZHU_ZFN_DONORS,
  zhuConstructToFasta,
  zhuConstructToGenBank,
} from "./zhu-construct-output.ts";
import { ZHU_MODULE_COUNT, ZHU_TRIPLET_COUNT } from "./zhu-module-archive.ts";

const EXAMPLE_LEFT_RECOGNITION = "GGAGATGGC";
const EXAMPLE_RIGHT_RECOGNITION = "GTGGATGAG";
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

function FingerCard({ finger }: { finger: ZhuFinger }) {
  return (
    <article className="finger-card">
      <div><span>F{finger.position}</span><small>N → C</small></div>
      <strong>{finger.triplet}</strong>
      <code>{finger.helix}</code>
      <small>{finger.source}</small>
    </article>
  );
}

function FingerGroup({ title, fingers }: { title: string; fingers: readonly ZhuFinger[] }) {
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
  candidate: ZhuCandidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`candidate ${selected ? "selected" : ""}`} type="button" onClick={onSelect}>
      <span className="candidate-rank">{String(rank).padStart(2, "0")}</span>
      <span className="candidate-sequence"><b>{candidate.leftTop}</b><i>{candidate.spacer}</i><b>{candidate.rightTop}</b></span>
      <span className="candidate-summary"><strong>GNN {candidate.gnnModules}/6</strong><small>cut {formatCut(candidate.cut)} · spacer {candidate.spacerLength} bp</small></span>
    </button>
  );
}

export default function Home() {
  const [rawSequence, setRawSequence] = useState(EXAMPLE_SEQUENCE);
  const [desiredCut, setDesiredCut] = useState(18);
  const [maxDistance, setMaxDistance] = useState(40);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [codonPreset, setCodonPreset] = useState<CodonPreset>("auxenochlorella");

  const dna = useMemo(() => cleanDNA(rawSequence), [rawSequence]);
  const invalidCount = rawSequence.replace(/[ACGTacgt\s\d>_-]/g, "").length;
  const candidates = useMemo(() => generateZhuCandidates(dna, desiredCut, maxDistance), [dna, desiredCut, maxDistance]);
  const selected = candidates.find(({ id }) => id === selectedId) ?? candidates[0] ?? null;
  const construct = useMemo(() => selected ? buildZhuBicistronicZfn(selected, codonPreset) : null, [selected, codonPreset]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Zinc Zinc Finger home">
          <span className="brand-mark">ZF</span>
          <span><strong>Zinc Zinc Finger</strong><small>3-finger ZFN designer</small></span>
        </a>
        <span className="local-badge"><i />端末内で計算</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">ZHU 2011 MODULAR ASSEMBLY</span>
          <h1>3つのfingerで、<br />9塩基を認識する。</h1>
          <p>Zhuらが公開した位置別モジュールだけを使い、左右3-fingerのZFN候補を探します。現在は文献で直接検証された範囲に限定し、6-finger設計は扱いません。</p>
          <div className="hero-stats">
            <span><strong>{ZHU_TRIPLET_COUNT}</strong>認識可能な3-mer</span>
            <span><strong>{ZHU_MODULE_COUNT}</strong>位置別module</span>
            <span><strong>3 + 3</strong>左右のfinger</span>
          </div>
        </div>
        <aside className="scope-card">
          <span>今回の設計範囲</span>
          <strong>片側3ZF × 左右2本</strong>
          <div className="target-mini"><b>9 bp</b><i>5–7 bp spacer</i><b>9 bp</b></div>
          <p>27種類の3-merで組める場所だけを提示します。候補がない場合、配列を推測で補いません。</p>
        </aside>
      </section>

      <section className="construct-overview">
        <div className="section-intro"><span>CONSTRUCT OVERVIEW</span><h2>1本のORFから、左右2本のZFNを作る</h2><p>F2Aで翻訳を分け、ELDとKKRが標的上でそろったときにFokI切断ドメインを形成します。出力は色付き部分のORFで、promoterとterminatorは発現系に合わせて別途選びます。</p></div>
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
          <div className="input-meta"><span>{dna.length} bp</span><span className={invalidCount ? "warning" : ""}>{invalidCount ? `${invalidCount}文字を除外` : "ACGTのみ"}</span></div>
          <div className="simple-controls">
            <label><span>希望切断位置</span><input type="number" min={0} max={dna.length} value={desiredCut} onChange={(event) => { setDesiredCut(Number(event.target.value)); setSelectedId(null); }} /><small>5′端からの塩基間座標</small></label>
            <label><span>探索範囲</span><select value={maxDistance} onChange={(event) => { setMaxDistance(Number(event.target.value)); setSelectedId(null); }}><option value={20}>±20 bp</option><option value={40}>±40 bp</option><option value={80}>±80 bp</option></select><small>希望位置から</small></label>
          </div>
          <button className="example-button" type="button" onClick={() => { setRawSequence(EXAMPLE_SEQUENCE); setDesiredCut(18); setMaxDistance(40); setSelectedId(null); }}>例を復元</button>
          <p className="input-note">候補順位はGNN module数、Zhu論文で安定だったmodule数、希望切断位置への近さの順です。成功確率ではありません。</p>
        </div>

        <div className="results-panel">
          <div className="panel-heading"><span>02</span><div><small>RESULTS</small><h2>組めるZFNペア</h2></div><button type="button" disabled={!candidates.length} onClick={() => downloadText(zhuCandidatesToCsv(candidates), "zhu-3finger-zfn-candidates.csv", "text/csv;charset=utf-8")}>CSV</button></div>
          <div className="result-count"><strong>{candidates.length}</strong><span>候補</span><small>spacer 5 / 6 / 7 bpを探索</small></div>
          {candidates.length ? <div className="candidate-list">{candidates.slice(0, 12).map((candidate, index) => <CandidateRow key={candidate.id} candidate={candidate} rank={index + 1} selected={selected?.id === candidate.id} onSelect={() => setSelectedId(candidate.id)} />)}</div> : <div className="empty-state"><strong>候補がありません</strong><p>27種類のmoduleで左右9 bpを構成できる部位がありません。探索範囲または入力配列を変更してください。</p></div>}
        </div>
      </section>

      {selected && construct && (
        <section className="selected-design">
          <div className="selected-heading"><div><span>03 · SELECTED DESIGN</span><h2>cut {formatCut(selected.cut)} · spacer {selected.spacerLength} bp</h2></div><div className="gnn-badge"><strong>{selected.gnnModules}/6</strong><small>GNN modules</small></div></div>
          <div className="target-layout"><span>5′</span><b>{selected.leftTop}</b><i>{selected.spacer}</i><b>{selected.rightTop}</b><span>3′</span><small>ZF-L half-site</small><small>切断領域</small><small>ZF-R half-site</small></div>
          <div className="strand-row"><span><small>Left recognition strand 5′→3′</small><code>{selected.leftRecognition}</code></span><span><small>Right recognition strand 5′→3′</small><code>{selected.rightRecognition}</code></span></div>
          <div className="finger-pair"><FingerGroup title="Left ZF · Zif268" fingers={selected.leftFingers} /><FingerGroup title="Right ZF · Zif268" fingers={selected.rightFingers} /></div>
          <details className="sequence-details"><summary>ZF array全アミノ酸配列を見る</summary><div><span>Left array N→C</span><code>{selected.leftArrayProtein}</code></div><div><span>Right array N→C</span><code>{selected.rightArrayProtein}</code></div></details>

          <div className="output-card">
            <div className="output-heading"><div><span>04 · SEQUENCE OUTPUT</span><h2>ELD–F2A–KKR single ORF</h2></div><label><span>Codon preset</span><select value={codonPreset} onChange={(event) => setCodonPreset(event.target.value as CodonPreset)}><option value="auxenochlorella">Auxenochlorella protothecoides</option><option value="human">Homo sapiens</option></select></label></div>
            <ArchitectureDiagram />
            <div className="output-stats"><span><strong>{construct.protein.length}</strong>aa polyprotein</span><span><strong>{construct.cds.length}</strong>bp CDS</span><span><strong>{construct.gcPercent.toFixed(1)}%</strong>GC</span><span><strong>{DUENAS_F2A.length}</strong>aa F2A</span></div>
            <div className="download-row">
              <button type="button" onClick={() => downloadText(zhuConstructToFasta(construct, "protein"), `${construct.name}-protein.fasta`)}>Protein FASTA</button>
              <button type="button" onClick={() => downloadText(zhuConstructToFasta(construct, "cds"), `${construct.name}-cds.fasta`)}>CDS FASTA</button>
              <button type="button" onClick={() => downloadText(zhuConstructToGenBank(construct, codonPreset), `${construct.name}.gb`, "text/plain;charset=utf-8")}>GenBank</button>
            </div>
            <details className="sequence-details compact"><summary>翻訳産物とCDSを確認する</summary><div><span>Processed left</span><code>{construct.processedLeftProtein}</code></div><div><span>Processed right</span><code>{construct.processedRightProtein}</code></div><div><span>Full CDS</span><code>{construct.cds}</code></div></details>
          </div>

          <div className="donor-card"><div><span>核酸供与体</span><strong>{ZHU_ZFN_DONORS.length}区分</strong></div><ul>{ZHU_ZFN_DONORS.map((donor) => <li key={donor.component}><span>{donor.component}</span><i>{donor.scientificName}</i><small>{donor.detail}</small></li>)}</ul></div>
        </section>
      )}

      <section className="evidence">
        <div className="section-intro"><span>EVIDENCE</span><h2>各部品の根拠</h2><p>設計法・FokI・2Aを別々の原著に対応させています。</p></div>
        <div className="reference-grid">
          <article><span>3-FINGER MODULE</span><h3>Zhu et al. 2011</h3><p>27種類×3位置のZif268 module。29 ZFNペア中8組で1%以上のlesionを確認。</p><a href="https://doi.org/10.1242/dev.066779" target="_blank" rel="noreferrer">DOI 10.1242/dev.066779</a></article>
          <article><span>FOKI HETERODIMER</span><h3>Doyon et al. 2011</h3><p>ELD/KKR obligate heterodimerを比較し、高活性とhomodimer抑制を示した研究。</p><a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">DOI 10.1038/nmeth.1539</a></article>
          <article><span>AUXENOCHLORELLA F2A</span><h3>Dueñas et al. 2025</h3><p>EK–GFP–F2A–LUCで上下流双方の発現を確認。本出力は同論文のF2A配列を使用。</p><a href="https://doi.org/10.1073/pnas.2417695122" target="_blank" rel="noreferrer">DOI 10.1073/pnas.2417695122</a></article>
          <article><span>MAMMALIAN F2A–ZFN</span><h3>Lei et al. 2011</h3><p>F2Aで左右ZFNを連結し、ヒト細胞でCCR5編集を実施した先例。</p><a href="https://doi.org/10.1038/mt.2011.12" target="_blank" rel="noreferrer">DOI 10.1038/mt.2011.12</a></article>
        </div>
        <p className="evidence-note">このツールは候補を絞るための設計支援です。約28%というZhu論文の結果はゼブラフィッシュでの集団成績であり、個別候補の成功確率ではありません。発現、標的結合、切断、off-targetは実験で確認してください。</p>
      </section>

      <footer><p>Zinc Zinc Finger · 3-finger modular design</p><p>現在: Zhu 2011 MA · 将来候補: 検証可能な6-finger設計</p></footer>
    </main>
  );
}
