const assert = require("node:assert/strict");
const fsNode = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../../src/extension/legacy.ts");
const source = fsNode.readFileSync(sourcePath, "utf8");

function extractFunction(name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(name);
}

function persistenceHarness() {
  const files = new Map();
  const dirs = new Set();
  const normalize = (value) => String(value).replaceAll("\\", "/");
  const fs = {
    async mkdir(value) { dirs.add(normalize(value)); },
    async writeFile(value, contents) { files.set(normalize(value), String(contents)); },
    async readFile(value) { const key = normalize(value); if (!files.has(key)) throw new Error("ENOENT"); return files.get(key); },
  };
  const sandbox = {
    fs, path, Date,
    UI_ACTION_ERROR_RECORD_LIMIT: 8,
    UI_ACTION_ERROR_MESSAGE_LIMIT: 480,
    UI_ACTION_ERROR_SUGGESTION_LIMIT: 240,
    UI_ACTION_ERROR_CAPABILITY_LIMIT: 8,
    PANEL_LIFECYCLE_DIAGNOSTIC_LIMIT: 24,
    actionErrorSuggestion: () => "retry after reload",
  };
  vm.createContext(sandbox);
  vm.runInContext(`(async () => {${[
    'const PROJECT_ACTION_ERRORS_PATH = "simple_cluster/ui/action_errors.json";',
    'const PROJECT_PANEL_LIFECYCLE_PATH = "simple_cluster/ui/panel_lifecycle.json";',
    extractFunction("redactSensitiveText"),
    extractFunction("compactSensitiveText"),
    extractFunction("panelLifecycleDiagnosticMessage"),
    extractFunction("compactPanelLifecycleDetails"),
    extractFunction("normalizeUiActionError"),
    extractFunction("compactUiActionError"),
    extractFunction("normalizeActionErrorRow"),
    extractFunction("readProjectActionErrorsState"),
    extractFunction("writeProjectActionErrorsState"),
    extractFunction("normalizePanelLifecycleDiagnosticRow"),
    extractFunction("readProjectPanelLifecycleDiagnosticsState"),
    extractFunction("writeProjectPanelLifecycleDiagnosticsState"),
    "this.compact = compactUiActionError; this.panelLifecycleDiagnosticMessage = panelLifecycleDiagnosticMessage; this.readErrors = readProjectActionErrorsState; this.writeErrors = writeProjectActionErrorsState; this.readEvents = readProjectPanelLifecycleDiagnosticsState; this.writeEvents = writeProjectPanelLifecycleDiagnosticsState;",
  ].join("\n")} })()`, sandbox);
  return { api: sandbox, files, dirs };
}

