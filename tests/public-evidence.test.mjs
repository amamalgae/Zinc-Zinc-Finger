import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { COPY, detectLanguage } from "../src/i18n.ts";

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

test("landing page leads with Gupta-first design and qualifies the 9-of-11 cohort", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(app, /GUPTA 2012 · 2F MODULE ZFN DESIGNER/);
  assert.equal(COPY.en.heroTitle, "Design a ZFN pair");
  assert.doesNotMatch(app, /標的DNAから、|ZFNペア候補を設計。/);
  assert.match(COPY.en.heroBody, /searches the Gupta 2012 two-finger archive first/);
  assert.match(COPY.en.heroBody, /falls back to CoDA for a monomer it cannot build/);
  assert.match(app, /label: "v2 · Gupta \+ CoDA fallback"/);
  assert.match(app, /label: "v1 · CoDA only"/);
  assert.doesNotMatch(app, /Design v[12]/);
  assert.match(app, /<select id="design-profile"/);
  assert.match(COPY.en.heroBody, /returns the amino acid sequence/);
  assert.equal(COPY.en.heroCta, "Enter a sequence");
  assert.match(app, /<strong>9\/11<\/strong>/);
  assert.match(COPY.en.studyHeadline, /zebrafish targets mutated/);
  assert.match(COPY.en.studyCaveat, /not the success probability of any candidate on this site/);
  assert.match(COPY.ja.studyCaveat, /各候補の成功確率ではありません/);
  assert.doesNotMatch(app, /3つのfingerで/i);
});

