import archiveData from "../data/coda-2011-units.json" with { type: "json" };

const f2Helices = new Map(archiveData.f2Contexts.map(({ target, helix }) => [target, helix]));
const keys = archiveData.units.map(({ unit, f2Target, target }) => `${unit}:${f2Target}:${target}`);
const f1 = archiveData.units.filter(({ unit }) => unit === "f1");
const f3 = archiveData.units.filter(({ unit }) => unit === "f3");
const assemblableRecognitionSites = archiveData.f2Contexts.reduce((sum, { target }) => {
  const f1Count = f1.filter(({ f2Target }) => f2Target === target).length;
  const f3Count = f3.filter(({ f2Target }) => f2Target === target).length;
  return sum + f1Count * f3Count;
}, 0);

const report = {
  f2Contexts: archiveData.f2Contexts.length,
  f1Units: f1.length,
  f3Units: f3.length,
  uniqueCompositeKeys: new Set(keys).size,
  duplicateCompositeKeys: keys.length - new Set(keys).size,
  inconsistentF2Helices: archiveData.units.filter(({ f2Target, f2Helix }) => f2Helices.get(f2Target) !== f2Helix).length,
  assemblableRecognitionSites,
  possibleNineBaseSites: 4 ** 9,
  recognitionSiteCoveragePercent: Number((100 * assemblableRecognitionSites / 4 ** 9).toFixed(3)),
};

console.log(JSON.stringify(report, null, 2));

if (
  report.f2Contexts !== 18 ||
  report.f1Units !== 319 ||
  report.f3Units !== 344 ||
  report.duplicateCompositeKeys !== 0 ||
  report.inconsistentF2Helices !== 0
) process.exitCode = 1;
