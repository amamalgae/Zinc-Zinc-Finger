# Zinc Zinc Finger

標的DNA配列から、extended modular assembly（extended MA）型ZFNの候補ペアをブラウザ内で設計するツールです。

公開ページ（GitHub Pages）：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

## 現在できること

- FASTAまたは塩基配列をブラウザ内で読み込む
- 実験選抜済みBarbas one-finger archive（49 modules）だけで構築可能な候補を列挙する
- 片側3–6 finger、spacer 5–7 bpを探索する
- target-site overlap（TSO）を生じるGNG moduleの隣接塩基を検査し、警告する
- published B-score、module評価、希望切断位置で候補を順位付けする
- DeepZF原著の学習済みPWMpredictorで各moduleの標的triplet整合度を計算する
- DeepZF整合度は順位に使わず、独立な認識診断値として表示する
- Sp1C framework、TGEKP interfinger linkerを含むZFAアミノ酸配列を出力する
- spacer 5 / 6 / 7 bpに対してTGGS / TGAAAR / TGPGAAAR ZFA–FokI linkerを提案する
- ゲノムFASTAまたはgzip圧縮FASTAを端末内だけで読み込む
- 4–6 finger、最大30候補について、少なくとも片側のhalf-siteが3 mismatch以内のZFNペアをゲノムwide検索する
- 正向き・逆向きheterodimer（LR / RL）とhomodimer（LL / RR）を区別する
- PROGNOS ZFN v2.0を独立実装し、候補off-targetを相対順位化する
- B-score ≥15を優先した上で、完全一致off-target、最大PROGNOS score、homodimer候補数の順に候補を並べ替える。`score ≥50`の部位数は表示だけに残し、実験陽性の判定や候補順位には使わない
- 候補と配列をCSVで保存する
- 上位off-target座標・配列・mismatch数・PROGNOS scoreをCSVで保存する

入力配列はブラウザ内だけで処理されます。API、アクセス解析、外部保存処理はありません。

## ゲノムwide off-target検索

ゲノムFASTAはサーバーへアップロードせず、Web Worker内で読み込み・検索します。`N`とcontig境界を保持するため、座標がずれたりcontigをまたいだ偽ヒットが生じたりしません。

検索はhalf-siteを2個のseedに分けるseed-and-verify方式です。half-siteの総mismatchが3以下なら、2個のseedの少なくとも一方は1 mismatch以下になるため、そのseed集合を一度のゲノム走査で検索して完全長half-siteを再検証します。左右どちらかがこのanchor条件を満たすペアを列挙し、反対側half-siteはmismatch数で打ち切らず完全長配列をPROGNOSで採点します。Sander 2013の独立陽性51 lociは全て少なくとも片側が3 mismatch以内でした。これはBLASTの局所アラインメントではなく、9–18 bpの固定長half-siteに対する置換だけの探索です。挿入・欠失は探索しません。

