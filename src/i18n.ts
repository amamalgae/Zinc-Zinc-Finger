export type Language = "en" | "ja";

export const LANGUAGE_STORAGE_KEY = "zzf-language";

/** Picks a UI language from the browser's ordered preference list. */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    if (tag.toLowerCase().startsWith("ja")) return "ja";
  }
  return "en";
}

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ja";
}

const en = {
  languageName: "English",
  tagline: "3-finger ZFN designer",
  versionAria: "open the GitHub Code page",
  localBadge: "Runs in your browser",
  localBadgeAria: "Designs are computed in your browser; sequences are never sent to a server",
  languageAria: "Interface language",

  heroTitle: "Design a ZFN pair",
  heroBody: "Paste the sequence around your target. The designer searches the Gupta 2012 two-finger archive first, falls back to CoDA for a monomer it cannot build, and returns the amino acid sequence.",
  heroCta: "Enter a sequence",
  heroPrivacy: "Sequences stay on your device",
  heroBenefitsAria: "What this tool does",
  heroBenefitBrowser: "Runs in the browser",
  heroBenefitFormats: "GenPept / protein FASTA",

  studyHeadline: "zebrafish targets mutated in Gupta 2012",
  studyCaveat: "A small, selectively evaluated cohort. It is not the success probability of any candidate on this site.",

  mechanismTitle: "How a ZFN pair finds and cuts DNA",
  mechanismBody: "The zinc fingers read the DNA; FokI is the nuclease that cuts it. Once both ZFNs are bound to their 9 bp half-sites, the two FokI variants meet over the spacer and form the complex that cleaves.",
  mechanismFigureAria: "Diagram of a 3-finger ZFN pair",
  mechanismSvgTitle: "Two 3-finger ZFNs bound to DNA with a FokI heterodimer cutting the spacer",
  mechanismSvgDesc: "ZF1 to ZF3 of the left ZFN and ZF4 to ZF6 of the right ZFN bind the 9 bp half-sites on the F and R strands. FokI ELD and KKR form a heterodimer over the 5 to 7 bp spacer between them.",
  mechanismMobileAria: "ZF1 to ZF6 bind the 9 bp half-sites on the F and R strands; FokI ELD and KKR cut both strands across the 5 to 7 bp spacer between them",
  cutSite: "cut site",
  mechanismCaption: "ZFNs work as a pair, never alone. ZF1 to ZF6 are numbered here for the explanation; each monomer is its own 3-finger array.",
  stepRecogniseTitle: "Recognise",
  stepRecogniseBody: "One finger reads 3 bp, so three fingers read 9 bp.",
  stepDimeriseTitle: "Dimerise",
  stepDimeriseBody: "The ELD (−) and KKR (+) FokI domains pair only with each other.",
  stepCutTitle: "Cut",
  stepCutBody: "The 5–7 bp spacer between the two half-sites is where the break falls.",
  mechanismCta: "Start designing",

  targetLabel: "Target DNA",
  targetHint: "top strand 5′→3′ · FASTA accepted",
  ambiguous: "bp ambiguous",
  unsupported: "unsupported characters",
  methodLabel: "Method",
  spacerCenterLabel: "Spacer center",
  rangeLabel: "Range ±bp",
  resetExample: "Reset to example",

  candidates: "candidates",
  rankingNote: "Nearest to the requested center first; ties prefer 6 > 5 >> 7 bp spacers.",
  copyHint: "Drag across a sequence to select and copy it.",
  selected: "Selected",
  select: "Select",
  emptyRangeTitle: "Spacer center is out of range",
  emptyRangeBody: "Enter a coordinate inside the input sequence.",
  emptyCharsTitle: "Unsupported characters in the input",
  emptyCharsBody: "Remove the unsupported characters. IUPAC ambiguity codes are allowed.",
  emptyNoneTitle: "No candidates",
  emptyNoneBody: "No site in this sequence can be built from the selected archive. Widen the range, change the sequence, or switch method.",

  precursorStat: "aa precursor",
  f2aStat: "aa F2A",
  outputIntro: "One precursor polyprotein from the single ORF NLS–ZF-L 3F–FokI ELD–F2A–NLS–ZF-R 3F–FokI KKR. The GenPept file records each finger's method, module ID and recognition helix.",
  downloadGenPept: "GenPept (annotated)",
  downloadFasta: "FASTA",
  sequenceLabel: "AMINO ACID SEQUENCE",
  sequenceName: "Precursor polyprotein",
  outputNote: "No nucleotide sequence is produced. Codon-optimise and QC for your actual host and vector at the synthesis stage.",
  technicalSummary: "Finger detail and ORF architecture",
  fingerDirection: "protein N→C",
  fingerOrder: "On DNA the order runs F3 → F2 → F1.",
  archNls: "nuclear import",
  archZf: "binds 9 bp",
  archCleave: "cleavage",
  archSkip: "ribosome skip",

  evidenceTitle: "Where the design comes from",
  evidenceBody: "Candidate selection, the FokI variants and the F2A linkage each follow a specific primary source.",
  evidenceGupta: "87 two-finger modules covering 162 six-bp targets. The third finger comes from the position-specific 1F archive of Zhu et al. 2011 (DOI 10.1242/dev.066779).",
  evidenceSander: "Used only for a monomer Gupta cannot complete, and only where the shared F2 context matches.",
  evidenceDoyon: "Compared obligate ELD/KKR heterodimers, showing high activity with homodimer cleavage suppressed.",
  evidenceLei: "Linked both ZFNs through F2A and edited CCR5 in human cells.",
  sequenceSources: "SEQUENCE SOURCES",
  componentCategories: "component categories",
  evidenceNote: "The 9 of 11 result is a small, selectively evaluated cohort, not a general success rate. Mixed Gupta/CoDA pairs and the complete ELD/KKR + F2A construct emitted here have not been tested under those conditions. Presence in an archive is not a guarantee that a candidate binds, cleaves or edits.",
  donorNls: "nuclear localisation signal",
  donorFramework: "Gupta/Zhu Zif268 scaffold or Sander CoDA framework",
  donorFokI: "cleavage domain with engineered obligate-heterodimer mutations",
  donorF2A: "FMDV-derived 2A peptide; the paired-ZFN single ORF precedent is Lei 2011",

  errorNotInteger: "Enter a whole number of 0 or more.",
  errorOutOfRange: (maximum: number) => `Enter a coordinate between 0 and ${maximum}.`,
};

