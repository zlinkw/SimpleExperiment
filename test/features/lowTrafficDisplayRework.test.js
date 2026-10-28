const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
require("../_helpers/registerTsRequire");
const { readSource } = require("../_helpers/sourceReader");
const legacyMethod = require("../_helpers/legacyMethod");
const panelFunction = require("../_helpers/panelFunction");
const { RealtimeTunnelClient, defaultRealtimeRefreshPolicy } = require("../../src/tunnel/RealtimeTunnelClient.ts");
const { MultiEndpointRealtimeClient } = require("../../src/tunnel/MultiEndpointRealtimeClient.ts");
const { RequestBudget } = require("../../src/tunnel/RequestBudget.ts");

// r2-final-1 rework coverage (GPT review of PR #25). Every assertion runs the real production
// artefact: the real tunnel client, the real multi-endpoint aggregator, the extracted host methods,
// or the rendered panel script. Nothing is reimplemented in the fixture.
const source = readSource("src/extension/legacy.ts");
const json = (value) => JSON.stringify(value);
const endpoint = (id) => ({ id, role: "worker", displayName: id, localHost: "localhost", localPort: 18765, remoteAgentPort: 18765 });
const tick = () => new Promise((resolve) => setImmediate(resolve));

function transpile(members) {
  return ts.transpileModule("globalThis.api = {" + members.map((body) => body.replace(/^ {4}/gm, "").replace(/^private\s+/gm, "")).join(",\n") + "};", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function hostFixture(members) {
  const calls = { applyTrafficScheduling: 0, policyAtApply: [], posts: 0 };
  const sandbox = {
    console,
    stringField: (message, key) => String((message && typeof message === "object" ? message[key] : "") || ""),
    errorMessage: (error) => String((error && error.message) || error),
    NORMAL_TRAFFIC_INTERVALS: { queueMs: 500, progressMs: 2000, tmuxMs: 5000, snapshotFallbackSeconds: 5 },
    LOW_TRAFFIC_INTERVALS: { queueMs: 5000, progressMs: 10000, tmuxMs: 0, snapshotFallbackSeconds: 0 },
    GpuHistoryState_1: { normalizeGpuHistoryQuery: (query) => ({ ...query }) },
    objectRecord: (value) => (value && typeof value === "object" ? value : undefined),
    numberField: (message, key) => (message && typeof message === "object" && typeof message[key] === "number" ? message[key] : undefined),
  };
  vm.runInNewContext(transpile(members), sandbox);
  const host = {
    lowTrafficMode: true,
    projectContextGeneration: 1,
    lastHealth: undefined,
    lastError: undefined,
    budget: { isPaused: () => false },
    tunnelConfig: { refreshProfile: "realtime", pauseAllBackgroundTraffic: false, allowStreaming: true, pauseWhenWebviewHidden: true },
    view: { visible: true, webview: { postMessage: (payload) => { (host.posted || (host.posted = [])).push(payload); return true; } } },
    client: {
      resume() { calls.resume = (calls.resume || 0) + 1; },
      pauseAll() { calls.pauseAll = (calls.pauseAll || 0) + 1; },
      disconnect: async () => { calls.disconnect = (calls.disconnect || 0) + 1; },
      connect: async () => { calls.connect = (calls.connect || 0) + 1; },
      diagnostics: () => ({ endpoints: [], }),
    },
    projectBootstrapPromise: Promise.resolve(),
    restoreRemotePlanOperations: async () => undefined,
    reconcileStalePlanRunOperations: async () => undefined,
    clearOfflineImport: async () => undefined,
    ensureRealtimeConnected: async () => undefined,
    postState: () => { calls.posts += 1; },
    applyTrafficScheduling() {
      calls.applyTrafficScheduling += 1;
      calls.policyAtApply.push(sandbox.api.effectiveTrafficPolicy ? sandbox.api.effectiveTrafficPolicy.call(host) : undefined);
    },
    posted: [],
  };
  Object.assign(host, sandbox.api);
  return { host, api: sandbox.api, calls };
}

test("r2: the shared policy object and the module default are never mutated, and endpoints stay independent", async () => {
  assert.equal(Object.isFrozen(defaultRealtimeRefreshPolicy), true, "the module default policy must be frozen");
  const before = json(defaultRealtimeRefreshPolicy);
  const shared = { ...defaultRealtimeRefreshPolicy };
  const first = new RealtimeTunnelClient(endpoint("w1"), new RequestBudget(), shared);
  const second = new RealtimeTunnelClient(endpoint("w2"), new RequestBudget(), shared);
  try {
    first.updateRefreshPolicy({ displayAutoRefresh: false, snapshotFallbackIntervalSeconds: 0 });
    assert.equal(json(shared), before, "the caller's policy snapshot must not be written in place");
    assert.equal(json(defaultRealtimeRefreshPolicy), before, "the module default must stay untouched");
    assert.equal(first.policy.displayAutoRefresh, false);
    assert.equal(second.policy.displayAutoRefresh, true, "another endpoint must not see the first endpoint's change");
    assert.equal(second.policy.snapshotFallbackIntervalSeconds, defaultRealtimeRefreshPolicy.snapshotFallbackIntervalSeconds);
    // Restoring the first endpoint compares against its OWN previous view, so it cannot early-return.
    let firstConnects = 0;
    first.connect = async () => { firstConnects += 1; first.status = "polling"; };
    first.updateRefreshPolicy({ displayAutoRefresh: true, snapshotFallbackIntervalSeconds: 5 });
    await tick();
    assert.ok(firstConnects >= 1, "the endpoint the guard closed must actually re-arm on restore");
    assert.equal(first.policy.snapshotFallbackIntervalSeconds, 5);
    assert.equal(second.policy.displayAutoRefresh, true, "the other endpoint is still untouched");
  }
  finally { await first.disconnect("dispose"); await second.disconnect("dispose"); }
});

test("r2: the multi-endpoint client hands every endpoint its own copy and restores each of them", async () => {
  const before = json(defaultRealtimeRefreshPolicy);
  const shared = { ...defaultRealtimeRefreshPolicy };
  const multi = new MultiEndpointRealtimeClient([endpoint("w1"), endpoint("w2")], () => new RequestBudget(), shared);
  const children = [...multi.clients.values()];
  assert.equal(children.length, 2);
  assert.notEqual(children[0].policy, children[1].policy, "no policy object may be shared between endpoints");
  try {
    multi.updateRefreshPolicy({ displayAutoRefresh: false, snapshotFallbackIntervalSeconds: 0 });
    assert.equal(json(shared), before, "the aggregator must not mutate the caller's snapshot either");
    assert.ok(children.every((child) => child.policy.displayAutoRefresh === false && child.policy.snapshotFallbackIntervalSeconds === 0),
      "every endpoint applies the guard, not only the first one");
    const guarded = multi.diagnostics();
    assert.equal(guarded.displayAutoRefreshDisabled, true);
    assert.equal(guarded.displayAutoClosed, true, "all endpoints closed by the guard is reported as such");
    let restores = 0;
    for (const child of children) child.connect = async () => { restores += 1; };
    multi.updateRefreshPolicy({ displayAutoRefresh: true, snapshotFallbackIntervalSeconds: 5 });
    await tick();
    assert.equal(restores, 2, "each endpoint restores independently instead of an early return on a shared value");
    assert.ok(children.every((child) => child.policy.displayAutoRefresh === true && child.policy.snapshotFallbackIntervalSeconds === 5));
  }
  finally { await multi.disconnect("dispose"); }
});

test("r3: a guarded display closure is not an outage, a real connection loss still is", async () => {
  const client = new RealtimeTunnelClient(endpoint("w1"), new RequestBudget());
  try {
    client.updateRefreshPolicy({ displayAutoRefresh: false, snapshotFallbackIntervalSeconds: 0 });
    await client.connect();
    let diagnostics = client.diagnostics();
    assert.equal(diagnostics.streamStatus, "disconnected");
    assert.equal(diagnostics.displayAutoRefreshDisabled, true);
    assert.equal(diagnostics.displayAutoClosed, true, "the closure is explained by the guard");
    assert.equal(diagnostics.lastError, undefined, "no connection error may be invented for the guard");
    // A real failure has to stay visible.
    client.connectionLost("socket hang up");
    diagnostics = client.diagnostics();
    assert.equal(diagnostics.displayAutoClosed, false, "a real loss clears the guard explanation");
    assert.match(String(diagnostics.lastError), /socket hang up/);
  }
  finally { await client.disconnect("dispose"); }
});

test("r3: the host does not publish tunnel_unavailable for a guarded closure and still reports a real failure", async () => {
  const members = [legacyMethod(source, "effectiveTrafficPolicy()"), legacyMethod(source, "ensureRealtimeConnected(_reason)")];
  const fixture = hostFixture(members);
  const { host, calls } = fixture;
  host.isRealtimeMode = () => true;
  host.applyTrafficScheduling = () => { calls.applyTrafficScheduling += 1; };
  host.client.diagnostics = () => ({
    endpoints: [{ id: "w1", streamStatus: "disconnected", displayAutoRefreshDisabled: true, displayAutoClosed: true }],
    displayAutoRefreshDisabled: true,
    displayAutoClosed: true,
  });
  await host.ensureRealtimeConnected("resume network");
  assert.notEqual(host.lastError, "tunnel_unavailable", "a guarded closure must not be published as an outage");
  assert.equal(host.lastHealth, undefined, "no fake local_port_closed health may be produced");

  // The same code path still reports a real outage.
  const broken = hostFixture(members);
  broken.host.isRealtimeMode = () => true;
  broken.host.applyTrafficScheduling = () => { broken.calls.applyTrafficScheduling += 1; };
  broken.host.client.diagnostics = () => ({
    endpoints: [{ id: "w1", streamStatus: "disconnected", displayAutoRefreshDisabled: false, displayAutoClosed: false }],
    displayAutoRefreshDisabled: false,
    displayAutoClosed: false,
  });
  await broken.host.ensureRealtimeConnected("startup");
  assert.equal(broken.host.lastError, "tunnel_unavailable");
  assert.equal(broken.host.lastHealth.status, "local_port_closed");
});

test("r4: pause, resume and a client reset converge the strategy on the current toggle", async () => {
  const members = [
    legacyMethod(source, "effectiveTrafficPolicy()"),
    legacyMethod(source, "pauseAllNetworkActivity()"),
    legacyMethod(source, "resumeNetwork()"),
  ];
  const fixture = hostFixture(members);
  const { host, api, calls } = fixture;
  // Pause: the stronger constraint is recorded first, then the whole strategy is recomputed.
  await api.pauseAllNetworkActivity.call(host);
  assert.equal(host.lastHealth.state, "paused");
  assert.equal(calls.applyTrafficScheduling, 1, "pause must re-apply the strategy, not only the host timers");
  // Resume: the stale pause evidence is dropped so the policy follows the persisted toggle, and the
  // display gate that the toggle closed stays closed.
  await api.resumeNetwork.call(host);
  assert.notEqual(host.lastHealth && host.lastHealth.state, "paused", "a resume must not keep claiming a pause");
  assert.ok(calls.applyTrafficScheduling >= 2, "resume must recompute the strategy after fresh evidence");
  const applied = calls.policyAtApply.filter(Boolean).pop();
  assert.equal(applied.displayAutoRefresh, false, "the restored policy keeps A-class display traffic off while the toggle is on");
  assert.equal(applied.blockedBy, "");

  // The reset path converges as well (config change → new client → re-applied strategy).
  const resetBody = legacyMethod(source, "resetClient()");
  assert.match(resetBody, /this\.applyTrafficScheduling\(\);/, "a client reset must re-apply cadence and guard");
  assert.match(resetBody, /this\.displayReadInFlight\.clear\(\);/, "a reset must not let a new round join an older display read");
  assert.match(legacyMethod(source, "ensureRealtimeConnected(_reason)"), /this\.applyTrafficScheduling\(\);/,
    "the connection path must converge the strategy on fresh evidence");
});

test("r1: automatic GPU history entries produce no request under the guard, a manual key still gets its round", () => {
  const posted = [];
  const sandbox = {
    console,
    Date,
    setTimeout: () => 1,
    clearTimeout: () => undefined,
    vscode: { postMessage: (message) => { posted.push(message); return true; } },
    gpuHistoryRequestLastAt: new Map(),
    GPU_HISTORY_REQUEST_COOLDOWN_MS: 4000,
    GPU_HISTORY_SERIES_CACHE_LIMIT: 8,
    gpuWindowPendingByKey: new Map(),
    gpuWindowPending: new Map(),
    gpuWindowRequestSeq: 0,
    gpuWindowFineWindowMs: () => 60000,
    lastState: { trafficMode: { enabled: true, displayAutoRefresh: false } },
    tmuxDisplayAutoHint: true,
    notices: 0,
  };
  const code = [
    panelFunction("lowTrafficModeFromState"),
    panelFunction("displayAutoAllowed"),
    panelFunction("gpuHistorySeriesKey"),
    panelFunction("requestGpuHistoryRemote"),
    panelFunction("requestGpuHistory"),
    "function renderDisplayAutoNotices() { this.notices += 1; }",
    "this.request = requestGpuHistory; this.remote = requestGpuHistoryRemote;",
  ].join("\n");
  vm.runInNewContext(code, sandbox, { filename: "panel-gpu.js" });
  sandbox.notices = 0;
  // Expansion / snapshot follow-up / ring fallback: automatic, so nothing leaves the machine.
  assert.equal(sandbox.request({ serverId: "srv", gpuId: "0", maxPoints: 288 }, true, "auto"), false, "expanding a series must not fetch in low traffic");
  assert.equal(sandbox.request({ maxPoints: 96 }, undefined, undefined), false, "an origin-less (automatic) follow-up must not fetch either");
  assert.deepEqual(posted, [], "no loadGpuHistory or gpuWindowSamples message may be produced by an automatic entry");
  assert.equal(sandbox.notices >= 1, true, "the area reports why nothing refreshed");
  assert.equal(sandbox.gpuHistoryRequestLastAt.size, 0, "a blocked automatic entry must not burn the cooldown of its key");
  // The explicit manual entry still performs exactly one round per key, tagged as user traffic.
  assert.equal(sandbox.request({ maxPoints: 96 }, true, "user"), true);
  assert.deepEqual(posted.map((message) => message.command), ["loadGpuHistory"], "one history round for the clicked key");
  assert.equal(posted[0].origin, "user", "the host must be able to tell this apart from automatic traffic");
  // A per-series round first asks the local host ring and remembers its origin, so the eventual
  // remote fallback of that same round is still an explicit user round.
  assert.equal(sandbox.request({ serverId: "srv", gpuId: "0", maxPoints: 288 }, true, "user"), true);
  const entry = [...sandbox.gpuWindowPendingByKey.values()][0];
  assert.equal(entry.origin, "user", "the ring fallback keeps the origin of the round that started it");
  assert.equal(sandbox.remote({ serverId: "srv", gpuId: "1" }, "user"), true);
  assert.equal(sandbox.remote({ serverId: "srv", gpuId: "1" }, "auto"), false, "the ring fallback may not turn into automatic traffic");
  // In normal mode the same automatic entry behaves exactly as before.
  sandbox.lastState = { trafficMode: { enabled: false, displayAutoRefresh: true } };
  posted.length = 0;
  assert.equal(sandbox.request({ maxPoints: 96 }, true, "auto"), true, "normal mode keeps its automatic history refresh");
  assert.equal(posted.length, 1);
});

test("r1: the host refuses an automatic GPU history round in low traffic and answers a manual round per key", async () => {
  const members = [legacyMethod(source, "effectiveTrafficPolicy()"), legacyMethod(source, "displayReadBlockedFor(message)"),
    legacyMethod(source, "loadGpuHistoryFromUi(message)")];
  const fixture = hostFixture(members);
  const { host } = fixture;
  let loads = 0;
  host.effectiveConnectionMode = () => "realtime";
  host.lastProbe = { capabilities: { endpoints: { gpuHistory: true } } };
  host.gpuHistoryState = {
    load: (query, loader) => { loads += 1; return loader(query).then(() => undefined); },
  };
  host.client.getGpuHistory = async () => ({ ok: true });
  await host.loadGpuHistoryFromUi({ serverId: "srv", gpuId: "0" });
  assert.equal(loads, 0, "an automatic history request must not reach the client in low traffic");
  assert.deepEqual(host.posted, [], "no result frame may claim a sample that never happened");
  await host.loadGpuHistoryFromUi({ serverId: "srv", gpuId: "0", origin: "user" });
  assert.equal(loads, 1, "the explicit manual entry still performs its round");
  const frame = host.posted.find((message) => message.type === "gpuHistoryResult");
  assert.ok(frame, "the round is answered so the panel can record the real sample time");
  assert.deepEqual([frame.ok, frame.serverId, frame.gpuId, frame.origin], [true, "srv", "0", "user"]);
  assert.ok(frame.fetchedAt, "the answer carries the actual completion time");
  // Normal mode keeps the automatic round.
  const normal = hostFixture(members);
  normal.host.lowTrafficMode = false;
  normal.host.effectiveConnectionMode = () => "realtime";
  normal.host.lastProbe = { capabilities: { endpoints: { gpuHistory: true } } };
  let normalLoads = 0;
  normal.host.gpuHistoryState = { load: (query, loader) => { normalLoads += 1; return loader(query).then(() => undefined); } };
  normal.host.client.getGpuHistory = async () => ({ ok: true });
  await normal.host.loadGpuHistoryFromUi({ maxPoints: 96 });
  assert.equal(normalLoads, 1, "normal mode still refreshes GPU history automatically");
});

test("r1: every display area states the real sample or manual time, and the hint polarity is consistent", () => {
  const mode = { trafficMode: { enabled: true, displayAutoRefresh: false } };
  const sandbox = { console, Date, lastState: mode, tmuxDisplayAutoHint: true, displayRefreshAt: new Map([["tmuxList|fetch", "10:00:00"]]) };
  vm.runInNewContext(panelFunction("lowTrafficModeFromState") + "\n" + panelFunction("displaySampleNotice")
    + "\nthis.notice = displaySampleNotice;", sandbox, { filename: "panel-notice.js" });
  const blocked = sandbox.notice("tmuxList");
  assert.match(blocked, /自动刷新已关闭/, "the hint is shown while the guard is on");
  assert.match(blocked, /当前缓存采样于 10:00:00/, "a cached sample is labelled as cached and as never manually refreshed");
  assert.match(blocked, /尚未手动刷新/);
  sandbox.displayRefreshAt.set("tmuxList|manual", "10:30:00");
  assert.match(sandbox.notice("tmuxList"), /上次手动刷新 10:30:00/);
  assert.match(sandbox.notice("gpuHistory:srv::0", "09:15:00"), /当前缓存采样于 09:15:00/, "a GPU key without its own sample falls back to the real curve time");
  assert.match(sandbox.notice("gpuHistory:srv::1", ""), /尚未手动刷新/, "no cache and no manual click says so plainly");
  sandbox.lastState = { trafficMode: { enabled: false, displayAutoRefresh: true } };
  assert.equal(sandbox.notice("tmuxList"), "", "normal mode shows no low-traffic hint at all");
  // The persisted pre-handshake hint is written and read with the same polarity (true = off), and the
  // old inverted key is gone.
  const rendered = panelFunction("applyLowTrafficModeState");
  assert.match(rendered, /persistWebviewState\(\{ lowTrafficDisplayAutoOff: mode\.displayAutoRefresh === false \}\)/);
  const script = require("../../dist/ui/PanelHtml").renderPanelHtml();
  assert.doesNotMatch(script, /lowTrafficDisplayAuto:/, "the inverted hint key must be gone");
  assert.match(script, /restoredWebviewState\.lowTrafficDisplayAutoOff === true/, "the initial hint reads the same polarity it was written with");
  assert.match(script, /lowTrafficDisplayAutoOff: !displayAutoAllowed\("auto"\)/);
});

test("r6: the confirmed receipt drives both the label and the next click target, and a stale requestId cannot cancel the current timer", () => {
  const sandbox = {
    console,
    Date,
    setTimeout: () => 77,
    clearTimeout: (id) => { sandbox.cleared.push(id); },
    cleared: [],
    lowTrafficTogglePending: { target: true, requestId: "ltm-2" },
    lowTrafficReceiptDisplay: null,
    lowTrafficReceiptNotice: "",
    lowTrafficReceiptTimer: 77,
    lastState: { trafficMode: { enabled: false } },
  };
  vm.runInNewContext([
    panelFunction("clearLowTrafficReceiptTimer"),
    panelFunction("handleLowTrafficModeReceipt"),
    panelFunction("lowTrafficDisplayEnabled"),
    "function applyLowTrafficModeState() {}",
    "this.receipt = handleLowTrafficModeReceipt; this.enabled = lowTrafficDisplayEnabled;",
  ].join("\n"), sandbox, { filename: "panel-receipt.js" });
  // A receipt for an abandoned request must not touch the current request's timer or display.
  sandbox.receipt({ ok: true, enabled: true, requestId: "ltm-1" });
  assert.deepEqual(sandbox.cleared, [], "a stale requestId must not cancel the pending request's timeout timer");
  assert.equal(sandbox.lowTrafficTogglePending.requestId, "ltm-2");
  assert.equal(sandbox.lowTrafficReceiptDisplay, null, "a stale receipt is not a confirmation");
  // The matching receipt confirms the value before the authoritative state frame arrives; the label
  // and the next target read the same confirmed value.
  sandbox.receipt({ ok: true, enabled: true, requestId: "ltm-2" });
  assert.equal(sandbox.lowTrafficTogglePending, null);
  assert.deepEqual(sandbox.cleared, [77]);
  assert.equal(sandbox.lowTrafficReceiptDisplay.enabled, true);
  assert.equal(sandbox.enabled(sandbox.lastState.trafficMode), true, "the display follows the confirmed value");
  assert.equal(!sandbox.enabled(sandbox.lastState.trafficMode), false, "the next click targets the confirmed value, not the stale state frame");
  // A late failure for a request already given up on keeps the current display.
  sandbox.lowTrafficReceiptDisplay = { enabled: true, until: Date.now() + 5000 };
  sandbox.lowTrafficReceiptNotice = "";
  sandbox.receipt({ ok: false, error: "late", requestId: "ltm-0" });
  assert.equal(sandbox.lowTrafficReceiptDisplay.enabled, true, "an unrelated late failure must not flip the display");
  assert.equal(sandbox.lowTrafficReceiptNotice, "");
  // The panel never computes the target from the raw state any more.
  const rendered = require("../../dist/ui/PanelHtml").renderPanelHtml();
  assert.match(rendered, /const lowTrafficTarget = !lowTrafficDisplayEnabled\(lowTrafficModeFromState\(lastState \|\| \{\}\)\);/);
});
