import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePersikovLinearModel,
  persikovTargetFit,
  predictArrayPwm,
} from "../src/persikov-svm.ts";

const SYNTHETIC_LINEAR_MODEL = `SVM-light Version V6.01
0 # kernel type
3 # kernel parameter -d
1 # kernel parameter -g
1 # kernel parameter -s
1 # kernel parameter -r
empty# kernel parameter -u
560 # highest feature index
1 # number of training documents
2 # number of support vectors plus 1
0 # threshold b, each following line is a SV (starting with alpha*y)
1 1:1 #
`;

test("the optional evaluator accepts an SVMl7-format linear model", () => {
  const model = parsePersikovLinearModel(SYNTHETIC_LINEAR_MODEL);
  assert.equal(model.weights.length, 560);
  assert.equal(model.weights[0], 1);
  assert.equal(model.weights[1], 0);
  assert.throws(
    () => parsePersikovLinearModel(SYNTHETIC_LINEAR_MODEL.replace("0 # kernel type", "1 # kernel type")),
    /expanded linear model/,
  );
});

test("the seven-contact model produces a 3n+1 PWM and finite target fit", () => {
  const model = parsePersikovLinearModel(SYNTHETIC_LINEAR_MODEL);
  const fingers = [{ helix: "QRANLRA" }, { helix: "QRANLRA" }];
  const pwm = predictArrayPwm(model, fingers);
  assert.equal(pwm.length, 7);
  for (const column of pwm) {
    assert.ok(Math.abs(column.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  }
  const fit = persikovTargetFit(model, fingers, "AAAAAA");
  assert.ok(fit > 0 && fit <= 1);
});
