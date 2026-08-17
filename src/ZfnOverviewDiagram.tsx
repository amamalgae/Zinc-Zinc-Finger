const LEFT_FINGERS = [
  { label: "ZF1", x: 140 },
  { label: "ZF2", x: 235 },
  { label: "ZF3", x: 330 },
] as const;

const RIGHT_FINGERS = [
  { label: "ZF6", x: 635 },
  { label: "ZF5", x: 730 },
  { label: "ZF4", x: 825 },
] as const;

function DnaCell({ x, side, row }: { x: number; side: "left" | "right"; row: "F" | "R" }) {
  return (
    <g>
      <rect className={`overview-dna-cell ${side}`} x={x} y={row === "F" ? 190 : 236} width="90" height="38" rx="4" />
      <text className="overview-triplet" x={x + 45} y={row === "F" ? 214 : 260}>NNN</text>
    </g>
  );
}

function Finger({ x, label, side }: { x: number; label: string; side: "left" | "right" }) {
  const y = side === "left" ? 318 : 62;
  const connectorY1 = side === "left" ? 318 : 120;
  const connectorY2 = side === "left" ? 274 : 190;
  return (
    <g>
      <line className={`overview-recognition-line ${side}`} x1={x + 45} y1={connectorY1} x2={x + 45} y2={connectorY2} />
      <rect className={`overview-finger ${side}`} x={x} y={y} width="90" height="58" rx="15" />
      <text className="overview-finger-label" x={x + 45} y={y + 25}>{label}</text>
      <text className="overview-finger-bases" x={x + 45} y={y + 43}>3 bp</text>
    </g>
  );
}

function LightningIcon({ position }: { position: "top" | "bottom" }) {
  return (
    <svg className={`overview-mobile-lightning ${position}`} viewBox="0 0 24 30" aria-hidden="true">
      <path d="M10 1 H21 L15 11 H22 L5 29 L10 16 H2 Z" />
    </svg>
  );
}

function MobileFinger({ label, side }: { label: string; side: "left" | "right" }) {
  return (
    <div className={`overview-mobile-finger ${side}`}>
      <strong>{label}</strong>
      <small>3 bp</small>
    </div>
  );
}

function MobileDnaCell({ side }: { side: "left" | "right" }) {
  return <div className={`overview-mobile-dna-cell ${side}`}>NNN</div>;
}

function MobileOverviewDiagram() {
  return (
    <div
      className="overview-mobile-diagram"
      role="img"
      aria-label="F鎖とR鎖の左右9塩基をZF1からZF6が認識し、中央の5から7塩基のspacerでFokI ELDマイナスとKKRプラスが両鎖を切断する構成図"
    >
      <div className="overview-mobile-array right">
        <span className="overview-mobile-terminus">C</span>
        <div className="overview-mobile-foki positive"><strong>FokI</strong><small>KKR（＋）</small></div>
        <MobileFinger label="ZF6" side="right" />
        <MobileFinger label="ZF5" side="right" />
        <MobileFinger label="ZF4" side="right" />
        <span className="overview-mobile-terminus">N</span>
      </div>

      <div className="overview-mobile-dna-row f">
        <strong className="overview-mobile-strand">F</strong>
        <MobileDnaCell side="left" />
        <MobileDnaCell side="left" />
        <MobileDnaCell side="left" />
        <div className="overview-mobile-spacer">
          <span>5–7 bp spacer</span>
          <small className="cut-label">切断部位</small>
          <LightningIcon position="top" />
        </div>
        <MobileDnaCell side="right" />
        <MobileDnaCell side="right" />
        <MobileDnaCell side="right" />
      </div>

      <div className="overview-mobile-dna-row r">
        <strong className="overview-mobile-strand">R</strong>
        <MobileDnaCell side="left" />
        <MobileDnaCell side="left" />
        <MobileDnaCell side="left" />
        <div className="overview-mobile-spacer">
          <span>5–7 bp spacer</span>
          <small className="cut-label">切断部位</small>
          <LightningIcon position="bottom" />
        </div>
        <MobileDnaCell side="right" />
        <MobileDnaCell side="right" />
        <MobileDnaCell side="right" />
      </div>

      <div className="overview-mobile-array left">
        <span className="overview-mobile-terminus">N</span>
        <MobileFinger label="ZF1" side="left" />
        <MobileFinger label="ZF2" side="left" />
        <MobileFinger label="ZF3" side="left" />
        <div className="overview-mobile-foki negative"><strong>FokI</strong><small>ELD（−）</small></div>
        <span className="overview-mobile-terminus">C</span>
      </div>
    </div>
  );
}

