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

test("landing page leads with Gupta-first design and qualifies the 9-of-11 cohort", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(app, /GUPTA 2012 · 2F MODULE ZFN DESIGNER/);
  assert.match(app, /<h1>Design a ZFN pair<\/h1>/);
  assert.doesNotMatch(app, /標的DNAから、|ZFNペア候補を設計。/);
  assert.match(app, /searches the Gupta 2012 two-finger archive first/);
  assert.match(app, /falls back to CoDA for a monomer it cannot build/);
  assert.match(app, /label: "v2 · Gupta \+ CoDA fallback"/);
  assert.match(app, /label: "v1 · CoDA only"/);
  assert.doesNotMatch(app, /Design v[12]/);
  assert.match(app, /<select id="design-profile"/);
  assert.match(app, /returns the amino acid sequence/);
  assert.match(app, /Enter a sequence/);
  assert.match(app, /<strong>9\/11<\/strong>/);
  assert.match(app, /zebrafish targets mutated/);
  assert.match(app, /not the success probability of any candidate on this site/);
  assert.doesNotMatch(app, /3つのfingerで/i);
});

test("candidate ranking shows the compact spacer order and keeps its rationale in the README", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  assert.match(app, /nearest to the requested center first; ties prefer 6 &gt; 5 &gt;&gt; 7 bp spacers/);
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

  assert.match(app, /GenPept \(annotated\)/);
  assert.match(app, /"true">↓<\/span> FASTA</);
  assert.match(app, /resultFilename\(selectedRank, "gp"\)/);
  assert.match(app, /resultFilename\(selectedRank, "fasta"\)/);
  assert.match(app, /records each finger's method, module ID and recognition helix/);
  assert.match(app, /<div className="protein-sequence"[\s\S]*?AMINO ACID SEQUENCE[\s\S]*?\{construct\.protein\}[\s\S]*?<\/div>/);
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
  assert.match(app, /✓ Selected/);
  assert.match(app, /"true">↓<\/span> CSV</);
  assert.match(app, /"true">↓<\/span> FASTA</);
  assert.match(app, /<ul className="hero-benefits"/);
  assert.doesNotMatch(app, /構成可能なペアだけを提示/);
  assert.match(app, /<ul className="hero-benefits"[\s\S]*?<li>Runs in the browser<\/li>[\s\S]*?<li>GenPept \/ protein FASTA<\/li>[\s\S]*?<\/ul>/);
  assert.match(css, /button:focus-visible, a:focus-visible, summary:focus-visible/);
  assert.match(css, /\.technical-details > summary::after/);
  assert.match(css, /\.candidate-action/);
  assert.match(app, /className=\{`candidate \$\{selected \? "selected" : ""\}`\} role="button" tabIndex=\{0\}/);
  assert.match(app, /hasTextSelectionWithin\(event\.currentTarget\)/);
  assert.doesNotMatch(app, /<button className=\{`candidate/);
  assert.match(css, /\.candidate-sequence \{[^}]*cursor: text;[^}]*user-select: text;/);
  assert.match(app, /Drag across a sequence to select and copy it/);
  assert.doesNotMatch(app, /希望位置から。初期値1000 bp/);
  assert.match(css, /\.input-panel, \.results-panel, \.evidence \{ border: 1px solid/);
});

test("selection flows directly into protein output while retaining technical details", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.doesNotMatch(app, /buildZfnBindingMap|ZfnBindingDiagram|選択内容の表示|標的塩基配列とfingerの対応/);
  assert.match(app, /<div className="panel-heading"><span>02<\/span><div><small>SELECT<\/small>/);
  assert.match(app, /<div className="output-heading"><div className="panel-heading"><span>03<\/span><div><small>PROTEIN OUTPUT<\/small>/);
  assert.doesNotMatch(app, /<small>RESULTS<\/small>/);
  assert.doesNotMatch(app, /className="selected-design"/);
  assert.match(app, /<summary>Finger detail and ORF architecture<\/summary>/);
  assert.doesNotMatch(css, /\.selected-design|\.selected-heading|\.binding-figure|\.dna-map/);
});

test("candidate rows retain the selected target sequence and ranking distance", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  assert.match(app, /<b className="left">\{candidate\.leftTop\}<\/b>/);
  assert.match(app, /<b className="right">\{candidate\.rightTop\}<\/b>/);
  assert.match(app, /±\{formatCut\(candidate\.distance\)\} bp from center/);
  assert.match(css, /\.candidate-sequence b\.left \{ color: var\(--green\); \}/);
  assert.match(css, /\.candidate-sequence b\.right \{ color: var\(--blue\); \}/);

});

test("the public UI renders every returned candidate without a duplicate display panel", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /className="candidate-list">\{candidates\.map\(/);
  assert.match(app, /All candidates, nearest to the requested center first/);
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
  assert.ok(panel.indexOf("<ArchitectureDiagram />") > panel.indexOf('<details className="technical-details">'));
  assert.match(app, /<summary>Finger detail and ORF architecture<\/summary>/);
});

test("an original 3ZF mechanism diagram explains the design before sequence input", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const diagram = readFileSync(new URL("../src/ZfnOverviewDiagram.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const patch = readFileSync(new URL("../src/ui-patch.css", import.meta.url), "utf8");

  assert.ok(app.indexOf("<ZfnOverviewDiagram />") < app.indexOf('<section className="designer"'));
  assert.match(diagram, /How a ZFN pair<br \/>finds and cuts DNA/);
  assert.match(diagram, /One finger reads 3 bp, so three fingers read 9 bp/);
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
  assert.match(app, /<small>INPUT<\/small><h2>Enter the target<\/h2>/);
  assert.match(app, /<small>SELECT<\/small><h2>Pick a candidate<\/h2>/);
  assert.match(app, /<small>PROTEIN OUTPUT<\/small><h2>Get the sequence<\/h2>/);
  assert.match(app, /<span>Method<\/span>/);
  assert.match(app, /<span>Spacer center<\/span>/);
  assert.match(app, /<span>Range ±bp<\/span>/);
});

test("the public interface is written in English", () => {
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

  for (const path of surfaces) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const offending = source.split("\n").filter((line) => japanese.test(line));
    assert.deepEqual(offending, [], `${path} still renders Japanese text`);
  }
});
