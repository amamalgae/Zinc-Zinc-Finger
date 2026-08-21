import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { COPY, detectLanguage } from "../src/i18n.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const publicEvidenceFiles = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/AI_HANDOFF.md",
  "src/App.tsx",
  "src/coda-construct-output.ts",
  "src/construct-output.ts",
];

test("public evidence excludes host-specific F2A paper and retains Lei paired-ZFN precedent", () => {
  const contents = publicEvidenceFiles.map(read).join("\n");
  const removedAuthor = String.fromCodePoint(68, 117, 101, 241, 97, 115);
  const removedAsciiAuthor = String.fromCodePoint(68, 117, 101, 110, 97, 115);
  const removedDoi = ["10.1073", "pnas", "2417695122"].join("/");

  assert.equal(contents.toLowerCase().includes(removedAuthor.toLowerCase()), false);
  assert.equal(contents.toLowerCase().includes(removedAsciiAuthor.toLowerCase()), false);
  assert.equal(contents.includes(removedDoi), false);
  assert.match(contents, /Lei et al\. \(2011\)|Lei 2011|Lei Y et al\. \(2011\)/);
  assert.match(contents, /10\.1038\/mt\.2011\.12/);
});

test("landing page leads with Bhakta v3 while retaining v2 and v1", () => {
  const app = read("src/App.tsx");

  assert.match(app, /BHAKTA 2013 · EXTENDED MA ZFN DESIGNER/);
  assert.equal(COPY.en.heroTitle, "Design a ZFN pair");
  assert.match(COPY.en.heroBody, /Bhakta 2013 extended modular assembly/);
  assert.match(COPY.en.heroBody, /Gupta 2012 with CoDA fallback/);
  assert.match(app, /label: "v3 · Bhakta 2013"/);
  assert.match(app, /label: "v2 · Gupta \+ CoDA fallback"/);
  assert.match(app, /label: "v1 · CoDA only"/);
  assert.match(app, /useState<DesignProfile>\("bhakta-2013"\)/);
  assert.match(app, /<select id="design-profile"/);
  assert.match(app, /<strong>15\/21<\/strong>/);
  assert.match(app, /10\.1101\/gr\.143693\.112/);
  assert.match(COPY.en.evidenceBhakta, /15 of 21/);
  assert.match(COPY.en.evidenceNote, /not candidate-specific success probabilities/);
  assert.match(COPY.ja.evidenceNote, /各候補固有の成功確率ではありません/);
});

test("public search uses the complete target DNA and no requested-center ranking", () => {
  const app = read("src/App.tsx");
  const engine = read("src/zfn-design-engine.ts");
  const readme = read("README.md");

  assert.match(app, /generateZfnCandidatesAcrossSequence\(dna, designProfile\)/);
  assert.doesNotMatch(app, /desiredCutInput|maxDistanceInput|desired-cut-error/);
  assert.doesNotMatch(app, /copy\.spacerCenterLabel|copy\.rangeLabel/);
  assert.match(COPY.en.bhaktaRankingNote, /higher combined B-score first/);
  assert.match(COPY.en.bhaktaRankingNote, /full target DNA/);
  assert.match(COPY.ja.bhaktaRankingNote, /標的 DNA 全体/);
  assert.match(COPY.en.rankingNote, /6 > 5 >> 7 bp spacers/);
  assert.match(app, /designProfile === "bhakta-2013" \? copy\.bhaktaRankingNote : copy\.rankingNote/);

  const bhaktaComparator = engine.slice(
    engine.indexOf("function compareBhaktaFunctional"),
    engine.indexOf("export function compareZfnCandidates"),
  );
  const publicComparator = engine.slice(
    engine.indexOf("export function compareZfnCandidates"),
    engine.indexOf("function bhaktaMetrics"),
  );
  assert.match(bhaktaComparator, /combinedBScore/);
  assert.doesNotMatch(bhaktaComparator, /distance/);
  assert.doesNotMatch(publicComparator, /\.distance/);
  assert.match(engine, /SPACER_PRIORITY/);
  assert.match(readme, /`6 > 5 >> 7`/);
});