test("normal detached to booting to ready transitions do not emit lifecycle failures", () => {
  const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const method = provider.members.find((node) => node.name?.getText(ast) === "transitionPanelLifecycle");
  assert.ok(method);
  const code = ts.transpileModule(`class Subject { panelLifecycleState = "detached"; panelLifecycleGeneration = 0; forceReloadRequired = false; panelDisposed = false; ${method.getText(ast)} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let failures = 0;
  const sandbox = { PanelLifecycle_1: { transitionPanelLifecycle(current, next) { return { state: next, changed: current !== next, allowed: true }; } } };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const providerHarness = new sandbox.Subject();
  providerHarness.recordPanelLifecycleDiagnostic = () => { failures += 1; };
  assert.equal(providerHarness.transitionPanelLifecycle("booting", "resolveWebviewView"), true);
  assert.equal(providerHarness.transitionPanelLifecycle("ready", "webviewReady"), true);
  assert.equal(providerHarness.panelLifecycleState, "ready");
  assert.equal(failures, 0);
});

test("action error details and structured lifecycle telemetry survive write then read", async () => {
  const { api, files } = persistenceHarness();
  const error = api.compact({
    command: "panelLifecycle", message: api.panelLifecycleDiagnosticMessage("heartbeatTimeout"),
    details: {
      reason: "heartbeatTimeout", lifecycle: "recovering", documentGeneration: 12, viewGeneration: 3,
      postedStateSeq: 71, receivedStateSeq: 54, renderedStateSeq: 54, statePayloadBytes: 717609,
      stateBuildDurationMs: 42, runningBuildId: "0123456789abcdef", diskBuildId: "0123456789abcdef",
      token: "secret-token", path: "C:/private/project",
    },
  });
  await api.writeErrors("C:/project", [error]);
  const errors = await api.readErrors("C:/project");
  assert.equal(errors[0].details.reason, "heartbeatTimeout");
  assert.equal(errors[0].details.lifecycle, "recovering");
  assert.equal(errors[0].details.documentGeneration, 12);
  assert.equal(errors[0].details.postedStateSeq, 71);
  assert.equal(errors[0].details.renderedStateSeq, 54);
  assert.equal(errors[0].details.statePayloadBytes, 717609);
  assert.equal(errors[0].details.runningBuildId, "0123456789ab");
  assert.doesNotMatch(files.get("C:/project/simple_cluster/ui/action_errors.json"), /secret-token|private\/project/);
});

test("bounded lifecycle file keeps only sanitized failure samples across reload", async () => {
  const { api, files } = persistenceHarness();
  const events = Array.from({ length: 30 }, (_, index) => ({
    timestamp: `2026-10-01T00:00:${String(index).padStart(2, "0")}Z`,
    reason: "state-render-sequence-stalled", message: "Webview state render stalled", lifecycle: "recovering",
    runningVersion: "0.5.200", installedVersion: "0.5.200", runningBuildId: "abcdef1234567890", diskBuildId: "abcdef1234567890",
    documentGeneration: index, viewGeneration: 2, webviewReady: true, viewVisible: true,
    postedSeq: 71, receivedSeq: 54, renderedSeq: 54, payloadBytes: 717609, stateBuildDurationMs: 42,
    serverToken: "secret-token", originalLog: "large log",
  }));
  await api.writeEvents("C:/project", events);
  const loaded = await api.readEvents("C:/project");
  assert.equal(loaded.length, 24);
  assert.equal(loaded[0].reason, "state-render-sequence-stalled");
  assert.equal(loaded[0].receivedSeq, 54);
  assert.equal(loaded[0].payloadBytes, 717609);
  assert.doesNotMatch(files.get("C:/project/simple_cluster/ui/panel_lifecycle.json"), /secret-token|large log/);
});

test("unknown lifecycle reasons never masquerade as heartbeat timeouts", () => {
  const { api } = persistenceHarness();
  assert.equal(api.panelLifecycleDiagnosticMessage("lifecycle:resolveWebviewView:booting"), "Panel lifecycle anomaly: lifecycle:resolveWebviewView:booting");
  assert.equal(api.panelLifecycleDiagnosticMessage("heartbeatTimeout"), "Webview heartbeat timeout");
});

test("a real heartbeat timeout creates one explicit structured failure", () => {
  const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const method = provider.members.find((node) => node.name?.getText(ast) === "recordPanelLifecycleDiagnostic");
  assert.ok(method);
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { PANEL_LIFECYCLE_DIAGNOSTIC_LIMIT: 24, Date };
  vm.runInNewContext([
    extractFunction("redactSensitiveText"),
    extractFunction("compactSensitiveText"),
    extractFunction("normalizePanelLifecycleDiagnosticRow"),
    extractFunction("compactPanelLifecycleDetails"),
    extractFunction("panelLifecycleDiagnosticMessage"),
    code,
    "this.Subject = Subject;",
  ].join("\n"), sandbox);
  const subject = new sandbox.Subject();
  const events = [];
  const errors = [];
  Object.assign(subject, {
    panelLifecycleState: "recovering", panelDocumentGeneration: 5, viewGeneration: 2,
    webviewReady: true, view: { visible: true }, lastPanelLifecycleDiagnosticKey: "",
    latestPanelStateTelemetry: { sampleId: 9, postedSeq: 71, receivedSeq: 54, renderedSeq: 54, payloadBytes: 717609, buildTotalMs: 42 },
    panelLifecycleDiagnostics: [], extensionRuntimeVersionState: () => ({
      runningVersion: "0.5.200", installedVersion: "0.5.200", registryState: "match",
      runningBuildId: "a".repeat(64), diskBuildId: "a".repeat(64), reloadRequired: false,
    }),
    persistProjectPanelLifecycleDiagnosticsState: async () => {},
    recordActionError: (error) => errors.push(error),
  });
  subject.persistProjectPanelLifecycleDiagnosticsState = () => { events.push(...subject.panelLifecycleDiagnostics); return Promise.resolve(); };
  subject.recordPanelLifecycleDiagnostic("heartbeatTimeout");
  subject.recordPanelLifecycleDiagnostic("heartbeatTimeout");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, "Webview heartbeat timeout");
  assert.equal(errors[0].details.reason, "heartbeatTimeout");
  assert.equal(events.length, 1);
  assert.equal(events[0].reason, "heartbeatTimeout");
  assert.equal(events[0].postedSeq, 71);
  assert.equal(events[0].receivedSeq, 54);
  assert.equal(events[0].payloadBytes, 717609);
  assert.equal(events[0].stateBuildDurationMs, 42);
});

test("panel.diagnostics returns the saved sample without rebuilding state or probing disk", () => {
  const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const method = provider.members.find((node) => node.name?.getText(ast) === "panelDiagnosticsApi");
  assert.ok(method);
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sandbox = { PANEL_LIFECYCLE_DIAGNOSTIC_LIMIT: 24 };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const telemetry = {
    sampleId: 8, payloadBytes: 717609, buildTotalMs: 42, runtimeEvidenceMs: 3,
    resultCatalog: { cacheHit: false, buildMs: 22 }, postedSeq: 71, receivedSeq: 54, renderedSeq: 54,
    receivedRenderedSemantics: "latest_heartbeat_ack",
  };
  const subject = new sandbox.Subject();
  Object.assign(subject, {
    panelLifecycleState: "ready", latestPanelBuildIdentityState: {
      runningVersion: "0.5.200", installedVersion: "0.5.200", runningBuildId: "a".repeat(64), diskBuildId: "a".repeat(64),
    },
    runningBuildIdentity: {}, diskBuildIdentity: {}, panelDocumentGeneration: 4, viewGeneration: 2,
    latestPanelStateTelemetry: telemetry, panelSectionFailures: new Set(["results"]),
    lastPanelRecoveryReason: "", panelLifecycleDiagnostics: [],
    buildState() { throw new Error("diagnostics must not rebuild state"); },
    readInstalledBuildIdentity() { throw new Error("diagnostics must not read disk"); },
  });
  const result = subject.panelDiagnosticsApi();
  assert.equal(result.lifecycle, "ready");
  assert.equal(result.runningBuildId, result.diskBuildId);
  assert.equal(result.latestTelemetry, telemetry);
  assert.deepEqual(Array.from(result.sectionFailures), ["results"]);
  assert.equal(result.lastRecoveryReason, "");
});

test("state telemetry records one serialized sample and labels ACK sequence semantics", () => {
  const flushStart = source.indexOf("private flushStatePost(force)");
  const flushEnd = source.indexOf("\n    private ", flushStart + 1);
  const flush = source.slice(flushStart, flushEnd);
  assert.ok(flushStart >= 0 && flushEnd > flushStart);
  assert.ok(flush.indexOf("const signature = webviewStatePostSignature(state)") < flush.indexOf("this.latestPanelStateTelemetry = Object.freeze({"));
  for (const field of ["sampleId", "startedAt", "finishedAt", "buildTotalMs", "runtimeEvidenceMs", "resultCatalog", "serializationMs", "payloadBytes", "postedSeq", "receivedSeq", "renderedSeq"]) {
    assert.match(flush, new RegExp(`${field}[:,]`));
  }
  assert.match(flush, /receivedRenderedSemantics: "latest_heartbeat_ack"/);
  assert.match(flush, /resultCatalog: \{ \.\.\.this\.latestPanelBuildTiming\.resultCatalog \}/);
  assert.match(flush, /this\.latestPanelBuildTiming = \{[\s\S]*?runtimeEvidenceMs: 0,[\s\S]*?resultCatalog: \{ cacheHit: true, buildMs: 0 \}/);
});