export default function ZfnOverviewDiagram() {
  return (
    <section className="mechanism-overview" id="how-zfn-works" aria-labelledby="mechanism-title">
      <div className="mechanism-heading">
        <div>
          <span>HOW A 3-FINGER ZFN PAIR WORKS</span>
          <h2 id="mechanism-title">3本のfingerで9 bp。<br />左右2本で標的を挟む。</h2>
        </div>
        <p>ZFはDNA配列を見分ける部分、FokIはDNAを切るヌクレアーゼです。左右のZFNがそれぞれ9 bpへ結合すると、spacer上で2種類のFokIが組み合わさり、切断可能な複合体になります。</p>
      </div>

      <figure className="overview-figure">
        <div className="overview-svg-scroll" tabIndex={0} aria-label="3-finger ZFNペアの構成図">
          <svg className="overview-svg" viewBox="0 0 1040 430" role="img" aria-labelledby="zfn-overview-title zfn-overview-desc">
            <title id="zfn-overview-title">左右の3-finger ZFNがDNAを認識し、FokIヘテロ二量体がspacerを切断する構成</title>
            <desc id="zfn-overview-desc">F鎖とR鎖からなるDNAの左右9塩基を、左ZFNのZF1からZF3と右ZFNのZF4からZF6が認識する。中央の5から7塩基のspacerでFokI ELDマイナスとKKRプラスがヘテロ二量体を形成する。</desc>
            <defs>
              <linearGradient id="overview-left-finger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f2f8ef" />
                <stop offset="1" stopColor="#cfe5d5" />
              </linearGradient>
              <linearGradient id="overview-right-finger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#eef7fa" />
                <stop offset="1" stopColor="#cce1ea" />
              </linearGradient>
              <filter id="overview-shadow" x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#173b30" floodOpacity=".12" />
              </filter>
              <marker id="overview-arrow-left" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 Z" fill="#416c5b" />
              </marker>
              <marker id="overview-arrow-right" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 Z" fill="#47758a" />
              </marker>
            </defs>

            <rect className="overview-stage" x="16" y="12" width="1008" height="406" rx="28" />
            <path className="overview-guide right" d="M 934 42 H 625" markerEnd="url(#overview-arrow-right)" />
            <text className="overview-array-title right" x="780" y="34">Right ZFN · protein N → C</text>
            <path className="overview-guide left" d="M 110 398 H 425" markerEnd="url(#overview-arrow-left)" />
            <text className="overview-array-title left" x="268" y="417">Left ZFN · protein N → C</text>

            {RIGHT_FINGERS.map((finger) => <Finger key={finger.label} {...finger} side="right" />)}
            {LEFT_FINGERS.map((finger) => <Finger key={finger.label} {...finger} side="left" />)}

            <text className="overview-terminus right" x="944" y="97">N</text>
            <text className="overview-terminus left" x="112" y="354">N</text>

            <path className="overview-protein-link right" d="M635 91 C607 91 606 116 590 132" />
            <path className="overview-foki positive" filter="url(#overview-shadow)" d="M595 86 C628 103 632 145 610 172 C596 190 570 198 544 187 C521 178 505 156 509 132 C514 102 549 73 595 86 Z" />
            <text className="overview-foki-name positive" x="568" y="126">FokI</text>
            <text className="overview-foki-variant positive" x="568" y="148">KKR（＋）</text>
            <text className="overview-terminus right" x="496" y="178">C</text>

            <path className="overview-protein-link left" d="M420 347 C447 347 451 326 467 309" />
            <path className="overview-foki negative" filter="url(#overview-shadow)" d="M462 286 C479 266 508 258 533 270 C557 281 570 306 564 331 C557 361 523 386 481 373 C448 363 435 318 462 286 Z" />
            <text className="overview-foki-name negative" x="505" y="315">FokI</text>
            <text className="overview-foki-variant negative" x="505" y="337">ELD（−）</text>
            <text className="overview-terminus left" x="579" y="354">C</text>

            <text className="overview-strand-name f" x="56" y="215">F</text>
            <text className="overview-dna-end" x="93" y="215">5′</text>
            <text className="overview-strand-name r" x="56" y="261">R</text>
            <text className="overview-dna-end" x="93" y="261">3′</text>
            <text className="overview-dna-end" x="937" y="215">3′</text>
            <text className="overview-dna-end" x="937" y="261">5′</text>

            {LEFT_FINGERS.map(({ x, label }) => <DnaCell key={`F-${label}`} x={x} side="left" row="F" />)}
            {RIGHT_FINGERS.map(({ x, label }) => <DnaCell key={`F-${label}`} x={x} side="right" row="F" />)}
            {LEFT_FINGERS.map(({ x, label }) => <DnaCell key={`R-${label}`} x={x} side="left" row="R" />)}
            {RIGHT_FINGERS.map(({ x, label }) => <DnaCell key={`R-${label}`} x={x} side="right" row="R" />)}

            <rect className="overview-spacer" x="430" y="190" width="195" height="38" rx="4" />
            <rect className="overview-spacer" x="430" y="236" width="195" height="38" rx="4" />
            <path className="overview-lightning" d="M518.5 174 H537.5 L530.5 185 H544.5 L516.5 206 L524.5 192 H510.5 Z" />
            <path className="overview-lightning" d="M518.5 258 H537.5 L530.5 269 H544.5 L516.5 290 L524.5 276 H510.5 Z" />
            <text className="overview-spacer-length" x="527.5" y="207">5–7 bp spacer</text>
            <text className="overview-spacer-label" x="527.5" y="260">切断部位</text>
          </svg>
        </div>
        <MobileOverviewDiagram />
        <figcaption>1本のZFNだけではなく、左右一対で働く構成です。図のZF1〜ZF6は説明用の通し番号で、実際のCoDA設計では左右それぞれ3-finger arrayを構成します。</figcaption>
      </figure>

      <ol className="mechanism-steps">
        <li><span>01</span><div><strong>配列を認識</strong><p>1 fingerがおよそ3 bp、3 fingerで9 bpを認識します。</p></div></li>
        <li><span>02</span><div><strong>中央で会合</strong><p>ELD（−）とKKR（＋）のFokIが異種二量体を形成します。</p></div></li>
        <li><span>03</span><div><strong>DNAを切断</strong><p>左右の認識部位に挟まれた5–7 bp spacerが切断領域になります。</p></div></li>
      </ol>

      <div className="mechanism-footer">
        <p><strong>このツールが行うこと：</strong>入力配列から、この左右3ZF＋FokI構成を作れる標的候補を探し、完全アミノ酸配列を出力します。</p>
        <a href="#designer">この構成で設計を始める <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
