import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version links to the genome-transition PR", () => {
  assert.equal(APP_VERSION_NUMBER, 75);
  assert.equal(APP_VERSION, "ver.75 (PR #75)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger/pull/75");
});
