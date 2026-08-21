import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version links to the progressive-candidate PR", () => {
  assert.equal(APP_VERSION_NUMBER, 74);
  assert.equal(APP_VERSION, "ver.74 (PR #74)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger/pull/74");
});
