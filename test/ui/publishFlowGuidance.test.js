const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panelSource = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panelSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = panelSource.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panelSource.length; index += 1) {
    if (panelSource[index] === "{") depth += 1;
    if (panelSource[index] === "}") depth -= 1;
    if (depth === 0) return panelSource.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function loadFlow() {
  const sandbox = {
    SYNC_NOT_READY_STATUS_TOKENS: new Set(["-", "待同步", "pending", "running", "in_progress", "unknown", "同步中", "执行中", "已跳过", "未参与本次同步"]),
    asArray: (value) => (Array.isArray(value) ? value : []),
    hasText: (value) => {
      const text = String(value || "").trim();
      return Boolean(text && text !== "-");
    },
    labelStatus: (value) => String(value || "-"),
    compactIdentifier: (value) => String(value || "-"),
    publishAgentReadiness: (state) => (state || {})._agent || { ready: false, status: "待检测", detail: "Agent 状态未知" },
    onboardingStep: (title, ok, status, detail, options) => JSON.stringify({ title, ok, status, tone: ok ? "good" : (options || {}).pending ? "pending" : (options || {}).current ? "current" : "warn" }) + "\n",
    projectNextAction: (status, label, command) => JSON.stringify({ next: status, label, command }),
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("syncStatusOk"),
    extractFunction("syncStatusFailure"),
    extractFunction("publishFlowSteps"),
    extractFunction("publishFlowBlocker"),
    extractFunction("renderPublishFlow"),
    "this.steps = publishFlowSteps;",
    "this.blocker = publishFlowBlocker;",
    "this.render = renderPublishFlow;",
  ].join("\n"), sandbox);
  return sandbox;
}

function tones(html) {
  return [...html.matchAll(/\{"title":.*?\}/g)].map((match) => JSON.parse(match[0]).tone);
}

function nextAction(html) {
  const match = /\{"next":.*?\}/.exec(html);
  return match ? JSON.parse(match[0]) : null;
}

const READY_STATE = {
  codeSync: { fingerprint: "abc123", hub: "已同步", workers: "已同步" },
  _agent: { ready: true, status: "已就绪", detail: "Agent 可达" },
};

test("a failed sync step is toned apart from one that has not started", () => {
  const flow = loadFlow();
  const html = flow.render({
    codeSync: { fingerprint: "abc123", hub: "失败", workers: "待同步" },
    _agent: { ready: false, status: "待检测", detail: "-" },
  });

  assert.deepEqual(tones(html), ["good", "warn", "pending", "pending"]);
});

test("the first actionable step is marked current and drives the next action", () => {
  const flow = loadFlow();
  const html = flow.render({
    codeSync: { fingerprint: "abc123", hub: "已同步", workers: "待同步" },
    _agent: { ready: false, status: "待检测", detail: "-" },
  });

  assert.deepEqual(tones(html), ["good", "good", "current", "pending"]);
  const next = nextAction(html);
  assert.equal(next.command, "distributeCodeToWorkers");
  assert.equal(next.label, "分发到 Worker");
  assert.match(next.next, /^完成同步 Worker：/);
});

test("a failed blocker asks to repair rather than to complete", () => {
  const flow = loadFlow();
  const next = nextAction(flow.render({
    codeSync: { fingerprint: "abc123", hub: "错误", workers: "已同步" },
    _agent: { ready: true, status: "已就绪", detail: "-" },
  }));
  assert.equal(next.command, "uploadProjectToHub");
  assert.match(next.next, /^修复同步 Hub：/);
});

test("a missing fingerprint blocks at the first step", () => {
  const flow = loadFlow();
  const html = flow.render({ codeSync: {}, _agent: { ready: false, status: "待检测", detail: "-" } });
  assert.deepEqual(tones(html), ["current", "pending", "pending", "pending"]);
  assert.equal(nextAction(html).command, "syncGithub");
});

test("a fully ready chain reports readiness instead of an action", () => {
  const flow = loadFlow();
  const html = flow.render(READY_STATE);
  assert.deepEqual(tones(html), ["good", "good", "good", "good"]);
  assert.equal(nextAction(html), null);
  assert.match(html, /发布同步链路已就绪，可提交计划/);
  assert.equal(flow.blocker(flow.steps(READY_STATE)), null);
});

test("blocker selection tolerates missing step data", () => {
  const flow = loadFlow();
  assert.equal(flow.blocker(null), null);
  assert.equal(flow.blocker([]), null);
  assert.equal(flow.blocker([null, { ok: true }]), null);
  assert.equal(flow.blocker([{ ok: true }, { ok: false, title: "x" }]).title, "x");
});
