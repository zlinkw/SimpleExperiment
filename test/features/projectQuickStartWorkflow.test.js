const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(source, name) {
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

function bootstrapCompletion(options) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(extension, "projectBootstrapEndpointReadiness"),
    extractFunction(extension, "projectBootstrapCompletion"),
    "this.check = projectBootstrapCompletion;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(options)));
}

function bootstrapPlanSelection(plans, planFileInput, selectedPlanId) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(extension, "projectBootstrapPlanSelection") + "\nthis.check = projectBootstrapPlanSelection;", sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(plans, planFileInput, selectedPlanId)));
}

function projectOnboardingState(options) {
  const sandbox = { path: require("node:path") };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(extension, "serverSetupMissingItems"),
    extractFunction(extension, "initialServerSetupComplete"),
    extractFunction(extension, "projectOnboardingStateForWebview"),
    "this.check = projectOnboardingStateForWebview;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(options)));
}

test("quick project onboarding preserves granular actions and follows gate order", () => {
  assert.match(extension, /function projectOnboardingStateForWebview\(options\)/);
  assert.match(extension, /const projectOnboarding = projectOnboardingStateForWebview\(\{/);
  assert.match(extension, /projectOnboarding,/);
  assert.match(panel, /id="projectOnboardingNotice"/);
  assert.match(panel, /function renderProjectOnboardingNotice\(state\)/);
  assert.match(panel, /renderProjectOnboardingNotice\(state\)/);
  assert.match(panel, /item\.required === true/);
  assert.match(panel, /当前项目待接入/);
  assert.match(panel, /data-command="bootstrapProject"[^>]*>接入当前项目/);
  assert.equal([...panel.matchAll(/data-command="bootstrapProject"[^>]*>接入当前项目/g)].length, 3);
  assert.match(panel, /<details class="projectQuickDetails"><summary>环境、服务器、连接与同步详情<\/summary>/);
  assert.match(panel, /const primaryRows = \[/);
  assert.match(panel, /const infrastructureRows = \[/);
  assert.match(panel, /function renderProjectNextAction\(/);
  assert.match(panel, /一键创建 Plan 和结果接入/);
  assert.match(panel, /补全结果捕获规则/);
  assert.match(panel, /补全计划输出契约/);
  assert.match(panel, /准备就绪；确认后自动同步、校验、预演并提交/);
  assert.match(panel, /data-command="generatePlanGuide">新建模板/);
  assert.match(panel, /data-command="generateOutputAdapter">/);
  assert.match(panel, /projectQuickRow\("当前配置"/);
  assert.match(panel, /function firstProjectConfig\(project, meta, plan\)/);
  assert.match(panel, /\(plan \|\| \{\}\)\.baseConfig/);
  assert.match(panel, /function projectConfigAvailable\(file, project, meta\)/);
  assert.match(panel, /firstConfig \+ "（缺失）"/);
  assert.match(panel, /projectPathButton\(configAvailable \? "打开配置" : "", firstConfig\)/);
  assert.match(panel, /renderPlanRunActions\(state, selectedPlan, outputReady, project\.adapterConfig, runtimeContractStage\)/);
  assert.match(panel, /function renderPlanRunActions\(state, selectedPlan, outputReady, adapterConfig, runtimeContractStage\)/);
  assert.match(panel, /planActiveRunEvidence\(state \|\| \{\}, selectedPlan, plan\)/);
  assert.match(panel, /已阻止重复提交/);
  assert.ok(panel.indexOf("const activeRun = planFile ? planActiveRunEvidence(state, planFile, selectedPlan)") < panel.indexOf("if (!(serverReadiness || {}).ready)"));
  assert.match(panel, /if \(activeRun\.active\) \{[\s\S]{0,800}return renderPlanExecutionNextAction\(state, planFile\)/);
  assert.match(panel, /adapterConfig[\s\S]{0,180}projectPathButton\("打开接入配置", adapterConfig\)[\s\S]{0,180}"generateOutputAdapter"/);
  assert.match(panel, />校验并提交运行<\/button><button class="mini secondary" data-command="validatePlan"/);
  assert.match(panel, />单独校验<\/button><button class="mini secondary" data-command="dryRunPlan"/);
  assert.match(panel, />单独预演<\/button>/);
  assert.doesNotMatch(panel, /data-command="runPlan"[^>]*>运行<\/button>/);
  assert.match(panel, /data-command="startAllConnections"[^>]*>启动连接<\/button>/);
  assert.doesNotMatch(panel, /data-command="startAllConnections">一键运行<\/button>/);
  assert.doesNotMatch(extension, /确认一键运行|一键运行将启动/);
  assert.match(extension, /启动连接将打开.*不会提交实验/);
  assert.match(panel, /校验时自动同步 Hub；提交运行时自动同步 Hub\/Worker/);
  assert.match(panel, /const lifecycle = projectQuickLifecyclePresentation\(executionStage, readyToStart, firstRunRecommended\)/);
  assert.match(panel, /const statusSummary = lifecycle\.preferStage && lifecycle\.summary \? lifecycle\.summary : readinessSummary/);
  assert.match(panel, /至少配置并启用一个执行 Worker[\s\S]{0,160}"添加 Worker"/);
  assert.match(panel, /选择本次要接入并运行的 Plan/);
  assert.match(panel, /const readyToStart = Boolean\(simpleSftp\.ready\) && Boolean\(selectedPlanFile\) && outputGate\.ok && serverReadiness\.ready && workerReadiness\.ready && endpointReadiness\.ready && !meta\.outputContractStage/);
  assert.match(panel, /selectedPlanFile \? firstProjectConfig/);
  assert.match(panel, /选择 Plan 后显示/);
  const quickAccessStart = panel.indexOf("function renderProjectQuickAccess(");
  const quickAccessEnd = panel.indexOf("function projectEnvironmentSummary(", quickAccessStart);
  const quickAccess = panel.slice(quickAccessStart, quickAccessEnd);
  assert.doesNotMatch(quickAccess, /firstProjectPath\(project\.plans\)/);
  const nextActionStart = panel.indexOf("function renderProjectNextAction(");
  const nextActionEnd = panel.indexOf("function renderPlanExecutionNextAction(", nextActionStart);
  const nextAction = panel.slice(nextActionStart, nextActionEnd);
  assert.doesNotMatch(nextAction, /uploadProjectToHub|uploadProjectToWorkers/);
});

test("configured single-project workspaces keep onboarding visible until explicitly completed", () => {
  const setup = {
    savedSessionPath: "C:/Sessions/hub.xsh",
    agentProjectDir: "/srv/projects",
    workerTunnels: [{
      id: "worker-a",
      savedSessionPath: "C:/Sessions/worker-a.xsh",
      agentProjectDir: "/srv/projects",
      enabled: true,
    }],
  };
  const workspace = { root: "D:/GitRepo/Demo", name: "Demo", singleProject: true };
  const pending = projectOnboardingState({ workspace, setup, simpleSftp: { ready: true }, promptShown: 0 });
  assert.equal(pending.required, true);
  assert.equal(pending.completed, false);
  assert.match(pending.detail, /Demo/);

  const completed = projectOnboardingState({ workspace, setup, simpleSftp: { ready: true }, completed: true, promptShown: 1 });
  assert.equal(completed.required, false);
  assert.equal(completed.completed, true);
  const dismissed = projectOnboardingState({ workspace, setup, simpleSftp: { ready: true }, promptShown: 1 });
  assert.equal(dismissed.required, true);
  assert.equal(dismissed.ready, true);
  const noWorkspace = projectOnboardingState({ workspace: { ...workspace, singleProject: false }, setup, simpleSftp: { ready: true }, promptShown: 0 });
  assert.equal(noWorkspace.required, false);
  const missingWorker = projectOnboardingState({ workspace, setup: { ...setup, workerTunnels: [] }, simpleSftp: { ready: true }, promptShown: 0 });
  assert.equal(missingWorker.required, true);
  assert.equal(missingWorker.blocked, true);
  assert.match(missingWorker.detail, /至少一个启用的执行 Worker/);
});

test("quick project onboarding completes safe Plan and output setup in one flow", () => {
  assert.match(extension, /case "bootstrapProject":\s*await this\.bootstrapProjectFromUi\(\)/);
  assert.match(extension, /async bootstrapProjectFromUi\(\)/);
  assert.match(extension, /async pickProjectBootstrapPlan\(plans\)/);
  assert.match(extension, /title: "选择要接入并运行的 Plan"/);
  assert.match(extension, /插件不会默认使用列表第一项/);
  assert.match(extension, /selectionChanged[\s\S]{0,900}queueSelectedPlanResultParse\("接入当前项目切换计划", planFile\)/);
  assert.match(extension, /async pickPlanBaseConfig\(configs, options = \{\}\)/);
  assert.match(extension, /async pickGuidedPlanEntry\(root, entries, stage\)/);
  assert.match(extension, /title: stage === "test" \? "选择评估入口" : "选择训练入口"/);
  assert.match(extension, /guidedPlanCommandUsesConfig\(trainCommand\).*guidedPlanCommandUsesConfig\(testCommand\)/);
  assert.match(extension, /await ensureGuidedFallbackConfig\(root, baseConfig\)/);
  assert.match(extension, /inputExistingWorkspaceConfig\(options\.root\)/);
  assert.match(extension, /const configReview = stages\.train \? await guidedPlanConfigReview\(root, baseConfig, generatedFallbackConfig\)/);
  assert.match(extension, /await confirmGuidedPlanCreation\(/);
  assert.match(extension, /title: "选择新 Plan 使用的配置"/);
  assert.match(extension, /if \(list\.length <= 1\)/);
  assert.match(extension, /if \(!plans\.length\) \{\s*await this\.generatePlanGuideFromUi\(false\);\s*if \(!this\.projectContextIsCurrent\(projectContext\)\)\s*return;\s*await this\.refreshLocalPlanMetadata\(\{ post: false, force: true \}\);/);
  assert.match(extension, /let gateDiagnostics = projectOutputGateDiagnostics\(project, selected\)/);
  assert.match(extension, /if \(gateReason && gateDiagnostics\.nextLabel === "接入配置" && !project\.adapterConfig\) \{\s*await this\.generateOutputAdapterFromUi\(\);\s*if \(!this\.projectContextIsCurrent\(projectContext\)\)\s*return;\s*await this\.refreshLocalPlanMetadata\(\{ post: false, force: true \}\);/);
  assert.match(extension, /return projectBootstrapCompletion\(/);
  assert.match(extension, /adapterConfig: project\.adapterConfig/);
  assert.match(extension, /offlineBundleActive: Boolean\(this\.offlineBundle\)/);
  assert.match(extension, /outputGateNextLabel: gateDiagnostics\.nextLabel/);
  assert.match(extension, /activeRun: activePlanRunEvidence\(state, planFile, selected\)/);
  assert.match(extension, /activeRun,/);
  assert.match(extension, /await this\.testTunnel\(false\)/);
  assert.match(extension, /handleProjectBootstrapAction\(next, \{/);
  assert.match(extension, /next === "开始一键配置"[\s\S]{0,100}this\.quickSetup\(false\)/);
  assert.match(extension, /next === "准备 Agent 并启动"[\s\S]{0,100}this\.prepareAgentsForFirstRun\(false\)/);
  assert.match(extension, /next === "添加 Worker"[\s\S]{0,80}this\.addWorkerConfigFromUi\(false\)/);
  assert.match(extension, /next === "打开连接设置"[\s\S]{0,140}workbench\.action\.openSettings/);
  assert.match(extension, /next === "恢复在线连接"[\s\S]{0,180}clearOfflineImport\(\)[\s\S]{0,180}ensureRealtimeConnected\("resume from project onboarding"\)/);
  assert.match(extension, /next === "打开当前 Plan" && context\.planFile\)[\s\S]{0,120}openWorkspaceFileForProjectContext\(context\.planFile, projectContext\)/);
  assert.match(extension, /next === "打开接入配置" && context\.adapterConfig\)[\s\S]{0,120}openWorkspaceFileForProjectContext\(context\.adapterConfig, projectContext\)/);
  assert.match(extension, /next === "查看任务"[\s\S]{0,100}openPanelAt\("tasks", "tasks-list"\)/);
  assert.match(extension, /next === "查看提交进度"[\s\S]{0,120}openPanelAt\("operations", "operations-list"\)/);
  assert.match(extension, /next === "校验并提交运行"[\s\S]{0,180}this\.runActionCommand\("runPlan"/);
  assert.match(extension, /const currentCompletion = \(\) => \{/);
  assert.match(extension, /const NEW_PROJECT_INFRASTRUCTURE_MAX_STEPS = 3/);
  assert.match(extension, /for \(let step = 0; step < NEW_PROJECT_INFRASTRUCTURE_MAX_STEPS; step \+= 1\)/);
  assert.match(extension, /const PROJECT_BOOTSTRAP_MAX_STEPS = 8/);
  assert.match(extension, /for \(let step = 0; step < PROJECT_BOOTSTRAP_MAX_STEPS; step \+= 1\)/);
  assert.match(extension, /const seenCompletions = new Set\(\)/);
  assert.match(extension, /seenCompletions\.has\(completionKey\)[\s\S]{0,100}stopAtProjectPanel\(completion\)/);
  assert.match(extension, /await stopAtProjectPanel\(currentCompletion\(\)\)/);
  assert.match(extension, /const continueFlow = await this\.handleProjectBootstrapAction\(next, \{/);
  assert.match(extension, /if \(!continueFlow\)\s*return/);
  assert.match(extension, /async addWorkerConfigFromUi\(showMessage = true\)[\s\S]{0,2200}return true/);
  assert.match(extension, /async assertPlanLocalConfigFiles\(body\)/);
  assert.match(extension, /当前 Plan 引用的配置文件不存在/);
  assert.match(extension, /label: "配置文件", ok: configReady/);
  assert.match(panel, /label: "配置文件", ok: configReady/);
  const bootstrapStart = extension.indexOf("async bootstrapProjectFromUi()");
  const bootstrapEnd = extension.indexOf("async generateOutputAdapterFromUi()", bootstrapStart);
  const bootstrap = extension.slice(bootstrapStart, bootstrapEnd);
  assert.equal([...bootstrap.matchAll(/await this\.handleProjectBootstrapAction\(/g)].length, 2);
  assert.ok(bootstrap.indexOf("const next = completion.action") < bootstrap.indexOf("handleProjectBootstrapAction(next"));
  assert.doesNotMatch(bootstrap, /gateDiagnostics = projectOutputGateDiagnostics\(project, selected\);\s*}\s*if \(planFile\)\s*await openWorkspaceFile\(planFile\)/);
  const planGuideStart = extension.indexOf("async generatePlanGuideFromUi(");
  const planGuideEnd = extension.indexOf("async pickGuidedPlanEntry(", planGuideStart);
  const planGuide = extension.slice(planGuideStart, planGuideEnd);
  assert.match(planGuide, /async generatePlanGuideFromUi\(openAfterCreate = true\)/);
  assert.match(planGuide, /const projectContext = this\.captureProjectContext\(\)/);
  assert.ok([...planGuide.matchAll(/projectContextIsCurrent\(projectContext\)/g)].length >= 14);
  assert.match(planGuide, /if \(openAfterCreate && this\.projectContextIsCurrent\(projectContext\)\)\s*await openWorkspaceFile\(relative\)/);
  assert.doesNotMatch(bootstrap, /generatePlanGuideFromUi\(\)/);
});

test("quick project onboarding never silently falls back to the first of multiple plans", () => {
  const plans = [
    { planFile: "experiments/plans/a.yaml", planId: "a" },
    { planFile: "experiments/plans/b.yaml", planId: "b" },
  ];
  const selectedByFile = bootstrapPlanSelection(plans, "experiments/plans/b.yaml", "");
  assert.equal(selectedByFile.plan.planId, "b");
  assert.equal(selectedByFile.needsChoice, false);

  const selectedById = bootstrapPlanSelection(plans, "", "a");
  assert.equal(selectedById.plan.planFile, "experiments/plans/a.yaml");

  const selectedFileWins = bootstrapPlanSelection(plans, "experiments/plans/b.yaml", "a");
  assert.equal(selectedFileWins.plan.planId, "b");

  const ambiguous = bootstrapPlanSelection(plans, "", "");
  assert.equal(ambiguous.plan, undefined);
  assert.equal(ambiguous.needsChoice, true);

  const only = bootstrapPlanSelection([plans[0]], "", "");
  assert.equal(only.plan.planId, "a");
  assert.equal(only.needsChoice, false);
});

test("quick project onboarding reports only the next action proven by current readiness", () => {
  const outputIncomplete = bootstrapCompletion({ outputGateReason: "缺少结果路径", realtimeMode: true, setupComplete: true, workers: [{ status: "ok" }], hubStatus: "ok" });
  assert.equal(outputIncomplete.state, "output_incomplete");
  assert.equal(outputIncomplete.action, "打开当前 Plan");
  assert.equal(bootstrapCompletion({ outputGateReason: "缺少结果路径", outputGateNextLabel: "接入配置", adapterConfig: "experiments/zlk_project.yaml" }).action, "打开接入配置");
  assert.equal(bootstrapCompletion({ outputGateReason: "配置文件缺失", outputGateNextLabel: "配置文件", adapterConfig: "experiments/zlk_project.yaml" }).action, "打开当前 Plan");
  assert.match(extension, /adapterReady \? "打开 experiments\/zlk_project\.yaml 补充候选结果规则/);
  assert.match(panel, /adapterReady \? "打开 experiments\/zlk_project\.yaml 补充候选结果规则/);
  assert.equal(bootstrapCompletion({ setupComplete: false }).action, "开始一键配置");
  const workerRequired = bootstrapCompletion({ setupComplete: true, workers: [] });
  assert.equal(workerRequired.state, "worker_required");
  assert.equal(workerRequired.action, "添加 Worker");
  const offline = bootstrapCompletion({ realtimeMode: false, setupComplete: true, workers: [{ status: "ok" }] });
  assert.equal(offline.state, "offline_import");
  assert.equal(offline.action, "打开连接设置");
  const importedOffline = bootstrapCompletion({ realtimeMode: false, offlineBundleActive: true, setupComplete: true, workers: [{ status: "ok" }] });
  assert.equal(importedOffline.state, "offline_import");
  assert.equal(importedOffline.action, "恢复在线连接");
  const missingAgent = bootstrapCompletion({ realtimeMode: true, setupComplete: true, hubStatus: "ok", workers: [{ label: "Worker A", status: "agent_project_mismatch" }] });
  assert.equal(missingAgent.action, "准备 Agent 并启动");
  assert.match(missingAgent.message, /Worker A Agent 未通过当前项目检测/);
  const activeTasks = bootstrapCompletion({ realtimeMode: true, setupComplete: true, hubStatus: "local_port_closed", workers: [{ label: "Worker A", status: "unknown" }], activeRun: { active: true, taskCount: 2, operationCount: 1 } });
  assert.equal(activeTasks.state, "active_run");
  assert.equal(activeTasks.action, "查看任务");
  assert.match(activeTasks.message, /2 个任务、1 个提交操作/);
  const activeSubmission = bootstrapCompletion({ realtimeMode: true, setupComplete: true, workers: [{ status: "unknown" }], activeRun: { active: true, taskCount: 0, operationCount: 1 } });
  assert.equal(activeSubmission.action, "查看提交进度");
  const activeRunWins = bootstrapCompletion({ outputGateReason: "缺少结果路径", setupComplete: false, realtimeMode: false, activeRun: { active: true, taskCount: 1, operationCount: 1 } });
  assert.equal(activeRunWins.state, "active_run");
  assert.equal(activeRunWins.action, "查看任务");
  const completionStart = extension.indexOf("function projectBootstrapCompletion(options)");
  const completionEnd = extension.indexOf("function automaticResultParseReady", completionStart);
  const completionSource = extension.slice(completionStart, completionEnd);
  assert.ok(completionSource.indexOf("if (activeRun.active)") < completionSource.indexOf("const outputGateReason"));
  const ready = bootstrapCompletion({ realtimeMode: true, setupComplete: true, hubStatus: "file_api_unavailable", workers: [{ label: "Worker A", status: "ok" }] });
  assert.equal(ready.state, "ready");
  assert.equal(ready.action, "校验并提交运行");
  assert.match(ready.message, /校验并提交运行/);
});

test("quick project onboarding opens the exact panel destination", () => {
  assert.match(extension, /webviewReady = false/);
  assert.match(extension, /case "webviewReady":[\s\S]{0,160}flushPendingPanelNavigation\(\)/);
  assert.match(extension, /async openPanelAt\(section, anchor = section, options = \{\}\)/);
  assert.match(extension, /postMessage\(\{ type: "navigate", \.\.\.target \}\)/);
  assert.match(panel, /vscode\.postMessage\(\{ command: "webviewReady" \}\)/);
  assert.match(panel, /item\.type === "navigate"/);
  assert.match(panel, /navigateToResourceTarget\(latestNavigationMessage\.section, latestNavigationMessage\.anchor, \{ force: true \}\)/);
});
