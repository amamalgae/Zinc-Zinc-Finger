import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version links to the repository Code page while retaining the implementation PR number", () => {
  assert.equal(APP_VERSION_NUMBER, 32);
  assert.equal(APP_VERSION, "ver.32 (PR #32)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger");
});
