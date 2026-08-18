import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DESIRED_CUT_INPUT,
  DEFAULT_MAX_DISTANCE_INPUT,
  desiredCutInputError,
  parseUnsignedIntegerInput,
} from "../src/manual-numeric-input.ts";

test("manual coordinate controls default to 1000 and accept unsigned integers", () => {
  assert.equal(DEFAULT_DESIRED_CUT_INPUT, "1000");
  assert.equal(DEFAULT_MAX_DISTANCE_INPUT, "1000");
  assert.equal(parseUnsignedIntegerInput("0"), 0);
  assert.equal(parseUnsignedIntegerInput("1000"), 1000);
  assert.equal(parseUnsignedIntegerInput(""), null);
  assert.equal(parseUnsignedIntegerInput("-1"), null);
  assert.equal(parseUnsignedIntegerInput("1.5"), null);
});

test("only a desired center inside the input sequence is valid", () => {
  assert.equal(desiredCutInputError("1000", 1000), null);
  assert.equal(desiredCutInputError("1001", 1000), "入力配列の範囲内（0〜1000）に訂正してください。");
  assert.equal(desiredCutInputError("", 1000), "0以上の整数を入力してください。");
});
