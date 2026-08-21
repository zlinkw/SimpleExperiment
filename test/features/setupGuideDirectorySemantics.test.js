const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const guide = fs.readFileSync(path.join(__dirname, "../../docs/simple-experiment-setup.md"), "utf8");

test("setup guide explains project parent directory and upload destination", () => {
  assert.match(guide, /```mermaid/);
  assert.match(guide, /## 最快接入路径/);
  assert.match(guide, /\| 阶段 \| 完成标准 \|/);
  assert.match(guide, /开始一键配置/);
  assert.match(guide, /离线安装包中的 `simple-experiment-setup\.md`/);
  assert.ok((guide.match(/```mermaid/g) || []).length >= 2);
  assert.match(guide, /项目父目录.*不要填写当前项目名或 `simple_agent`/);
  assert.match(guide, /插件会自动追加当前项目名/);
  assert.match(guide, /代码上传到 \/remote\/experiments\/my_project/);
  assert.match(guide, /Agent runtime 位于 \/remote\/experiments\/simple_agent/);
  assert.match(guide, /检测全部隧道/);
});
