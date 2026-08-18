import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicEvidenceFiles = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/AI_HANDOFF.md",
  "src/App.tsx",
  "src/coda-construct-output.ts",
  "src/construct-output.ts",
];

test("public evidence excludes host-specific F2A paper and retains Lei paired-ZFN precedent", () => {
  const contents = publicEvidenceFiles
    .map((path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8"))
    .join("\n");
  const removedAuthor = String.fromCodePoint(68, 117, 101, 241, 97, 115);
  const removedAsciiAuthor = String.fromCodePoint(68, 117, 101, 110, 97, 115);
  const removedDoi = ["10.1073", "pnas", "2417695122"].join("/");

  assert.equal(contents.toLowerCase().includes(removedAuthor.toLowerCase()), false);
  assert.equal(contents.toLowerCase().includes(removedAsciiAuthor.toLowerCase()), false);
  assert.equal(contents.includes(removedDoi), false);
  assert.match(contents, /Lei et al\. \(2011\)|Lei 2011/);
  assert.match(contents, /10\.1038\/mt\.2011\.12/);
});

test("landing page leads with the CoDA-based value proposition and qualifies the 50% cohort result", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(app, /SANDER 2011 · CoDA-based ZFN Designer/);
  assert.match(app, /<h1>ZFNペアを設計<\/h1>/);
  assert.doesNotMatch(app, /標的DNAから、|ZFNペア候補を設計。/);
  assert.match(app, /CoDAで構成可能な左右ZFNペアを検索し、アミノ酸配列を出力します。/);
  assert.doesNotMatch(app, /実験に使う完全アミノ酸配列まで出力します。/);
  assert.match(app, /配列を入力して設計する/);
  assert.match(app, /38標的中19標的で/);
  assert.match(app, /各候補の成功確率ではありません/);
  assert.doesNotMatch(app, /3つのfingerで/i);
});

test("candidate ranking shows the compact spacer order and keeps its rationale in the README", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  assert.match(app, /希望位置優先 · 同距離6 &gt; 5 &gt;&gt; 7 bp/);
  assert.doesNotMatch(app, /spacer長の実験傾向を用いた優先順位/);
  assert.match(readme, /`6 > 5 >> 7`/);
  assert.match(readme, /Shimizu et al\. \(2009\).*10\.1016\/j\.bmcl\.2009\.02\.109/);
  assert.match(readme, /Chen et al\. \(2013\).*10\.1093\/nar\/gks1356/);
  assert.match(readme, /定量的な活性比を意味しません/);
  assert.match(readme, /5 bp \| 30 \| 17 \| 56\.7% \| 2\.73%/);
  assert.match(readme, /6 bp \| 28 \| 13 \| 46\.4% \| 2\.64%/);
  assert.match(readme, /7 bp \| 26 \| 3 \| 11\.5% \| 0\.121%/);
  assert.match(readme, /5 bpと6 bpのindel率分布に有意差なし（P=0\.42）/);
  assert.match(readme, /現在の.*CoDA 3F、ELD\/KKR、F2A.*いずれの研究でもそのまま比較されていません/);
});

test("protein output offers annotated GenPept without inventing a DNA sequence", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const exporter = readFileSync(new URL("../src/coda-construct-output.ts", import.meta.url), "utf8");

  assert.match(app, /注釈付きProteinを保存（GenPept）/);
  assert.match(app, /Protein FASTAを保存（前駆体1配列）/);
  assert.match(app, /codaResultFilename\(selectedRank, "gp"\)/);
  assert.match(app, /codaResultFilename\(selectedRank, "fasta"\)/);
  assert.match(app, /ZF1–ZF6、FokI ELD\/KKR、F2Aをfeature/);
  assert.doesNotMatch(app, /processedLeftProtein|processedRightProtein|Processed left|Processed right/);
  assert.match(exporter, /\/region_name=/);
  assert.doesNotMatch(exporter, /processed_left|processed_right|predicted_product/);
  assert.match(exporter, /Protein-only design; no nucleotide sequence or codon choice is implied/);
  assert.doesNotMatch(exporter, /optimizeCodingSequence|construct\.cds/);
});