test("candidate ranking shows the compact spacer order and keeps its rationale in the README", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  assert.match(COPY.en.rankingNote, /Nearest to the requested center first; ties prefer 6 > 5 >> 7 bp spacers/);
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
  const exporter = readFileSync(new URL("../src/zfn-construct-output.ts", import.meta.url), "utf8");

  assert.equal(COPY.en.downloadGenPept, "GenPept (annotated)");
  assert.equal(COPY.en.downloadFasta, "FASTA");
  assert.match(app, /resultFilename\(selectedRank, "gp"\)/);
  assert.match(app, /resultFilename\(selectedRank, "fasta"\)/);
  assert.match(COPY.en.outputIntro, /records each finger's method, module ID and recognition helix/);
  assert.match(app, /<div className="protein-sequence"[\s\S]*?\{copy\.sequenceLabel\}[\s\S]*?\{construct\.protein\}[\s\S]*?<\/div>/);
  assert.equal(COPY.en.sequenceLabel, "AMINO ACID SEQUENCE");
  assert.doesNotMatch(app, /<details className="sequence-details compact"/);
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
  assert.match(app, /`✓ \$\{copy\.selected\}`/);
  assert.match(app, /"true">↓<\/span> CSV</);
  assert.match(app, /<ul className="hero-benefits"/);
  assert.doesNotMatch(app, /構成可能なペアだけを提示/);
  assert.match(app, /<ul className="hero-benefits"[\s\S]*?\{copy\.heroBenefitBrowser\}[\s\S]*?\{copy\.heroBenefitFormats\}[\s\S]*?<\/ul>/);
  assert.equal(COPY.en.heroBenefitBrowser, "Runs in the browser");
  assert.match(css, /button:focus-visible, a:focus-visible, summary:focus-visible/);
  assert.match(css, /\.technical-details > summary::after/);
  assert.match(css, /\.candidate-action/);
  assert.match(app, /className=\{`candidate \$\{selected \? "selected" : ""\}`\} role="button" tabIndex=\{0\}/);
  assert.match(app, /hasTextSelectionWithin\(event\.currentTarget\)/);
  assert.doesNotMatch(app, /<button className=\{`candidate/);
  assert.match(css, /\.candidate-sequence \{[^}]*cursor: text;[^}]*user-select: text;/);
  assert.match(COPY.en.copyHint, /Drag across a sequence to select and copy it/);
  assert.doesNotMatch(app, /希望位置から。初期値1000 bp/);
  assert.match(css, /\.input-panel, \.results-panel, \.evidence \{ border: 1px solid/);
});

test("selection flows directly into protein output while retaining technical details", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.doesNotMatch(app, /buildZfnBindingMap|ZfnBindingDiagram|選択内容の表示|標的塩基配列とfingerの対応/);
  assert.match(app, /<div className="panel-heading"><span>02<\/span><h2>SELECT<\/h2>/);
  assert.match(app, /<div className="output-heading"><div className="panel-heading"><span>03<\/span><h2>PROTEIN OUTPUT<\/h2>/);
  assert.match(app, /<div className="panel-heading"><span>01<\/span><h2>INPUT<\/h2>/);
  assert.doesNotMatch(app, /<h2>Enter the target<\/h2>|<h2>Pick a candidate<\/h2>|<h2>Get the sequence<\/h2>/);
  assert.doesNotMatch(app, /<small>RESULTS<\/small>/);
  assert.doesNotMatch(app, /className="selected-design"/);
  assert.equal(COPY.en.technicalSummary, "Finger detail and ORF architecture");
  assert.doesNotMatch(css, /\.selected-design|\.selected-heading|\.binding-figure|\.dna-map/);
});

test("candidate rows retain the selected target sequence and ranking distance", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.match(app, /<b className="left">\{candidate\.leftTop\}<\/b>/);
  assert.match(app, /<b className="right">\{candidate\.rightTop\}<\/b>/);
  assert.match(app, /±\{formatCut\(candidate\.distance\)\} bp · \{candidate\.spacerLength\} bp/);
  assert.match(css, /\.candidate-sequence b\.left \{ color: var\(--green\); \}/);
  assert.match(css, /\.candidate-sequence b\.right \{ color: var\(--blue\); \}/);

});

test("the public UI renders every returned candidate without a duplicate display panel", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /className="candidate-list">\{candidates\.map\(/);
  assert.match(app, /\{copy\.rankingNote\}/);
  assert.doesNotMatch(app, /LISTED_CANDIDATE_LIMIT|listedCandidates|candidates\.slice\(/);
  assert.doesNotMatch(app, /dna-ruler|dna-legend|dna-direction|selected-rank/);
});

test("protein output retains its technical disclosure and keeps evidence separate", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const panel = app.slice(app.indexOf('<section className="protein-output-section">'), app.indexOf('<section className="evidence">'));
  const evidence = app.slice(app.indexOf('<section className="evidence">'));
  assert.doesNotMatch(panel, /ZFN_DONORS/);
  assert.match(evidence, /ZFN_DONORS/);
  assert.ok(panel.indexOf("PROTEIN OUTPUT") < panel.indexOf('<details className="technical-details">'));
  assert.ok(panel.indexOf("<ArchitectureDiagram copy={copy} />") > panel.indexOf('<details className="technical-details">'));
  assert.match(app, /<summary>\{copy\.technicalSummary\}<\/summary>/);
});

test("an original 3ZF mechanism diagram explains the design before sequence input", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const diagram = readFileSync(new URL("../src/ZfnOverviewDiagram.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const patch = readFileSync(new URL("../src/ui-patch.css", import.meta.url), "utf8");

  assert.ok(app.indexOf("<ZfnOverviewDiagram />") < app.indexOf('<section className="designer"'));
  assert.equal(COPY.en.mechanismTitle, "How a ZFN pair finds and cuts DNA");
  assert.match(COPY.en.stepRecogniseBody, /One finger reads 3 bp, so three fingers read 9 bp/);
  assert.doesNotMatch(diagram, /およそ3 bp|左右2本で標的を挟む/);
  assert.match(diagram, /Left ZFN · protein N → C/);
  assert.match(diagram, /Right ZFN · protein N → C/);
  assert.match(diagram, /ELD \(−\)/);
  assert.match(diagram, /KKR \(\+\)/);
  assert.match(diagram, /5–7 bp/);
  assert.match(diagram, /overview-strand-name f"[^>]*>F/);
  assert.match(diagram, /overview-strand-name r"[^>]*>R/);
  assert.match(diagram, /overview-lightning/);
  assert.doesNotMatch(diagram, /overview-cut|overview-dimer-link/);
  assert.match(diagram, /overview-mobile-diagram/);
  assert.match(diagram, /overview-mobile-array right[\s\S]*>C<[\s\S]*KKR \(\+\)[\s\S]*ZF6[\s\S]*ZF5[\s\S]*ZF4[\s\S]*>N</);
  assert.match(diagram, /overview-mobile-array left[\s\S]*>N<[\s\S]*ZF1[\s\S]*ZF2[\s\S]*ZF3[\s\S]*ELD \(−\)[\s\S]*>C</);
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

test("no interface text is set below the legible floor, and each step states what to do", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const sheets = ["../src/index.css", "../src/ui-patch.css"].map((file) =>
    readFileSync(new URL(file, import.meta.url), "utf8"),
  );

  // The 3ZF-FokI schematic is drawn on a fixed grid and keeps its own units;
  // everything the reader has to read as text stays at 13px or larger.
  const undersized = [];
  for (const sheet of sheets) {
    for (const [, selector, body] of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (selector.includes(".overview") && !selector.includes("figcaption")) continue;
      for (const [, value] of body.matchAll(/font(?:-size)?:\s*([^;]+)/g)) {
        for (const [, px] of value.matchAll(/(\d+(?:\.\d+)?)px/g)) {
          if (Number(px) < 13) undersized.push(`${selector.trim()} → ${px}px`);
        }
      }
    }
  }
  assert.deepEqual(undersized, []);

  // The three steps are carried by the numbered badge, the section key and the
  // controls themselves; prose instructions are deliberately absent.
  assert.doesNotMatch(app, /ここですること|ここで得られるもの|className="panel-help"/);
  assert.match(app, /<span>\{copy\.methodLabel\}<\/span>/);
  assert.match(app, /<span>\{copy\.spacerCenterLabel\}<\/span>/);
  assert.match(app, /<span>\{copy\.rangeLabel\}<\/span>/);
  assert.equal(COPY.en.methodLabel, "Method");
  assert.equal(COPY.en.spacerCenterLabel, "Spacer center");
  assert.equal(COPY.en.rangeLabel, "Range ±bp");
});

test("interface copy lives in the dictionary, in both languages", () => {
  const surfaces = [
    "index.html",
    "src/App.tsx",
    "src/ZfnOverviewDiagram.tsx",
    "src/zfn-construct-output.ts",
    "src/manual-numeric-input.ts",
    "src/index.css",
    "src/ui-patch.css",
  ];
  const japanese = /[぀-ヿ一-鿿]/;

  // Every reader-facing string resolves through COPY, so no component,
  // stylesheet or data module carries prose of its own in either language.
  for (const path of surfaces) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const offending = source.split("\n").filter((line) => japanese.test(line));
    assert.deepEqual(offending, [], `${path} carries Japanese text outside the dictionary`);
  }

  assert.deepEqual(Object.keys(COPY.ja), Object.keys(COPY.en));
  for (const [key, value] of Object.entries(COPY.en)) {
    if (typeof value !== "string") continue;
    assert.doesNotMatch(value, japanese, `COPY.en.${key} is not English`);
  }
  assert.match(COPY.ja.heroTitle, japanese);

  assert.equal(detectLanguage(["ja-JP", "en-US"]), "ja");
  assert.equal(detectLanguage(["en-GB"]), "en");
  assert.equal(detectLanguage([]), "en");
});
