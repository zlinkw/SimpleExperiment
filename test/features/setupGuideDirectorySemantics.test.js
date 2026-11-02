const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const guide = fs.readFileSync(path.join(__dirname, "../../docs/simple-experiment-setup.md"), "utf8");
const readme = fs.readFileSync(path.join(__dirname, "../../README.md"), "utf8");

test("setup guide explains project parent directory and upload destination", () => {
  assert.match(guide, /## 3\. 目录、端口与身份先填清楚/);
  assert.match(guide, /## 4\. 添加第一台 Worker/);
  assert.match(guide, /SimpleExperiment → 设置 → 服务器/);
  assert.match(guide, /不要用文件路径、系统根、数据集根或临时目录代替项目父目录/);
  assert.match(readme, /最终代码目录是/);
  assert.match(readme, /<项目父目录>\/<本地工作区名称>\/<全局前缀>_agent\/simple_cluster\/runtime/);
  assert.match(guide, /检查全部启用 Worker/);
  assert.match(guide, /唯一默认公共例外是同账号同 Worker 的 GPU 采样/);
  assert.match(guide, /已有显式安装\/状态目录原样保留/);
});

test("current guides describe one global prefix and never recommend the retired sibling runtime default", () => {
  const files = ["README.md", "docs/simple-experiment-setup.md", "docs/configuration-reference.md", "docs/release-delivery.md", "docs/plugin-project-contract.md", "docs/technical-notes.md"];
  for (const file of files) {
    const text = fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
    assert.match(text, /simpleExperiment\.tunnel\.remoteTmuxSessionPrefix/, file);
    assert.match(text, /每次打开.*默认.*提醒/, file);
    assert.doesNotMatch(text, /<项目父目录>\/simple_agent/, file);
  }
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8")).contributes.configuration.properties;
  assert.equal(config["simpleExperiment.tunnel.remoteTmuxSessionPrefix"].default, "simple");
  assert.equal(config["simpleExperiment.tunnel.remoteTmuxSessionPrefix"].scope, "application");
  const reference = fs.readFileSync(path.join(__dirname, "../../docs/configuration-reference.md"), "utf8");
  assert.doesNotMatch(reference, /`simpleExperiment\.tensorboard\.tmuxSession`/);
  assert.match(reference, /旧项目别名不覆盖|旧项目.*别名不覆盖/);
});
