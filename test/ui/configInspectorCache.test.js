const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

function inlineFunction(name) {
  const html = renderPanelHtml();
  const scriptStart = html.indexOf(">", html.indexOf("<script")) + 1;
  const script = html.slice(scriptStart, html.indexOf("</script>", scriptStart));
  const start = script.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "missing inline function " + name);
  const bodyStart = script.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < script.length; index += 1) {
    const char = script[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return script.slice(start, index + 1);
  }
  throw new Error("unclosed inline function " + name);
}

test("config inspector reuses static path and search indexes until source replacement", () => {
  const context = {
    configInspectorIndexCacheSource: null,
    configInspectorIndexCacheValue: null,
    asArray(value) { return Array.isArray(value) ? value : []; },
    naturalCompare(left, right) { return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }); },
  };
  vm.runInNewContext([inlineFunction("configPathParts"), inlineFunction("configInspectorIndex")].join("\n"), context);
  const configs = [
    { file: "configs/model10/base.yaml", folder: "model10", params: [{ key: "seed", value: "2", kind: "scalar" }] },
    { file: "configs/model2/train.yaml", folder: "model2", params: [{ key: "dataset", value: "PAD-UFES-20", kind: "scalar" }] },
    { file: "configs/model2/eval.yaml", folder: "model2", params: [{ key: "output_dir", value: "work_dirs/eval", kind: "scalar" }] },
  ];
  const first = context.configInspectorIndex(configs);
  assert.equal(context.configInspectorIndex(configs), first);
  assert.deepEqual(Array.from(first.level1Values), ["model2", "model10"]);
  assert.deepEqual(Array.from(first.level2ValuesByLevel1.get("model2")), ["eval.yaml", "train.yaml"]);
  assert.match(first.indexed[1].searchText, /pad-ufes-20/);
  const replaced = context.configInspectorIndex(configs.slice());
  assert.notEqual(replaced, first);
  assert.equal(replaced.indexed.length, 3);
});

test("config inspector filtering consumes cached search text", () => {
  const html = renderPanelHtml();
  assert.match(html, /const staticIndex = configInspectorIndex\(configSummaries\)/);
  assert.match(html, /cfg\.searchText\.includes\(query\)/);
  assert.match(html, /configInspectorIndexCacheSource === source/);
});

test("config inspector debounce ignores stale callbacks", () => {
  const html = renderPanelHtml();
  assert.match(html, /let configParamFilterGeneration = 0/);
  assert.match(html, /const generation = \+\+configParamFilterGeneration/);
  assert.match(html, /if \(generation !== configParamFilterGeneration\) return;/);
});
