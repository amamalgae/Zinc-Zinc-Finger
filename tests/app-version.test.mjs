import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version number maps directly to its implementation PR", () => {
  assert.equal(APP_VERSION_NUMBER, 21);
  assert.equal(APP_VERSION, "ver.21 (PR #21)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger/pull/21");
});
