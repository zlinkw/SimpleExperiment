const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

test("latest result catalog retains special column values after JSON serialization", async () => {
  const text = fs.readFileSync(path.join(__dirname, "../../src/results/LatestResultExport.ts"), "utf8");
  const tree = ts.createSourceFile("LatestResultExport.ts", text, ts.ScriptTarget.ES2022, true);
  const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "latestResultCatalog");
  const code = ts.transpileModule(`${declaration.getText(tree).replace(/^export /, "")}\nlatestResultCatalog`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const result = { tables: [{ dataset: "demo", datasetKey: "demo", header: ["__proto__", "accuracy"],
    rows: [["0.4", "0.8"]], relativePath: "table.csv", markdownPath: "table.md" }] };
  const catalog = vm.runInNewContext(code, { readLatestResultExport: async () => result, path });
  const serialized = JSON.parse(JSON.stringify(await catalog("project", "results")));
  assert.equal(serialized.datasets[0].tables[0].values.__proto__[0], "0.4");
  assert.equal(serialized.datasets[0].tables[0].values.accuracy[0], "0.8");
});
