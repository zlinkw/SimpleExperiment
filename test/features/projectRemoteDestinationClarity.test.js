const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");
const readme = fs.readFileSync(path.join(__dirname, "../../README.md"), "utf8");
const legacyNotes = fs.readFileSync(path.join(__dirname, "../../docs/technical-notes.md"), "utf8");
const guide = fs.readFileSync(path.join(__dirname, "../../docs/simple-experiment-setup.md"), "utf8");
const packageScript = fs.readFileSync(path.join(__dirname, "../../scripts/package-public.ps1"), "utf8");

function extractFunction(name) { return require('../_helpers/panelFunction')(name); }

test("settings show computed code and Agent runtime destinations for every server", () => {
  assert.match(panel, /function renderServerDestinationPreview\(agentState, scope\)/);
  assert.match(panel, /当前项目代码/);
  assert.match(panel, /Agent runtime/);
  assert.match(panel, /installDir \+ "\/simple_cluster\/runtime"/);
  assert.doesNotMatch(panel, /renderServerDestinationPreview\(hubAgent, "hub"\)/);
  assert.match(panel, /renderServerDestinationPreview\(workerAgent, scope\)/);
  assert.match(panel, /\.serverDestinationPreview code/);
  assert.match(panel, /Xshell、端口、项目父目录/);
  assert.match(panel, /configInput\(scope, "agentProjectDir", "项目父目录", worker\.agentProjectDir/);
  const sandbox = { meaningfulValue: value => String(value || ""), esc: String, escAttr: String };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction("renderServerDestinationPreview"), sandbox);
  const rendered = sandbox.renderServerDestinationPreview({ workDir: "/srv/projects/demo", installDir: "/srv/projects/demo/alice_agent", actualWorkRoot: "/srv/projects", projectName: "demo", agentDirectoryName: "alice_agent" }, "worker:one");
  assert.ok(rendered.includes('<code data-destination-kind="code">/srv/projects/demo</code>'));
  assert.ok(rendered.includes('<code data-destination-kind="runtime">/srv/projects/demo/alice_agent/simple_cluster/runtime</code>'));
  assert.doesNotMatch(panel, /\["工作目录", compactPath\(setup\.agentProjectDir/);
  assert.match(packageScript, /Invoke-VscePackage \$root \$experimentVsix/);
  assert.doesNotMatch(packageScript, /Set-Content[^\n]*settings\.json|hubAgentProjectDir|workerTunnels/);
});

test("editing a project parent root updates unsaved destination preview without changing saved state", () => {
  assert.match(panel, /function normalizeRemoteDestinationRoot\(value\)/);
  assert.match(panel, /function updateServerDestinationPreview\(input\)/);
  assert.match(panel, /function remoteDestinationRootIssue\(root, projectName\)/);
  assert.match(panel, /function remoteDestinationRootWarning\(root, projectName\)/);
  assert.match(panel, /function remoteDestinationParentRoot\(value\)/);
  assert.match(panel, /input\.dataset\.key !== "agentProjectDir"/);
  assert.match(panel, /root \+ "\/" \+ projectName/);
  assert.match(panel, /codePath \+ "\/" \+ agentDirectoryName \+ "\/simple_cluster\/runtime"/);
  assert.match(panel, /未保存预览；点击保存服务器后生效/);
  assert.match(panel, /上传和 Agent 启动仍使用已保存配置/);
  assert.match(panel, /路径末级与项目名相同；[\s\S]{0,120}否则项目名会重复/);
  assert.match(panel, /classList\.toggle\("error", Boolean\(issue\)\)/);
  assert.ok([...panel.matchAll(/updateServerDestinationPreview\(input\)/g)].length >= 4);

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("normalizeRemoteDestinationRoot"),
    extractFunction("remoteDestinationParentRoot"),
    extractFunction("remoteDestinationRootWarning"),
    extractFunction("remoteDestinationRootIssue"),
    "this.parent = remoteDestinationParentRoot; this.warn = remoteDestinationRootWarning; this.issue = remoteDestinationRootIssue;",
  ].join("\n"), sandbox);
  assert.equal(sandbox.parent("/srv/projects/demo"), "/srv/projects");
  assert.match(sandbox.warn("/srv/projects/demo", "demo"), /建议改为 \/srv\/projects/);
  assert.equal(sandbox.warn("/srv/projects", "demo"), "");
  for (const configured of ["/srv/simple_agent", "/srv/zlk_agent", "/srv/alice_agent", "/srv/simple"]) {
    assert.equal(sandbox.issue(configured, "demo"), "");
  }
  assert.match(sandbox.issue("", "demo"), /请填写项目父目录/);
  assert.match(sandbox.issue("/srv/../secret", "demo"), /不能包含 \.\./);
});

test("draft runtime paths use the resolved global prefix and preserve explicit installation paths", () => {
  const code = { textContent: "" }, runtime = { textContent: "" }, status = { textContent: "" };
  const preview = { dataset: { destinationPreview: "worker:one", projectName: "demo", agentDirectoryName: "alice_agent", installDirIsExplicit: "false", savedInstallDir: "/old/demo/alice_agent" },
    querySelector: selector => selector.includes('="code"') ? code : selector.includes('="runtime"') ? runtime : status,
    classList: { add() {}, toggle() {} } };
  const sandbox = { document: { querySelectorAll: () => [preview] }, setNativeTitle() {} };
  vm.createContext(sandbox);
  vm.runInContext(["normalizeRemoteDestinationRoot", "remoteDestinationParentRoot", "remoteDestinationRootIssue", "remoteDestinationRootWarning", "updateServerDestinationPreview"].map(extractFunction).join("\n"), sandbox);
  const input = { dataset: { key: "agentProjectDir", configInput: "worker:one" }, value: "/new" };
  sandbox.updateServerDestinationPreview(input);
  assert.equal(code.textContent, "/new/demo");
  assert.equal(runtime.textContent, "/new/demo/alice_agent/simple_cluster/runtime");
  assert.match(status.textContent, /未保存预览/);
  assert.equal(preview.dataset.savedInstallDir, "/old/demo/alice_agent");
  preview.dataset.installDirIsExplicit = "true";
  sandbox.updateServerDestinationPreview(input);
  assert.equal(runtime.textContent, "/old/demo/alice_agent/simple_cluster/runtime");
  preview.dataset.savedInstallDir = "/custom/zlk_agent";
  sandbox.updateServerDestinationPreview(input);
  assert.equal(runtime.textContent, "/custom/zlk_agent/simple_cluster/runtime");
  preview.dataset.installDirIsExplicit = "false"; preview.dataset.agentDirectoryName = "";
  sandbox.updateServerDestinationPreview(input);
  assert.equal(runtime.textContent, "等待读取全局前缀");
  preview.dataset.projectName = "";
  sandbox.updateServerDestinationPreview(input);
  assert.equal(runtime.textContent, "打开本地项目后显示");
});

test("project quick access summarizes upload destinations and refreshes after project changes", () => {
  assert.match(panel, /function renderServerDestinationPreview\(agentState, scope\)/);
  assert.match(panel, /section === "settings"[\s\S]{0,320}data\.agentSessions/);
  assert.match(legacyNotes, /设置 -> 服务器.*当前项目代码.*Agent runtime/);
});
