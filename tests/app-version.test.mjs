import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version links to the SELECT decision-cue PR", () => {
  assert.equal(APP_VERSION_NUMBER, 73);
  assert.equal(APP_VERSION, "ver.73 (PR #73)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger/pull/73");
});
