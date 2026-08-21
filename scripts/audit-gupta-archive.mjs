import archiveData from "../data/gupta-2012-two-finger-modules.json" with { type: "json" };
import { buildCodaArray } from "../src/coda-module-archive.ts";
import { buildGuptaArray } from "../src/gupta-module-archive.ts";

const targets = archiveData.targets;
let guptaRecognitionSites = 0;
let unionRecognitionSites = 0;
for (let value = 0; value < 4 ** 9; value += 1) {
  let encoded = value;
  let sequence = "";
  for (let position = 0; position < 9; position += 1) {
    sequence = "ACGT"[encoded % 4] + sequence;
    encoded = Math.floor(encoded / 4);
  }
  const gupta = buildGuptaArray(sequence);
  if (gupta) guptaRecognitionSites += 1;
  if (gupta || buildCodaArray(sequence)) unionRecognitionSites += 1;
}
const report = {
  sourceMd5: archiveData.metadata.sourceMd5,
  targetRows: targets.length,
  uniqueTargets: new Set(targets.map(({ target }) => target)).size,
  uniqueModules: new Set(targets.map(({ id }) => id)).size,
  invalidTargets: targets.filter(({ target }) => !/^[ACGT]{6}$/.test(target)).length,
  invalidHelices: targets.filter(({ f1Helix, f2Helix }) => !/^[ACDEFGHIKLMNPQRSTVWY]{7}$/.test(f1Helix) || !/^[ACDEFGHIKLMNPQRSTVWY]{7}$/.test(f2Helix)).length,
  unreconstructableRows: targets.filter(({ target, f1Helix, f2Helix }) => {
    const array = buildGuptaArray(`${target}GAA`);
    return !array || array.moduleTarget !== target || array.fingers[1].helix !== f1Helix || array.fingers[2].helix !== f2Helix;
  }).length,
  guptaRecognitionSites,
  guptaRecognitionCoveragePercent: Number((guptaRecognitionSites / 4 ** 9 * 100).toFixed(3)),
  guptaCodaUnionRecognitionSites: unionRecognitionSites,
  guptaCodaUnionCoveragePercent: Number((unionRecognitionSites / 4 ** 9 * 100).toFixed(3)),
};

console.log(JSON.stringify(report, null, 2));

if (
  report.sourceMd5 !== "1998b2a86b539c624bbb5ee944875530" ||
  report.targetRows !== 162 ||
  report.uniqueTargets !== 162 ||
  report.uniqueModules !== 87 ||
  report.invalidTargets !== 0 ||
  report.invalidHelices !== 0 ||
  report.unreconstructableRows !== 0 ||
  report.guptaRecognitionSites !== 8700 ||
  report.guptaCodaUnionRecognitionSites !== 13978
) process.exitCode = 1;
