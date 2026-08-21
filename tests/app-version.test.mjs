import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version links to the genome multi-file input PR", () => {
  assert.equal(APP_VERSION_NUMBER, 68);
  assert.equal(APP_VERSION, "ver.68 (PR #68)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger/pull/68");
});
