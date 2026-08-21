# Zinc Zinc Finger

Gupta 2012のtwo-finger module archiveを優先し、構成できない片側だけSander 2011のCoDAへフォールバックして、左右3-fingerのZFN候補をブラウザ内で設計するツールです。従来のCoDA-only設計にも切り替えられます。

公開ページ：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

別のAI・開発者へ引き継ぐ場合は、現行仕様だけでなく採用・不採用の根拠、過去の検証値、全変更履歴、一次資料の対応をまとめた[AI handoff and decision record](docs/AI_HANDOFF.md)を最初に参照してください。自動化されたcoding agent向けの不変条件は[AGENTS.md](AGENTS.md)にあります。

## 現在の設計範囲

- Gupta et al. (2012), DOI [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) のimplementation archive 162標的・87個の2F moduleを収録
- Gupta 3Fは、完全な2F moduleをF1–F2またはF2–F3へ置き、残る1FをZhu et al. (2011), DOI [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) の位置別archiveから補う
- 設計法は1つのプルダウンから選び、デフォルトは`v2 · Gupta + CoDA fallback`、従来方式は`v1 · CoDA only`。フォールバックは完成した3Fモノマー単位で行い、1本の3F内でGuptaとCoDAを混ぜない
- CoDA fallback用にF1 unit 319件、固定F2 context 18種、F3 unit 344件を収録
- 左右とも3-fingerに固定し、5–7 bp spacerを探索
- GuptaはXLSにある6 bp標的、CoDAは共有F2 contextが一致する組合せだけを使い、archiveにない組合せを予測や補間で埋めない
- 希望スペーサー中心と探索範囲はスピナーのない手入力欄で、初期値はいずれも1000 bp。希望中心が入力配列外なら赤色で訂正を求め、候補計算を停止
- 希望スペーサー中心への近さを最優先し、同距離では`6 > 5 >> 7`の順で候補を順位付け
- 公開画面の表示文字はすべて英語（`index.html`の`lang`とdescription、模式図、検証メッセージ、開閉ラベルを含む）。公開UIが描画しない旧研究モジュールの文字列は日本語のまま
- 画面文字は13px未満を使わず（模式図内を除く）、01 INPUT / 02 SELECT / 03 PROTEIN OUTPUTは説明文を置かないミニマル構成。項目名は`Target DNA`・`Method`・`Spacer center`・`Range ±bp`の英語1語で、状態表示は問題があるときだけ出す。候補行は塩基配列を独立した行に置いて全長を読めるようにする
- 02 SELECTは順位付けされた候補を最大30件すべてスクロール表示し、候補行全体を押して選択可能。表示塩基配列は選択状態を保ったままマウスドラッグで範囲選択・コピー可能
- 各fingerの標的triplet、7 aa recognition helix、設計法、module ID、完全array配列を表示
- `NLS–ZF-L 3F–FokI ELD–F2A–NLS–ZF-R 3F–FokI KKR`の単一ORFを生成
- 選択候補の前駆体polyprotein 1配列を常時画面に表示し、`Download (GenPept: featureあり)`からZF1–ZF6、FokI ELD/KKR、F2Aのfeature付きGenPeptで保存
- `Download (fasta)`から同じ前駆体1配列を保存し、ファイル名は候補番号に対応する`ZFN_ResultNN.gp` / `ZFN_ResultNN.fasta`
- 塩基配列、codon-optimized CDS、nucleotide GenBankは生成しない

公開ページは、価値提案とGupta 2012の小規模cohort、ZFNの基本構成を示すオリジナル概念図、01 INPUT、02 SELECT、03 PROTEIN OUTPUTの順に進みます。設計法は01で切り替え、左右それぞれのGupta/CoDA由来は02と出力ファイルに表示します。候補配列と希望位置との差は02の各候補行に表示し、finger構成と単一ORFの構成は03直下の折りたたみ表示で確認できます。

入力配列はブラウザ内だけで処理され、外部へ送信されません。FASTA header、空白、位置番号は無視します。IUPAC曖昧塩基とgapは`N`として座標を保持し、それらをまたぐ標的窓は候補から除外します。未対応文字がある場合は設計を停止します。

画面右上の`ver.N (PR #N)`は、その版を導入したGitHub Pull Request `#N`に対応し、表記自体から該当PRを開けます。

## Spacer候補順位の根拠

候補順位は、まず希望スペーサー中心からの絶対距離で決めます。距離が同じ候補だけ、spacer長を`6 > 5 >> 7`の順に扱います。ここで`>`は6 bpを5 bpより優先し、`>>`は7 bpを5–6 bpより明確に後順位へ置くことを表す定性的な表記です。実装上の順序は6、5、7という離散的なtie-breakであり、記号の数は定量的な活性比を意味しません。