PROGNOS ZFN v2.0はfingerごとの初回mismatch penalty 70、追加mismatch penalty 65、標的G一致bonus 17.5（triplet 5′端Gは2倍）、FokIからの距離に応じたpolarity 1.00 / 0.85 / 0.80 / 0.70、dimer exponent 1.75を実装しています。Fine et al. (2014), DOI: [10.1093/nar/gkt1326](https://doi.org/10.1093/nar/gkt1326)。

### Sander 2013外部陽性データとの照合

Sander et al. (2013)のmain-text Tables 3–4から、同研究で新規に検証された陽性部位を行単位で再構成しました。CCR5は重複するSKAP2 windowをまとめて25 loci、VEGFAは26 lociです。DOI: [10.1093/nar/gkt716](https://doi.org/10.1093/nar/gkt716)。

| 評価 | CCR5 4ZF | VEGFA 3ZF | 合計 |
|---|---:|---:|---:|
| 独立陽性loci | 25 | 26 | 51 |
| 旧条件：左右とも≤3 mismatch | 5/25 | 25/26 | 30/51 |
| 新条件：少なくとも片側≤3 mismatch | 25/25 | 26/26 | 51/51 |
| PROGNOS score vs indel率 Spearman ρ | 0.103 | −0.000 | −0.076 |
| 単純identity vs indel率 Spearman ρ | 0.077 | 0.037 | −0.090 |

このデータは陽性部位だけなので、ROC-AUCやprecisionは計算できません。PROGNOS scoreはoff-targetの定量indel率を予測せず、score ≥50も陽性判定閾値として使えません。一方、少なくとも片側を≤3 mismatchのanchorとして探索する規則は、独立陽性51/51 lociを包含しました。ブラウザ版は3ZFを計算量上の理由で受け付けないため、実装回帰試験はCCR5 4ZFの25/25 lociを対象にしています。

再構成データSHA-256: `635ce1d3373b3f3a0ab2f3ef9ff37041c06debc6ba2dce66bd55d87a23328a2f`

20 Mbp・30候補の合成ゲノムで、新しい高感度探索は6ZFで約1.72秒、4ZFで約36.55秒でした（desktop Node.js）。4ZFは短いanchorが多数出るため、スマートフォンではさらに時間がかかる可能性があります。

### Sander 2013の全陽性・陰性候補による順位検証

Supplementary Tables 3・6に掲載された候補を、実験陰性を含めて再構成しました。掲載310行のうち、PCRで評価可能だった297行には各ZFNのon-targetが1行ずつ含まれるため、実際のoff-target候補は295部位です。論文が有意なoff-targetとして報告した行を陽性ラベルとしました。Sander et al. (2013), DOI: [10.1093/nar/gkt716](https://doi.org/10.1093/nar/gkt716)。

| 評価 | CCR5 4ZF | VEGFA 3ZF |
|---|---:|---:|
| 掲載行 | 141 | 169 |
| 評価可能行（on-targetを含む） | 138 | 159 |
| off-target候補 | 137 | 158 |
| 実験陽性 | 22 | 34 |
| PROGNOS ROC-AUC | 0.642 | 0.677 |
| Average precision | 0.338 | 0.428 |
| Recall@20 | 6/22 | 10/34 |
| Recall@50 | 10/22 | 18/34 |
| `score ≥50`の候補 | 14/137 | 77/158 |
| `score ≥50`で回収した陽性 | 5/22 | 21/34 |

PROGNOSはランダムよりよい相対順位を持ちますが、上位20件でも陽性の27–29%しか回収せず、固定の`score ≥50`はCCR5とVEGFAで挙動が大きく異なります。このため`score ≥50`の件数を候補順位から外し、画面上の参考表示だけにしました。左右half-site scoreの幾何平均は事後解析でAUCがCCR5 0.680、VEGFA 0.711へ上がりましたが、候補集合がSander classifierで事前選抜されており、同一データ内の比較でもあるため、PROGNOS式の置換や再学習は行っていません。これらのprecision指標は全ゲノムprecisionではなく、選抜済み候補集合内の値です。

再構成データSHA-256: `bad9bf02412f9424118ae0cfc79e432a5cba02cad4085d1cbec124ead14f554b`

### Fine 2014の陽性・陰性データとの照合

Fine et al. (2014)のSupplementary Tables 8–9を、陰性候補とread countを含めて再構成しました。DOI: [10.1093/nar/gkt1326](https://doi.org/10.1093/nar/gkt1326)。独立実装したPROGNOS scoreは、掲載46候補すべてのhalf-site mismatch数と、掲載されたZFN v2.0順位の相対順序を再現しました。

| HBB ZFN | 評価可能off-target | 実験陽性 | PROGNOS ROC-AUC | Average precision | Recall@10 |
|---|---:|---:|---:|---:|---:|
| 3F | 22 | 6 | 0.698 | 0.399 | 4/6 |
| 4F | 22 | 1 | 0.524 | 0.091 | 0/1 |

この結果は、実装式の再現性は高い一方、PROGNOS順位を切断陽性の判定器として扱えないことを示します。特に4Fは陽性が1部位しかないためAUCの不確実性が大きく、再学習には使いません。3Fでは単純Homology順位のaverage precision 0.506がZFN v2.0の0.399を上回りましたが、同じ22候補内の事後比較なので、順位式の置換根拠にはしていません。

同じHBB領域では、on-target indelが3Fの1.9%から4Fの6.3%へ増え、検出されたoff-targetは6/22から1/22へ減りました。また3Fで陽性だった5部位の4F再検査は、評価可能4部位すべてで有意差なしでした。これはfinger数を増やす設計を支持しますが、3Fと4Fで候補抽出条件が異なるため、6/22対1/22を一般的な効果量とは解釈しません。

再構成したSupplementary PDF SHA-256: `dbf9d5e05fa081e9754ef96df34be1fd30bef1844e3707371b86af730675e1b5`

入力した標的windowがゲノム内で一意に見つかった場合だけ、その1部位をintended siteとしてoff-target集計から除外します。一意に同定できなければ、完全一致部位も保守的にoff-targetとして数えます。PROGNOS scoreは0–100の相対順位であり、切断確率や安全性の尺度ではありません。

### Paschon 2019の5–6Fデータと適用範囲

Paschon et al. (2019)のSource Data Figure 5から、TRAC 1–5の122 off-target候補（実験陽性16部位）とon-target indelを再構成しました。陽性数はTRAC 1–5で4、8、4、0、0、on-target indelは79.37–85.14%です。DOI: [10.1038/s41467-019-08867-x](https://doi.org/10.1038/s41467-019-08867-x)。

ただしSupplementary Figure 21を照合すると、TRAC 1–4は少なくとも片側にbase-skipping linkerがあり、TRAC 5は左右6F/5Fの非対称ペアです。したがって、現行の連続half-site・左右同finger数を前提とするPROGNOS探索へ直接適用できるペアは0/5でした。このデータを無理に採点せず、非連続half-siteと非対称ペアを将来実装した際の外部検証セットとして保持します。

再構成データSHA-256: `59a269de1330011afe4e36a224cec52747a0100e0df8eeab1f2ea3845114a77b`

## スコアの意味

B-scoreは各moduleで、標的塩基と認識ヘリックス間に期待される二価水素結合（G–Arg、A–Gln/Asn）を0–3点で評価し、左右ZFAについて合算した値です。実装には単純な再計算値ではなくBhakta et al.のmodule別公表値を使用します。AAG、AGG、AGT、ATTは単純な接触数と公表値が一致せず、ATCは旧実装のarchiveから欠落していたためです。

Bhakta et al.のデータでは、92 array variantsに対する分類AUCは0.77、268 ZFN構成全体ではcombined B-score ≥15の52%がSSA活性ありでした。これは本ツールが表示する各候補の成功確率ではありません。Bhakta et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112)。

## 実験データとの照合

原著表から行単位で復元できるL6+R6構成21件（活性15件）を再計算しました。

| 評価 | B-score単独 | DeepZF単独 | 採用順位（B-score、同点時TSO等） |
|---|---:|---:|---:|
| 21件全体のAUC | 0.656 | 0.522 | 0.656 |
| 前向き11件のAUC | 0.875 | 0.583 | 0.917 |

module別公表値から得たL6+R6 B-scoreは20/21標的で原著表と一致しました。CS7-3だけは、原著Figure 4Aのmodule別公表値を合計すると20ですが、原著Table 1では21と記載されており、論文内に1点の不整合があります。

21件全体ではDeepZFによる改善はAUC 0.011に留まり、DeepZF単独はほぼランダムです。前向き11件では改善が見えましたが、活性8・不活性3の小標本なので一般化性能とは扱いません。

さらに、別研究室のCoDA ZFN 84ペアについて、補足表のcoding sequenceから各fingerのCys2–His1間12残基を抽出して外部検証しました。配列を取得できた82ペア（活性32、不活性50）では、DeepZF整合度とsomatic indel率のSpearman ρは0.053、活性閾値>0.27%に対するROC-AUCは0.491でした。最弱fingerまたは最弱monomerを使ってもAUCは0.520、0.518で、活性順位付けには使えませんでした。Chen et al. (2013), DOI: [10.1093/nar/gks1356](https://doi.org/10.1093/nar/gks1356)。

以上から、DeepZFは候補順位から外し、PWM上の認識整合度を確認する診断表示だけに限定しました。ChenデータはCoDA・zebrafish胚という別方式なので、extended MAの成功率推定には混ぜていません。再計算は`npm run benchmark`で実行できます。

92 array variantsについては、原著の報告AUCは0.77です。Figure 2から92件の二値ラベルを復元した参考解析もスクリプトに含めていますが、出版社移行後に行単位の補足データを取得できず、図からの復元値は原著の生データと同一とは保証できないため、主結果には使用していません。

## 重要な制限

- 出力するのはDNA-binding ZFA配列までです。FokI cleavage domain、obligate heterodimer変異、NLS、発現カセット、コドン最適化は含みません。
- ゲノムwide検索は塩基置換だけを扱い、bulge、挿入・欠失、構造変異は探索しません。
- PROGNOS ZFN v2.0は3–4 finger ZFNを中心に構築されており、5–6 fingerは外挿です。
- 現行設計は連続した左右同finger数のhalf-siteだけを扱い、base-skipping linkerや左右でfinger数が異なるペアは生成・採点しません。
- 検索の完全列挙保証は「少なくとも片側のhalf-siteが3 mismatch以内」の範囲です。左右とも4 mismatch以上の部位は列挙しません。
- クロマチン accessibility、発現量、細胞種依存性は評価しません。
- 3-fingerでは3 mismatch以内のhalf-siteが急増するため、ブラウザ版のゲノム検索対象は4–6 fingerに限定しています。
- B-scoreはaffinity/activityの粗い分類器であり、PWM、結合定数、indel率を予測しません。
- DeepZF target fitはPWM上の標的塩基確率の幾何平均であり、結合確率や切断効率ではありません。
- DeepZF target fitは候補順位に使用しません。Chen 2013の独立82ペアで活性予測AUC 0.491だったためです。
- DeepZF PWMpredictorは天然C2H2-ZF中心のデータで学習されており、人工Barbas moduleへの分布外適用です。
- TSO不一致は候補を除外せず警告します。原著Zinc Finger ToolsもTSOを警告として扱い、TSO不一致でも高affinityの例があると記載しています。
- 6-finger arraysを増やすとaffinityが上がり得る一方、3-finger subgroupによる非意図的結合も起こり得ます。
- 実験では複数候補をSSA等で一次スクリーニングしてください。

## DeepZF PWMpredictorの軽量移植

DeepZFはprotein sequenceからPWMを予測するforward modelです。本ツールは、原著リポジトリの`transfer_model100.h5`（352 KB）から推論用weightだけを変換し、同じone-hot encodingとニューラルネットワーク計算をTypeScriptで実行します。ProteinBERTを使う約122 MBのBindZFpredictorは、実験選抜済みmoduleから組む本用途には不要なので同梱していません。

49個のBarbas moduleに対し、DeepZFの最高確率tripletが公称標的と一致したのは16/49（32.7%）、top-3以内は25/49（51.0%）でした。ランダム期待値はそれぞれ1/64（1.6%）、3/64（4.7%）なので認識情報はありますが、単独でmoduleを棄却できる精度ではありません。さらにChen 2013の実配列外部検証でも活性予測はランダム相当だったため、DeepZFは順位付けに使いません。DeepZFのfull textは確認済みです。Aizenshtein-Gazit et al. (2022), DOI: [10.1093/bioinformatics/btac469](https://doi.org/10.1093/bioinformatics/btac469)。

変換元はDeepZF commit `351da3013467631ad5390b71648680f34b2634fa`、`transfer_model100.h5`のSHA-256は`2488eb1f07a26779f03bee946bc958d42213db560de3d9cb05c0ea9cab0e656d`です。再変換には`npm run convert:deepzf -- /path/to/transfer_model100.h5`を使います。由来と利用条件は[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)を参照してください。

## 科学的根拠

- one-finger archiveとSp1C / Zif268 framework：Bhakta & Segal (2010), DOI: [10.1007/978-1-60761-753-2_1](https://doi.org/10.1007/978-1-60761-753-2_1)
- extended MA、B-score、linker、活性データ：Bhakta et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112)
- CoDA ZFN 84ペアの外部活性データ：Chen et al. (2013), DOI: [10.1093/nar/gks1356](https://doi.org/10.1093/nar/gks1356)
- ZFN off-target全候補の外部検証：Sander et al. (2013), DOI: [10.1093/nar/gkt716](https://doi.org/10.1093/nar/gkt716)
- PROGNOS式とHBB 3F/4Fの検証：Fine et al. (2014), DOI: [10.1093/nar/gkt1326](https://doi.org/10.1093/nar/gkt1326)
- 非連続・非対称5–6F ZFNの適用範囲：Paschon et al. (2019), DOI: [10.1038/s41467-019-08867-x](https://doi.org/10.1038/s41467-019-08867-x)
- 最新の構造的認識コードの整理：Zhang et al. (2024), DOI: [10.1016/j.sbi.2024.102836](https://doi.org/10.1016/j.sbi.2024.102836)
- DeepZF forward prediction：Aizenshtein-Gazit et al. (2022), DOI: [10.1093/bioinformatics/btac469](https://doi.org/10.1093/bioinformatics/btac469)

出典と再利用上の整理は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記載しています。

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
npm test
```

## ライセンス

[MIT License](LICENSE)。ただしDeepZF由来の学習済みweightと文献由来データにMITを再付与するものではありません。第三者由来部分は[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)を参照してください。
