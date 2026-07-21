const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("configuration preview translates parameter kinds and labels the open action", () => {
  assert.match(panel, /function configParamKindLabel\(kind\)/);
  assert.match(panel, /yaml: "YAML 配置"/);
  assert.match(panel, /scalar: "单值", mapping: "对象"/);
  assert.match(panel, /configParamKindLabel\(param\.kind\)/);
  assert.match(panel, /原始类型：/);
  assert.match(panel, />打开配置文件<\/button>/);
});

test("unknown configuration kinds remain compatible", () => {
  assert.match(panel, /return labels\[raw\.toLowerCase\(\)\] \|\| raw \|\| "参数"/);
  assert.doesNotMatch(panel, />打开 config<\/button>/);
});
