import { useEffect, useMemo, useRef, useState } from "react";
import {
  candidatesToCsv,
  cleanDNA,
  compareCandidates,
  formatCut,
  generateCandidates,
  reverseComplement,
  type Candidate,
  type Finger,
} from "./design-engine";
import { MODULE_COUNT } from "./module-archive.ts";
import {
  addPersikovScores,
  parsePersikovLinearModel,
  type PersikovModel,
} from "./persikov-svm.ts";
import type {
  CandidateSpecificitySummary,
  GenomeSearchResult,
  OffTargetCandidateInput,
} from "./off-target-engine.ts";
import { selectDiversePortfolio } from "./portfolio.ts";
import {
  buildZfnPair,
  constructsToFasta,
  constructsToGenBank,
  type CodonPreset,
} from "./construct-output.ts";
import {
  generateContextCandidates,
  parseFauserContextWorkbook,
  type FauserContextMap,
} from "./fauser-context.ts";
import {
  cleavageAssayToCsv,
  designCleavageAssay,
} from "./assay-design.ts";

const EXAMPLE_LEFT_RECOGNITION = "GACGAAGATGCAGCCGGT";
const EXAMPLE_RIGHT_RECOGNITION = "GGAGGCGGTGACGAACTA";
const EXAMPLE_SEQUENCE = `CAGTCA${reverseComplement(EXAMPLE_LEFT_RECOGNITION)}GATTAC${EXAMPLE_RIGHT_RECOGNITION}TGACGT`;

function downloadText(contents: string, filename: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

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

function downloadOffTargets(
  candidates: Candidate[],
  summaries: CandidateSpecificitySummary[],
) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const header = [
    "specificity_rank",
    "candidate_id",
    "combined_b_score",
    "intended_site_found",
    "perfect_off_target_pairs",
    "max_off_target_prognos_score",
    "off_target_pairs_score_ge_50",
    "homodimer_pairs",
    "hit_rank",
    "contig",
    "position_1based",
    "pair_type",
    "spacer_bp",
    "left_mismatches",
    "right_mismatches",
    "prognos_score",
    "left_site_recognition_5to3",
    "right_site_recognition_5to3",
  ];
  const rows: (string | number | boolean)[][] = [];
  summaries.forEach((summary, summaryIndex) => {
    const candidate = candidateById.get(summary.candidateId);
    const hits = summary.topHits.length ? summary.topHits : [null];
    hits.forEach((hit, hitIndex) => {
      rows.push([
        summaryIndex + 1,
        summary.candidateId,
        candidate?.combinedBScore ?? "",
        summary.intendedSiteFound,
        summary.perfectOffTargetHits,
        summary.maxOffTargetScore.toFixed(3),
        summary.highScoreHits,
        summary.homodimerHits,
        hit ? hitIndex + 1 : "",
        hit?.contig ?? "",
        hit ? hit.position + 1 : "",
        hit?.pairType ?? "",
        hit?.spacerLength ?? "",
        hit?.leftMismatches ?? "",
        hit?.rightMismatches ?? "",
        hit?.score.toFixed(3) ?? "",
        hit?.leftSite ?? "",
        hit?.rightSite ?? "",
      ]);
    });
  });
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "zfn-genome-off-targets.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatBases(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)} Mbp`
    : `${value.toLocaleString()} bp`;
}

