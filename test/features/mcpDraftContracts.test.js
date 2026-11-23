"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), vm = require("node:vm");
require("../_helpers/registerTsRequire");
const { PROJECT_TOOLS } = require("../../src/mcp/ToolCatalog.ts");
const { ProjectGateway } = require("../../src/mcp/ProjectGateway.ts");
const { createProjectAuthorization } = require("../../src/mcp/ProjectAuthorization.ts");
const root = path.resolve(__dirname, "../..");
function source(file) { const text = fs.readFileSync(path.join(root, file), "utf8"); return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true); }
function method(tree, name) { let found; function visit(n) { if (ts.isMethodDeclaration(n) && n.name.getText(tree) === name) found = n.getText(tree); ts.forEachChild(n, visit); } visit(tree); assert.ok(found, name); return found; }
function declaration(tree, name) { let found; function visit(n) { if (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(tree) === name)) found = n.getText(tree); ts.forEachChild(n, visit); } visit(tree); assert.ok(found, name); return found; }
function makeClass(members, sandbox) { return vm.runInNewContext(ts.transpileModule("class Host{" + members.join("\n") + "};Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox); }
const commands = ["runDraftDebug", "promoteDraft", "rejectDraft", "reviewDraft", "cleanupDrafts"];

test("the current MCP catalog and local method and action maps omit retired draft entries", async () => {
  assert.equal(PROJECT_TOOLS.some(tool => tool.method.startsWith("drafts.") || tool.name.startsWith("draft_")), false);
  assert.ok(PROJECT_TOOLS.some(tool => tool.method === "plans.list"));
  const tree = source("src/extension/legacy.ts");
  const names = ["uiActionCommands", "SAFE_WEBVIEW_COMMANDS", "API_INTERNAL_COMMANDS", "RETIRED_DRAFT_COMMANDS", "API_EXECUTABLE_COMMANDS", "API_CONFIRM_COMMANDS"];
  const compiled = ts.transpileModule(names.map(name => declaration(tree, name)).join("\n") + "\nclass Host{" + method(tree, "createLocalApiMethods") + "};Host",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const Host = vm.runInNewContext(compiled, { actionCommandMap: {}, PLAN_SUBMISSION_COMMANDS: new Set(),
    WORKER_ACTION_CONFIRM_COMMANDS: new Set(), NO_HUB_RESULT_CONFIRM_COMMANDS: new Set() });
  const host = new Host(); host.refreshSharedConnectionSettings = () => {};
  const methods = host.createLocalApiMethods();
  assert.equal(Object.keys(methods).some(name => name.startsWith("drafts.")), false);
  assert.equal(typeof methods["plans.list"], "function");
  const actions = await methods["actions.list"]();
  for (const command of commands) assert.equal(actions.actions.some(row => row.command === command), false);
  assert.ok(actions.actions.some(row => row.command === "runPlan"));
});

test("retired gateway reads and writes reject before paths, grants, or handlers can have effects", async () => {
  let grant = createProjectAuthorization(root), calls = 0;
  const names = ["draft_list", "draft_validate", "draft_promotion_preview", "draft_review", "draft_reject", "draft_cleanup_candidates"];
  const methods = Object.fromEntries(["list", "validate", "promotionPreview", "review", "reject", "cleanupCandidates", "cleanup"]
    .map(name => ["drafts." + name, async () => { calls++; }]));
  methods["config.set"] = async () => { calls++; };
  const gateway = new ProjectGateway({ root: () => root, workers: () => [], store: { get: () => grant }, methods: () => methods });
  for (const name of names) for (const draftPlanPath of ["tmp/plan/old.yaml", "../outside.yaml"]) {
    await assert.rejects(gateway.call(name, { draftPlanPath }), /MCP_TOOL_UNAVAILABLE/);
  }
  grant = undefined;
  await assert.rejects(gateway.call("draft_review", { draftPlanPath: "tmp/plan/old.yaml" }), /MCP_TOOL_UNAVAILABLE/);
  await assert.rejects(gateway.call("configuration_set", { key: "simpleExperiment.test", value: true, scope: "workspace" }), /AUTHORIZATION_REQUIRED/);
  assert.equal(calls, 0);
});

test("old UI and invoke draft commands reject before any handler or cleanup preview", async () => {
  const tree = source("src/extension/legacy.ts"), retired = new Set(commands);
  const Host = makeClass([method(tree, "invokeApi"), method(tree, "handleMessage"), method(tree, "handleMessageCore")],
    { RETIRED_DRAFT_COMMANDS: retired, stringField: (obj, key) => obj[key], API_EXECUTABLE_COMMANDS: new Set(commands),
      getSafeCommand: msg => msg.command, hostOperationLeaseActionForUiCommand: () => assert.fail("retired command reached lease"),
      console: { log() {} } });
  const host = new Host();
  for (const command of commands) {
    await assert.rejects(host.invokeApi({ command }), /DRAFT_RETIRED/);
    await assert.rejects(host.handleMessage({ command }), /DRAFT_RETIRED/);
    await assert.rejects(host.handleMessageCore({ command }, command), /DRAFT_RETIRED/);
  }
});

test("the local RPC rejects retired methods before handler dispatch", async () => {
  const tree = source("src/api/LocalApiServer.legacy.ts"); let payload, sent, calls = 0;
  class LocalApiError extends Error {}
  const Host = makeClass([method(tree, "handleRpc"), method(tree, "capabilities"), method(tree, "openapi")], { AbortController, process, LocalApiError,
    readJsonBody: async () => payload, sendJson: (_response, _status, result) => { sent = result; },
    rpcError: (id, code, message) => ({ id, code, message }), operationOutcomeFor: () => ({}) });
  const host = new Host(); host.getWorkspace = () => "project"; host.methods = { "drafts.cleanup": () => { calls++; } };
  host.methods["plans.list"] = () => [];
  assert.equal(host.capabilities().methods.includes("drafts.cleanup"), false);
  assert.equal(host.capabilities().methods.includes("plans.list"), true);
  assert.equal(JSON.stringify(host.openapi()).includes("drafts.cleanup"), false);
  const request = { headers: {} }, response = { once() {}, removeListener() {}, writableEnded: false };
  for (const name of ["list", "validate", "promotionPreview", "promote", "reject", "review", "cleanupCandidates", "cleanup"]) {
    payload = { jsonrpc: "2.0", id: 1, method: "drafts." + name, params: {} }; sent = undefined;
    await host.handleRpc(request, response); assert.match(sent.message, name === "promote" ? /DRAFT_PROMOTION_RETIRED/ : /DRAFT_RETIRED/);
  }
  assert.equal(calls, 0);
});

test("metadata refresh no longer starts the old draft reconciliation", () => {
  const tree = source("src/extension/legacy.ts"), text = method(tree, "refreshLocalPlanMetadata");
  assert.doesNotMatch(text, /refreshDraftPlans\s*\(/);
});
