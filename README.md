# Zinc Zinc Finger

Sander 2011のContext-Dependent Assembly（CoDA）archiveを使い、左右3-fingerのZFN候補をブラウザ内で設計するツールです。

公開ページ：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

## 現在の設計範囲

- 公開archiveのF1 unit 319件、固定F2 context 18種、F3 unit 344件を収録
- 左右とも3-fingerに固定し、5–7 bp spacerを探索
- F1–F2とF2–F3で同じF2 target / recognition helixを共有する場合だけ組み立て
- archiveにない組合せを予測や補間で埋めない
- 希望スペーサー中心への近さ、次に6 bp spacerへの近さで候補を順位付け（実切断塩基を予測する値ではありません）
- 各fingerの標的triplet、7 aa recognition helix、F2 context、完全array配列を表示
- `NLS–CoDA 3F–FokI ELD–F2A–NLS–CoDA 3F–FokI KKR`の単一ORFを生成
- 前駆体polyproteinとF2A処理後の左右産物をProtein FASTAで保存
- 塩基配列、codon-optimized CDS、GenBankは生成しない

入力配列はブラウザ内だけで処理され、外部へ送信されません。FASTA header、空白、位置番号は無視します。IUPAC曖昧塩基とgapは`N`として座標を保持し、それらをまたぐ標的窓は候補から除外します。未対応文字がある場合は設計を停止します。

画面右上の`ver.N (PR #N)`は、その版を導入したGitHub Pull Request `#N`に対応し、表記自体から該当PRを開けます。

## CoDAの組立て

CoDAは、実験的に選択されたF1/F2 unitとF2/F3 unitを、共通する固定F2で接続します。標的ごとに新たなライブラリを作ってselectionする工程は設計時に不要ですが、完成ZFNの発現・結合・切断・毒性・off-target検証は必要です。

C2H2 fingerはDNAと逆平行に結合します。認識鎖が`5′-GTG-GGG-GAG-3′`なら、タンパク質のN→C末端は`F1=GAG、F2=GGG、F3=GTG`です。各fingerはWO2011017293A2の共通framework（SEQ ID NOs: 841–844）にrecognition helixを入れ、finger間をcanonical `TGEKP` linkerで連結します。

## 構成

```text
Promoter → NLS–ZF-L(3F)–FokI ELD → F2A → NLS–ZF-R(3F)–FokI KKR → Terminator
```

F2Aのribosomal skippingにより、ELD側とKKR側を1本の転写産物から発現させる設計です。F2AはDueñas 2025でAuxenochlorellaにおけるGFP/F2A/LUCの両側発現が確認された22 aa配列を使います。

本ツールが固定するのはアミノ酸配列です。CoDA array、finger間linker、ZF–FokI linker、SV40 NLS、FokI ELD/KKR、F2Aはいずれもペプチドとして定義し、特定の同義コドン列には固定しません。DNA合成時に、実際の宿主・オルガネラ・発現ベクターに合わせて別途コドン最適化と配列QCを行います。

## データ源

CoDA unit tableはSander 2011のSupplementary Tables 1–2を転記し、件数とframeworkを対応特許WO2011017293A2で照合しています。収録数は原著・特許記載どおりF1 319件、F3 344件、合計663件です。

| 用途 | 文献 |
|---|---|
| 3-finger CoDA | Sander et al. (2011), DOI: [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) |
| CoDA unit framework | [WO2011017293A2](https://patents.google.com/patent/WO2011017293A2/en) |
| obligate heterodimer FokI ELD/KKR | Doyon et al. (2011), DOI: [10.1038/nmeth.1539](https://doi.org/10.1038/nmeth.1539) |
| AuxenochlorellaでのF2A | Dueñas et al. (2025), DOI: [10.1073/pnas.2417695122](https://doi.org/10.1073/pnas.2417695122) |
| 哺乳類ZFNのF2A単一ORF先例 | Lei et al. (2011), DOI: [10.1038/mt.2011.12](https://doi.org/10.1038/mt.2011.12) |

## 実装検証の範囲

- archiveの18 F2 context、319 F1 unit、344 F3 unitについて、形式、複合キー重複、F2 helix一致を起動時に検査します。
- F1/F3の標的triplet別件数をWO2011017293A2のSEQ ID範囲から得た独立の期待値と照合します。
- 4^9 = 262,144通りの9-merを全探索し、同じF2 contextを共有するF1/F3の直積だけが組立て可能になることをテストします。
- 左右鎖方向、5–7 bp spacer、距離境界、順位を独立の全走査oracleと比較します。
- 曖昧塩基を削除して前後を誤結合する回帰ケースをテストします。

これらは**選択ロジックと転記データの構造検証**です。原著でB2H評価された181 arrayの全配列・全測定値を再現する試験ではありません。原著の集団成績を各新規候補の活性予測値へ変換していません。

## 重要な制限

- 原著のB2H評価では181 array中139（76.8%）が3倍超、14（7.7%）が1.57倍未満でした。さらにZFNとして調べた38標的中19（50%）で変異導入が検出されています。この集団成績はarchiveにある個々の新規組合せの成功確率ではありません。
- 候補順位に未測定の活性スコアは加えていません。複数候補を発現系とSSA等で比較してください。
- `spacer中心`は左右half-site間の幾何学的中心です。FokIによる特定の切断結合を予測・保証する座標ではありません。
- ELD/KKR、F2A、CoDA 3Fを組み合わせた完全構成そのものは本ツールの設計提案であり、同一条件での実験検証は未実施です。
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
npm run audit:coda
npm test
```

## ライセンス

[MIT License](LICENSE)。文献・特許由来の科学データや配列にMITを再付与するものではありません。
