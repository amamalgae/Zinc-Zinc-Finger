import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test("study card qualifies the selectively tested Gupta 2012 cohort", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /11標的中9標的で/);
  assert.match(app, /ゼブラフィッシュ変異導入/);
  assert.match(app, /Gupta 2012で選択的に評価された小規模cohortの成績です。本サイトの各候補の成功確率ではありません。/);
});

test("design computation contains no runtime network API", async () => {
  const sourceDir = fileURLToPath(new URL("../src", import.meta.url));
  const sourceFiles = await listFiles(sourceDir);
  const networkApi = /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\s*\(/;
  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, networkApi, `${file} contains a runtime network API`);
  }
});

test("header displays the concise local-processing label", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const patch = await readFile(new URL("../src/ui-patch.css", import.meta.url), "utf8");
  assert.match(app, /入力配列はサーバーへ送信されません/);
  assert.match(patch, /\.local-badge::after/);
  assert.match(patch, /content: "ローカル処理"/);
});

test("overview diagram marks both strand cut sites on the spacer", async () => {
  const diagram = await readFile(new URL("../src/ZfnOverviewDiagram.tsx", import.meta.url), "utf8");
  assert.match(diagram, /5–7 bp spacer/);
  assert.match(diagram, /切断部位/);
  assert.equal((diagram.match(/className="overview-lightning"/g) ?? []).length, 2);
  assert.match(diagram, /M518\.5 174/);
  assert.match(diagram, /M518\.5 258/);
  assert.match(diagram, /LightningIcon position="top"/);
  assert.match(diagram, /LightningIcon position="bottom"/);
});
