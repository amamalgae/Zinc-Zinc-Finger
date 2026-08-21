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
  assert.match(app, /<strong>9\/11<\/strong>/);
  assert.match(app, /zebrafish targets mutated<br \/>in Gupta 2012/);
  assert.match(app, /A small, selectively evaluated cohort\. It is not the success probability of any candidate on this site\./);
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
  assert.match(app, /Sequences stay on your device/);
  assert.match(app, /Designs are computed in your browser; sequences are never sent to a server/);
  assert.match(patch, /\.local-badge::after/);
  assert.match(patch, /content: "Runs in your browser"/);
});

test("overview diagram marks both strand cut sites on the spacer", async () => {
  const diagram = await readFile(new URL("../src/ZfnOverviewDiagram.tsx", import.meta.url), "utf8");
  assert.match(diagram, /5–7 bp spacer/);
  assert.match(diagram, /cut site/);
  assert.equal((diagram.match(/className="overview-lightning"/g) ?? []).length, 2);
  assert.match(diagram, /M518\.5 174/);
  assert.match(diagram, /M518\.5 258/);
  assert.match(diagram, /LightningIcon position="top"/);
  assert.match(diagram, /LightningIcon position="bottom"/);
});
