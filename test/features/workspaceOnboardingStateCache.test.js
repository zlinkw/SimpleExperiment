const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension.ts");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadWorkspaceContext() {
  const sandbox = {
    path,
    mapping: { hostRoot: "D:/GitRepo", containerRoot: "/workspaces", remoteScheme: "vscode-remote" },
    locationCalls: 0,
    EMPTY_WORKSPACE_FOLDERS_FOR_WEBVIEW: Object.freeze([]),
    workspaceContextForWebviewCacheFolders: undefined,
    workspaceContextForWebviewCacheMappingKey: "",
    workspaceContextForWebviewCacheValue: undefined,
    vscode: { workspace: { workspaceFolders: [] } },
    workspaceMappingConfig() { return { ...sandbox.mapping }; },
    workspaceLocationForFolder(folder, mapping) {
      sandbox.locationCalls += 1;
      if (folder && folder.fail) throw new Error("mapping failed");
      return folder ? { hostPath: folder.hostPath, editorUri: folder.uri.toString(), remote: Boolean(mapping.containerRoot) } : undefined;
    },
    errorMessage(error) { return String(error.message || error); },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("workspaceContextForWebview")}\nthis.check = workspaceContextForWebview;`, sandbox);
  return sandbox;
}

function loadOnboarding() {
  const sandbox = {
    path,
    EMPTY_PROJECT_ONBOARDING_SOURCE: Object.freeze({}),
    projectOnboardingStateForWebviewCache: new WeakMap(),
    serverSetupMissingItems(setup) {
      const missing = [];
      if (!setup.savedSessionPath) missing.push("Hub Xshell 会话");
      if (!setup.agentProjectDir) missing.push("Hub 项目父目录");
      return missing;
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("projectOnboardingStateForWebview")}\nthis.check = projectOnboardingStateForWebview;`, sandbox);
  return sandbox;
}

function folder(name = "Demo") {
  return {
    hostPath: `D:/GitRepo/${name}`,
    uri: { path: `/workspaces/${name}`, toString: () => `vscode-remote://${name}` },
  };
}

test("workspace Webview context reuses stable folders and mapping config", () => {
  const sandbox = loadWorkspaceContext();
  const folders = [folder()];
  sandbox.vscode.workspace.workspaceFolders = folders;
  const first = sandbox.check();

  assert.strictEqual(sandbox.check(), first);
  assert.equal(sandbox.locationCalls, 1);
  assert.equal(first.root, "D:/GitRepo/Demo");
  assert.equal(first.singleProject, true);

  sandbox.mapping = { ...sandbox.mapping, hostRoot: "E:/Projects" };
  const mapping = sandbox.check();
  assert.notStrictEqual(mapping, first);
  assert.equal(sandbox.locationCalls, 2);

  sandbox.vscode.workspace.workspaceFolders = [folder("Other"), folder("Second")];
  const multiple = sandbox.check();
  assert.notStrictEqual(multiple, mapping);
  assert.equal(multiple.folderCount, 2);
  assert.equal(multiple.singleProject, false);
});

test("project onboarding state reuses stable sources and invalidates each input", () => {
  const sandbox = loadOnboarding();
  const workspace = { root: "D:/GitRepo/Demo", name: "Demo", singleProject: true };
  const setup = {
    savedSessionPath: "hub.xsh",
    agentProjectDir: "/srv/projects",
    workerTunnels: [{ id: "worker-a", enabled: true }],
  };
  const simpleSftp = { ready: true };
  const first = sandbox.check({ workspace, setup, simpleSftp, promptShown: 0, completed: false });

  assert.strictEqual(sandbox.check({ workspace, setup, simpleSftp, promptShown: 0, completed: false }), first);
  assert.equal(first.required, true);
  assert.equal(first.ready, true);

  const prompt = sandbox.check({ workspace, setup, simpleSftp, promptShown: 1, completed: false });
  assert.notStrictEqual(prompt, first);
  const completed = sandbox.check({ workspace, setup, simpleSftp, promptShown: 1, completed: true });
  assert.notStrictEqual(completed, prompt);
  assert.equal(completed.required, false);

  const sftp = sandbox.check({ workspace, setup, simpleSftp: { ready: false, message: "SimpleSFTP 未就绪" }, promptShown: 1 });
  assert.notStrictEqual(sftp, completed);
  assert.equal(sftp.blocked, true);

  const configuration = sandbox.check({ workspace, setup: { ...setup, workerTunnels: [] }, simpleSftp, promptShown: 1 });
  assert.notStrictEqual(configuration, sftp);
  assert.match(configuration.detail, /至少一个启用的执行 Worker/);

  const duplicate = sandbox.check({
    workspace,
    setup: { ...setup, savedSessionPath: "" },
    simpleSftp: { ready: false, message: "Hub Xshell 会话" },
    promptShown: 1,
  });
  assert.deepEqual(Array.from(duplicate.missing), ["Hub Xshell 会话"]);
  assert.equal((duplicate.detail.match(/Hub Xshell 会话/g) || []).length, 1);

  const noWorkspace = sandbox.check({ workspace: { ...workspace, root: "" }, setup, simpleSftp, promptShown: 1 });
  assert.notStrictEqual(noWorkspace, configuration);
  assert.equal(noWorkspace.required, false);
  assert.equal(noWorkspace.ready, false);
});

