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
- B-score同点候補をDeepZF整合度で再順位付けする
- Sp1C framework、TGEKP interfinger linkerを含むZFAアミノ酸配列を出力する
- spacer 5 / 6 / 7 bpに対してTGGS / TGAAAR / TGPGAAAR ZFA–FokI linkerを提案する
- 候補と配列をCSVで保存する

入力配列はブラウザ内だけで処理されます。API、アクセス解析、外部保存処理はありません。

## スコアの意味

B-scoreは各moduleで、標的塩基と認識ヘリックス間に期待される二価水素結合（G–Arg、A–Gln/Asn）を0–3点で評価し、左右ZFAについて合算した値です。実装には単純な再計算値ではなくBhakta et al.のmodule別公表値を使用します。AAG、AGG、AGT、ATTは単純な接触数と公表値が一致せず、ATCは旧実装のarchiveから欠落していたためです。

Bhakta et al.のデータでは、92 array variantsに対する分類AUCは0.77、268 ZFN構成全体ではcombined B-score ≥15の52%がSSA活性ありでした。これは本ツールが表示する各候補の成功確率ではありません。Bhakta et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112)。

## 実験データとの照合

原著表から行単位で復元できるL6+R6構成21件（活性15件）を再計算しました。

| 評価 | B-score単独 | DeepZF単独 | 現在の順位（B-score、同点時DeepZF） |
|---|---:|---:|---:|
| 21件全体のAUC | 0.656 | 0.522 | 0.667 |
| 前向き11件のAUC | 0.875 | 0.583 | 0.958 |

module別公表値から得たL6+R6 B-scoreは20/21標的で原著表と一致しました。CS7-3だけは、原著Figure 4Aのmodule別公表値を合計すると20ですが、原著Table 1では21と記載されており、論文内に1点の不整合があります。

21件全体ではDeepZFによる改善はAUC 0.011に留まり、DeepZF単独はほぼランダムです。前向き11件では改善が見えますが、活性8・不活性3の小標本なので、DeepZFは引き続き同点候補の補助に限定します。再計算は`npm run benchmark`で実行できます。

92 array variantsについては、原著の報告AUCは0.77です。Figure 2から92件の二値ラベルを復元した参考解析もスクリプトに含めていますが、出版社移行後に行単位の補足データを取得できず、図からの復元値は原著の生データと同一とは保証できないため、主結果には使用していません。

## 重要な制限

- 出力するのはDNA-binding ZFA配列までです。FokI cleavage domain、obligate heterodimer変異、NLS、発現カセット、コドン最適化は含みません。
- ゲノムwide off-target検索、クロマチン accessibility、発現量、細胞種依存性は評価しません。
- B-scoreはaffinity/activityの粗い分類器であり、PWM、結合定数、indel率を予測しません。
- DeepZF target fitはPWM上の標的塩基確率の幾何平均であり、結合確率や切断効率ではありません。
- DeepZF PWMpredictorは天然C2H2-ZF中心のデータで学習されており、人工Barbas moduleへの分布外適用です。
- TSO不一致は候補を除外せず警告します。原著Zinc Finger ToolsもTSOを警告として扱い、TSO不一致でも高affinityの例があると記載しています。
- 6-finger arraysを増やすとaffinityが上がり得る一方、3-finger subgroupによる非意図的結合も起こり得ます。
- 実験では複数候補をSSA等で一次スクリーニングしてください。

## DeepZF PWMpredictorの軽量移植

DeepZFはprotein sequenceからPWMを予測するforward modelです。本ツールは、原著リポジトリの`transfer_model100.h5`（352 KB）から推論用weightだけを変換し、同じone-hot encodingとニューラルネットワーク計算をTypeScriptで実行します。ProteinBERTを使う約122 MBのBindZFpredictorは、実験選抜済みmoduleから組む本用途には不要なので同梱していません。

49個のBarbas moduleに対し、DeepZFの最高確率tripletが公称標的と一致したのは16/49（32.7%）、top-3以内は25/49（51.0%）でした。ランダム期待値はそれぞれ1/64（1.6%）、3/64（4.7%）なので認識情報はありますが、単独でmoduleを棄却できる精度ではありません。このためB-scoreを主順位とし、DeepZFは同点候補の補助順位に限定しています。DeepZFのfull textは確認済みです。Aizenshtein-Gazit et al. (2022), DOI: [10.1093/bioinformatics/btac469](https://doi.org/10.1093/bioinformatics/btac469)。

変換元はDeepZF commit `351da3013467631ad5390b71648680f34b2634fa`、`transfer_model100.h5`のSHA-256は`2488eb1f07a26779f03bee946bc958d42213db560de3d9cb05c0ea9cab0e656d`です。再変換には`npm run convert:deepzf -- /path/to/transfer_model100.h5`を使います。由来と利用条件は[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)を参照してください。

## 科学的根拠

- one-finger archiveとSp1C / Zif268 framework：Bhakta & Segal (2010), DOI: [10.1007/978-1-60761-753-2_1](https://doi.org/10.1007/978-1-60761-753-2_1)
- extended MA、B-score、linker、活性データ：Bhakta et al. (2013), DOI: [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112)
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
