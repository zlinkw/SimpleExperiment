const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");
const { terminalHistoryLogBinding } = require("../../dist/features/DistributedPlanQueue.js");
const { readSource } = require("../_helpers/sourceReader");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

test("Rich progress redraws replace old lines in the log view", () => {
  const html = renderPanelHtml();
  const start = html.indexOf("function terminalDisplayText(raw)");
  const end = html.indexOf("async function refreshTmuxCapture(", start);
  assert.ok(start >= 0 && end > start);
  const display = vm.runInNewContext(html.slice(start, end) + "; terminalDisplayText;");
  const progress = "start\nTrain 1/3 0%\nVal 1/3 0%\r\x1b[2K\x1b[1A\x1b[2KTrain 1/3 50%\nVal 1/3 50%\r\x1b[2K\x1b[1A\x1b[2KTrain 1/3 100%\nVal 1/3 100%";
  const result = display(progress);
  assert.match(result, /start/);
  assert.match(result, /Train 1\/3 100%/);
  assert.match(result, /Val 1\/3 100%/);
  assert.doesNotMatch(result, /(?:^|\s)(?:0%|50%)|\x1b/);
});

function attachmentFunctions() {
  const html = renderPanelHtml();
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n");
  const ast = ts.createSourceFile("panel.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = new Set(["renderTmuxAttachControl"]), functions = [];
  let click;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) functions.push(node.getText(ast));
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "document.addEventListener" && node.arguments[0]?.text === "click"
      && node.arguments[1]?.getText(ast).includes('[data-copy-target]')) click = node.arguments[1].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(functions.length, names.size); assert.ok(click);
  return { html, code: functions.join("\n") + "\nthis.copy = " + click + ";" };
}

test("attachment controls use only a selected real Worker window and replace all placeholder commands", () => {
  const { html, code } = attachmentFunctions();
  const { TmuxSection } = require("../../dist/ui/sections/TmuxSection.js");
  for (const rendered of [html, new TmuxSection().renderHtml()]) {
    assert.doesNotMatch(rendered, /tmuxCmdAgent|tmuxCmdSch|tmuxCmdGpu|ssh &lt;user&gt;|zlk-sch-&lt;opId&gt;/);
    assert.match(rendered, /id="tmuxAttachCopy"[^>]*disabled/);
  }
  const label = { textContent: "" }, button = { dataset: { tmuxAttachCopy: "true" } }, requests = [];
  let workers = [], target = "";
  const sandbox = { el: id => id === "tmuxAttachTarget" ? label : id === "tmuxAttachCopy" ? button : null,
    enabledWorkerTunnelsForState: () => workers, lastState: {}, tmuxSelectedWorkerId: "a", tmuxListCache: {},
    tmuxResolveCaptureTarget: () => target, vscode: { postMessage: value => requests.push(value) } };
  vm.createContext(sandbox); vm.runInContext(code, sandbox);
  sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true);
  workers = [{ id: "a" }];
  sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true); assert.match(label.textContent, /未核实/);
  sandbox.tmuxListCache = { workerId: "a", ok: false, error: "offline" };
  sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true); assert.match(label.textContent, /offline/);
  sandbox.tmuxListCache = { workerId: "a", ok: true, fetchedAt: "source-time", sessions: [{ name: "historical-prefix", windows: [
    { target: "historical-prefix:7", index: "7", windowId: "@41", name: "retained", panes: [{ id: "%9", target: "historical-prefix:7.0" }] },
  ] }] };
  sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true);
  target = "historical-prefix:7.0"; sandbox.renderTmuxAttachControl();
  assert.equal(button.disabled, false); assert.match(label.textContent, /a · historical-prefix:7 · @41 · 上次查询 source-time/);
  sandbox.copy({ target: { closest: () => button } });
  const payload = requests[0]; assert.equal(payload.command, "copyText");
  assert.equal(payload.tmuxAttach.windowId, "@41"); assert.equal(payload.tmuxAttach.workerId, "a");
  assert.deepEqual([...payload.tmuxAttach.paneIds], ["%9"]);
  sandbox.tmuxListCache.sessions.push({ name: "linked", windows: [{ index: "0", windowId: "@41", name: "retained", panes: [{ id: "%9" }] }] });
  target = "@41"; sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true);
  sandbox.tmuxListCache.sessions.pop(); target = "historical-prefix:7.0";
  sandbox.tmuxListCache.sessions[0].windows[0].windowId = "";
  sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true); assert.equal(button.dataset.tmuxAttach, undefined);
  sandbox.tmuxListCache = { workerId: "other", ok: true };
  sandbox.renderTmuxAttachControl(); assert.equal(button.disabled, true);
});