test("protein output offers annotated GenPept without inventing a DNA sequence", () => {
  const app = read("src/App.tsx");
  const exporter = read("src/zfn-construct-output.ts");

  assert.equal(COPY.en.downloadGenPept, "GenPept (annotated)");
  assert.equal(COPY.en.downloadFasta, "FASTA");
  assert.match(app, /resultFilename\(selectedRank, "gp"\)/);
  assert.match(app, /resultFilename\(selectedRank, "fasta"\)/);
  assert.match(COPY.en.outputIntro, /records each finger's method, module ID and recognition helix/);
  assert.match(COPY.en.bhaktaOutputIntro, /ZF-L 6F/);
  assert.match(COPY.en.bhaktaOutputIntro, /combined B-score ≥15/);
  assert.match(app, /<div className="protein-sequence"[\s\S]*?\{copy\.sequenceLabel\}[\s\S]*?\{construct\.protein\}[\s\S]*?<\/div>/);
  assert.equal(COPY.en.sequenceLabel, "AMINO ACID SEQUENCE");
  assert.doesNotMatch(app, /processedLeftProtein|processedRightProtein|Processed left|Processed right/);
  assert.match(exporter, /\/region_name=/);
  assert.doesNotMatch(exporter, /processed_left|processed_right|predicted_product/);
  assert.match(exporter, /Protein-only design; no nucleotide sequence or codon choice is implied/);
  assert.doesNotMatch(exporter, /optimizeCodingSequence|construct\.cds/);
});

test("input panel exposes method choice but no center or range controls", () => {
  const app = read("src/App.tsx");

  assert.match(app, /<label htmlFor="target-sequence">\{copy\.targetLabel\}<small>\{copy\.targetHint\}<\/small><\/label>/);
  assert.match(app, /<span>\{copy\.methodLabel\}<\/span>/);
  assert.match(app, /<select id="design-profile"/);
  assert.doesNotMatch(app, /type="text" inputMode="numeric"/);
  assert.doesNotMatch(app, /DEFAULT_DESIRED_CUT_INPUT|DEFAULT_MAX_DISTANCE_INPUT|desiredCutInputError/);
  assert.match(COPY.en.targetHint, /entire sequence searched/);
  assert.match(COPY.ja.targetHint, /入力全体を探索/);
});

test("interactive controls remain distinguishable from informational labels", () => {
  const app = read("src/App.tsx");
  const css = read("src/index.css");

  assert.match(app, /aria-pressed=\{selected\}/);
  assert.match(app, /`✓ \$\{copy\.selected\}`/);
  assert.match(app, /CSV/);
  assert.match(app, /<ul className="hero-benefits"/);
  assert.equal(COPY.en.heroBenefitBrowser, "Runs in your browser");
  assert.match(css, /button:focus-visible, a:focus-visible, summary:focus-visible/);
  assert.match(css, /\.technical-details > summary::after/);
  assert.match(css, /\.candidate-action/);
  assert.match(app, /className=\{`candidate \$\{selected \? "selected" : ""\}`\} role="button" tabIndex=\{0\}/);
  assert.match(app, /hasTextSelectionWithin\(event\.currentTarget\)/);
  assert.doesNotMatch(app, /<button className=\{`candidate/);
  assert.match(css, /\.candidate-sequence \{[^}]*cursor: text;[^}]*user-select: text;/);
  assert.match(COPY.en.copyHint, /Drag across a sequence to select and copy it/);
});

test("selection flows directly into protein output while retaining technical details", () => {
  const app = read("src/App.tsx");
  const css = read("src/index.css");

  assert.doesNotMatch(app, /buildZfnBindingMap|ZfnBindingDiagram|選択内容の表示|標的塩基配列とfingerの対応/);
  assert.match(app, /<div className="panel-heading"><span>02<\/span><h2>SELECT<\/h2>/);
  assert.match(app, /<div className="output-heading"><div className="panel-heading"><span>03<\/span><h2>PROTEIN OUTPUT<\/h2>/);
  assert.match(app, /<div className="panel-heading"><span>01<\/span><h2>INPUT<\/h2>/);
  assert.doesNotMatch(app, /className="selected-design"/);
  assert.equal(COPY.en.technicalSummary, "Finger detail and ORF architecture");
  assert.doesNotMatch(css, /\.selected-design|\.selected-heading|\.binding-figure|\.dna-map/);
});

test("candidate rows show B-score, integer location coordinate, and spacer length", () => {
  const app = read("src/App.tsx");
  const engine = read("src/zfn-design-engine.ts");
  const css = read("src/index.css");

  assert.match(app, /<b className="left">\{candidate\.leftTop\}<\/b>/);
  assert.match(app, /<b className="right">\{candidate\.rightTop\}<\/b>/);
  assert.match(app, /candidate\.combinedBScore === undefined \? "" : `B\$\{candidate\.combinedBScore\} · `/);
  assert.match(app, /\{functionalScore\}\+\{formatCut\(candidate\.cut\)\} · \{candidate\.spacerLength\} bp/);
  assert.doesNotMatch(app, /formatCut\(candidate\.distance\)/);
  assert.match(engine, /cut: Math\.floor\(candidate\.cut\)/);
  assert.match(css, /\.candidate-sequence b\.left \{ color: var\(--green\); \}/);
  assert.match(css, /\.candidate-sequence b\.right \{ color: var\(--blue\); \}/);
});

test("the public UI renders every returned candidate without a duplicate display panel", () => {
  const app = read("src/App.tsx");
  assert.match(app, /className="candidate-list">\{candidates\.map\(/);
  assert.match(app, /\{rankingNote\}/);
  assert.doesNotMatch(app, /LISTED_CANDIDATE_LIMIT|listedCandidates|candidates\.slice\(/);
  assert.doesNotMatch(app, /dna-ruler|dna-legend|dna-direction|selected-rank/);
});

test("protein output retains technical disclosure, Bhakta alternatives, and separate evidence", () => {
  const app = read("src/App.tsx");
  const panel = app.slice(app.indexOf('<section className="protein-output-section">'), app.indexOf('<section className="evidence">'));
  const evidence = app.slice(app.indexOf('<section className="evidence">'));

  assert.doesNotMatch(panel, /ZFN_DONORS/);
  assert.match(evidence, /ZFN_DONORS/);
  assert.ok(panel.indexOf("PROTEIN OUTPUT") < panel.indexOf('<details className="technical-details">'));
  assert.match(panel, /ArchitectureDiagram/);
  assert.match(panel, /BhaktaAlternativesPanel/);
  assert.match(app, /<summary>\{copy\.technicalSummary\}<\/summary>/);
});

test("an original 3ZF mechanism diagram explains the paired-FokI principle before sequence input", () => {
  const app = read("src/App.tsx");
  const diagram = read("src/ZfnOverviewDiagram.tsx");

  assert.ok(app.indexOf("<ZfnOverviewDiagram copy={copy} />") < app.indexOf('<section className="designer"'));
  assert.equal(COPY.en.mechanismTitle, "How a ZFN pair finds and cuts DNA");
  assert.match(COPY.en.stepRecogniseBody, /v1\/v2 use 3 fingers per monomer, while Bhakta v3 uses 6/);
  assert.match(COPY.en.mechanismCaption, /conventional 3-finger geometry used by v1\/v2/);
  assert.match(diagram, /Left ZFN · protein N → C/);
  assert.match(diagram, /Right ZFN · protein N → C/);
  assert.match(diagram, /ELD \(−\)/);
  assert.match(diagram, /KKR \(\+\)/);
  assert.match(diagram, /5–7 bp/);
  assert.match(diagram, /overview-lightning/);
  assert.match(diagram, /overview-mobile-diagram/);
});

test("no interface text is set below the legible floor", () => {
  const sheets = ["src/index.css", "src/ui-patch.css"].map(read);
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

  for (const path of surfaces) {
    const source = read(path);
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