test("coordinate controls are manual-only, default to 1000, and expose an accessible range error", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.match(app, /useState\(DEFAULT_DESIRED_CUT_INPUT\)/);
  assert.match(app, /useState\(DEFAULT_MAX_DISTANCE_INPUT\)/);
  assert.equal((app.match(/type="text" inputMode="numeric" pattern="\[0-9\]\*"/g) ?? []).length, 2);
  assert.doesNotMatch(app, /type="number"|step=\{50\}|初期値500 bp/);
  assert.match(app, /aria-invalid=\{Boolean\(desiredCutError\)\}/);
  assert.match(app, /id="desired-cut-error" className="field-error" role="alert"/);
  assert.match(app, /invalidCharacterCount \|\| desiredCutError/);
  assert.match(css, /input\[aria-invalid="true"\].*border-color: #c7352c/);
});

test("interactive controls remain distinguishable from informational labels", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.match(app, /aria-pressed=\{selected\}/);
  assert.match(app, /✓ 選択中/);
  assert.match(app, /CSVを保存/);
  assert.match(app, /Protein FASTAを保存/);
  assert.match(app, /<ul className="hero-benefits"/);
  assert.doesNotMatch(app, /構成可能なペアだけを提示/);
  assert.match(app, /<ul className="hero-benefits"[\s\S]*?<li>ブラウザ内で処理<\/li>[\s\S]*?<li>GenPept \/ Protein FASTA出力<\/li>[\s\S]*?<\/ul>/);
  assert.match(css, /button:focus-visible, a:focus-visible, summary:focus-visible/);
  assert.match(css, /\.technical-details > summary::after/);
  assert.match(css, /\.candidate-action/);
  assert.match(app, /className=\{`candidate \$\{selected \? "selected" : ""\}`\} role="button" tabIndex=\{0\}/);
  assert.match(app, /hasTextSelectionWithin\(event\.currentTarget\)/);
  assert.doesNotMatch(app, /<button className=\{`candidate/);
  assert.match(css, /\.candidate-sequence \{[^}]*cursor: text;[^}]*user-select: text;/);
  assert.match(app, /塩基配列はドラッグして選択・コピーできます/);
  assert.doesNotMatch(app, /希望位置から。初期値1000 bp/);
  assert.match(app, /この欄は表示専用です。設計を変更する場合は、02で別の候補を選択してください。/);
  assert.match(css, /\.input-panel, \.results-panel, \.evidence \{ border: 1px solid/);
  assert.match(css, /\.selected-design \{[^}]*border: 0;[^}]*background: #edf3ed/);
  assert.match(css, /\.binding-figure \{[^}]*border: 0;[^}]*background: transparent/);
  assert.doesNotMatch(css, /\.input-panel, \.results-panel, \.selected-design/);
});

test("selected-design diagram foregrounds the variable target sequence and six-finger mapping", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.match(app, /buildZfnBindingMap/);
  assert.match(app, /選択内容の表示/);
  assert.match(app, /標的塩基配列とfingerの対応/);
  assert.match(app, /選択した標的塩基配列とZF1–ZF6の対応/);
  assert.match(app, /左ZFN標的 · 9 bp/);
  assert.match(app, /右ZFN標的 · 9 bp/);
  assert.match(app, /strand-name">F</);
  assert.match(app, /strand-name">R</);
  assert.doesNotMatch(app, /03 · SELECTED ZFN PAIR|04 · PROTEIN OUTPUT|binding-explainer/);
  assert.match(css, /\.dna-scroll \{[^}]*overflow-x: auto/);
  assert.doesNotMatch(css, /\.dna-map \{[^}]*min-width: 810px/);
});

test("the selected-design panel states the ranking distance once instead of repeating the target layout", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  // The ranking key is distance to the requested spacer centre, so it must be visible.
  assert.match(app, /希望位置との差/);
  assert.match(app, /±\{formatCut\(selected\.distance\)\} bp/);
  assert.match(app, /希望スペーサー中心から±\{formatCut\(selected\.distance\)\} bpの候補です。/);

  // The left/spacer/right split is stated inside the diagram only.
  assert.doesNotMatch(app, /target-summary/);
  assert.doesNotMatch(css, /\.target-summary/);
  assert.doesNotMatch(app, /<h3>選択した標的塩基配列<\/h3>/);
  assert.match(app, /className="visually-hidden">選択した標的塩基配列/);

  // Nothing in the selected-design region may drop below 11px, on any viewport.
  const region = css.slice(css.indexOf(".selected-design {"));
  const selectors = /\.(selected-heading|selected-lead|selected-metrics|display-kicker|selected-rank|dna-[a-z-]+|direction-name|strand-name|reverse-strand|forward-strand|binding-note)/;
  for (const rule of region.split("\n")) {
    if (!selectors.test(rule)) continue;
    for (const [, size] of rule.matchAll(/font-size: (\d+(?:\.\d+)?)px/g)) {
      assert.ok(Number(size) >= 11, `${rule.trim()} uses ${size}px`);
    }
    for (const [, size] of rule.matchAll(/font: [^;]*?(\d+(?:\.\d+)?)px/g)) {
      assert.ok(Number(size) >= 11, `${rule.trim()} uses ${size}px`);
    }
  }
});

test("the diagram carries its own legend, binding direction, and colour language", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  // Legend and direction belong inside the dark panel, next to the colours they name.
  const map = app.slice(app.indexOf('<div className="dna-map">'), app.indexOf("</figure>"));
  assert.match(map, /className="dna-legend"/);
  assert.match(map, /左ZFNが認識 · ZF1–ZF3/);
  assert.match(map, /右ZFNが認識 · ZF4–ZF6/);
  assert.doesNotMatch(app, /target-legend/);

  // The antiparallel right monomer is shown, not only footnoted.
  assert.match(map, /className="dna-direction"/);
  assert.ok(map.indexOf('className="dna-direction"') < map.indexOf('className="dna-row dna-labels"'));
  assert.match(css, /\.dna-direction \.left i::after/);
  assert.match(css, /\.dna-direction \.right i::before/);

  // Candidate rows use the diagram's left/spacer/right colours and show the ranking distance.
  assert.match(app, /<b className="left">\{candidate\.leftTop\}<\/b>/);
  assert.match(app, /<b className="right">\{candidate\.rightTop\}<\/b>/);
  assert.match(css, /\.candidate-sequence b\.left \{ color: var\(--green\); \}/);
  assert.match(css, /\.candidate-sequence b\.right \{ color: var\(--blue\); \}/);
  assert.match(app, /希望位置 ±\{formatCut\(candidate\.distance\)\} bp/);

  // The display panel names which candidate it is showing.
  assert.match(app, /className="selected-rank">候補 <strong>\{String\(selectedRank\)\.padStart\(2, "0"\)\}<\/strong>/);
  assert.match(app, /const LISTED_CANDIDATE_LIMIT = 12;/);
  assert.doesNotMatch(app, /candidates\.slice\(0, 12\)/);
});

test("the panel locates the target in the pasted sequence and holds only candidate-specific content", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  // A ruler ties the diagram back to coordinates in the input sequence.
  const map = app.slice(app.indexOf('<div className="dna-map">'), app.indexOf("</figure>"));
  assert.match(map, /className="dna-ruler"/);
  assert.ok(map.indexOf('className="dna-ruler"') < map.indexOf('className="dna-group-labels"'));
  assert.match(map, /\{candidate\.start \+ 1\}/);
  assert.match(map, /\{candidate\.start \+ 18 \+ candidate\.spacerLength\}/);
  assert.match(app, /上端の座標は、入力配列の5′端を1とする位置です/);

  // The diagram scrolls rather than clipping, and stays narrow enough not to scroll on a phone.
  const mapWidth = Number(/\.dna-map \{[^}]*min-width: (\d+)px/.exec(css)[1]);
  assert.ok(mapWidth <= 298, `dna-map min-width ${mapWidth}px would scroll on a 360px viewport`);

  // Candidate-independent blocks left the display panel.
  const panel = app.slice(app.indexOf('<section className="selected-design">'), app.indexOf('<section className="evidence">'));
  const evidence = app.slice(app.indexOf('<section className="evidence">'));
  assert.doesNotMatch(panel, /CODA_ZFN_DONORS/);
  assert.match(evidence, /CODA_ZFN_DONORS/);
  assert.ok(panel.indexOf("<ArchitectureDiagram />") > panel.indexOf('<details className="technical-details">'));
  assert.match(app, /<summary>finger構成と単一ORFの構成を見る<\/summary>/);
});

test("an original 3ZF mechanism diagram explains the design before sequence input", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const diagram = readFileSync(new URL("../src/ZfnOverviewDiagram.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const patch = readFileSync(new URL("../src/ui-patch.css", import.meta.url), "utf8");

  assert.ok(app.indexOf("<ZfnOverviewDiagram />") < app.indexOf('<section className="designer"'));
  assert.match(diagram, /ZFNがDNAを認識して<br \/>切断する仕組み/);
  assert.match(diagram, /1 fingerが3 bp、3 fingerで9 bpを認識します/);
  assert.doesNotMatch(diagram, /およそ3 bp|左右2本で標的を挟む/);
  assert.match(diagram, /Left ZFN · protein N → C/);
  assert.match(diagram, /Right ZFN · protein N → C/);
  assert.match(diagram, /ELD（−）/);
  assert.match(diagram, /KKR（＋）/);
  assert.match(diagram, /5–7 bp/);
  assert.match(diagram, /overview-strand-name f"[^>]*>F/);
  assert.match(diagram, /overview-strand-name r"[^>]*>R/);
  assert.match(diagram, /overview-lightning/);
  assert.doesNotMatch(diagram, /overview-cut|overview-dimer-link/);
  assert.match(diagram, /overview-mobile-diagram/);
  assert.match(diagram, /overview-mobile-array right[\s\S]*>C<[\s\S]*KKR（＋）[\s\S]*ZF6[\s\S]*ZF5[\s\S]*ZF4[\s\S]*>N</);
  assert.match(diagram, /overview-mobile-array left[\s\S]*>N<[\s\S]*ZF1[\s\S]*ZF2[\s\S]*ZF3[\s\S]*ELD（−）[\s\S]*>C</);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.overview-svg-scroll \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.overview-mobile-diagram \{ display: grid;/);
  assert.match(patch, /\.overview-spacer-length,\s*\.overview-spacer-label \{\s*dominant-baseline: middle;\s*fill: #95461f;\s*font-size: 16px;/);
  assert.match(patch, /\.overview-lightning \{\s*transform: scale\(\.65\)/);
  assert.match(patch, /\.overview-mobile-spacer > span \{[\s\S]*color: #95461f;[\s\S]*font-size: 8px;/);
  assert.match(patch, /\.overview-mobile-spacer \.cut-label \{[\s\S]*color: #95461f;[\s\S]*font-size: 8px;/);
  assert.match(patch, /\.overview-mobile-lightning\.top \{\s*top: -6px;/);
  assert.match(patch, /\.overview-mobile-lightning\.bottom \{\s*bottom: -6px;/);
  assert.doesNotMatch(diagram, /2ACB03D5|IN BRIEF|Zinc finger nucleases \(ZFNs\)/);
});
