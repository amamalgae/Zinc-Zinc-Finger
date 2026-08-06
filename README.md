# Zinc Zinc Finger

標的DNA配列から、modular assembly（MA）型ZFNの候補ペアを高速に列挙するブラウザ内プロトタイプです。

公開ページ（GitHub Pages）：<https://amamalgae.github.io/Zinc-Zinc-Finger/>

## 現在できること

- FASTAまたは塩基配列をブラウザ内で読み込む
- 片側3–6 finger、spacer 5–7 bpのZFN候補を列挙する
- 希望切断位置、簡易的な認識則、spacer長で候補を順位付けする
- 左右ZFAの認識鎖、finger順序（N→C）、初期残基案を表示する
- 上位候補をCSVで保存する

入力配列はブラウザ内だけで処理されます。API、データベース、アクセス解析、外部保存処理はありません。

## 重要な制限

これは活性予測器でも、実験検証済みの自動設計器でもありません。現在のv0.1は、主要接触位置 `−7 / −4 / −1` の単純な初期則と位置スコアを使うヒューリスティックです。隣接finger依存性、`−8 / −5`、反対鎖接触、context dependence、linker・framework適合性、細胞内活性、off-targetはまだ定量化していません。

表示スコアを「切断成功率」と解釈しないでください。実験に進める前に、複数候補の独立評価、off-target検索、配列・発現設計、実験検証が必要です。

## 根拠と今後の方針

初期実装の出発点は、C2H2 zinc finger–DNA認識コードを構造知見から整理したレビューです：Zhang et al. (2024), *Updated understanding of the protein-DNA recognition code used by C2H2 zinc finger proteins*, DOI: [10.1016/j.sbi.2024.102836](https://doi.org/10.1016/j.sbi.2024.102836)。

今後は、同レビューのFigure 1hに整理された複合体を検証セットとして使い、PDB由来の接触特徴とprotein→DNA/PWMモデルで候補を再順位付けする予定です。

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

[MIT License](LICENSE)
