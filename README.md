# Zinc Zinc Finger

Zhu 2011の位置別Zif268モジュールを使い、左右3-fingerのZFN候補をブラウザ内で設計するツールです。

公開ページ：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

## 現在の設計範囲

- 27種類のDNA triplet × F1/F2/F3の3位置、計81モジュールを使用
- 左右とも3-fingerに固定し、5–7 bp spacerを探索
- 希望切断位置からの探索範囲を数値指定（初期値±500 bp）
- GNNモジュール数、Zhu 2011で比較的安定だったモジュール、希望切断位置への近さで候補を順位付け
- 各fingerの標的triplet、7 aa recognition helix、由来を表示
- `NLS–Zif268 3F–FokI ELD–F2A–NLS–Zif268 3F–FokI KKR`の単一ORFを生成
- Protein FASTA、codon-optimized CDS FASTA、GenBankを保存
- Auxenochlorellaまたはhumanのcodon presetを選択

入力配列はブラウザ内だけで処理され、外部へ送信されません。

## 構成

```text
Promoter → NLS–ZF-L(3F)–FokI ELD → F2A → NLS–ZF-R(3F)–FokI KKR → Terminator
```

F2Aのribosomal skippingにより、ELD側とKKR側を1本の転写産物から発現させる設計です。F2AはDueñas 2025でAuxenochlorellaにおけるGFP/F2A/LUCの両側発現が確認された22 aa配列を使います。

Zif268 fingerはDNAと逆平行に結合します。たとえば認識鎖が`5′-GGA-GAT-GGC-3′`なら、タンパク質のN→C末端は`F1=GGC、F2=GAT、F3=GGA`です。

## 参考文献

| 用途 | 文献 |
|---|---|
| 3-finger位置別モジュール | Zhu et al. (2011), DOI: [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) |
| obligate heterodimer FokI ELD/KKR | Doyon et al. (2011), DOI: [10.1038/nmeth.1539](https://doi.org/10.1038/nmeth.1539) |
| AuxenochlorellaでのF2A | Dueñas et al. (2025), DOI: [10.1073/pnas.2417695122](https://doi.org/10.1073/pnas.2417695122) |
| 哺乳類ZFNのF2A単一ORF先例 | Lei et al. (2011), DOI: [10.1038/mt.2011.12](https://doi.org/10.1038/mt.2011.12) |
| ZF–DNA認識のレビュー | Zhang et al. (2024), DOI: [10.1016/j.sbi.2024.102836](https://doi.org/10.1016/j.sbi.2024.102836) |

## 重要な制限

- Zhu 2011では29 ZFNペア中8組がゼブラフィッシュで1%以上のsomatic lesionを示しました。これは各候補の成功確率ではありません。
- 現在は文献の位置別ライブラリをそのまま扱える3-fingerに限定しています。6-fingerは、連結方法と実験的根拠を別途確定してから追加します。
- 配列一致だけでは結合・切断・off-targetを保証できません。複数候補を発現系とSSA等で比較してください。
- ELD/KKR、F2A、Zif268 3Fを組み合わせた完全構成そのものは本ツールの提案であり、同一条件での実験検証は未実施です。
- Auxenochlorella codon presetは公開CDSの小標本に基づくため、使用株に合わせた再確認が必要です。
- 出力はORFです。promoter、terminator、UTR、選択マーカー、vector backboneは含みません。

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
npm test
```

## ライセンス

[MIT License](LICENSE)。文献由来の科学データにMITを再付与するものではありません。
