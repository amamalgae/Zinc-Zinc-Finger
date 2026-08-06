import { useMemo, useState } from "react";
import {
  candidatesToCsv,
  cleanDNA,
  formatCut,
  generateCandidates,
  reverseComplement,
  type Candidate,
  type Finger,
} from "./design-engine";
import { MODULE_COUNT } from "./module-archive.ts";

const EXAMPLE_LEFT_RECOGNITION = "GACGAAGATGCAGCCGGT";
const EXAMPLE_RIGHT_RECOGNITION = "GGAGGCGGTGACGAACTA";
const EXAMPLE_SEQUENCE = `CAGTCA${reverseComplement(EXAMPLE_LEFT_RECOGNITION)}GATTAC${EXAMPLE_RIGHT_RECOGNITION}TGACGT`;

function downloadCandidates(candidates: Candidate[]) {
  const url = URL.createObjectURL(
    new Blob([candidatesToCsv(candidates)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "zfn-ma-candidates.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function FingerTable({ title, fingers }: { title: string; fingers: Finger[] }) {
  return (
    <section className="finger-panel">
      <div className="finger-heading">
        <h3>{title}</h3>
        <span>N → C</span>
      </div>
      <div className="finger-scroll">
        <table>
          <thead>
            <tr>
              <th>Finger</th>
              <th>標的3-mer</th>
              <th>認識ヘリックス −1…+6</th>
              <th>B</th>
              <th>DeepZF予測</th>
              <th>標的順位</th>
              <th>TSO</th>
              <th>評価</th>
            </tr>
          </thead>
          <tbody>
            {fingers.map((finger) => (
              <tr key={`${title}-${finger.finger}`}>
                <td>F{finger.finger}</td>
                <td className="mono strong">{finger.triplet}</td>
                <td className="mono residue">{finger.helix}</td>
                <td>{finger.bScore}</td>
                <td className="mono">{finger.deepZf.topTriplet}</td>
                <td>#{finger.deepZf.targetRank}</td>
                <td className={finger.tsoCompatible ? "" : "warning"}>
                  {finger.tsoCompatible ? "—" : "要確認"}
                </td>
                <td className={`module-${finger.recommendation}`}>
                  {finger.recommendation === "favorable"
                    ? "推奨"
                    : finger.recommendation === "unfavorable"
                      ? "非推奨"
                      : "未評価"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const [rawSequence, setRawSequence] = useState(EXAMPLE_SEQUENCE);
  const [desiredCut, setDesiredCut] = useState(27);
  const [fingerCount, setFingerCount] = useState(6);
  const [maxDistance, setMaxDistance] = useState(35);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dna = useMemo(() => cleanDNA(rawSequence), [rawSequence]);
  const invalidCount = rawSequence.replace(/[ACGTacgt\s\d>_-]/g, "").length;
  const candidates = useMemo(
    () => generateCandidates(dna, desiredCut, fingerCount, maxDistance),
    [dna, desiredCut, fingerCount, maxDistance],
  );
  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  const footprint = fingerCount * 6 + 6;

  return (
    <main>
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            ZF
          </div>
          <div>
            <p>ZFN MA DESIGNER</p>
            <span>extended modular assembly</span>
          </div>
        </div>
        <div className="privacy-pill"><span />Local calculation</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Experiment-derived modular design</p>
          <h1>標的配列から、<br />ZFN候補を瞬時に組む。</h1>
          <p className="hero-copy">
            実験選抜済みone-finger archiveから構築可能な配列だけを列挙し、
            B-scoreとDeepZFのprotein→PWM予測を組み合わせて順位付けします。
          </p>
        </div>
        <aside className="method-card">
          <p className="method-label">EVIDENCE LAYER</p>
          <div className="evidence-grid">
            <div><strong>{MODULE_COUNT}</strong><small>Barbas modules</small></div>
            <div><strong>6 + 6</strong><small>finger default</small></div>
            <div><strong>≥15</strong><small>combined B-score</small></div>
            <div><strong>DeepZF</strong><small>PWM cross-check</small></div>
          </div>
          <p className="method-note">再計算: B-score 20/21一致 · ranking AUC 0.67</p>
        </aside>
      </section>

      <section className="workspace">
        <div className="input-card">
          <div className="section-heading">
            <div>
              <span className="step">01</span>
              <h2>Target window</h2>
            </div>
            <button className="text-button" type="button" onClick={() => {
              setRawSequence(EXAMPLE_SEQUENCE);
              setDesiredCut(27);
            }}>例を復元</button>
          </div>

          <label className="field-label" htmlFor="sequence">標的周辺配列（上鎖、5′→3′）</label>
          <textarea
            id="sequence"
            value={rawSequence}
            onChange={(event) => setRawSequence(event.target.value)}
            spellCheck={false}
            aria-describedby="sequence-help"
          />
          <div className="sequence-meta" id="sequence-help">
            <span>{dna.length} bp</span>
            <span className={invalidCount ? "warning" : ""}>
              {invalidCount ? `${invalidCount}文字を除外` : "ACGTのみ・FASTA可"}
            </span>
          </div>

          <div className="control-grid">
            <label>
              <span>希望切断位置</span>
              <input
                type="number"
                min={0}
                max={dna.length}
                value={desiredCut}
                onChange={(event) => setDesiredCut(Number(event.target.value))}
              />
              <small>5′端からの塩基間座標</small>
            </label>
            <label>
              <span>片側のfinger数</span>
              <select value={fingerCount} onChange={(event) => setFingerCount(Number(event.target.value))}>
                <option value={3}>3ZF</option>
                <option value={4}>4ZF</option>
                <option value={5}>5ZF</option>
                <option value={6}>6ZF（推奨）</option>
              </select>
              <small>既定はextended MA</small>
            </label>
            <label>
              <span>探索距離</span>
              <select value={maxDistance} onChange={(event) => setMaxDistance(Number(event.target.value))}>
                <option value={20}>±20 bp</option>
                <option value={35}>±35 bp</option>
                <option value={60}>±60 bp</option>
                <option value={100}>±100 bp</option>
              </select>
              <small>切断希望点から</small>
            </label>
          </div>

          <div className="footprint">
            <span>想定フットプリント</span>
            <strong>約 {footprint} bp</strong>
            <small>左右{fingerCount * 3} bp + spacer 5–7 bp</small>
          </div>
        </div>

        <div className="results-card">
          <div className="section-heading">
            <div>
              <span className="step">02</span>
              <h2>Ranked pairs</h2>
            </div>
            <button
              className="export-button"
              type="button"
              disabled={!candidates.length}
              onClick={() => downloadCandidates(candidates)}
            >CSV</button>
          </div>
          <div className="result-summary">
            <strong>{candidates.length}</strong>
            <span>候補を表示</span>
            <small>spacer 5 / 6 / 7 bpを同時評価</small>
          </div>

          {candidates.length ? (
            <div className="candidate-list" role="listbox" aria-label="ZFN candidates">
              {candidates.slice(0, 12).map((candidate, index) => (
                <button
                  type="button"
                  key={candidate.id}
                  className={`candidate-row ${selected?.id === candidate.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(candidate.id)}
                  role="option"
                  aria-selected={selected?.id === candidate.id}
                >
                  <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="pair-sequence mono">
                    <b>{candidate.leftTop}</b>
                    <i>{candidate.spacer}</i>
                    <b>{candidate.rightTop}</b>
                  </span>
                  <span className="candidate-data">
                    <b>B {candidate.combinedBScore}</b>
                    <small>
                      DeepZF {candidate.deepZfTargetFit.toFixed(2)} · TSO {candidate.tsoIssues} · cut {formatCut(candidate.cut)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>候補を生成できません</strong>
              <p>{MODULE_COUNT}-module archiveで組める部位がありません。探索距離を広げてください。</p>
            </div>
          )}
        </div>
      </section>

      {selected && (
        <section className="design-detail">
          <div className="detail-header">
            <div>
              <span className="step">03</span>
              <p>Selected design</p>
              <h2>切断位置 {formatCut(selected.cut)} ・ spacer {selected.spacerLength} bp</h2>
            </div>
            <div className="score-badge">
              <strong>B {selected.combinedBScore}</strong>
              <span>{selected.passesBScoreCutoff ? "published cutoffを通過" : "published cutoff未満"}</span>
            </div>
          </div>

          <div className="duplex-view" aria-label="selected target layout">
            <span className="end-label">5′</span>
            <b>{selected.leftTop}</b>
            <i>{selected.spacer}</i>
            <b>{selected.rightTop}</b>
            <span className="end-label">3′</span>
            <div className="cut-marker"><span>▼</span><small>DSB中心</small></div>
          </div>

          <div className="recognition-strands">
            <div>
              <span>Left ZFA recognition strand 5′→3′</span>
              <code>{selected.leftRecognition}</code>
            </div>
            <div>
              <span>Right ZFA recognition strand 5′→3′</span>
              <code>{selected.rightRecognition}</code>
            </div>
          </div>

          <div className="finger-grid">
            <FingerTable title="Left ZFA" fingers={selected.leftFingers} />
            <FingerTable title="Right ZFA" fingers={selected.rightFingers} />
          </div>

          <div className="protein-output">
            <div>
              <span>Left Sp1C-array protein（N→C）</span>
              <code>{selected.leftArrayProtein}</code>
            </div>
            <div>
              <span>Right Sp1C-array protein（N→C）</span>
              <code>{selected.rightArrayProtein}</code>
            </div>
          </div>

          <div className="score-explanation">
            <div>
              <span>Combined B-score</span>
              <strong>{selected.combinedBScore}</strong>
              <p>{selected.leftFingers.length + selected.rightFingers.length} modulesのpublished値を合算</p>
            </div>
            <div>
              <span>Module evidence</span>
              <strong>{selected.favorableModules} / {selected.unfavorableModules}</strong>
              <p>推奨 / 非推奨 · TSO警告 {selected.tsoIssues}</p>
            </div>
            <div>
              <span>DeepZF target fit</span>
              <strong>{selected.deepZfTargetFit.toFixed(3)}</strong>
              <p>top-1一致 {selected.deepZfExactModules} / {selected.leftFingers.length + selected.rightFingers.length}</p>
            </div>
            <div>
              <span>ZFA–FokI linker</span>
              <strong>{selected.fokILinker}</strong>
              <p>{selected.spacerLength} bp spacer用</p>
            </div>
            <p className="score-caution">
              B-score ≥15の構成はBhakta et al.の268構成中52%がSSA活性ありでしたが、これは本候補の成功確率ではありません。
              TSO不一致は原著どおり警告であり、候補を自動除外しません。DeepZF値も結合確率ではなくPWM整合度です。
              表示配列はSp1C型ZFAまでで、FokI、NLS、発現カセット、
              ゲノムwide off-target評価はまだ含みません。
            </p>
          </div>
        </section>
      )}

      <section className="notes">
        <article>
          <span>CANDIDATE GENERATION</span>
          <h2>単純な1塩基→1残基則を廃止</h2>
          <p>
            {MODULE_COUNT}個の実験選抜済みBarbas moduleだけを使います。認識ヘリックス、Sp1C framework、
            TGEKP interfinger linker、target-site overlap警告を明示して完全なZFA配列を出力します。
          </p>
        </article>
        <article>
          <span>INDEPENDENT FORWARD MODEL</span>
          <h2>DeepZFで認識配列を逆方向から検査</h2>
          <p>
            原著の学習済みPWMpredictorをブラウザ用に軽量移植しました。B-scoreを主順位とし、同点候補だけを
            DeepZFの標的PWM整合度で並べ替えます。49 moduleでは標的tripletがtop-1に16件、top-3に25件でした。
          </p>
        </article>
      </section>

      <footer>
        <p>Research prototype · no sequence is uploaded or retained</p>
        <a href="https://doi.org/10.1101/gr.143693.112" target="_blank" rel="noreferrer">
          Bhakta et al., 2013 · DOI 10.1101/gr.143693.112
        </a>
      </footer>
    </main>
  );
}