function FingerTable({
  title,
  fingers,
  skipAfterFinger,
}: {
  title: string;
  fingers: Finger[];
  skipAfterFinger: number | null;
}) {
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
              <th>TSO</th>
              <th>評価</th>
              <th>次linker</th>
            </tr>
          </thead>
          <tbody>
            {fingers.map((finger) => (
              <tr key={`${title}-${finger.finger}`}>
                <td>F{finger.finger}</td>
                <td className="mono strong">{finger.triplet}</td>
                <td className="mono residue">{finger.helix}</td>
                <td>{finger.bScore}</td>
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
                <td className={skipAfterFinger === finger.finger ? "base-skip" : "mono"}>
                  {finger.finger === fingers.length
                    ? "—"
                    : skipAfterFinger === finger.finger
                      ? "1c"
                      : "TGEKP"}
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
  const [leftFingerCount, setLeftFingerCount] = useState(6);
  const [rightFingerCount, setRightFingerCount] = useState(6);
  const [leftSkipAfterFinger, setLeftSkipAfterFinger] = useState<number | null>(null);
  const [rightSkipAfterFinger, setRightSkipAfterFinger] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState(35);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [genomeFile, setGenomeFile] = useState<File | null>(null);
  const [genomeResult, setGenomeResult] = useState<GenomeSearchResult | null>(null);
  const [genomeProgress, setGenomeProgress] = useState<{
    phase: "parsing" | "searching";
    fraction: number;
    message: string;
  } | null>(null);
  const [genomeError, setGenomeError] = useState<string | null>(null);
  const [persikovModel, setPersikovModel] = useState<PersikovModel | null>(null);
  const [persikovFileName, setPersikovFileName] = useState<string | null>(null);
  const [persikovError, setPersikovError] = useState<string | null>(null);
  const [fauserContextMap, setFauserContextMap] = useState<FauserContextMap | null>(null);
  const [fauserFileName, setFauserFileName] = useState<string | null>(null);
  const [fauserError, setFauserError] = useState<string | null>(null);
  const [codonPreset, setCodonPreset] = useState<CodonPreset>("auxenochlorella");
  const workerRef = useRef<Worker | null>(null);
  const dna = useMemo(() => cleanDNA(rawSequence), [rawSequence]);
  const invalidCount = rawSequence.replace(/[ACGTacgt\s\d>_-]/g, "").length;
  const baseCandidates = useMemo(
    () => generateCandidates(dna, desiredCut, leftFingerCount, maxDistance, {
      rightFingerCount,
      leftSkipAfterFinger,
      rightSkipAfterFinger,
      candidateLimit: persikovModel ? Number.POSITIVE_INFINITY : 30,
    }),
    [
      dna,
      desiredCut,
      leftFingerCount,
      rightFingerCount,
      leftSkipAfterFinger,
      rightSkipAfterFinger,
      maxDistance,
      persikovModel,
    ],
  );
  const candidates = useMemo(
    () => persikovModel
      ? addPersikovScores(baseCandidates, persikovModel).sort(compareCandidates).slice(0, 30)
      : baseCandidates,
    [baseCandidates, persikovModel],
  );
  const specificityById = useMemo(
    () => new Map(genomeResult?.summaries.map((summary) => [summary.candidateId, summary]) ?? []),
    [genomeResult],
  );
  const rankedCandidates = useMemo(() => {
    if (!genomeResult) return candidates;
    return [...candidates].sort((a, b) => {
      const aSpecificity = specificityById.get(a.id);
      const bSpecificity = specificityById.get(b.id);
      if (!aSpecificity || !bSpecificity) return compareCandidates(a, b);
      return (
        Number(b.passesBScoreCutoff) - Number(a.passesBScoreCutoff) ||
        aSpecificity.perfectOffTargetHits - bSpecificity.perfectOffTargetHits ||
        aSpecificity.maxOffTargetScore - bSpecificity.maxOffTargetScore ||
        aSpecificity.homodimerHits - bSpecificity.homodimerHits ||
        compareCandidates(a, b)
      );
    });
  }, [candidates, genomeResult, specificityById]);
  const portfolio = useMemo(
    () => selectDiversePortfolio(rankedCandidates, 3),
    [rankedCandidates],
  );
  const selected =
    rankedCandidates.find((candidate) => candidate.id === selectedId) ?? rankedCandidates[0];
  const selectedConstructs = useMemo(
    () => selected ? buildZfnPair(selected, codonPreset) : [],
    [selected, codonPreset],
  );
  const cleavageAssay = useMemo(
    () => selected
      ? designCleavageAssay(
          dna,
          selected.cut,
          `${selected.leftTop}${selected.spacer}${selected.rightTop}`,
        )
      : null,
    [dna, selected],
  );
  const portfolioConstructs = useMemo(
    () => portfolio.flatMap(({ candidate }) => buildZfnPair(candidate, codonPreset)),
    [portfolio, codonPreset],
  );
  const contextCandidates = useMemo(
    () => fauserContextMap && leftSkipAfterFinger === null && rightSkipAfterFinger === null
      ? generateContextCandidates(
          dna,
          desiredCut,
          leftFingerCount,
          rightFingerCount,
          maxDistance,
          fauserContextMap,
        )
      : [],
    [
      dna,
      desiredCut,
      leftFingerCount,
      rightFingerCount,
      maxDistance,
      fauserContextMap,
      leftSkipAfterFinger,
      rightSkipAfterFinger,
    ],
  );
  const selectedSpecificity = selected ? specificityById.get(selected.id) : undefined;
  const footprint =
    leftFingerCount * 3 +
    rightFingerCount * 3 +
    Number(leftSkipAfterFinger !== null) +
    Number(rightSkipAfterFinger !== null) +
    6;

  const resetGenomeAnalysis = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setGenomeResult(null);
    setGenomeProgress(null);
    setGenomeError(null);
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  const runGenomeSearch = () => {
    if (!genomeFile) {
      setGenomeError("ゲノムFASTAを選択してください。");
      return;
    }
    if (leftFingerCount < 4 || rightFingerCount < 4) {
      setGenomeError("3ZFは近似half-siteが多すぎるため、ゲノム検索は4–6ZFに限定しています。");
      return;
    }
    if (!candidates.length) {
      setGenomeError("検索できるZFN候補がありません。");
      return;
    }

    workerRef.current?.terminate();
    const worker = new Worker(new URL("./off-target.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    setGenomeError(null);
    setGenomeResult(null);
    setGenomeProgress({ phase: "parsing", fraction: 0, message: "検索を準備しています" });

    worker.addEventListener("message", (event: MessageEvent) => {
      if (event.data.type === "progress") {
        setGenomeProgress(event.data.progress);
        return;
      }
      if (event.data.type === "result") {
        setGenomeResult(event.data.result as GenomeSearchResult);
        setGenomeProgress(null);
        worker.terminate();
        workerRef.current = null;
        return;
      }
      if (event.data.type === "error") {
        setGenomeError(event.data.message);
        setGenomeProgress(null);
        worker.terminate();
        workerRef.current = null;
      }
    });
    worker.addEventListener("error", () => {
      setGenomeError("検索処理を開始できませんでした。FASTA形式を確認してください。");
      setGenomeProgress(null);
      worker.terminate();
      workerRef.current = null;
    });

    const searchCandidates: OffTargetCandidateInput[] = candidates.map((candidate) => ({
      id: candidate.id,
      leftRecognition: candidate.leftRecognition,
      rightRecognition: candidate.rightRecognition,
      leftSkippedBaseOffsets: candidate.leftSkippedBaseOffset === null
        ? []
        : [candidate.leftSkippedBaseOffset],
      rightSkippedBaseOffsets: candidate.rightSkippedBaseOffset === null
        ? []
        : [candidate.rightSkippedBaseOffset],
      spacerLength: candidate.spacerLength,
      targetStart: candidate.start,
      footprintLength: candidate.leftTop.length + candidate.spacerLength + candidate.rightTop.length,
    }));
    worker.postMessage({
      type: "start",
      file: genomeFile,
      candidates: searchCandidates,
      targetWindow: dna,
    });
  };

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
            published B-scoreを主軸に順位付けし、任意のexpanded SVMとゲノムFASTAで再評価できます。
          </p>
        </div>
        <aside className="method-card">
          <p className="method-label">EVIDENCE LAYER</p>
          <div className="evidence-grid">
            <div><strong>{MODULE_COUNT}</strong><small>Barbas modules</small></div>
            <div><strong>{leftFingerCount} + {rightFingerCount}</strong><small>left / right fingers</small></div>
            <div><strong>≥15</strong><small>combined B-score</small></div>
            <div><strong>SVMl7</strong><small>optional local model</small></div>
          </div>
          <p className="method-note">再計算: B-score 20/21一致 · 異種archiveは学習に不使用</p>
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
              resetGenomeAnalysis();
              setRawSequence(EXAMPLE_SEQUENCE);
              setDesiredCut(27);
              setLeftFingerCount(6);
              setRightFingerCount(6);
              setLeftSkipAfterFinger(null);
              setRightSkipAfterFinger(null);
            }}>例を復元</button>
          </div>

          <label className="field-label" htmlFor="sequence">標的周辺配列（上鎖、5′→3′）</label>
          <textarea
            id="sequence"
            value={rawSequence}
            onChange={(event) => {
              resetGenomeAnalysis();
              setRawSequence(event.target.value);
            }}
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
                onChange={(event) => {
                  resetGenomeAnalysis();
                  setDesiredCut(Number(event.target.value));
                }}
              />
              <small>5′端からの塩基間座標</small>
            </label>
            <label>
              <span>Left finger数</span>
              <select value={leftFingerCount} onChange={(event) => {
                resetGenomeAnalysis();
                setLeftFingerCount(Number(event.target.value));
                setLeftSkipAfterFinger(null);
              }}>
                <option value={3}>3ZF</option>
                <option value={4}>4ZF</option>
                <option value={5}>5ZF</option>
                <option value={6}>6ZF（推奨）</option>
              </select>
              <small>左ZFA（既定6ZF）</small>
            </label>
            <label>
              <span>Right finger数</span>
              <select value={rightFingerCount} onChange={(event) => {
                resetGenomeAnalysis();
                setRightFingerCount(Number(event.target.value));
                setRightSkipAfterFinger(null);
              }}>
                <option value={3}>3ZF</option>
                <option value={4}>4ZF</option>
                <option value={5}>5ZF</option>
                <option value={6}>6ZF（推奨）</option>
              </select>
              <small>右ZFA（非対称可）</small>
            </label>
            <label>
              <span>探索距離</span>
              <select value={maxDistance} onChange={(event) => {
                resetGenomeAnalysis();
                setMaxDistance(Number(event.target.value));
              }}>
                <option value={20}>±20 bp</option>
                <option value={35}>±35 bp</option>
                <option value={60}>±60 bp</option>
                <option value={100}>±100 bp</option>
              </select>
              <small>切断希望点から</small>
            </label>
          </div>

          <div className="geometry-grid">
            <label>
              <span>Left 1c base-skip</span>
              <select value={leftSkipAfterFinger ?? 0} onChange={(event) => {
                resetGenomeAnalysis();
                const value = Number(event.target.value);
                setLeftSkipAfterFinger(value || null);
              }}>
                <option value={0}>なし（連続）</option>
                {Array.from({ length: leftFingerCount - 1 }, (_, index) => index + 1).map((finger) => (
                  <option key={finger} value={finger}>F{finger}の後で1 bp飛ばす</option>
                ))}
              </select>
            </label>
            <label>
              <span>Right 1c base-skip</span>
              <select value={rightSkipAfterFinger ?? 0} onChange={(event) => {
                resetGenomeAnalysis();
                const value = Number(event.target.value);
                setRightSkipAfterFinger(value || null);
              }}>
                <option value={0}>なし（連続）</option>
                {Array.from({ length: rightFingerCount - 1 }, (_, index) => index + 1).map((finger) => (
                  <option key={finger} value={finger}>F{finger}の後で1 bp飛ばす</option>
                ))}
              </select>
            </label>
            <p>
              1c（THPRAPIPKP）は指定finger間で1塩基を認識対象から外します。Paschon 2019由来で、
              通常のTGEKP linkerと同じ活性根拠ではありません。設計出力はC末端FokIのcanonical構成です。
            </p>
          </div>

          <div className="geometry-grid">
            <label className="file-picker">
              <input
                type="file"
                accept=".mod,text/plain"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  resetGenomeAnalysis();
                  try {
                    const model = parsePersikovLinearModel(await file.text());
                    setPersikovModel(model);
                    setPersikovFileName(file.name);
                    setPersikovError(null);
                  } catch (error) {
                    setPersikovModel(null);
                    setPersikovFileName(null);
                    setPersikovError(error instanceof Error ? error.message : "SVM modelを解析できません。");
                  }
                }}
              />
              <span>{persikovFileName ?? "任意: SVMl7.modを読み込む"}</span>
              <small>ファイルは端末外へ送信されません</small>
            </label>
            <p>
              Persikov–Singh expanded linear SVMをB-score同点時の補助順位に使います。
              <a href="https://zf.princeton.edu/download.php" target="_blank" rel="noreferrer">公式配布ページ</a>の
              models.zipからSVMl7.modを選択してください。モデル本体はこのサイトに同梱していません。
            </p>
            {persikovError && <p className="genome-error" role="alert">{persikovError}</p>}
          </div>

          <div className="geometry-grid experimental-loader">
            <label className="file-picker">
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const contextMap = parseFauserContextWorkbook(await file.arrayBuffer());
                    setFauserContextMap(contextMap);
                    setFauserFileName(file.name);
                    setFauserError(null);
                  } catch (error) {
                    setFauserContextMap(null);
                    setFauserFileName(null);
                    setFauserError(error instanceof Error ? error.message : "xlsxを解析できません。");
                  }
                }}
              />
              <span>{fauserFileName ?? "実験: Fauser Data 33 (.xlsx)"}</span>
              <small>{fauserContextMap ? `${Object.keys(fauserContextMap).length} context読込済み` : "4塩基context-aware候補を並列生成"}</small>
            </label>
            <p>
              Fauser 2024 Supplementary Data 33の「Triplet + flanking base」を端末内で読み、
              Barbas候補とは別枠で連続3–6ZF部位を探索します。
              <a href="https://doi.org/10.1038/s41467-024-45100-w" target="_blank" rel="noreferrer">原著と補足資料</a>
            </p>
            {fauserError && <p className="genome-error" role="alert">{fauserError}</p>}
          </div>

          <div className="footprint">
            <span>想定フットプリント</span>
            <strong>約 {footprint} bp</strong>
            <small>
              Left {leftFingerCount * 3 + Number(leftSkipAfterFinger !== null)} bp +
              Right {rightFingerCount * 3 + Number(rightSkipAfterFinger !== null)} bp + spacer 5–7 bp
            </small>
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
              disabled={!rankedCandidates.length}
              onClick={() => downloadCandidates(rankedCandidates)}
            >CSV</button>
          </div>
          <div className="result-summary">
            <strong>{rankedCandidates.length}</strong>
            <span>候補を表示</span>
            <small>{genomeResult ? "B-score・完全一致・最大類似scoreを優先" : persikovModel ? "B-score同点時にexpanded SVMを使用" : "spacer 5 / 6 / 7 bpを同時評価"}</small>
          </div>

          {portfolio.length > 0 && (
            <div className="portfolio-block">
              <div>
                <strong>試験推奨セット</strong>
                <small>B-score通過・TSOなしを優先し、切断位置とmodule重複を分散</small>
              </div>
              <div className="portfolio-items">
                {portfolio.map((choice, index) => (
                  <button
                    type="button"
                    key={choice.candidate.id}
                    className={selected?.id === choice.candidate.id ? "selected" : ""}
                    onClick={() => setSelectedId(choice.candidate.id)}
                  >
                    <span>P{index + 1}</span>
                    <b>元順位 {choice.sourceRank}</b>
                    <small>
                      {choice.minimumCutSeparation === null
                        ? "基準候補"
                        : `cut差 ≥${formatCut(choice.minimumCutSeparation)} bp · module重複 ≤${Math.round((choice.maximumModuleOverlap ?? 0) * 100)}%`}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {rankedCandidates.length ? (
            <div className="candidate-list" role="listbox" aria-label="ZFN candidates">
              {rankedCandidates.slice(0, 12).map((candidate, index) => {
                const specificity = specificityById.get(candidate.id);
                return <button
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
                    <b>{specificity ? `OT ${specificity.maxOffTargetScore.toFixed(1)}` : `B ${candidate.combinedBScore}`}</b>
                    <small>
                      {specificity
                        ? `完全一致 ${specificity.perfectOffTargetHits} · B ${candidate.combinedBScore}`
                        : `${candidate.persikovTargetFit === undefined ? (persikovModel ? "SVM対象外" : "SVM未読込") : `SVM ${candidate.persikovTargetFit.toFixed(2)}`} · TSO ${candidate.tsoIssues} · cut ${formatCut(candidate.cut)}`}
                    </small>
                  </span>
                </button>;
              })}
            </div>
          ) : (
            <div className="empty-state">
              <strong>候補を生成できません</strong>
              <p>{MODULE_COUNT}-module archiveで組める部位がありません。探索距離を広げてください。</p>
            </div>
          )}
        </div>
      </section>

      {fauserContextMap && (
        <section className="context-panel">
          <div className="detail-header">
            <div>
              <span className="step">EXPERIMENTAL</span>
              <p>Four-base context comparison</p>
              <h2>Fauser context候補 {contextCandidates.length}組</h2>
            </div>
            <span className="experimental-badge">主順位・CDS出力から分離</span>
          </div>
          {(leftSkipAfterFinger !== null || rightSkipAfterFinger !== null) ? (
            <p className="genome-warning">4塩基表は1c base-skippingを定義しないため、両側を「連続」にすると候補を生成します。</p>
          ) : contextCandidates.length ? (
            <div className="context-candidates">
              {contextCandidates.slice(0, 3).map((candidate, index) => {
                const overlapsBarbas = rankedCandidates.some((item) => item.start === candidate.start && item.spacerLength === candidate.spacerLength);
                return <article key={candidate.id}>
                  <div><span>C{index + 1}</span><strong>cut {formatCut(candidate.cut)} · spacer {candidate.spacerLength} bp</strong></div>
                  <code>{candidate.leftTop}<i>{candidate.spacer}</i>{candidate.rightTop}</code>
                  <dl>
                    <div><dt>Left helices N→C</dt><dd>{candidate.leftHelices.join(" · ")}</dd></div>
                    <div><dt>Right helices N→C</dt><dd>{candidate.rightHelices.join(" · ")}</dd></div>
                  </dl>
                  <small>{overlapsBarbas ? "同じ切断配置がBarbas archiveにも存在" : "Barbas上位30組にない追加配置"} · helix重複 {candidate.repeatedHelices}</small>
                </article>;
              })}
            </div>
          ) : (
            <p className="genome-warning">読込んだ182 contextだけで両側の全fingerを満たす候補はありません。探索距離またはfinger数を変更してください。</p>
          )}
          <p className="context-caution">
            この枠はZFDesign由来の4塩基context表による配列適合探索で、活性score・B-score・直接的ZFN検証を持ちません。
            framework互換性を未検証のため、完全ORFには変換しません。既定のBarbas/eMA順位との比較用です。
          </p>
        </section>
      )}

      <section className="genome-panel">
        <div className="detail-header genome-header">
          <div>
            <span className="step">03</span>
            <p>Genome specificity</p>
            <h2>FASTA内の切断可能な類似ペアを検索</h2>
          </div>
          {genomeResult && (
            <button
              className="export-button"
              type="button"
              onClick={() => downloadOffTargets(rankedCandidates, rankedCandidates.map((candidate) => specificityById.get(candidate.id)!).filter(Boolean))}
            >off-target CSV</button>
          )}
        </div>

        <div className="genome-intro">
          <p>
            4–6ZF候補を最大30組まとめて検索します。左右非対称と片側1個までの1-bp base-skippingに対応し、
            いずれかのhalf-siteが3 mismatch以内の
            ペアを漏れなく列挙し、反対側は制限せずLR・RL・LL・RRをPROGNOS ZFN v2.0で相対順位化します。
          </p>
          <span>ファイルは端末内のWeb Workerだけで処理され、送信・保存されません。</span>
        </div>

        <div className="genome-controls">
          <label className="file-picker">
            <input
              type="file"
              accept=".fa,.fasta,.fna,.fas,.fa.gz,.fasta.gz,.fna.gz,.gz,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                workerRef.current?.terminate();
                workerRef.current = null;
                setGenomeFile(file);
                setGenomeResult(null);
                setGenomeProgress(null);
                setGenomeError(null);
              }}
            />
            <span>{genomeFile ? genomeFile.name : "ゲノムFASTAを選択"}</span>
            <small>{genomeFile ? `${(genomeFile.size / 1_000_000).toFixed(1)} MB` : "FASTAまたはgzip圧縮FASTA"}</small>
          </label>
          <button
            className="search-button"
            type="button"
            disabled={!genomeFile || !candidates.length || leftFingerCount < 4 || rightFingerCount < 4 || Boolean(genomeProgress)}
            onClick={runGenomeSearch}
          >
            {genomeProgress ? "検索中…" : `${candidates.length}候補を検索`}
          </button>
        </div>

        {(leftFingerCount < 4 || rightFingerCount < 4) && (
          <p className="genome-warning">3ZFは近似候補が急増するため非対応です。特異性を比較する場合は4–6ZFを選択してください。</p>
        )}
        {genomeError && <p className="genome-error" role="alert">{genomeError}</p>}
        {genomeProgress && (
          <div className="progress-block" aria-live="polite">
            <div><span style={{ width: `${Math.max(3, genomeProgress.fraction * 100)}%` }} /></div>
            <p>{genomeProgress.message} · {Math.round(genomeProgress.fraction * 100)}%</p>
          </div>
        )}

        {genomeResult && selectedSpecificity && (
          <>
            <div className="genome-run-meta">
              <span>{formatBases(genomeResult.genomeBases)}</span>
              <span>{genomeResult.contigCount.toLocaleString()} contigs</span>
              <span>{(genomeResult.elapsedMs / 1000).toFixed(2)} s</span>
              <span>片側half-site ≤3 mismatch</span>
            </div>
            {!genomeResult.targetWindowUniquelyLocated && (
              <p className="genome-warning">
                入力した標的windowをゲノム内で一意に同定できませんでした。
                完全一致部位も保守的にoff-targetとして数えています。
              </p>
            )}
            <div className="specificity-summary">
              <div>
                <span>追加の完全一致ペア</span>
                <strong>{selectedSpecificity.perfectOffTargetHits}</strong>
                <small>意図部位を同定できた場合は除外</small>
              </div>
              <div>
                <span>最大off-target score</span>
                <strong>{selectedSpecificity.maxOffTargetScore.toFixed(1)}</strong>
                <small>PROGNOS相対スコア · 確率ではない</small>
              </div>
              <div>
                <span>score ≥50（表示のみ）</span>
                <strong>{selectedSpecificity.highScoreHits}</strong>
                <small>陽性判定・候補順位には不使用</small>
              </div>
              <div>
                <span>homodimer候補</span>
                <strong>{selectedSpecificity.homodimerHits}</strong>
                <small>LL + RR · heterodimer FokIで抑制対象</small>
              </div>
            </div>

            <div className="off-target-table-wrap">
              <table className="off-target-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Location</th>
                    <th>Pair</th>
                    <th>Mismatch L/R</th>
                    <th>Spacer</th>
                    <th>PROGNOS</th>
                    <th>Recognition sites 5′→3′</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSpecificity.topHits.slice(0, 20).map((hit, index) => (
                    <tr key={`${hit.contig}-${hit.position}-${hit.pairType}-${hit.spacerLength}`}>
                      <td>{index + 1}</td>
                      <td className="mono">{hit.contig}:{(hit.position + 1).toLocaleString()}</td>
                      <td><span className={`pair-type pair-${hit.pairType.toLowerCase()}`}>{hit.pairType}</span></td>
                      <td>{hit.leftMismatches} / {hit.rightMismatches}</td>
                      <td>{hit.spacerLength} bp</td>
                      <td><strong>{hit.score.toFixed(1)}</strong></td>
                      <td className="mono site-pair">{hit.leftSite} · {hit.rightSite}</td>
                    </tr>
                  ))}
                  {!selectedSpecificity.topHits.length && (
                    <tr><td colSpan={7} className="no-off-targets">探索条件内のoff-targetペアはありません。</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="genome-caution">
              この順位は配列類似性に基づく候補抽出です。5–6ZFはPROGNOS学習範囲外への外挿であり、
              Sander 2013の全候補ではPROGNOS ROC-AUCがCCR5 0.64、VEGFA 0.68でした。
              score ≥50は陽性をCCR5で5/22、VEGFAで21/34しか回収せず、候補順位には使用しません。
              クロマチン状態・発現量・実細胞での切断は予測しません。上位部位はamplicon sequencing等で検証してください。
            </p>
          </>
        )}
      </section>

      {selected && (
        <section className="design-detail">
          <div className="detail-header">
            <div>
              <span className="step">04</span>
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
            <FingerTable
              title="Left ZFA"
              fingers={selected.leftFingers}
              skipAfterFinger={selected.leftSkipAfterFinger}
            />
            <FingerTable
              title="Right ZFA"
              fingers={selected.rightFingers}
              skipAfterFinger={selected.rightSkipAfterFinger}
            />
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

          <section className="construct-output">
            <div className="construct-heading">
              <div>
                <span>Complete coding constructs</span>
                <h3>SV40 NLS–Sp1C ZFA–linker–FokI ELD/KKR</h3>
              </div>
              <label>
                <span>Codon preset</span>
                <select value={codonPreset} onChange={(event) => setCodonPreset(event.target.value as CodonPreset)}>
                  <option value="auxenochlorella">Auxenochlorella protothecoides</option>
                  <option value="human">Homo sapiens</option>
                </select>
              </label>
            </div>
            <div className="construct-grid">
              {selectedConstructs.map((construct) => (
                <div key={construct.name}>
                  <span>{construct.arm === "left" ? "Left" : "Right"} · FokI-{construct.fokIVariant}</span>
                  <strong>{construct.protein.length} aa · {construct.cds.length} bp</strong>
                  <small>CDS GC {construct.gcPercent.toFixed(1)}%</small>
                  <code>{construct.protein}</code>
                </div>
              ))}
            </div>
            <div className="construct-actions">
              <button type="button" onClick={() => downloadText(
                constructsToFasta(selectedConstructs, "protein"),
                `zfn-${selected.id}-protein.fasta`,
              )}>Protein FASTA</button>
              <button type="button" onClick={() => downloadText(
                constructsToFasta(selectedConstructs, "cds"),
                `zfn-${selected.id}-${codonPreset}-cds.fasta`,
              )}>CDS FASTA</button>
              <button type="button" onClick={() => downloadText(
                constructsToGenBank(selectedConstructs, codonPreset),
                `zfn-${selected.id}-${codonPreset}.gb`,
              )}>GenBank</button>
              <button type="button" disabled={!portfolioConstructs.length} onClick={() => downloadText(
                constructsToFasta(portfolioConstructs, "cds"),
                `zfn-portfolio-3-${codonPreset}-cds.fasta`,
              )}>推奨3組 CDS</button>
            </div>
            <p className="construct-caution">
              左をELD、右をKKRとしてFokI P14870 aa 384–579へQ486E/N496D/I499LまたはE490K/H537R/I538Kを導入しています。
              出力は合成可能なORFですが、promoter・terminator・ベクターbackboneは含みません。
              Auxenochlorella presetは公開1056 codon由来の小標本なので、合成前に使用株・核発現系で再確認してください。
            </p>
          </section>

          {cleavageAssay && (
            <section className="assay-output">
              <div className="construct-heading">
                <div>
                  <span>Cleavage validation output</span>
                  <h3>PCR amplicon + SSA target duplex</h3>
                </div>
                <button type="button" onClick={() => downloadText(
                  cleavageAssayToCsv(cleavageAssay),
                  `zfn-${selected.id}-cleavage-assay.csv`,
                  "text/csv;charset=utf-8",
                )}>Assay CSV</button>
              </div>
              {cleavageAssay.amplicon ? (
                <div className="primer-grid">
                  {[cleavageAssay.amplicon.forward, cleavageAssay.amplicon.reverse].map((primer) => (
                    <div key={primer.name}>
                      <span>{primer.name}</span>
                      <code>{primer.sequence}</code>
                      <small>Tm {primer.tmCelsius.toFixed(1)} °C · GC {primer.gcPercent.toFixed(1)}% · {primer.sequence.length} nt</small>
                    </div>
                  ))}
                  <p>Amplicon {cleavageAssay.amplicon.length} bp · 入力配列内 {cleavageAssay.amplicon.start + 1}–{cleavageAssay.amplicon.end}</p>
                </div>
              ) : (
                <p className="genome-warning">PCR primerを設計するには、切断点の両側を少なくとも約250 bp含む標的windowを入力してください。</p>
              )}
              <div className="ssa-duplex">
                <span>SSA reporter insert（overhangなし、各鎖5′→3′）</span>
                <code>Top&nbsp;&nbsp;&nbsp; {cleavageAssay.ssaTargetTop}</code>
                <code>Bottom {cleavageAssay.ssaTargetBottom}</code>
              </div>
              <p className="construct-caution">
                Primer Tmは50 mM一価塩相当の簡易式による一次案です。発注前にPrimer3、参照ゲノムBLAST、dimer/hairpin評価で確認してください。
                SSA insertにはクローニングoverhangを付けていません。
              </p>
            </section>
          )}

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
              <span>Expanded SVM target fit</span>
              <strong>{selected.persikovTargetFit?.toFixed(3) ?? "—"}</strong>
              <p>{selected.persikovTargetFit === undefined ? (persikovModel ? "1c base-skippingはSVM対象外" : "SVMl7.mod未読込") : "B-score同点時だけ順位に使用"}</p>
            </div>
            <div>
              <span>ZFA–FokI linker</span>
              <strong>{selected.fokILinker}</strong>
              <p>{selected.spacerLength} bp spacer用</p>
            </div>
            <p className="score-caution">
              B-score ≥15の構成はBhakta et al.の268構成中52%がSSA活性ありでしたが、これは本候補の成功確率ではありません。
              TSO不一致は原著どおり警告であり、候補を自動除外しません。expanded SVM値は結合確率ではなくPWM整合度です。
              Zhu 2011の29ペアは別module archiveで現行配列と0/29一致のため、順位学習には混ぜていません。
              完全ORF出力にはFokIとNLSを含みますが、promoter・terminator・ベクターbackboneと
              クロマチン状態の評価は含みません。FASTA検索後はB-score閾値内でゲノム特異性を優先して並べ替えます。
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
          <span>OPTIONAL RECOGNITION MODEL</span>
          <h2>公開weightを同梱せず、必要時だけローカル評価</h2>
          <p>
            Persikov–Singh expanded SVMは4-bp重複認識を含むPWMを計算します。公式SVMl7.modを利用者が読み込んだ場合だけ、
            B-score同点候補の補助順位に使います。モデルは送信・保存されません。
          </p>
        </article>
        <article>
          <span>GENOME-WIDE SPECIFICITY</span>
          <h2>似たhalf-siteではなく、切れる配置を探す</h2>
          <p>
            左右half-siteが5–7 bp spacerで向かい合う場所だけを列挙し、LR・RLに加えてLL・RRも検索します。
            PROGNOS ZFN v2.0は相対順位に限定し、切断確率とは表示しません。
          </p>
        </article>
      </section>

      <footer>
        <p>Research prototype · no sequence is uploaded or retained</p>
        <div className="footer-links">
          <a href="https://doi.org/10.1101/gr.143693.112" target="_blank" rel="noreferrer">Bhakta 2013</a>
          <a href="https://doi.org/10.1242/dev.066779" target="_blank" rel="noreferrer">Zhu 2011</a>
          <a href="https://doi.org/10.1093/nar/gkt1326" target="_blank" rel="noreferrer">Fine 2014</a>
          <a href="https://doi.org/10.1093/nar/gkt890" target="_blank" rel="noreferrer">Persikov 2014</a>
          <a href="https://doi.org/10.1038/nmeth.1539" target="_blank" rel="noreferrer">Doyon 2011</a>
          <a href="https://doi.org/10.1038/s41467-024-45100-w" target="_blank" rel="noreferrer">Fauser 2024</a>
        </div>
      </footer>
    </main>
  );
}
