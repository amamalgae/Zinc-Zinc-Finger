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

test("interactive controls remain distinguishable from informational labels", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.match(app, /aria-pressed=\{selected\}/);
  assert.match(app, /✓ 選択中/);
  assert.match(app, /CSVを保存/);
  assert.match(app, /Protein FASTAを保存/);
  assert.match(app, /<ul className="hero-benefits"/);
  assert.doesNotMatch(app, /構成可能なペアだけを提示/);
  assert.match(app, /<ul className="hero-benefits"[\s\S]*?<li>ブラウザ内で処理<\/li>[\s\S]*?<li>Protein FASTA出力<\/li>[\s\S]*?<\/ul>/);
  assert.match(css, /button:focus-visible, a:focus-visible, summary:focus-visible/);
  assert.match(css, /\.technical-details > summary::after/);
  assert.match(css, /\.candidate-action/);
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
  assert.match(app, /選択した標的塩基配列/);
  assert.match(app, /左ZFN標的 · 9 bp/);
  assert.match(app, /右ZFN標的 · 9 bp/);
  assert.match(app, /strand-name">F</);
  assert.match(app, /strand-name">R</);
  assert.doesNotMatch(app, /03 · SELECTED ZFN PAIR|04 · PROTEIN OUTPUT|binding-explainer/);
  assert.match(css, /\.dna-scroll \{[^}]*overflow: hidden/);
  assert.doesNotMatch(css, /\.dna-map \{[^}]*min-width: 810px/);
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
