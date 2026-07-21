const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");

test("native title tooltips avoid design notes and long explanations", () => {
  const source = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const banned = [
    "参考 Kubernetes",
    "GitLens",
    "GitHub PR",
    "Cline/Continue",
    "直接解释主要按钮",
    "不允许点击后无反应",
    "为保证面板长时间运行稳定",
    "为保持大集群面板稳定",
    "为保持 Webview 长时间运行稳定",
    "完整状态仍",
    "完整进程仍",
    "这些参数用于",
    "只影响删除、停止、归档",
  ];
  for (const text of banned) assert.doesNotMatch(source, new RegExp(text), text);
  for (const expected of ["title=\"运维总览\"", "title=\"对象状态\"", "title=\"通信拓扑\"", "title=\"调度参数\"", "title=\"GPU 已省略\""]) {
    assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), expected);
  }
});