現在のZF–FokI linkerは5 bp=`TGGS`、6 bp=`TGAAAR`、7 bp=`TGPGAAAR`です。根拠となる実験は、同一ZFNでspacerだけを変えた直接比較と、異なる標的を多数含むCoDA cohortに分けて読む必要があります。

| 一次研究 | 比較したもの | 定量結果 | この順位への意味 |
|---|---|---|---|
| Shimizu et al. (2009), DOI: [10.1016/j.bmcl.2009.02.109](https://doi.org/10.1016/j.bmcl.2009.02.109) | 同じZFNペアと6 aa `TGAAAR` linkerを使い、reporterのspacerを4–8 bpに変更したHEK293T episomal SSA | 6 bpで鋭い最大値を示し、4、5、7、8 bpは約6分の1の活性 | 6 bpを5 bpより先に置く最も直接的な根拠。ただしplasmid reporterとDD/RR FokIでの比較 |
| Händel et al. (2009), DOI: [10.1038/mt.2008.233](https://doi.org/10.1038/mt.2008.233) | 同一ZF背景で11種類のZF–FokI linkerと4–18 bp spacerを系統比較 | 6 aa linkerでは6 bpが7 bpの約5倍（episomal）、約4倍（chromosomal）。4 aa linkerは5–6 bp、より長いlinkerは7 bp以上にも活性域を拡大した | linker長と配列がspacer選択性を変えることを実証。7 bpを使えるlinkerはあるが、5–6 bpほど限定的・一様ではない |
| Bhakta et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112) | 5/6/7 bpに`TGGS`/`TGAAAR`/`TGPGAAAR`を割り当てたextended-MA ZFN | 6+6-finger ZFNは21標的中15標的（71%）で変異を生成 | 現在の3種類の割当てに実用例があることを支持。ただし標的・finger数が異なるため、spacer間効率の比較にはならない |
| Chen et al. (2013), DOI: [10.1093/nar/gks1356](https://doi.org/10.1093/nar/gks1356) | zebrafish内在性標的に対する84組の3-finger CoDA ZFN | 5 bpと6 bpのindel率分布に有意差なし（P=0.42）。7 bpは5/6 bpより「active」になる割合が約4–5分の1 | `6 > 5`を強い差とは扱わず、`5 >> 7`として7 bpを明確に下げる根拠 |

Chen 2013のSupplementary Table S1を、同論文がgermline変異を得られる目安として定義したsomatic indel率`>0.27%`で集計すると次のとおりです。

| Spacer | ZFNペア数 | Active（>0.27%） | Active率 | 平均somatic indel率 |
|---:|---:|---:|---:|---:|
| 5 bp | 30 | 17 | 56.7% | 2.73% |
| 6 bp | 28 | 13 | 46.4% | 2.64% |
| 7 bp | 26 | 3 | 11.5% | 0.121% |

7 bpのactive率は5 bpの約1/4.9、6 bpの約1/4.0です。一方、5 bpと6 bpはこのin vivo cohortでは同等であり、`6 > 5`はShimizu 2009の同一背景での直接比較をtie-breakへ弱く反映したものです。`>>`はこの証拠の非対称性を表しますが、特定候補の倍率を表す記号ではありません。

ただし、この順位はspacer長に基づく粗い集団傾向であり、候補固有の活性予測ではありません。Händel 2009とShimizu 2009は同じ標的背景でlinker/spacer効果を比較できる一方、Chen 2013とBhakta 2013では標的配列、ZF array、細胞・生物、FokI構成なども候補間で変わります。現在の`TGGS` / `TGAAAR` / `TGPGAAAR` linker、GuptaまたはCoDA 3F、ELD/KKR、F2Aを組み合わせた完全構成は、いずれの研究でもそのまま比較されていません。したがって、上表の率を本サイトの候補へ予測indel率や成功確率として転用してはいけません。

## Gupta 2012の組立てとfallback

Gupta et al. (2012), DOI [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) のSupplementary Table 2には、87個の2F moduleと、それらが認識する162個の6 bp配列が記載されています。本実装はXLSの各行をそのまま有限lookupとして使います。3F arrayでは2F moduleをタンパク質N→CのF1–F2またはF2–F3へ置き、残るfingerだけをZhu et al. (2011), DOI [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) の81個の位置別1F moduleから選びます。C2H2 fingerはDNAと逆平行に結合するため、DNA 5′側のtripletはタンパク質F3が認識します。

デフォルトprofileでは、各9 bp half-siteについてまずGupta 3Fを完成できるか調べます。できない場合だけ、そのhalf-site全体をCoDA 3Fとして組み直します。したがって左右ペアはGupta/Gupta、Gupta/CoDA、CoDA/Gupta、CoDA/CoDAのいずれかになりますが、単一3F内のfinger単位mixはありません。候補順位は従来どおり希望位置、spacer長の順が先で、それらも同じ場合にGuptaを使える腕が多い候補を優先します。

全262,144通りの9-merを実装上の有限lookupで全探索すると、Gupta 3Fだけで8,700（3.319%）、CoDAだけで6,680（2.548%）、Gupta + CoDA fallbackの和集合で13,978（5.332%）を構成できます。half-site coverageの和集合はCoDA単独の2.09倍です。これは均一ランダム9-merに対する組立て可能率であり、ゲノム中のZFNペア密度や活性率そのものではありません。

原著のonline methodには2F specificity categoryを使うscoringの説明がありますが、implementation workbookは合理的改変を含む全162行へgood/fair/poorを割り当てていません。本実装は未記載categoryを推定せず、archive availabilityとprovenanceだけを用います。

## CoDAの組立て

CoDAは、実験的に選択されたF1/F2 unitとF2/F3 unitを、共通する固定F2で接続します。標的ごとに新たなライブラリを作ってselectionする工程は設計時に不要ですが、完成ZFNの発現・結合・切断・毒性・off-target検証は必要です。

C2H2 fingerはDNAと逆平行に結合します。認識鎖が`5′-GTG-GGG-GAG-3′`なら、タンパク質のN→C末端は`F1=GAG、F2=GGG、F3=GTG`です。各fingerはWO2011017293A2の共通framework（SEQ ID NOs: 841–844）にrecognition helixを入れ、finger間をcanonical `TGEKP` linkerで連結します。

CoDAは、Guptaで構成できないhalf-siteの監査可能なfallbackとして残しています。文脈依存で実験選択された有限のunit archiveを欠損補間なしで再現できる利点は変わりません。GuptaまたはCoDAの公開データを実装したことは、特許クリアランスを意味しません。判断表と検証値は[AI handoff](docs/AI_HANDOFF.md)に記録しています。

## 構成

```text
Promoter → NLS–ZF-L(3F)–FokI ELD → F2A → NLS–ZF-R(3F)–FokI KKR → Terminator
```

FokIはDNAを切断するヌクレアーゼドメインです。左右には二量体化界面の電荷が異なるELD（−）とKKR（＋）を割り当て、異種間で機能するobligate heterodimerとして表示します。F2Aのribosomal skippingにより、ELD側とKKR側を1本の転写産物から発現させる設計です。現在の22 aa配列はfoot-and-mouth disease virus由来のF2Aです。左右ZFNをF2Aで連結した単一ORFの実施先例として、Lei 2011の哺乳類細胞でのCCR5編集を根拠にしています。

本ツールが固定するのはアミノ酸配列です。Gupta/ZhuまたはCoDA array、finger間linker、ZF–FokI linker、SV40 NLS、FokI ELD/KKR、F2Aはいずれもペプチドとして定義し、特定の同義コドン列には固定しません。DNA合成時に、実際の宿主・オルガネラ・発現ベクターに合わせて別途コドン最適化と配列QCを行います。

主出力のGenPept（`.gp`）は、前駆体polyprotein 1配列へ1-based amino-acid座標の`Region` featureを付ける標準テキスト形式です。ZF1–ZF6、FokI (ELD)、F2A、FokI (KKR)の9領域を、標的triplet、recognition helix、FokI変異の説明とともに格納します。Protein FASTAも同じ前駆体1配列だけを格納し、F2A処理後の予測産物はどちらにも出力しません。候補01を選択した場合のファイル名は`ZFN_Result01.gp`と`ZFN_Result01.fasta`です。[SnapGene](https://support.snapgene.com/hc/en-us/articles/10384012120596-Import-a-Protein-Sequence)、[Benchling](https://help.benchling.com/hc/en-us/articles/38759866105229-AA-sequence-overview)、[Geneious Prime](https://www.geneious.com/features/import-export-sequence-data)は注釈付きprotein sequenceとして読み込めます。ApEはDNA/plasmid中心のため、このprotein-onlyファイルの表示先には想定していません。色は各エディター側のfeature設定に依存します。

## データ源

Gupta 2F tableはGupta 2012のSupplementary Table 2 implementation workbookを転記し、原ファイルMD5 `1998b2a86b539c624bbb5ee944875530`、162 unique targets、87 unique modulesを監査します。Zhu 1FはZhu 2011のSupplementary Table S1にある27 triplet × 3 positions = 81 modulesです。CoDA unit tableはSander 2011のSupplementary Tables 1–2を転記し、件数とframeworkをWO2011017293A2で照合しています。

| 用途 | 文献 |
|---|---|
| 2F module archiveと1F/2F assembly | Gupta et al. (2012), DOI: [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) |
| 位置別1F module archive | Zhu et al. (2011), DOI: [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) |
| 3-finger CoDA | Sander et al. (2011), DOI: [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) |
| 5–7 bp ZF–FokI linker比較 | Händel et al. (2009), DOI: [10.1038/mt.2008.233](https://doi.org/10.1038/mt.2008.233) |
| 6 bp `TGAAAR` spacer選択性 | Shimizu et al. (2009), DOI: [10.1016/j.bmcl.2009.02.109](https://doi.org/10.1016/j.bmcl.2009.02.109) |
| CoDA ZFNの5–7 bp活性傾向 | Chen et al. (2013), DOI: [10.1093/nar/gks1356](https://doi.org/10.1093/nar/gks1356) |
| CoDA unit framework | [WO2011017293A2](https://patents.google.com/patent/WO2011017293A2/en) |
| obligate heterodimer FokI ELD/KKR | Doyon et al. (2011), DOI: [10.1038/nmeth.1539](https://doi.org/10.1038/nmeth.1539) |
| 哺乳類ZFNのF2A単一ORF先例 | Lei et al. (2011), DOI: [10.1038/mt.2011.12](https://doi.org/10.1038/mt.2011.12) |

## 実装検証の範囲

- Gupta XLSの162 target rows、162 unique targets、87 unique module IDs、helix形式、原ファイルMD5を監査します。
- 全162行をF2–F3配置の3Fとして再構成し、2FのF1/F2 helixが転記行と一致することをテストします。
- Gupta原著Supplementary Table 3のdab2ip `GACATGGAC`について、N→C helix `LKGNLTR / RSDTLKQ / DKGNLTR`を再現します。
- Gupta/CoDA混成ペアでもfallbackが完成3Fモノマー境界だけで起こり、GenPeptに各fingerの由来が残ることをテストします。
- archiveの18 F2 context、319 F1 unit、344 F3 unitについて、形式、複合キー重複、F2 helix一致を起動時に検査します。
- F1/F3の標的triplet別件数をWO2011017293A2のSEQ ID範囲から得た独立の期待値と照合します。
- 4^9 = 262,144通りの9-merを全探索し、同じF2 contextを共有するF1/F3の直積だけが組立て可能になることをテストします。
- 左右鎖方向、5–7 bp spacer、距離境界、順位を独立の全走査oracleと比較します。
- 曖昧塩基を削除して前後を誤結合する回帰ケースをテストします。

これらは**選択ロジックと転記データの構造検証**です。Gupta 2012の9/11 ZFN cohortやSander 2011の181 B2H arraysを、新規候補の活性予測値へ変換していません。

## 重要な制限

- Gupta 2012ではゼブラフィッシュ11標的中9標的で0.5%超のindelが得られましたが、標的はarchive全体から無作為抽出されておらず、小規模cohortです。一般成功率や候補固有確率として使えません。
- Gupta 3Fは2F moduleとZhu 1F moduleの組合せです。Gupta/CoDA混成の左右ペア、および本ツールのELD/KKR + F2A完全構成は原著と同一条件で試験されていません。
- 原著のB2H評価では181 array中139（76.8%）が3倍超、14（7.7%）が1.57倍未満でした。さらにZFNとして調べた38標的中19（50%）で変異導入が検出されています。この集団成績はarchiveにある個々の新規組合せの成功確率ではありません。
- 候補順位に未測定の活性スコアは加えていません。複数候補を発現系とSSA等で比較してください。
- `spacer中心`は左右half-site間の幾何学的中心です。FokIによる特定の切断結合を予測・保証する座標ではありません。
- ELD/KKR、F2A、GuptaまたはCoDA 3Fを組み合わせた完全構成そのものは本ツールの設計提案であり、同一条件での実験検証は未実施です。
- 出力はアミノ酸配列です。塩基配列、promoter、terminator、UTR、選択マーカー、vector backboneは含みません。
- 公開情報を実装したことはFTOを意味しません。特許・ライセンスは用途と地域に応じて別途確認してください。

第三者由来データと配列の整理は[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)に記載しています。

## ローカル実行

Node.js 22以上が必要です。

```bash
npm ci
npm run dev
```

検証：

```bash
npm run lint
npm run build
npm run audit:gupta
npm run audit:coda
npm test
```

## ライセンス

[MIT License](LICENSE)。文献・特許由来の科学データや配列にMITを再付与するものではありません。
