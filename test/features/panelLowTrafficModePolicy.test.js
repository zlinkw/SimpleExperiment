const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
require("../_helpers/registerTsRequire");
const { readSource } = require("../_helpers/sourceReader");
const legacyMethod = require("../_helpers/legacyMethod");

// Normal mode must stay byte-for-byte on the pre-existing schedule; that is a hard requirement of
// the task and does not depend on the pending r2 rules. The low traffic table itself is still
// provisional (r2 will turn display-class reads into manual-refresh-only), so this test pins the
// invariants: normal mode exact, low traffic mode through the single derived policy point (B
// minimum cadence + A display auto refresh fully off), block precedence, persistence, receipts and
// that B correctness advancement never depends on panel visibility.
const NORMAL = { queueMs: 500, progressMs: 2000, tmuxMs: 5000, snapshotFallbackSeconds: 5 };
// r2 final table: B keeps a minimum cadence, A (display only) drops to 0 = no timer at all.
const LOW = { queueMs: 5000, progressMs: 10000, tmuxMs: 0, snapshotFallbackSeconds: 0 };

const source = readSource("src/extension/legacy.ts");
const names = [
  "effectiveTrafficPolicy()",
  "trafficModeStateForWebview()",
  "scheduleTrafficTimers()",
  "applyTrafficScheduling()",
  'setLowTrafficMode(enabled, requestId = "")',
  "handleLowTrafficModeToggle(message)",
  "postLowTrafficModeReceipt(requestId, receipt)",
  "realtimeRefreshPolicy()",
  "displayReadOnce(key, reader, signal)",
  "fetchTmuxListFromUi(_message)",
];
const bodies = names.map((marker) => legacyMethod(source, marker)
  .replace(/^ {4}/gm, "")
  .replace(/^private\s+/gm, ""));