test("copying an attachment queries fresh Worker identity and never copies a changed or unknown target", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === "RealtimeTunnelPanelProvider");
  const method = cls.members.find(n => n.name?.getText(ast) === "copyTextFromUi").getText(ast);
  const copied = [], requests = [], notices = [];
  let currentRoot = "/local/project", workers = [{ id: "a" }], mode = "normal", nonce = 0;
  const session = "alice's-task";
  const expected = { workerId: "a", target: session + ":0", windowId: "@7", windowName: "console", paneIds: ["%7"] };
  const endpointClient = { requestJson: async (...args) => {
    requests.push(args);
    if (mode === "offline") throw new Error("connection unavailable");
    if (mode === "switch") currentRoot = "/local/other";
    return { ok: mode !== "failed", available: true, workerId: mode === "foreign" ? "other" : "a", error: "list unavailable", sessions: [{ name: session, windows: [
      { index: "0", name: "console", windowId: mode === "replaced" ? "@8" : "@7", panes: [{ id: mode === "changed-pane" ? "%8" : "%7" }] },
    ] }] };
  } };
  const Host = vm.runInNewContext(ts.transpileModule("class Host {" + method + "}; Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    workspaceRoot: () => currentRoot, crypto: { randomUUID: () => "copy-" + ++nonce },
    TmuxWindowIdentity: require("../../dist/features/TmuxWindowIdentity.js"),
    vscode: { env: { clipboard: { writeText: async text => copied.push(text) } }, window: {
      showInformationMessage: text => notices.push(text), showWarningMessage: text => notices.push(text),
    } },
  });
  const host = new Host(); host.enabledWorkerConfigs = () => workers;
  host.client = { clients: new Map([["a", endpointClient]]) };
  host.requestTmuxJson = () => { throw new Error("unexpected legacy fallback"); };
  await host.copyTextFromUi({ text: "plain text" }); assert.deepEqual(copied, ["plain text"]);
  await host.copyTextFromUi({ tmuxAttach: expected });
  assert.equal(copied.at(-1), "tmux attach-session -t '=alice'\"'\"'s-task:@7'");
  assert.match(requests[0][0], /^\/api\/tmux\/list\?attachCheck=copy-/);
  assert.equal(requests[0][1], "manual_refresh"); assert.equal(requests[0][3].method, "GET");
  assert.match(notices.at(-1), /a 的窗口 @7/);
  for (mode of ["foreign", "failed", "replaced", "changed-pane", "offline", "switch"]) {
    currentRoot = "/local/project";
    const before = copied.length;
    await assert.rejects(host.copyTextFromUi({ tmuxAttach: expected }));
    assert.equal(copied.length, before, mode);
  }
  const before = requests.length; workers = [];
  await assert.rejects(host.copyTextFromUi({ tmuxAttach: expected }), /已启用/);
  workers = [{ id: "a" }];
  await assert.rejects(host.copyTextFromUi({ tmuxAttach: { ...expected, windowId: "" } }), /身份未核实/);
  assert.equal(requests.length, before);
});

test("terminal attempts on one GPU keep immutable run and command log identities", () => {
  const first = terminalHistoryLogBinding({ id: "run-a" }, {
    status: "completed", commandId: "command-a", gpuId: "gpu-0", outputDir: "simple_cluster/runs/ebmc/attempts/run-a/job-42",
  });
  const second = terminalHistoryLogBinding({ id: "run-b" }, {
    status: "failed", commandId: "command-b", gpuId: "gpu-0", outputDir: "simple_cluster/runs/ebmc/attempts/run-b/job-42",
  });
  assert.equal(first.logPath, "simple_cluster/runs/ebmc/attempts/run-a/job-42/stdout.log");
  assert.deepEqual(first.historyLogIdentity, {
    commandId: "command-a", outputDir: "simple_cluster/runs/ebmc/attempts/run-a/job-42", runId: "run-a",
  });
  assert.equal(second.logPath, "simple_cluster/runs/ebmc/attempts/run-b/job-42/stderr.log");
  assert.notEqual(first.logPath, second.logPath);
  assert.equal(terminalHistoryLogBinding({ id: "run-a" }, {
    status: "running", commandId: "command-live", outputDir: "simple_cluster/runs/live",
  }), undefined);
});

test("tmux overview requests and retains all Worker session lists", () => {
  const panel = readSource("src/ui/PanelHtml.legacy.ts");
  const host = readSource("src/extension/legacy.ts");
  assert.match(panel, /allWorkers: !jobWorker/);
  assert.match(panel, /tmuxListsByWorker\[item\.workerId\]/);
  assert.match(panel, /data-tmux-worker/);
  // r2 C05 + r5: every configured Worker is still requested, but under the low-traffic guard one
  // Worker key may only have one display round in flight, while each request still publishes a reply
  // carrying its own requestId. Normal mode keeps one round per request.
  assert.match(host, /await Promise\.all\(workerIds\.map\(\(workerId\) => this\.fetchTmuxListForCaller\(workerId, _message\?\.requestId\)\)\);/);
  assert.match(host, /if \(!this\.displayMergeEnabled\(\)\) return this\.fetchOneTmuxListFromUi\(workerId, requestId\);/);
  assert.match(host, /return this\.publishTmuxList\(workerId, result, requestId\);/);
  assert.match(host, /private displayReadOnce<T>\(key: string, reader: \(\) => Promise<T>, signal\?: AbortSignal\)/);
});

