const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = panel.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function extractFrozenObject(name) {
  const start = panel.indexOf(`const ${name} = Object.freeze({`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = panel.indexOf("});", start);
  assert.ok(end > start, `unterminated ${name}`);
  return panel.slice(start, end + 3);
}

function loadConfigKindLabel() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFrozenObject("CONFIG_PARAM_KIND_LABELS")}\n${extractFunction("configParamKindLabel")}\nthis.kindLabel = configParamKindLabel;\nthis.kindLabels = CONFIG_PARAM_KIND_LABELS;`, sandbox);
  return sandbox;
}

test("configuration preview translates parameter kinds and labels the open action", () => {
  const sandbox = loadConfigKindLabel();
  assert.equal(sandbox.kindLabel("yaml"), "YAML 配置");
  assert.equal(sandbox.kindLabel("PY"), "Python 配置");
  assert.equal(sandbox.kindLabel("mapping"), "对象");
  assert.equal(Object.isFrozen(sandbox.kindLabels), true);
  assert.match(panel, /const CONFIG_PARAM_KIND_LABELS = Object\.freeze\(\{/);
  assert.match(panel, /configParamKindLabel\(param\.kind\)/);
  assert.match(panel, /原始类型：/);
  assert.match(panel, />打开配置文件<\/button>/);
});

test("unknown configuration kinds remain compatible", () => {
  const sandbox = loadConfigKindLabel();
  assert.equal(sandbox.kindLabel("future-kind"), "future-kind");
  assert.equal(sandbox.kindLabel(""), "参数");
  assert.match(extractFunction("configParamKindLabel"), /CONFIG_PARAM_KIND_LABELS\[raw\.toLowerCase\(\)\] \|\| raw \|\| "参数"/);
  assert.doesNotMatch(extractFunction("configParamKindLabel"), /const labels =/);
  assert.doesNotMatch(panel, />打开 config<\/button>/);
});