test("project onboarding derives the filtered missing item list once", () => {
  const onboarding = extractFunction("projectOnboardingStateForWebview");
  assert.equal((onboarding.match(/new Set\(missing\.filter\(Boolean\)\)/g) || []).length, 1);
  assert.match(onboarding, /const missingItems = \[\.\.\.new Set\(missing\.filter\(Boolean\)\)\];/);
  assert.match(onboarding, /const projectReady = hasProject && missingItems\.length === 0 && !mismatchedWorker;/);
  assert.match(onboarding, /\$\{missingItems\.join\("、"\)\}/);
});

test("recognized local projects do not require an old setup marker, while a connected foreign Agent stays explicit", () => {
  const sandbox = loadOnboarding();
  const workspace = { root: "D:/GitRepo/SimpleMcpAcceptance", name: "SimpleMcpAcceptance", singleProject: true };
  const setup = { savedSessionPath: "legacy.xsh", agentProjectDir: "/root/projects", workerTunnels: [{ id: "rjj8", enabled: true }] };
  const common = { workspace, setup, simpleSftp: { ready: true }, completed: false, recognized: true };
  const ready = sandbox.check({ ...common, workerProbes: { rjj8: { status: "ok", tcpOpen: true } } });
  assert.equal(ready.required, false);
  assert.equal(ready.completed, true);
  const workerProbes = { rjj8: {
    status: "agent_project_mismatch", tcpOpen: true, projectRoot: "/root/projects/MultiModal", expectedProjectRoot: "/root/projects/SimpleMcpAcceptance",
  } };
  const mismatch = sandbox.check({ ...common, workerProbes });
  assert.equal(mismatch.required, true);
  assert.equal(mismatch.ready, false);
  assert.match(mismatch.title, /Agent.*项目不匹配/);
  assert.match(mismatch.detail, /隧道已连通.*MultiModal.*SimpleMcpAcceptance/);
  assert.equal(mismatch.actionCommand, "prepareAgents");
  assert.equal(mismatch.actionLabel, "部署本项目 Agent");
  workerProbes.rjj8 = { status: "ok", tcpOpen: true };
  const checked = sandbox.check({ ...common, workerProbes });
  assert.equal(checked.required, false);
});

test("onboarding renderer uses the host's actual issue and next action", () => {
  const source = require("../_helpers/panelFunction")("renderProjectOnboardingNotice");
  let html = "";
  const target = { classList: { toggle() {} } };
  const render = vm.runInNewContext(source + ";renderProjectOnboardingNotice", {
    el: () => target, esc: String, escAttr: String, setHtmlIfChanged: (_, value) => { html = value; },
  });
  render({ projectOnboarding: { required: true, title: "Worker Agent 项目不匹配", detail: "隧道已连通", actionCommand: "prepareAgents", actionLabel: "部署本项目 Agent" } });
  assert.match(html, /Worker Agent 项目不匹配/);
  assert.match(html, /data-command="prepareAgents"/);
  assert.doesNotMatch(html, /当前项目待接入|data-command="bootstrapProject"/);
  render({ projectOnboarding: { required: false } });
  assert.equal(html, "");
});

test("local recognition uses scanned plans and adapter, without requiring a tunnel or changing saved flags", () => {
  const ts = require("typescript"), method = require("../_helpers/legacyMethod");
  const Host = vm.runInNewContext(ts.transpileModule("class Host {" + method(source, "projectLocallyRecognized(") + "};Host", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText);
  const host = new Host();
  host.localPlanMetadata = { detectedProject: { adapterConfig: "experiments/simple_project.yaml" }, plans: [{ planFile: "acceptance.yaml" }] };
  assert.equal(host.projectLocallyRecognized(), true);
  host.localPlanMetadata.error = "scan failed";
  assert.equal(host.projectLocallyRecognized(), false);
  delete host.localPlanMetadata.error;
  host.localPlanMetadata.plans = [];
  assert.equal(host.projectLocallyRecognized(), false);
});