test("tmux refresh releases only after every Worker replies and ignores stale replies", () => {
  const html = renderPanelHtml();
  const start = html.indexOf("function scheduleTmuxInitialRetry()");
  const end = html.indexOf("function tmuxResolveCaptureTarget", start);
  assert.ok(start >= 0 && end > start);
  const cleared = [];
  const refreshes = [];
  let retry;
  const sandbox = {
    tmuxListBusy: true,
    tmuxListRequestId: 2,
    tmuxListPendingWorkers: new Set(),
    tmuxListTimeout: 12,
    tmuxInitialRetryCount: 0,
    tmuxInitialRetryTimer: 0,
    tmuxConfiguredWorkers: [{ id: "nwpu2" }, { id: "nwpu3" }],
    tmuxListsByWorker: { nwpu2: { ok: false }, nwpu3: { ok: false } },
    document: { hidden: false },
    setTimeout: (callback) => { retry = callback; return 13; },
    refreshTmuxList: () => refreshes.push("retry"),
    clearTimeout: (id) => cleared.push(id),
  };
  vm.runInNewContext(html.slice(start, end), sandbox);
  const workers = [{ id: "nwpu2" }, { id: "nwpu3" }];
  sandbox.finishTmuxListRequest({ requestId: 1, workerId: "nwpu2", workers });
  assert.equal(sandbox.tmuxListBusy, true);
  sandbox.finishTmuxListRequest({ requestId: 2, workerId: "nwpu2", workers, ok: false });
  assert.equal(sandbox.tmuxListBusy, true);
  assert.deepEqual(cleared, []);
  sandbox.finishTmuxListRequest({ requestId: 2, workerId: "nwpu3", workers, ok: false });
  assert.equal(sandbox.tmuxListBusy, false);
  assert.deepEqual(cleared, [12]);
  assert.equal(sandbox.tmuxInitialRetryCount, 1, "initial failures retry without a Worker click");
  retry();
  assert.deepEqual(refreshes, ["retry"]);
});

test("Worker switch immediately replaces stale pane and capture state", () => {
  const html = renderPanelHtml();
  const start = html.indexOf("function selectTmuxWorker(workerId)");
  const end = html.indexOf("async function refreshTmuxList(", start);
  assert.ok(start >= 0 && end > start);
  const elements = {
    tmuxWorkerSelect: { value: "nwpu3" },
    tmuxWindowSelect: { selectedIndex: 2 },
    tmuxCapturePre: { textContent: "old pane", dataset: { captureTarget: "old", lastFetch: "old" } },
  };
  const calls = [];
  const context = {
    tmuxConfiguredWorkers: [{ id: "nwpu2" }, { id: "nwpu3" }],
    tmuxListsByWorker: { nwpu2: { sessions: [{ name: "zlk-gpu-0" }], workerId: "nwpu2" } },
    tmuxSelectedWorkerId: "nwpu3",
    tmuxWindowFilter: "zlk-gpu-0:2",
    tmuxSelectedPaneTarget: "%5",
    tmuxSelectedTaskTarget: "old",
    tmuxListCache: { sessions: [] },
    tmuxLastCaptureTarget: "old",
    el: (id) => elements[id],
    persistWebviewState: (state) => calls.push(["persist", state.tmuxSelectedWorkerId]),
    renderTmuxOverview: (sessions) => calls.push(["overview", sessions[0]?.name]),
    renderTmuxWorkersOverview: () => calls.push(["workers"]),
    refreshTmuxCapture: origin => calls.push(["capture", origin]),
    refreshTmuxList: origin => calls.push(["list", origin]),
  };
  vm.runInNewContext(html.slice(start, end) + "; selectTmuxWorker('nwpu2');", context);
  assert.equal(context.tmuxSelectedWorkerId, "nwpu2");
  assert.equal(elements.tmuxWorkerSelect.value, "nwpu2");
  assert.equal(elements.tmuxWindowSelect.selectedIndex, -1);
  assert.equal(elements.tmuxCapturePre.textContent, "");
  assert.equal(context.tmuxSelectedPaneTarget, "");
  assert.equal(context.tmuxWindowFilter, "all");
  assert.deepEqual(calls.map((call) => call[0]), ["persist", "overview", "workers", "capture", "list"]);
  assert.deepEqual(calls.filter(call => call[0] === "capture" || call[0] === "list"), [["capture", "user"], ["list", "user"]]);
  assert.match(html, /document\.addEventListener\("click", function\(event\)[\s\S]*?button\[data-tmux-worker\]/);
});
