# Zinc Zinc Finger

Bhakta 2013のextended modular assemblyをv3としてデフォルト実装し、Gupta 2012 + CoDA fallbackのv2、CoDA-onlyのv1も切り替えて使えるブラウザ内ZFN設計ツールです。

公開ページ：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

別のAI・開発者へ引き継ぐ場合は、[AI handoff and decision record](docs/AI_HANDOFF.md)と、現在のv3決定を記録した[Bhakta 2013 v3 addendum](docs/AI_HANDOFF_V3_BHAKTA_2013.md)を参照してください。自動化されたcoding agent向けの不変条件は[AGENTS.md](AGENTS.md)にあります。

## 現在の設計範囲

設計法は1つのプルダウンから選択します。

- `v3 · Bhakta 2013`（デフォルト）: Bhakta MS et al. (2013), DOI [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112) のextended modular assembly。公開Barbas/Bhakta 1F archive 49 moduleから左右6-fingerを構成し、18 bp + 5–7 bp spacer + 18 bpを探索します。combined B-score `>=15`だけを主候補にします。
- `v2 · Gupta + CoDA fallback`: Gupta A et al. (2012), DOI [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) の87個の2F module / 162標的を優先し、残る1FをZhu C et al. (2011), DOI [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) の位置別archiveから補います。完成できないhalf-siteだけSander JD et al. (2011), DOI [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) のCoDAへモノマー単位でfallbackします。
- `v1 · CoDA only`: Sander 2011の319 F1 units、18 fixed F2 contexts、344 F3 unitsを共有F2 contextが一致する場合だけ組みます。

共通仕様：

- archiveにないmoduleや組合せを予測・補間で埋めません。
- 希望スペーサー中心と探索範囲はスピナーのない手入力欄で、初期値はいずれも1000 bpです。希望中心が入力配列外なら候補計算を停止します。
- v3では**中心からの距離を順位に使いません**。探索範囲内なら、combined B-scoreが高い候補、context/module警告が少ない候補を優先し、その後に`6 > 5 >> 7`のspacer順を使います。距離は表示情報として残します。
- v2/v1では従来どおり希望スペーサー中心への近さを最優先し、同距離では`6 > 5 >> 7`を使います。
- v3の候補選択後は同じ切断部位に対するL3–L6 × R3–R6の16構成をtechnical detailで確認できます。主候補検索自体はBhakta 2013の推奨workflowに合わせL6+R6です。
- 表示は英語と日本語の2言語で、公開UI文字列は`src/i18n.ts`の`COPY.en` / `COPY.ja`に置きます。
- 02 SELECTは順位付けされた候補を最大30件すべてスクロール表示し、候補行の塩基配列は選択状態のまま範囲選択・コピーできます。
- 各fingerの標的triplet、7 aa recognition helix、設計法、完全array配列を確認できます。
- 出力はprotein-onlyです。v3では`NLS–ZF-L 6F–FokI ELD–F2A–NLS–ZF-R 6F–FokI KKR`、v2/v1では各側3Fの単一ORF前駆体polyproteinを出します。
- `Download (GenPept: featureあり)`と`Download (fasta)`は同じ前駆体1配列を保存します。v3 GenPeptはZF1–ZF12までfeature化します。
- 塩基配列、codon-optimized CDS、nucleotide GenBankは生成しません。

入力配列はブラウザ内だけで処理され、外部へ送信されません。FASTA header、空白、位置番号は無視します。IUPAC曖昧塩基とgapは`N`として座標を保持し、それらをまたぐ標的窓は候補から除外します。未対応文字がある場合は設計を停止します。

画面右上の`ver.N (PR #N)`は、その版を導入したGitHub Pull Request `#N`に対応します。

## v3: Bhakta 2013 extended modular assembly

Bhakta MS et al. (2013), DOI [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112) は、Barbas系single-finger moduleを3–6本へ延長し、L6+R6を最初に試すextended modular assemblyを評価しました。L6+R6では探索・prospectiveを合わせ21標的中15標的でactiveでした。prospective 11標的はcombined B-score `>=15`を基準に選ばれ、8/11がactiveでした。この15/21は新規候補の71%成功確率ではありません。

v3は49個の公開moduleを有限lookupとして使います。各moduleのB-scoreはBhakta 2013で用いられたmodule単位の公開値を保持し、左右12 fingerの和をcombined B-scoreとします。候補eligibilityは`B >= 15`です。

