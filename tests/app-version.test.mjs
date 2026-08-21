import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  APP_VERSION_NUMBER,
  APP_VERSION_PR_URL,
} from "../src/app-version.ts";

test("displayed version links to the genome-page-readiness PR", () => {
  assert.equal(APP_VERSION_NUMBER, 79);
  assert.equal(APP_VERSION, "ver.79 (PR #79)");
  assert.equal(APP_VERSION_PR_URL, "https://github.com/amamalgae/Zinc-Zinc-Finger/pull/79");
});
