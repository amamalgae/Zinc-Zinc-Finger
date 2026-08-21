# Zinc Zinc Finger

Bhakta 2013 extended modular assembly を v3 としてデフォルト実装し、Gupta 2012 + CoDA fallback の v2、CoDA-only の v1 も切り替えて使えるブラウザ内 ZFN 設計ツールです。

公開ページ：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

詳細な実装判断は [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) と [docs/AI_HANDOFF_V3_BHAKTA_2013.md](docs/AI_HANDOFF_V3_BHAKTA_2013.md)、coding agent 向け不変条件は [AGENTS.md](AGENTS.md) を参照してください。

## 公開ワークフロー

1. `01 INPUT` で標的 DNA を入力します。
2. 設計法を `v3 · Bhakta 2013`、`v2 · Gupta + CoDA fallback`、`v1 · CoDA only` から選択します。
3. 入力した標的 DNA **全体**を探索し、`02 SELECT` に候補を出します。
4. 選択した候補から `03 PROTEIN OUTPUT` で単一 ORF 前駆体のアミノ酸配列を出します。

希望中心や `Range ±bp` の入力欄はありません。候補行には標的 DNA 先頭から見た spacer 中心の位置を `+65` のように表示します。5/7 bp spacer で幾何学的中心が半整数になる場合は、前側の整数を使います（例：`64.5` → `+64`）。これは位置表示であり、順位スコアではありません。

候補は30件ずつ段階表示され、候補配列は選択状態のままドラッグしてコピーできます。

## 設計法

### v3 · Bhakta 2013

Bhakta MS et al. (2013), DOI [10.1101/gr.143693.112](https://doi.org/10.1101/gr.143693.112) の extended modular assembly を用います。

- 左右 18 bp half-site、各 6 finger
- spacer 5–7 bp
- 公開 Barbas/Bhakta 1F archive 49 module の有限 lookup
- combined B-score `>=15` の L6+R6 を主候補
- 順位：combined B-score → context/module 警告 → `6 > 5 >> 7` spacer → genomic start
- 位置座標は順位に使わない
- 選択後に同じ切断部位の L3–L6 × R3–R6 の16構成を technical detail で確認可能

Sp1C-style framework は Mandell JG, Barbas CF III (2006), DOI [10.1093/nar/gkl209](https://doi.org/10.1093/nar/gkl209) の公開記述に従います。

Bhakta 2013 の L6+R6 は21標的中15標的で active でしたが、これは新規候補の71%成功確率ではありません。B-score も候補固有の編集確率ではありません。

### v2 · Gupta + CoDA fallback

Gupta A et al. (2012), DOI [10.1038/nmeth.1994](https://doi.org/10.1038/nmeth.1994) の 2F module を優先し、残る 1F は Zhu C et al. (2011), DOI [10.1242/dev.066779](https://doi.org/10.1242/dev.066779) の位置別 archive から補います。

完成できない 3F monomer は、Sander JD et al. (2011), DOI [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) の CoDA へ monomer 単位で fallback します。単一 3F 内で Gupta と CoDA を finger 単位に混ぜません。

通常順位は `6 > 5 >> 7` spacer、次に Gupta で完成できる腕数、最後に genomic start です。

### v1 · CoDA only

Sander JD et al. (2011), DOI [10.1038/nmeth.1542](https://doi.org/10.1038/nmeth.1542) の exact shared-F2 assembly を使います。欠損セルを予測や補間で埋めません。

通常順位は `6 > 5 >> 7` spacer、次に genomic start です。

## spacer と ZF–FokI linker

現在の対応は次の通りです。

| spacer | linker |
|---:|---|
| 5 bp | `TGGS` |
| 6 bp | `TGAAAR` |
| 7 bp | `TGPGAAAR` |

根拠には Bhakta MS et al. (2013), DOI `10.1101/gr.143693.112`、Shimizu Y et al. (2009), DOI `10.1016/j.bmcl.2009.02.109`、Händel EM et al. (2009), DOI `10.1038/mt.2008.233`、Chen S et al. (2013), DOI `10.1093/nar/gks1356` を用いています。

`6 > 5 >> 7` は離散的な優先順であり、予測 indel 率ではありません。

## 任意ゲノム入力

FASTA / FASTA.gz / ZIP を複数まとめて選択、またはドラッグ&ドロップできます。処理はブラウザ内です。

- 選択したファイル名は省略せずすべて表示します。
- ZIP は解析後、認識した各 FASTA entry も `archive.zip / path/to/file.fa` の形ですべて表示します。
- v1/v2 は各 9-bp half-site ≤4 mismatch、合計 ≤5 mismatch を検索します。
- v3 は各 18-bp half-site ≤4 mismatch、合計最大8 mismatch を検索します。
- 両 genomic orientation と spacer 5/6/7 bp を確認します。
- spacer 塩基自体は一致判定に使いません。

これは配列類似性の回避補助であり、off-target 切断確率、安全性、chromatin、methylation、cell type などを予測するものではありません。

## 出力

v3：

```text
NLS–ZF-L(6F)–FokI ELD–F2A–NLS–ZF-R(6F)–FokI KKR
```

v2/v1：

```text
NLS–ZF-L(3F)–FokI ELD–F2A–NLS–ZF-R(3F)–FokI KKR
```

FokI ELD/KKR は Doyon Y et al. (2011), DOI [10.1038/nmeth.1539](https://doi.org/10.1038/nmeth.1539)、左右 ZFN を F2A で単一 ORF 化する先例は Lei Y et al. (2011), DOI [10.1038/mt.2011.12](https://doi.org/10.1038/mt.2011.12) を根拠にしています。

出力は protein-only です。

- `GenPept（feature 付き）`
- protein `FASTA`

codon-optimized CDS、nucleotide GenBank、promoter、terminator、vector backbone は生成しません。

## 入力配列の扱い

入力配列とゲノムは外部へ送信しません。

- FASTA header、空白、位置番号は無視
- IUPAC 曖昧塩基、gap は `N` として座標を保持
- `N` をまたぐ候補窓は除外
- 未対応文字がある場合は設計を停止

## 検証

Node.js 22 以上が必要です。

```bash
npm ci
npm run lint
npm run build
npm run audit:coda
npm test
```

Gupta データを変更した場合は `npm run audit:gupta` も実行します。

主要な regression / benchmark は、Bhakta 2013 の published target/B-score 再構成、Gupta/CoDA archive の有限 lookup、全 4^9 CoDA 9-mer audit、ゲノム mismatch 検索、全標的 DNA 探索、ファイル名表示を含みます。

## 制限

- archive membership や B-score は結合・切断・編集を保証しません。
- Bhakta 6F + ELD/KKR + F2A の完全構成は Bhakta 2013 でそのまま検証されたものではありません。
- v2/v1 の完全構成も各原著の条件そのものではありません。
- 公開情報を実装したことは freedom-to-operate を意味しません。

第三者由来データと配列の整理は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記載しています。

## ライセンス

[MIT License](LICENSE)。文献・特許由来の科学データや配列に MIT を再付与するものではありません。
