const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");

test("target mode plan keeps only the latest active target and current guardrails", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const plan = fs.readFileSync(path.join(root, "docs", "target-mode-plan.md"), "utf8");

  assert.match(readme, /docs\/target-mode-plan\.md/);
  assert.match(readme, /只保留最新活动目标/);
  for (const text of [
    "目标模式当前计划",
    "只保留最新活动目标",
    "角色分工",
    "全局约束",
    "当前批次",
    "相邻回归风险",
    "验证清单",
    "后续优先级",
    "本批记录",
    "Agent runtime cache",
    "项目计划、结果、归档、删除墓碑和文件传输状态属于项目态",
    "metrics_summary.csv",
    "Xshell 本地隧道 + 可选 Hub/Worker Agent + SimpleSFTP",
    "新增补充任务不得破坏当前主目标",
    "计划更新必须防止修复循环",
    "PPT 绘图链路与 realtime post gate 稳定化",
    "per-request timeout",
    "pending key",
    "lastSeq/lastHeartbeatAt",
    "禁止“父级 evidence key 被子文件 archive 反向命中”",
    "docs/target-plans/server-gpu-history.md",
    "docs/target-plans/docker-codex-plugin-compat.md",
  ]) {
    assert.match(plan + readme, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const oldText of [
    "Batch 36：UI 按需渲染与 Agent 低频采样",
    "Batch 120：计划与结果长期运行闭环",
    "目标模式当前计划：资源树总结性静态目录防闪烁",
    "0.1.166",
  ]) {
    assert.doesNotMatch(plan, new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(plan, /\[(?:待做|进行中|已完成)\]/);
  const priorityStatuses = [...plan.matchAll(/^- \[(待做|进行中|已完成)\] \d+\/\d+/gm)];
  assert.ok(priorityStatuses.length > 0);
  assert.equal((plan.match(/^## 当前批次/gm) || []).length, 1);
  assert.ok(plan.split(/\r?\n/).length <= 80);
});
