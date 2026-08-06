import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import h5wasm from "h5wasm/node";

const [inputPath, outputPath = "src/deepzf-pwm-weights.ts"] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: node scripts/convert-deepzf-pwm.mjs <transfer_model100.h5> [output.ts]",
  );
  process.exit(1);
}

await h5wasm.ready;

const model = new h5wasm.File(path.resolve(inputPath), "r");

function tensor(datasetPath) {
  const dataset = model.get(datasetPath);
  const values = dataset.value;
  const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);

  return {
    shape: dataset.shape,
    base64: bytes.toString("base64"),
  };
}

const weights = {
  dense1Kernel: tensor("model_weights/dense/dense/kernel:0"),
  dense1Bias: tensor("model_weights/dense/dense/bias:0"),
  dense2Kernel: tensor("model_weights/dense_1/dense_1/kernel:0"),
  dense2Bias: tensor("model_weights/dense_1/dense_1/bias:0"),
  position1Kernel: tensor("model_weights/dense_2/dense_2/kernel:0"),
  position1Bias: tensor("model_weights/dense_2/dense_2/bias:0"),
  position2Kernel: tensor("model_weights/dense_3/dense_3/kernel:0"),
  position2Bias: tensor("model_weights/dense_3/dense_3/bias:0"),
  position3Kernel: tensor("model_weights/dense_4/dense_4/kernel:0"),
  position3Bias: tensor("model_weights/dense_4/dense_4/bias:0"),
};

model.close();

const output = `// Generated from DeepZF PWMpredictor transfer_model100.h5.\n// Upstream commit: 351da3013467631ad5390b71648680f34b2634fa\n// Source model SHA-256: 2488eb1f07a26779f03bee946bc958d42213db560de3d9cb05c0ea9cab0e656d\n// Do not edit this generated file by hand. See THIRD_PARTY_NOTICES.md.\n\nexport const deepZfPwmWeights = ${JSON.stringify(weights, null, 2)} as const;\n`;

fs.writeFileSync(path.resolve(outputPath), output);
console.log(`Wrote ${outputPath}`);
