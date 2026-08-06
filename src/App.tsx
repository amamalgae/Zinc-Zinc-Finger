import { useMemo, useState } from "react";
import {
  candidatesToCsv,
  cleanDNA,
  contactCode,
  formatCut,
  generateCandidates,
  type Candidate,
  type Finger,
} from "./design-engine";

const EXAMPLE_SEQUENCE =
  "GCTACCGATGAGTCCGATGCGTACCTGACCGTAGGCTACGTTGACCTAGCGATGGCATCCGTAACGTTAGCCGATGACTACCGGATCGTACGATGCTAGCGTACCTGAGCATCGGATCGTACGCTAGCATGACCTG";

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
              <th>−7</th>
              <th>−4</th>
              <th>−1</th>
            </tr>
          </thead>
          <tbody>
            {fingers.map((finger) => (
              <tr key={`${title}-${finger.finger}`}>
                <td>F{finger.finger}</td>
                <td className="mono strong">{finger.triplet}</td>
                <td className="residue">{finger.minus7}</td>
                <td className="residue">{finger.minus4}</td>
                <td className="residue">{finger.minus1}</td>
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
  const [desiredCut, setDesiredCut] = useState(72);
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
            <span>literature-grounded prototype</span>
          </div>
        </div>
        <div className="privacy-pill"><span />Local calculation</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">C2H2 recognition-code inverse design</p>
          <h1>標的配列から、<br />ZFN候補を瞬時に組む。</h1>
          <p className="hero-copy">
            2024年の構造レビューを起点に、主要接触3残基の初期則を透明なルールとして実装。
            6ZF×2の候補を列挙し、実験に回す3–5組を絞り込みます。
          </p>
        </div>
        <aside className="method-card">
          <p className="method-label">INITIAL MODEL</p>
          <div className="contact-grid">
            {Object.entries(contactCode).map(([base, rule]) => (
              <div key={base}>
                <span className={`base base-${base.toLowerCase()}`}>{base}</span>
                <strong>{rule.primary}</strong>
                <small>{rule.alternatives !== "—" ? `alt. ${rule.alternatives}` : "primary contact"}</small>
              </div>
            ))}
          </div>
          <p className="method-note">G→R/K/H ・ A→Q/N ・ T→E ・ C→D</p>
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
              setDesiredCut(72);
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
                    <b>{candidate.score}</b>
                    <small>cut {formatCut(candidate.cut)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>候補を生成できません</strong>
              <p>配列長を増やすか、探索距離を広げてください。</p>
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
              <strong>{selected.score}</strong>
              <span>ranking score</span>
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

          <div className="score-explanation">
            <div>
              <span>位置</span>
              <strong>50%</strong>
              <p>希望切断点への近さ</p>
            </div>
            <div>
              <span>認識則</span>
              <strong>40%</strong>
              <p>構造知見の相対的確度</p>
            </div>
            <div>
              <span>Spacer</span>
              <strong>10%</strong>
              <p>6 bpを初期優先</p>
            </div>
            <p className="score-caution">
              このスコアは活性確率ではなく、初期候補の順位付けです。full-length ZFA配列には、
              商用利用を確認したmodule/frameworkライブラリの接続が必要です。
            </p>
          </div>
        </section>
      )}

      <section className="notes">
        <article>
          <span>STRUCTURAL LAYER</span>
          <h2>図1hは「辞書」ではなく検証セットとして使う</h2>
          <p>
            掲載されたZF–DNA複合体は、−8/−7/−5/−4/−1残基、反対鎖接触、隣接triplet効果を抽出する入口です。
            自然型ZFをそのままMAモジュールとして扱わず、PDB構造から独自に接触特徴を作ります。
          </p>
        </article>
        <article>
          <span>NEXT MODEL</span>
          <h2>Deep modelは候補生成後に使う</h2>
          <p>
            逆設計はこの高速ルール層で行い、候補だけをprotein→PWMモデルで再評価します。
            これにより総当たりを避け、ブラウザの応答速度を維持します。
          </p>
        </article>
      </section>

      <footer>
        <p>Research prototype · no sequence is uploaded or retained</p>
        <a href="https://doi.org/10.1016/j.sbi.2024.102836" target="_blank" rel="noreferrer">
          Zhang et al., 2024 · DOI 10.1016/j.sbi.2024.102836
        </a>
      </footer>
    </main>
  );
}
