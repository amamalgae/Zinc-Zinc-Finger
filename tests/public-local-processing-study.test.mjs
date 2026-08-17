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

test("study card names the organisms actually tested in Sander 2011", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /38標的中19標的で/);
  assert.match(app, /実証宿主：ゼブラフィッシュ／シロイヌナズナ／ダイズ/);
  assert.match(app, /Sander 2011の実験条件で得られた集団成績です。本サイトが提示する各候補の成功確率ではありません。/);
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

test("header explicitly describes browser-local processing", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /端末内で計算（ローカル処理）/);
  assert.match(app, /入力配列はサーバーへ送信されません/);
});