export type Copy = typeof en;

const ja: Copy = {
  languageName: "日本語",
  tagline: "3-finger ZFN デザイナー",
  versionAria: "GitHub Code ページを開く",
  localBadge: "ブラウザ内で計算",
  localBadgeAria: "設計計算は端末内のブラウザで実行され、配列がサーバーへ送信されることはありません",
  languageAria: "表示言語",

  heroTitle: "ZFN ペアを設計",
  heroBody: "標的の周辺配列を貼り付けてください。Gupta 2012 の 2F archive を優先して探索し、組めない側のモノマーだけ CoDA へ戻して、アミノ酸配列を返します。",
  heroCta: "配列を入力",
  heroPrivacy: "配列は端末内にとどまります",
  heroBenefitsAria: "このツールの特徴",
  heroBenefitBrowser: "ブラウザ内で処理",
  heroBenefitFormats: "GenPept / protein FASTA",

  studyHeadline: "Gupta 2012 で変異が入ったゼブラフィッシュ標的",
  studyCaveat: "選択的に評価された小規模 cohort です。本サイトの各候補の成功確率ではありません。",

  mechanismTitle: "ZFN ペアが DNA を見つけて切るまで",
  mechanismBody: "zinc finger が DNA を読み、FokI が切るヌクレアーゼです。左右の ZFN が 9 bp の half-site に結合すると、2 種類の FokI が spacer 上で出会い、切断する複合体になります。",
  mechanismFigureAria: "3-finger ZFN ペアの構成図",
  mechanismSvgTitle: "左右の 3-finger ZFN が DNA に結合し、FokI ヘテロ二量体が spacer を切断する構成",
  mechanismSvgDesc: "左 ZFN の ZF1〜ZF3 と右 ZFN の ZF4〜ZF6 が、F 鎖と R 鎖の 9 bp half-site に結合する。その間の 5〜7 bp spacer 上で FokI ELD と KKR がヘテロ二量体を形成する。",
  mechanismMobileAria: "ZF1〜ZF6 が F 鎖と R 鎖の 9 bp half-site に結合し、間の 5〜7 bp spacer で FokI ELD と KKR が両鎖を切断する",
  cutSite: "切断部位",
  mechanismCaption: "ZFN は単独ではなく左右一対で働きます。ZF1〜ZF6 は説明用の通し番号で、各モノマーがそれぞれ 3-finger array です。",
  stepRecogniseTitle: "認識",
  stepRecogniseBody: "1 finger が 3 bp、3 finger で 9 bp を読みます。",
  stepDimeriseTitle: "会合",
  stepDimeriseBody: "ELD (−) と KKR (+) の FokI は互いとだけ対を作ります。",
  stepCutTitle: "切断",
  stepCutBody: "左右の half-site に挟まれた 5–7 bp spacer が切断領域です。",
  mechanismCta: "設計を始める",

  targetLabel: "標的 DNA",
  targetHint: "上鎖 5′→3′ · FASTA 可",
  ambiguous: "bp が曖昧塩基",
  unsupported: "件の未対応文字",
  methodLabel: "設計法",
  spacerCenterLabel: "スペーサー中心",
  rangeLabel: "探索範囲 ±bp",
  resetExample: "例に戻す",

  candidates: "候補",
  rankingNote: "希望中心に近い順。同距離では 6 > 5 >> 7 bp の spacer を優先します。",
  copyHint: "配列はドラッグで選択・コピーできます。",
  selected: "選択中",
  select: "選択",
  emptyRangeTitle: "スペーサー中心が範囲外です",
  emptyRangeBody: "入力配列の内側の座標を指定してください。",
  emptyCharsTitle: "入力に未対応の文字があります",
  emptyCharsBody: "未対応文字を取り除いてください。IUPAC 曖昧塩基は使えます。",
  emptyNoneTitle: "候補がありません",
  emptyNoneBody: "選択中の archive で構成できる部位がこの配列にはありません。探索範囲、配列、設計法のいずれかを変えてください。",

  precursorStat: "aa 前駆体",
  f2aStat: "aa F2A",
  outputIntro: "NLS–ZF-L 3F–FokI ELD–F2A–NLS–ZF-R 3F–FokI KKR の単一 ORF から得られる前駆体 polyprotein 1 配列。GenPept には各 finger の設計法、module ID、認識 helix を記録します。",
  downloadGenPept: "GenPept（feature 付き）",
  downloadFasta: "FASTA",
  sequenceLabel: "アミノ酸配列",
  sequenceName: "前駆体 polyprotein",
  outputNote: "塩基配列は生成しません。合成時に、実際の宿主とベクターへ合わせてコドン最適化と QC を行ってください。",
  technicalSummary: "finger 構成と ORF アーキテクチャ",
  fingerDirection: "protein N→C",
  fingerOrder: "DNA 上では F3 → F2 → F1 の順に対応します。",
  archNls: "核移行",
  archZf: "9 bp を認識",
  archCleave: "切断",
  archSkip: "ribosome skip",

  evidenceTitle: "設計の出どころ",
  evidenceBody: "候補選択、FokI の変異体、F2A 連結は、それぞれ対応する一次文献に従っています。",
  evidenceGupta: "162 個の 6 bp 標的をカバーする 87 個の 2F module。3 番目の finger は Zhu et al. 2011（DOI 10.1242/dev.066779）の位置別 1F archive から取ります。",
  evidenceSander: "Gupta で完成しないモノマーに限り、共有 F2 context が一致する場合だけ使います。",
  evidenceDoyon: "obligate な ELD/KKR ヘテロ二量体を比較し、homodimer 切断を抑えたまま高活性を示した研究。",
  evidenceLei: "左右の ZFN を F2A で連結し、ヒト細胞で CCR5 を編集した先例。",
  sequenceSources: "配列の出典",
  componentCategories: "件の構成要素",
  evidenceNote: "9/11 は選択的に評価された小規模 cohort であり、一般的な成功率ではありません。Gupta/CoDA 混成ペアと、ここで出力する ELD/KKR + F2A 完全構成は、その条件で検証されていません。archive に存在することは、その候補が結合・切断・編集することの保証ではありません。",
  donorNls: "核移行配列",
  donorFramework: "Gupta/Zhu の Zif268 scaffold または Sander の CoDA framework",
  donorFokI: "切断ドメインに obligate ヘテロ二量体変異を導入",
  donorF2A: "FMDV 由来 2A peptide。左右 ZFN 単一 ORF の先例は Lei 2011",

  errorNotInteger: "0 以上の整数を入力してください。",
  errorOutOfRange: (maximum: number) => `0〜${maximum} の座標を入力してください。`,
};

export const COPY: Readonly<Record<Language, Copy>> = { en, ja };
