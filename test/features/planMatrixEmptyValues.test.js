const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const builder = require("../../src/features/PlanBuilder.legacy.ts");
const text = fs.readFileSync(path.join(__dirname, "../../src/mcp/query/Plans.ts"), "utf8");
const tree = ts.createSourceFile("plan.ts", text, ts.ScriptTarget.ES2022, true);
const nodes = ["planMatrix", "hasExplicitEmptyMatrix"].map(name => tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(tree).replace(/^export /, ""));
const code = ts.transpileModule(`${nodes.join("\n")}\nplanMatrix`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("empty seed and commented multiline empty cases produce no matrix rows", async () => {
  let yaml, output;
  const run = vm.runInNewContext(code, { ...builder, path, queryContext: () => ({ root: "synthetic" }),
    fs: { existsSync: () => true, readFileSync: () => yaml }, emit: value => { output = value; } });
  for (const text of [
    "suite: demo\ncases: [a]\nseeds: []\n",
    "suite: demo\ncases: # explanation\n  # more\n  []\nseeds: [1]\n",
    "suite: demo\nexperiments: {} # empty\nseeds: [1]\n",
  ]) {
    yaml = text; assert.equal(await run("plan.yaml"), 0); assert.equal(output.count, 0, text);
  }
  yaml = "suite: demo\ncases: [a]\nseeds: [0, 1]\n";
  assert.equal(await run("plan.yaml"), 0);
  assert.equal(output.count, 2);
});