Sp1C-style arrayはMandell JG, Barbas CF III (2006), DOI [10.1093/nar/gkl209](https://doi.org/10.1093/nar/gkl209) の公開framework記述に従い、次を連結します。

```text
LEPGEKP
[ YKCPECGKSFS + recognition helix + HQRTH ]
TGEKP
...
[ YKCPECGKSFS + recognition helix + HQRTH ]
TGKKTS
```

Bhakta 2013のSupplemental Appendices XLSそのものはrepositoryへ同梱していません。したがって、本実装は公開module archive、原著の標的配列/B-score、既存benchmark再構成、Mandell 2006 frameworkに対して監査していますが、「出力する全arrayがSupplemental XLSから逐語転記された」とは扱いません。

### v3候補順位

ユーザー要件として、v3では中心位置への近さは順位に使いません。希望位置と`Range ±bp`は「どの範囲まで切断位置を許容するか」だけを定義します。

順位は次の順です。

1. combined B-scoreが高い
2. TSO/context warningが少ない
3. historical unfavorable moduleが少ない
4. historical favorable moduleが多い
5. spacer `6 > 5 >> 7`
6. 完全同点だけgenomic startで決定

距離は候補行に表示しますがcomparatorには入りません。回帰試験では、中心から900 bp離れたB20候補が距離0のB16候補より上位になることを固定しています。

B-scoreは粗いevidence-based rankingであり、候補固有の活性予測値ではありません。repo内のexact L6+R6 21例では15 active、published B-scoreは20/21で再現し、唯一CS7-3がpaper B=21 / module-sum B=20です。この21例だけでのB-score ROC-AUCは約0.656です。

## Spacer候補順位とZF–FokI linkerの根拠

v3ではspacer長はB-score/contextより後のtie-breakです。v2/v1では、まず希望スペーサー中心からの絶対距離で決め、距離が同じ候補だけ`6 > 5 >> 7`を使います。`>`や`>>`は定量的な活性比を意味しません。

ZF–FokI linkerは5 bp=`TGGS`、6 bp=`TGAAAR`、7 bp=`TGPGAAAR`です。

| 一次研究 | 比較したもの | 定量結果 | 解釈 |
|---|---|---|---|
| Shimizu et al. (2009), DOI: [10.1016/j.bmcl.2009.02.109](https://doi.org/10.1016/j.bmcl.2009.02.109) | 同じZFNペアと6 aa `TGAAAR` linkerでspacer 4–8 bp | 6 bpで最大、4/5/7/8 bpは約6分の1 | 6 bpを5 bpより先に置く直接的根拠 |
| Händel et al. (2009), DOI: [10.1038/mt.2008.233](https://doi.org/10.1038/mt.2008.233) | 同一ZF背景で11種類のZF–FokI linkerと4–18 bp spacer | 6 aa linkerでは6 bpが7 bpの約5倍（episomal）、約4倍（chromosomal） | linkerとspacerの相互依存を実証 |
| Bhakta et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112) | 5/6/7 bpへ`TGGS`/`TGAAAR`/`TGPGAAAR` | 6+6-finger ZFNは21標的中15標的でactive | 現在の3 linker割当ての実用例 |
| Chen et al. (2013), DOI: [10.1093/nar/gks1356](https://doi.org/10.1093/nar/gks1356) | zebrafish内在性標的の84組3-finger CoDA ZFN | 5 bpと6 bpのindel率分布に有意差なし（P=0.42）。7 bpはactive率が大幅に低い | `6 > 5`は弱いtie-break、`5 >> 7`は明確 |

Chen 2013 Supplementary Table S1をsomatic indel率`>0.27%`で集計した値：

| Spacer | ZFNペア数 | Active（>0.27%） | Active率 | 平均somatic indel率 |
|---:|---:|---:|---:|---:|
| 5 bp | 30 | 17 | 56.7% | 2.73% |
| 6 bp | 28 | 13 | 46.4% | 2.64% |
| 7 bp | 26 | 3 | 11.5% | 0.121% |

5 bpと6 bpのindel率分布に有意差なし（P=0.42）であり、`6 > 5 >> 7`は離散的な優先順であって予測indel率ではありません。現在のBhakta 6FまたはGupta/CoDA 3F、ELD/KKR、F2Aを組み合わせた完全構成は、これらの研究でそのまま比較されていません。

## v2: Gupta 2012の組立てとCoDA fallback

Gupta A et al. (2012), DOI [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) のSupplementary Table 2には、87個の2F moduleと162個の6 bp標的が記載されています。v2はXLS各行を有限lookupとして使い、完全な2F moduleをF1–F2またはF2–F3へ置き、残るfingerをZhu C et al. (2011), DOI [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) の位置別1F moduleから選びます。

各9 bp half-siteについてGupta 3Fを完成できなければ、そのhalf-site全体をCoDA 3Fとして組み直します。単一3F内でGuptaとCoDAをfinger単位mixしません。v2の順位は希望位置、spacer長、その後Guptaを使える腕数です。

全4^9 = 262,144通りの9-merでは、Gupta 3Fだけで8,700（3.319%）、CoDAだけで6,680（2.548%）、Gupta + CoDA fallbackの和集合で13,978（5.332%）を構成できます。これは均一ランダム9-merに対する組立て可能率であり、ゲノム中のZFNペア密度や活性率ではありません。

## v1: CoDA

CoDAはSander JD et al. (2011), DOI [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) の実験選択済みF1/F2 unitとF2/F3 unitを共通する固定F2で接続します。標的ごとの新規selectionは設計時に不要ですが、完成ZFNの発現・結合・切断・毒性・off-target検証は必要です。

C2H2 fingerはDNAと逆平行に結合します。認識鎖が`5′-GTG-GGG-GAG-3′`ならタンパク質N→Cは`F1=GAG、F2=GGG、F3=GTG`です。

## 出力構成

v3：

```text
NLS–ZF-L(6F)–FokI ELD → F2A → NLS–ZF-R(6F)–FokI KKR
```

v2/v1：

```text
NLS–ZF-L(3F)–FokI ELD → F2A → NLS–ZF-R(3F)–FokI KKR
```

FokI ELD/KKRはDoyon Y et al. (2011), DOI [10.1038/nmeth.1539](https://doi.org/10.1038/nmeth.1539) を根拠とし、F2Aで左右ZFNを単一ORF化する先例はLei Y et al. (2011), DOI [10.1038/mt.2011.12](https://doi.org/10.1038/mt.2011.12) です。Bhakta 2013はこのexact ELD/KKR + F2A complete constructを試していません。各要素の根拠を組み合わせた設計提案として扱います。

本ツールが固定するのはアミノ酸配列です。DNA合成時に実際の宿主・オルガネラ・ベクターへ合わせてコドン最適化と配列QCを行います。

## データ源

| 用途 | 文献 |
|---|---|
| extended modular assembly / B-score | Bhakta MS et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112) |
| Barbas/Sp1C framework | Mandell JG, Barbas CF III (2006), DOI: [10.1093/nar/gkl209](https://doi.org/10.1093/nar/gkl209) |
| 1F module archive | Bhakta M, Segal DJ (2010), DOI: [10.1007/978-1-60761-753-2_1](https://doi.org/10.1007/978-1-60761-753-2_1) |
| 2F module archive | Gupta A et al. (2012), DOI: [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) |
| 位置別1F module archive | Zhu C et al. (2011), DOI: [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) |
| 3-finger CoDA | Sander JD et al. (2011), DOI: [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) |
| 5–7 bp ZF–FokI linker比較 | Händel EM et al. (2009), DOI: [10.1038/mt.2008.233](https://doi.org/10.1038/mt.2008.233) |
| 6 bp `TGAAAR` spacer選択性 | Shimizu Y et al. (2009), DOI: [10.1016/j.bmcl.2009.02.109](https://doi.org/10.1016/j.bmcl.2009.02.109) |
| CoDA ZFN 5–7 bp cohort | Chen S et al. (2013), DOI: [10.1093/nar/gks1356](https://doi.org/10.1093/nar/gks1356) |
| obligate heterodimer FokI ELD/KKR | Doyon Y et al. (2011), DOI: [10.1038/nmeth.1539](https://doi.org/10.1038/nmeth.1539) |
| 哺乳類ZFNのF2A単一ORF先例 | Lei Y et al. (2011), DOI: [10.1038/mt.2011.12](https://doi.org/10.1038/mt.2011.12) |

## 実装検証の範囲

v3：

- 49 module archiveとpublished B-score `>=15` cutoffを固定します。
- Bhakta 2013のHIV992 L6+R6をcombined B=17としてproduction pathで再構成します。
- CS3-1は全moduleを構成できてもcombined B=14なのでv3候補から除外することをテストします。
- L6+R6のexact 21例では15 active、published full-array B-scoreは20/21で再現します。CS7-3のみpaper 21 / calculated 20の既知不一致を保持します。
- 92 array-length variants / 41 activeの既存benchmarkを保持します。
- 同一部位のL3–L6 × R3–R6 = 16構成を生成します。
- v3 comparatorにdistanceが入らないことを明示的に回帰試験します。
- v3 protein exporterでZF1–ZF12 featureとprotein終端座標を検証します。

v2/v1：

- Gupta XLS 162 targets / 87 modules、CoDA 18 F2 contexts / 319 F1 / 344 F3を監査します。
- CoDAについて4^9全探索でexact shared-F2 joinだけが組立て可能であることをテストします。
- 左右鎖方向、5–7 bp spacer、距離境界、曖昧塩基座標保持を回帰試験します。

これらは**選択ロジックと公開データ転記の構造検証**であり、新規候補の成功確率ではありません。

## 重要な制限

- Bhakta 2013の15/21、Gupta 2012の9/11などのcohort成績を個々の新規候補の成功確率に変換してはいけません。
- B-scoreは候補を機能的根拠で並べるための指標ですが、exact L6+R6 21例に限る再構成ROC-AUCは約0.656であり、細かな点差を精密な活性予測として扱えません。
- `spacer中心`は左右half-site間の幾何学的中心で、FokIが切る特定のphosphodiester bondを保証しません。
- v3のBhakta 6F + ELD/KKR + F2A、v2/v1の3F + ELD/KKR + F2Aはいずれも完全構成として原著そのままの条件で検証されたものではありません。
- 出力はアミノ酸配列です。promoter、terminator、UTR、選択マーカー、vector backboneは含みません。
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
