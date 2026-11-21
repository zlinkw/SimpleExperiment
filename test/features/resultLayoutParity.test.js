const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ts = require("typescript");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const layout = require("../../src/results/ResultLayout.ts");

test("TypeScript and Python dataset paths agree and the old key remains readable", () => {
  const names = ["BUS", "肺", "肝", "set-肺", "a b", "𠀀测试"];
  const result = spawnSync("python", ["-B", "-X", "utf8", path.join(__dirname, "resultLayoutParity.py")], {
    input: JSON.stringify({ functions: layout.RESULT_LAYOUT_PYTHON, names }), encoding: "utf8", timeout: 10000, windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  const python = JSON.parse(result.stdout);
  assert.deepEqual(python.keys, names.map(layout.datasetPathKey));
  assert.equal(python.legacy, "_");
  const agent = fs.readFileSync(path.join(__dirname, "../../src/clusterAgentRuntime.legacy.ts"), "utf8");
  assert.match(agent, /table\["datasetKey"\] not in \(dataset_path_key\(dataset\), legacy_dataset_path_key\(dataset\)\)/);
});