// The methods are extracted as class members and bound to a fixture host, the same seam other
// legacy tests use; production logic is never reimplemented in the test.
const code = ts.transpileModule("globalThis.trafficApi = {" + bodies.join(",\n") + "};", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function json(value) {
  return JSON.stringify(value);
}

function createFixture() {
  const timers = [];
  const cleared = [];
  let nextId = 0;
  const state = { stored: {}, posts: [], policyUpdates: [], progressRounds: 0, progressOptions: [], ticks: 0, failWrite: false, reads: 0, listReads: [] };
  const sandbox = {
    NORMAL_TRAFFIC_INTERVALS: NORMAL,
    LOW_TRAFFIC_INTERVALS: LOW,
    LOW_TRAFFIC_REQUEST_HISTORY: 16,
    keys: { lowTrafficMode: "simpleExperiment.lowTrafficMode" },
    errorMessage: (error) => String((error && error.message) || error),
    booleanField: (message, key) => (message || {})[key] === true,
    workspaceRoot: () => "/work/root",
    RealtimeTunnelClient_1: { defaultRealtimeRefreshPolicy: {
      mode: "realtime", preferWebSocket: true, fallbackToSse: true, fallbackToPolling: true,
      heartbeatIntervalSeconds: 5, snapshotFallbackIntervalSeconds: 5, gpuEventCoalesceMs: 500,
      uiBatchMs: 100, logTailEnabledByDefault: false, logTailOnlyForSelectedExperiment: true,
      logTailIntervalSeconds: 1, pauseWhenWebviewHidden: false, keepAgentStreamWhenHidden: true,
    } },
    setInterval: (fn, ms) => { const timer = { id: ++nextId, fn, ms, unref() {} }; timers.push(timer); return timer; },
    clearInterval: (timer) => { if (timer) cleared.push(timer.id); },
    console,
  };
  vm.runInNewContext(code, sandbox);
  const api = sandbox.trafficApi;
  const host = {
    lowTrafficMode: false,
    lowTrafficModeSwitching: false,
    lowTrafficModeError: "",
    lowTrafficModeSwitch: Promise.resolve(),
    lowTrafficModeRequests: new Map(),
    queueTrafficTimer: undefined, queueTrafficTimerMs: 0,
    progressTrafficTimer: undefined, progressTrafficTimerMs: 0,
    trafficTimersDisposed: false,
    tunnelConfig: { refreshProfile: "realtime", pauseAllBackgroundTraffic: false, allowStreaming: true, pauseWhenWebviewHidden: true },
    budget: { isPaused: () => state.paused === true },
    lastHealth: undefined,
    view: { visible: true },
    client: { updateRefreshPolicy(policy) { state.policyUpdates.push(policy); } },
    distributedQueueCache: { plans: [{ planFile: "a.yaml", jobs: [] }] },
    distributedQueueRoot: "/work/root",
    displayReadInFlight: new Map(),
    enabledWorkerConfigs: () => [{ id: "w1" }],
    tmuxWorkerId: () => "w1",
    fetchOneTmuxListFromUi: async () => ({ ok: true }),
    tickDistributedQueue: async () => { state.ticks += 1; },
    refreshServerPlanProgress: async (options) => { state.progressRounds += 1; state.progressOptions.push(options); },
    recordActionError: (row) => { state.recorded = row; },
    context: { globalState: {
      get: (key) => state.stored[key],
      update: async (key, value) => { if (state.failWrite) throw new Error("fixture storage failure"); state.stored[key] = value; },
    } },
    postState: (immediate) => { state.posts.push(immediate === true); },
  };
  // Mirror the production class shape: extracted members call each other through this.
  Object.assign(host, api);
  return { host, api, timers, cleared, state };
}

function findTimer(timers, ms) {
  const found = timers.filter((timer) => timer.ms === ms);
  assert.equal(found.length, 1, "exactly one timer may use cadence " + ms);
  return found[0];
}

test("normal mode keeps the original 500ms queue and 2s progress cadence", () => {
  const { host, api, timers } = createFixture();
  api.scheduleTrafficTimers.call(host);
  assert.deepEqual(timers.map((timer) => timer.ms), [NORMAL.queueMs, NORMAL.progressMs]);
  const policy = api.effectiveTrafficPolicy.call(host);
  assert.equal(policy.enabled, false);
  assert.equal(policy.effective, false);
  assert.equal(policy.blockedBy, "");
  assert.equal(policy.scope, "global");
  assert.equal(json(policy.intervals), json(NORMAL));
});

test("low traffic mode goes through the derived policy and never keeps the normal cadence", () => {
  const { host, api, timers } = createFixture();
  api.scheduleTrafficTimers.call(host);
  host.lowTrafficMode = true;
  api.applyTrafficScheduling.call(host);
  const policy = api.effectiveTrafficPolicy.call(host);
  assert.equal(policy.enabled, true);
  assert.equal(policy.effective, true);
  assert.equal(policy.blockedBy, "");
  assert.notEqual(json(policy.intervals), json(NORMAL), "an enabled low traffic mode must actually change the schedule");
  assert.equal(policy.displayAutoRefresh, false, "A-class display traffic is switched off by a boolean");
  assert.equal(policy.intervals.tmuxMs, 0, "r2: display tmux refresh has no automatic round at all");
  assert.equal(policy.intervals.snapshotFallbackSeconds, 0);
  assert.equal(policy.intervals.queueMs, 5000, "r2: B queue coordination keeps a 5s minimum");
  assert.equal(policy.intervals.progressMs, 10000, "r2: necessary terminal confirmation keeps a 10s minimum");
  assert.equal(json(policy.intervals), json(api.trafficModeStateForWebview.call(host).intervals),
    "the webview echo and the host timers must read the same derived table");
  assert.deepEqual(timers.map((timer) => timer.ms),
    [NORMAL.queueMs, NORMAL.progressMs, policy.intervals.queueMs, policy.intervals.progressMs]);
});

test("an unchanged cadence never churns timers and only creates one timer per kind", () => {
  const { host, api, timers } = createFixture();
  api.scheduleTrafficTimers.call(host);
  api.scheduleTrafficTimers.call(host);
  host.lowTrafficMode = true;
  api.scheduleTrafficTimers.call(host);
  api.scheduleTrafficTimers.call(host);
  assert.equal(timers.length, 4, "rescheduling must clear the old timer and create one replacement per kind");
});

test("the cadence lives only in the derived policy, not in the scheduling code", () => {
  const scheduling = bodies.filter((body) => /^(private )?(async )?(effectiveTrafficPolicy|applyTrafficScheduling|scheduleTrafficTimers)\(/.test(body)).join("\n");
  assert.ok(scheduling.length > 500, "the three scheduling members must be extracted");
  assert.doesNotMatch(scheduling, /\b\d{3,}\b/, "no interval literal may be hardcoded outside the policy table");
  assert.match(scheduling, /intervals\.queueMs/);
  assert.match(scheduling, /intervals\.progressMs/);
});

test("pauseAll, manual_only and pauseAllBackgroundTraffic block low traffic instead of being rewritten", () => {
  const paused = createFixture();
  paused.host.lowTrafficMode = true;
  paused.state.paused = true;
  const pausedPolicy = paused.api.effectiveTrafficPolicy.call(paused.host);
  assert.equal(pausedPolicy.enabled, true);
  assert.equal(pausedPolicy.effective, false);
  assert.equal(pausedPolicy.blockedBy, "paused");
  assert.equal(json(pausedPolicy.intervals), json(NORMAL), "a stronger constraint keeps the normal schedule untouched");
  assert.equal(paused.host.tunnelConfig.refreshProfile, "realtime");

  const manual = createFixture();
  manual.host.lowTrafficMode = true;
  manual.host.tunnelConfig = { ...manual.host.tunnelConfig, refreshProfile: "manual_only" };
  const manualPolicy = manual.api.effectiveTrafficPolicy.call(manual.host);
  assert.equal(manualPolicy.blockedBy, "manual_only");
  assert.equal(manual.host.tunnelConfig.refreshProfile, "manual_only", "low traffic must not rewrite the refresh profile");

  const background = createFixture();
  background.host.lowTrafficMode = true;
  background.host.tunnelConfig = { ...background.host.tunnelConfig, pauseAllBackgroundTraffic: true };
  assert.equal(background.api.effectiveTrafficPolicy.call(background.host).blockedBy, "background_traffic_paused");
});

test("realtime policy changes only the display fields; every other field is identical", () => {
  const { host, api } = createFixture();
  const normal = api.realtimeRefreshPolicy.call(host);
  host.lowTrafficMode = true;
  const low = api.realtimeRefreshPolicy.call(host);
  assert.equal(normal.snapshotFallbackIntervalSeconds, NORMAL.snapshotFallbackSeconds);
  assert.equal(normal.displayAutoRefresh, true);
  assert.equal(low.snapshotFallbackIntervalSeconds, 0);
  assert.equal(low.displayAutoRefresh, false);
  assert.equal(json({ ...normal, snapshotFallbackIntervalSeconds: 0, displayAutoRefresh: null }),
    json({ ...low, snapshotFallbackIntervalSeconds: 0, displayAutoRefresh: null }),
    "low traffic must not touch heartbeat, coalescing, batching, log tail selection, reconnect or streaming profile fields");
});

test("cadence change updates the live client without rebuilding it, and reports the new policy", () => {
  const { host, api, state } = createFixture();
  host.lowTrafficMode = true;
  api.applyTrafficScheduling.call(host);
  assert.equal(state.policyUpdates.length, 1);
  assert.notEqual(state.policyUpdates[0].snapshotFallbackIntervalSeconds, NORMAL.snapshotFallbackSeconds);
});

test("r2 F4: the 10s necessary confirmation still runs while the panel is hidden, with the automatic flag", async () => {
  const { host, api, timers, state } = createFixture();
  api.scheduleTrafficTimers.call(host);
  host.lowTrafficMode = true;
  api.applyTrafficScheduling.call(host);
  const policy = api.effectiveTrafficPolicy.call(host);
  const progress = findTimer(timers, policy.intervals.progressMs);
  const queue = findTimer(timers, policy.intervals.queueMs);
  host.view = { visible: false };
  await progress.fn();
  assert.equal(state.progressRounds, 1, "B terminal confirmation must not depend on panel visibility");
  assert.equal(json(state.progressOptions), json([{ automatic: true }]), "the automatic round keeps excludeVerifiedCompleted semantics");
  await queue.fn();
  assert.equal(state.ticks, 1, "queue coordination keeps running");
  // Normal mode keeps its own original trajectory while hidden.
  const plain = createFixture();
  plain.api.scheduleTrafficTimers.call(plain.host);
  const plainProgress = findTimer(plain.timers, NORMAL.progressMs);
  plain.host.view = { visible: false };
  await plainProgress.fn();
  assert.equal(plain.state.progressRounds, 1);
  // The original early exits stay: an empty queue or a stale workspace root still queries nothing.
  state.progressRounds = 0;
  host.distributedQueueCache = { plans: [] };
  await progress.fn();
  assert.equal(state.progressRounds, 0);
  host.distributedQueueCache = { plans: [{ planFile: "a.yaml", jobs: [] }] };
  host.distributedQueueRoot = "/other/root";
  await progress.fn();
  assert.equal(state.progressRounds, 0, "a stale workspace root must not trigger a remote query");
});

test("r2 F2: display reads are one round per key and repeated clicks merge into it", async () => {
  const { host, api, state } = createFixture();
  const first = api.displayReadOnce.call(host, "tmuxList|w1", () => { state.reads += 1; return Promise.resolve("a"); });
  const second = api.displayReadOnce.call(host, "tmuxList|w1", () => { state.reads += 1; return Promise.resolve("b"); });
  assert.equal(first, second, "an in-flight repeated click must join the same round");
  assert.equal(await first, "a");
  assert.equal(await second, "a");
  assert.equal(state.reads, 1);
  const third = api.displayReadOnce.call(host, "tmuxList|w1", () => { state.reads += 1; return Promise.resolve("c"); });
  assert.equal(await third, "c", "the next independent click is allowed a new round");
  assert.equal(state.reads, 2);
  const otherKey = api.displayReadOnce.call(host, "tmuxCapture|w1|win", () => { state.reads += 1; return Promise.resolve("d"); });
  assert.equal(await otherKey, "d");
  assert.equal(state.reads, 3, "a different section key is its own round");
  // Callers that need their own cancellation (API server route) must not be silently joined.
  const controller = new AbortController();
  await api.displayReadOnce.call(host, "tmuxList|w1", () => { state.reads += 1; return Promise.resolve("e"); }, controller.signal);
  assert.equal(state.reads, 4);
  // The UI entry point merges per selected Worker.
  host.enabledWorkerConfigs = () => [{ id: "w1" }, { id: "w2" }];
  host.fetchOneTmuxListFromUi = async (workerId) => { state.listReads.push(workerId); return { ok: true, workerId }; };
  await Promise.all([
    api.fetchTmuxListFromUi.call(host, { allWorkers: true, requestId: 1 }),
    api.fetchTmuxListFromUi.call(host, { allWorkers: true, requestId: 2 }),
  ]);
  assert.deepEqual(state.listReads, ["w1", "w2"], "two clicks for the same Workers are one round per Worker");
});

test("r2 F1: the real client opens no display channel, snapshot, poll or reconnect in low traffic mode", async () => {
  const { RealtimeTunnelClient } = require("../../src/tunnel/RealtimeTunnelClient.ts");
  const { RequestBudget } = require("../../src/tunnel/RequestBudget.ts");
  const client = new RealtimeTunnelClient({ id: "w", role: "worker", localHost: "localhost", localPort: 1 }, new RequestBudget());
  const calls = { ws: 0, sse: 0, poll: 0, gpu: 0 };
  client.connectWebSocket = () => { calls.ws += 1; client.status = "websocket"; };
  client.connectSse = async () => { calls.sse += 1; client.status = "sse"; };
  client.startPolling = async () => { calls.poll += 1; client.status = "polling"; };
  client.http.getGpu = async () => { calls.gpu += 1; return { gpu: [] }; };
  try {
    client.updateRefreshPolicy({ displayAutoRefresh: false, snapshotFallbackIntervalSeconds: 0 });
    await client.connect();
    assert.deepEqual(calls, { ws: 0, sse: 0, poll: 0, gpu: 0 }, "A01/A04/A05: no display stream, initial snapshot, poll or GPU auto read");
    assert.equal(client.diagnostics().streamStatus, "disconnected");
    client.setHidden(false);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, { ws: 0, sse: 0, poll: 0, gpu: 0 }, "recovery/visibility must not pull display data either");
    // F3: turning the mode off restores the original channel and cadence on the same client.
    client.updateRefreshPolicy({ displayAutoRefresh: true, snapshotFallbackIntervalSeconds: 5 });
    await client.connect();
    assert.ok(calls.sse + calls.ws + calls.poll >= 1, "normal mode re-arms the display channel");
    assert.equal(client.policy.snapshotFallbackIntervalSeconds, 5, "the original 5s snapshot fallback returns, not a leftover r1 value");
    // An already-open display channel is closed when the mode turns on, without faking a user pause.
    client.updateRefreshPolicy({ displayAutoRefresh: false, snapshotFallbackIntervalSeconds: 0 });
    await new Promise((resolve) => setImmediate(resolve));
    const status = client.diagnostics().streamStatus;
    assert.equal(status, "disconnected");
    assert.notEqual(status, "paused", "low traffic must never be reported as the global pause");
  }
  finally { await client.disconnect("dispose"); }
});

test("r2 F3: normal - low - normal restores the 500ms/2s cadence with no extra timers", () => {
  const { host, api, timers, state } = createFixture();
  api.applyTrafficScheduling.call(host);
  host.lowTrafficMode = true;
  api.applyTrafficScheduling.call(host);
  host.lowTrafficMode = false;
  api.applyTrafficScheduling.call(host);
  assert.deepEqual(timers.map((timer) => timer.ms), [NORMAL.queueMs, NORMAL.progressMs, LOW.queueMs, LOW.progressMs, NORMAL.queueMs, NORMAL.progressMs]);
  // The initial normal frame, the low traffic frame and the restore frame all report the policy.
  assert.deepEqual(state.policyUpdates.map((policy) => policy.displayAutoRefresh), [true, false, true]);
  // Repeated scheduling in the same mode never adds a timer.
  api.applyTrafficScheduling.call(host);
  api.scheduleTrafficTimers.call(host);
  assert.equal(timers.length, 6);
});

test("setter persists the preference first, applies cadence, and reports the real error on failure", async () => {
  const { host, api, state } = createFixture();
  const ok = await api.setLowTrafficMode.call(host, true, "req-1");
  assert.equal(ok.ok, true);
  assert.equal(ok.enabled, true);
  assert.equal(state.stored["simpleExperiment.lowTrafficMode"], true);
  assert.equal(state.policyUpdates.length, 1);
  assert.deepEqual(state.posts, [true]);
  assert.equal(host.lowTrafficModeSwitching, false);

  state.failWrite = true;
  const failed = await api.setLowTrafficMode.call(host, false, "req-2");
  assert.equal(failed.ok, false);
  assert.equal(failed.enabled, true, "the previous authoritative value must survive a failed write");
  assert.equal(state.stored["simpleExperiment.lowTrafficMode"], true);
  assert.match(String(failed.error), /fixture storage failure/);
  assert.equal(host.lowTrafficModeError, String(failed.error).replace("低流量模式设置未保存：", ""));
});

test("the same requestId is idempotent and concurrent clicks are serialised", async () => {
  const { host, api, state } = createFixture();
  const first = await api.setLowTrafficMode.call(host, true, "req-dup");
  const replay = await api.setLowTrafficMode.call(host, false, "req-dup");
  assert.equal(replay.ok, true);
  assert.equal(replay.enabled, first.enabled);
  assert.equal(state.stored["simpleExperiment.lowTrafficMode"], true);
  const parallel = await Promise.all([
    api.setLowTrafficMode.call(host, true, "p1"),
    api.setLowTrafficMode.call(host, false, "p2"),
    api.setLowTrafficMode.call(host, true, "p3"),
  ]);
  // The three clicks are serialised in submission order, so each round sees the previous result.
  assert.deepEqual(parallel.map((row) => row.enabled), [true, false, true]);
  assert.equal(state.stored["simpleExperiment.lowTrafficMode"], true);
  assert.equal(host.lowTrafficMode, true);
});

test("a malformed toggle frame is refused with a receipt instead of flipping the preference", async () => {
  const { host, api, state } = createFixture();
  const posted = [];
  host.view = { visible: true, webview: { postMessage: (payload) => { posted.push(payload); return true; } } };
  await api.handleLowTrafficModeToggle.call(host, { requestId: "bad-1", documentGeneration: 7 });
  assert.equal(posted.length, 1);
  assert.equal(posted[0].ok, false);
  assert.equal(posted[0].requestId, "bad-1");
  assert.match(posted[0].error, /缺少有效的开关值/);
  assert.equal(host.lowTrafficMode, false);
  assert.deepEqual(Object.keys(state.stored), [], "nothing may be persisted for a refused frame");

  // A string "true" is not a boolean and is refused the same way.
  await api.handleLowTrafficModeToggle.call(host, { enabled: "true", requestId: "bad-2", documentGeneration: 7 });
  assert.equal(posted.length, 2);
  assert.equal(posted[1].ok, false);
  assert.equal(posted[1].requestId, "bad-2");
  assert.equal(host.lowTrafficMode, false);
});

test("receipt keeps the panel informed without a second state frame storm", async () => {
  const { host, api, state } = createFixture();
  const posted = [];
  host.view = { visible: true, webview: { postMessage: (payload) => { posted.push(payload); return true; } } };
  await api.handleLowTrafficModeToggle.call(host, { enabled: true, requestId: "req-9", documentGeneration: 7 });
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "lowTrafficModeUpdated");
  assert.equal(posted[0].requestId, "req-9");
  assert.equal(posted[0].ok, true);
  assert.equal(posted[0].enabled, true);
  assert.equal(posted[0].error, "");
  assert.deepEqual(state.posts, [true], "one authoritative state frame per accepted change");
  host.view = { visible: true, webview: { postMessage() { throw new Error("fixture disposed webview"); } } };
  assert.doesNotThrow(() => api.postLowTrafficModeReceipt.call(host, "req-10", { ok: true, enabled: true }));
});

test("webview echo carries the authoritative preference, block reason and intervals", () => {
  const { host, api } = createFixture();
  const echo = api.trafficModeStateForWebview.call(host);
  assert.equal(echo.enabled, false);
  assert.equal(echo.effective, false);
  assert.equal(echo.blockedBy, "");
  assert.equal(echo.scope, "global");
  assert.equal(echo.switching, false);
  assert.equal(echo.error, "");
  assert.equal(echo.displayAutoRefresh, true);
  assert.equal(json(echo.intervals), json(NORMAL));
  host.lowTrafficMode = true;
  const pausedHost = { ...host, budget: { isPaused: () => true } };
  const blockedEcho = api.trafficModeStateForWebview.call(pausedHost);
  assert.equal(blockedEcho.enabled, true);
  assert.equal(blockedEcho.effective, false);
  assert.equal(blockedEcho.blockedBy, "paused");
  assert.equal(blockedEcho.scope, "global");
  assert.equal(blockedEcho.switching, false);
  // A stronger constraint keeps the display channels exactly as the user configured them.
  assert.equal(blockedEcho.displayAutoRefresh, true);
  assert.equal(json(blockedEcho.intervals), json(NORMAL));
});
