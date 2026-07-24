const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

test("first activation offers the exact missing setup or SimpleSFTP action", () => {
  assert.match(source, /firstRunSetupPrompt: "simpleExperiment\.firstRunSetupPromptVersion"/);
  assert.match(source, /legacySftpNoticeShown: "simpleExperiment\.legacySftpNoticeShown"/);
  assert.match(source, /const FIRST_RUN_SETUP_PROMPT_VERSION = 4/);
  assert.match(source, /void provider\.runActivationOnboarding\(\)/);
  const activationFlow = source.slice(source.indexOf("async runActivationOnboarding()"), source.indexOf("async recordOnboardingBackgroundError"));
  assert.ok(activationFlow.indexOf('name: "legacyConfigMigration"') < activationFlow.indexOf('name: "workspaceContinuation"'));
  assert.ok(activationFlow.indexOf('name: "workspaceContinuation"') < activationFlow.indexOf('name: "projectStateBootstrap"'));
  assert.ok(activationFlow.indexOf('name: "projectStateBootstrap"') < activationFlow.indexOf('name: "firstRunPrompt"'));
  assert.match(activationFlow, /run: \(\) => this\.projectBootstrapPromise/);
  assert.match(source, /firstRunSetupPromptSingleFlight = createSingleFlightRunner\(\)/);
  assert.match(source, /showFirstRunSetupPromptOnce\(\)[\s\S]{0,160}firstRunSetupPromptSingleFlight\(\(\) => this\.showFirstRunSetupPromptOnceCore\(\)\)/);
  assert.match(source, /shownVersion >= FIRST_RUN_SETUP_PROMPT_VERSION/);
  assert.match(source, /globalState\.update\(keys\.firstRunSetupPrompt, FIRST_RUN_SETUP_PROMPT_VERSION\)/);
  assert.match(source, /首次使用 SimpleExperiment：先配置 Xshell 会话，再填写 Hub\/Worker 项目父目录；插件会自动追加当前项目名/);
  assert.match(source, /const simpleSftp = simpleSftpIntegrationReadiness\(\)/);
  assert.match(source, /const legacySftp = legacySftpInstallationState\(\)/);
  assert.match(source, /simpleSftp\.ready && legacySftp\.installed/);
  assert.match(source, /检测到旧版 SFTP 插件仍已安装/);
  assert.match(source, /"打开旧版扩展管理",\s*"不再提示"/);
  assert.match(source, /@id:\$\{LEGACY_SFTP_EXTENSION_ID\}/);
  assert.match(source, /choice === "不再提示"[\s\S]{0,120}legacySftpNoticeShown/);
  const promptFlow = source.slice(source.indexOf("async showFirstRunSetupPromptOnce()"), source.indexOf("async ensureSimpleSftpReadyForSetup"));
  assert.ok(promptFlow.indexOf("legacySftpInstallationState()") < promptFlow.indexOf("shownVersion >= FIRST_RUN_SETUP_PROMPT_VERSION"));
  assert.match(source, /serverSetupComplete && simpleSftp\.ready && enabledWorkerCount > 0/);
  const readyFlow = promptFlow.slice(promptFlow.indexOf("if (serverSetupComplete"), promptFlow.indexOf("const needsSftp"));
  assert.match(readyFlow, /if \(!root\)\s*return;/);
  assert.match(readyFlow, /workspaceState\.get\(keys\.projectOnboardingPrompt/);
  assert.match(readyFlow, /workspaceState\.update\(keys\.projectOnboardingPrompt, 1\)/);
  assert.doesNotMatch(readyFlow, /globalState\.update\(keys\.firstRunSetupPrompt/);
  const workspaceChange = source.slice(source.indexOf("handleWorkspaceFoldersChanged()"), source.indexOf("resetProjectContextInMemory()"));
  assert.match(workspaceChange, /reloadProjectContextAfterWorkspaceChange\(\)\)[\s\S]{0,120}showFirstRunSetupPromptOnce\(\)/);
  assert.match(source, /SimpleExperiment 已就绪，当前项目为/);
  assert.match(source, /showWarningMessage\(`SimpleExperiment 已就绪，当前项目为[\s\S]{0,260}\{ modal: true \}, "接入当前项目", "打开面板", "不再提示"\)/);
  assert.match(source, /choice === "接入当前项目"\)\s*await this\.bootstrapProjectFromUi\(\)/);
  assert.match(source, /首次上传前会再次确认本地与远端预期位置/);
  assert.match(source, /配套 SimpleSFTP 未就绪/);
  assert.match(source, /const needsSftp = !simpleSftp\.ready/);
  assert.match(source, /const enabledWorkerCount = this\.setupConfig\.workerTunnels\.filter\(\(worker\) => worker\.enabled !== false\)\.length/);
  assert.match(source, /const needsWorker = !needsSftp && serverSetupComplete && enabledWorkerCount < 1/);
  assert.match(source, /正式运行、复现和批量运行还缺少至少一个启用的执行 Worker/);
  assert.match(source, /needsWorker\s*\? await vscode\.window\.showInformationMessage\(message, "添加 Worker", "打开配置说明", "不再提示"\)/);
  assert.match(source, /choice === "添加 Worker"\)\s*await this\.addWorkerConfigFromUi\(false\)/);
  assert.match(source, /const afterWorkerCount = this\.setupConfig\.workerTunnels\.filter\(\(worker\) => worker\.enabled !== false\)\.length/);
  assert.match(source, /workspaceRoot\(\) && initialServerSetupComplete\(this\.setupConfig\) && afterSftp\.ready && afterWorkerCount > 0/);
  assert.match(source, /choice === "不再提示"[\s\S]{0,140}globalState\.update/);
  assert.match(source, /afterSftp = simpleSftpIntegrationReadiness\(\)/);
  assert.match(source, /async markProjectOnboardingComplete\(\)/);
  assert.match(source, /await this\.markProjectOnboardingComplete\(\)/);
  assert.doesNotMatch(source, /needsSftpOnly/);
  assert.match(source, /"打开配置说明", "开始一键配置", "不再提示"/);
  assert.match(source, /choice === "打开配置说明"[\s\S]{0,80}this\.openSetupGuide\(\)/);
  assert.match(source, /choice === "打开扩展管理"[\s\S]{0,140}workbench\.extensions\.search/);
  assert.match(source, /choice === "开始一键配置"[\s\S]{0,80}this\.quickSetup\(\)/);

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("serverSetupMissingItems")}\n${extractFunction("initialServerSetupComplete")}\nthis.check = initialServerSetupComplete;\nthis.missing = serverSetupMissingItems;`, sandbox);
  const check = sandbox.check;
  assert.equal(check({}), false);
  assert.equal(check({ savedSessionPath: "hub.xsh", agentProjectDir: "/srv/projects" }), true);
  assert.equal(check({ savedSessionPath: "hub.xsh", agentProjectDir: "/srv/projects", workerTunnels: [{ id: "w1", enabled: true }] }), false);
  assert.equal(check({ savedSessionPath: "hub.xsh", agentProjectDir: "/srv/projects", workerTunnels: [{ id: "w1", enabled: false }] }), true);
  assert.equal(check({ savedSessionPath: "hub.xsh", agentProjectDir: "/srv/projects", workerTunnels: [{ id: "w1", savedSessionPath: "w1.xsh", agentProjectDir: "/srv/worker", enabled: true }] }), true);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.missing({ savedSessionPath: "hub.xsh", agentProjectDir: "/srv/projects", workerTunnels: [{ id: "w1", displayName: "GPU 服务器", enabled: true }] }))), ["GPU 服务器 Xshell 会话", "GPU 服务器 项目父目录"]);
});
