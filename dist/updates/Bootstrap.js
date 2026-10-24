"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTALL_COMMAND = exports.CHECK_COMMAND = void 0;
exports.getUpdater = getUpdater;
exports.getUpdateStatus = getUpdateStatus;
exports.assertBusinessAllowed = assertBusinessAllowed;
exports.validateUpdateComponents = validateUpdateComponents;
exports.registerUpdater = registerUpdater;
exports.activateWithBusiness = activateWithBusiness;
exports.activate = activate;
exports.deactivate = deactivate;
const ExtensionUpdates_1 = require("../features/ExtensionUpdates");
const ReleaseClient_1 = require("./ReleaseClient");
const VerifiedPackage_1 = require("./VerifiedPackage");
const UpdateGate_1 = require("./UpdateGate");
const UpdateTransaction_1 = require("./UpdateTransaction");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const HostOperationLease_1 = require("../core/HostOperationLease");
exports.CHECK_COMMAND = "simpleExperiment.checkPluginUpdates";
exports.INSTALL_COMMAND = "simpleExperiment.installPluginUpdates";
const STATUS_KEY = "simpleExperiment.pluginUpdateStatus";
const RETRY_KEY = "simpleExperiment.pluginUpdateRetryAt";
let service;
let status = { status: "unknown", message: "尚未检查配套更新。", checkedAt: "" };
let business;
function getUpdater() { return service; }
function getUpdateStatus() { return structuredClone(status); }
function assertBusinessAllowed() {
    if (service?.blocked)
        throw new Error("配套插件正在更新或等待补装/重载，暂不接受新的本机业务操作；远端训练保持运行。");
    try {
        const file = (0, HostOperationLease_1.defaultHostOperationLeasePath)(), stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536)
            throw new Error("本机更新租约身份无效。");
        const row = JSON.parse(fs.readFileSync(file, "utf8"));
        if (row.actionType === "paired-plugin-update" && Date.parse(row.expiresAt) > Date.now())
            throw new Error("另一窗口正在配套更新；暂不接受新的本机业务操作。");
    }
    catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
}
function validateUpdateComponents(components) {
    const ids = [ExtensionUpdates_1.SFTP_EXTENSION_ID, ExtensionUpdates_1.EXPERIMENT_EXTENSION_ID], repos = [ExtensionUpdates_1.SFTP_UPDATE_REPO, ExtensionUpdates_1.EXPERIMENT_UPDATE_REPO];
    if (!Array.isArray(components) || components.length !== 2)
        throw new Error("配套更新记录无效。");
    for (let i = 0; i < 2; i++) {
        const c = components[i], a = c?.vsix;
        if (c?.id !== ids[i] || c.repo !== repos[i] || !c.latestVersion || (0, ExtensionUpdates_1.normalizeReleaseVersion)(c.latestVersion) !== c.latestVersion || !a || !Number.isSafeInteger(a.size) || a.size < 22 || a.size > 128 * 1024 * 1024
            || !/^sha256:[a-f0-9]{64}$/i.test(a.digest || ""))
            throw new Error("配套更新记录的身份、大小或 SHA-256 无效。");
        (0, ReleaseClient_1.assertUpdateUrl)(a.url, c.repo);
        (0, ExtensionUpdates_1.componentUpdateForInstalledVersion)(c, "0.0.0");
    }
}
/** Independent update entry: no project, tunnel or business panel is needed. */
function registerUpdater(context, vscode, client, options = {}) {
    const current = (id) => String(vscode.extensions.getExtension(id)?.packageJSON?.version || "0.0.0");
    // Proven rate-limit backoff lives in globalState so a window reload cannot immediately
    // re-hammer the GitHub API; the store's async save is awaited inside the client.
    const retryStore = {
        load: async () => Number(context.globalState.get(RETRY_KEY, 0)) || 0,
        save: async (at) => { await context.globalState.update(RETRY_KEY, at); },
    };
    const releaseClient = client || new ReleaseClient_1.ReleaseClient(fetch, Date.now, retryStore);
    const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
    bar.command = exports.CHECK_COMMAND;
    bar.show();
    status = { status: "unknown", message: "尚未检查配套更新。", checkedAt: "" };
    const initialJournal = context.globalState.get(UpdateTransaction_1.TRANSACTION_KEY);
    let blocked = Boolean(initialJournal && (initialJournal.installationRequested || initialJournal.completed?.length || ["installing", "reload_required"].includes(initialJournal.status)));
    let gateActive = false, disposed = false, lastPlan;
    let checking, installing;
    const notices = new Set();
    const gate = options.gate || new UpdateGate_1.UpdateGate();
    const store = options.store || new VerifiedPackage_1.PackageStore(path.join(context.globalStorageUri.fsPath, "updates", "verified"), releaseClient, vscode.version);
    async function acquireGate() {
        if ((0, ExtensionUpdates_1.compareSemanticVersions)(current(ExtensionUpdates_1.SFTP_EXTENSION_ID), "0.2.69") < 0)
            throw new Error("配套更新需要 SimpleSFTP 0.2.69 的传输等待协议；请先安装配套包并重载，不能中断旧版传输。");
        await gate.begin(context.globalStorageUri.fsPath);
        gateActive = true;
        blocked = true;
    }
    async function publish(value) {
        if (disposed)
            return;
        status = structuredClone(value);
        bar.text = `$(cloud-download) 配套更新：${({ unknown: "未检查", checking: "检查中", up_to_date: "已是最新", update_available: "可更新", installing: "更新中", reload_required: "需重载", error: "失败" })[value.status]}`;
        bar.tooltip = value.message;
        await context.globalState.update(STATUS_KEY, status);
        try {
            require.cache[require.resolve("../extension/Activation")]?.exports.getProvider()?.postState?.();
        }
        catch { /* Do not load business to report an update. */ }
    }
    const transaction = new UpdateTransaction_1.UpdateTransaction({
        readJournal: () => context.globalState.get(UpdateTransaction_1.TRANSACTION_KEY),
        saveJournal: async (value) => { await context.globalState.update(UpdateTransaction_1.TRANSACTION_KEY, value); },
        currentVersion: current,
        beginGate: async () => {
            await acquireGate();
            await publish({ ...status, status: "installing", message: "等待本地操作完成；现有传输继续，远端训练保持运行。" });
        },
        waitForTransfers: async (signal) => gate.wait(signal),
        endGate: async () => { await gate.end(); gateActive = false; blocked = false; },
        prepare: async (component) => { await publish({ ...status, status: "installing", message: `下载并验证 ${component.label} ${component.latestVersion}。` }); return store.prepare(component); },
        verify: async (file, component) => store.verify(file, component),
        install: async (file) => { await vscode.commands.executeCommand("workbench.extensions.installExtension", vscode.Uri.file(file)); },
        reload: async () => { await publish({ ...status, status: "reload_required", message: "配套更新已安装，需要重载窗口生效。" }); await vscode.commands.executeCommand("workbench.action.reloadWindow"); },
    });
    async function checkCore(manual) {
        if (installing)
            return status;
        await publish({ ...status, status: "checking", message: "正在检查 Windows 配套插件公开稳定 Release。" });
        try {
            const journal = context.globalState.get(UpdateTransaction_1.TRANSACTION_KEY);
            if (journal && ["failed", "installing", "reload_required"].includes(journal.status)) {
                validateUpdateComponents(journal.components);
                const frozen = (0, ExtensionUpdates_1.planPairedUpdates)((0, ExtensionUpdates_1.componentUpdateForInstalledVersion)(journal.components[1], current(ExtensionUpdates_1.EXPERIMENT_EXTENSION_ID)), (0, ExtensionUpdates_1.componentUpdateForInstalledVersion)(journal.components[0], current(ExtensionUpdates_1.SFTP_EXTENSION_ID)));
                if (frozen.status === "update_available") {
                    lastPlan = frozen;
                    if (journal.installationRequested || journal.completed.length || journal.status !== "failed")
                        await acquireGate();
                    await publish({ ...frozen, message: "上次配套更新未完成；点击安装补齐原批次，随后重载。" });
                    return status;
                }
                if (gateActive) {
                    await publish({ ...frozen, status: "reload_required", message: "更新组件已安装，请重载窗口后继续。" });
                    return status;
                }
                // A new Extension Host sees the installed disk versions after reload.
                await context.globalState.update(UpdateTransaction_1.TRANSACTION_KEY, undefined);
                blocked = false;
            }
            lastPlan = await releaseClient.check(current, manual);
            await publish(lastPlan);
            const key = `simpleExperiment.update.notified.${lastPlan.sftp?.latestVersion}:${lastPlan.experiment?.latestVersion}`;
            if (lastPlan.status === "update_available" && !notices.has(key) && !context.globalState.get(key, false)) {
                notices.add(key);
                await context.globalState.update(key, true);
                const choice = await vscode.window.showInformationMessage(lastPlan.message, "查看更新");
                if (choice === "查看更新")
                    void vscode.window.showInformationMessage(lastPlan.message + " 可通过命令面板“安装或补装配套更新并重载”操作。");
            }
            else if (manual)
                void vscode.window.showInformationMessage(lastPlan.message);
            return status;
        }
        catch (error) {
            if (error instanceof ReleaseClient_1.RateLimitedError) {
                // A proven quota window is a deferral, not a check failure. Publish the existing
                // unknown state with an explicit deferred message (never leave the API/panel/
                // globalState stuck on "checking", never relabel stale data as latest).
                const when = new Date(error.retryAt).toLocaleString();
                const deferred = `GitHub API 限流中；更新检查已延后，${when} 后自动重试；此前的检查结果不能视为最新。`;
                await publish({ ...status, status: "unknown", message: deferred });
                bar.text = "$(cloud) 配套更新：限流中";
                bar.tooltip = deferred;
                if (manual)
                    void vscode.window.showWarningMessage(deferred);
                return status;
            }
            await publish({ ...status, status: "error", message: `检查失败：${error.message}` });
            if (manual)
                void vscode.window.showErrorMessage(status.message);
            throw error;
        }
    }
    function check(manual = false) {
        if (checking)
            return checking;
        checking = checkCore(manual).finally(() => { checking = undefined; });
        return checking;
    }
    async function installCore() {
        if (!lastPlan)
            await check(true);
        const journal = context.globalState.get(UpdateTransaction_1.TRANSACTION_KEY);
        const components = journal && ["failed", "installing", "reload_required"].includes(journal.status) ? journal.components : [lastPlan.sftp, lastPlan.experiment];
        validateUpdateComponents(components);
        const plan = (0, ExtensionUpdates_1.planPairedUpdates)((0, ExtensionUpdates_1.componentUpdateForInstalledVersion)(components[1], current(ExtensionUpdates_1.EXPERIMENT_EXTENSION_ID)), (0, ExtensionUpdates_1.componentUpdateForInstalledVersion)(components[0], current(ExtensionUpdates_1.SFTP_EXTENSION_ID)));
        if (plan.status !== "update_available") {
            await publish(plan);
            return plan;
        }
        const detail = components.map(c => `${c.label} ${current(c.id)} → ${c.latestVersion}\n${c.vsix.url}\nSHA256 ${c.vsix.digest.slice(7)}`).join("\n\n");
        const answer = await vscode.window.showWarningMessage(`安装并重载窗口以应用配套插件更新？\n\n${detail}`, { modal: true }, "安装并重载", "取消");
        if (answer !== "安装并重载")
            return plan;
        const controller = new AbortController();
        try {
            if (vscode.window.withProgress)
                return await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "配套插件更新", cancellable: true }, async (_, cancellation) => {
                    const subscription = cancellation.onCancellationRequested(() => controller.abort(new Error("用户取消更新；已安装组件需重载核对。")));
                    try {
                        return await transaction.install(components, controller.signal);
                    }
                    finally {
                        subscription.dispose();
                    }
                });
            return await transaction.install(components, controller.signal);
        }
        catch (error) {
            await publish({ ...status, status: "error", message: error.message });
            const answer = await vscode.window.showErrorMessage(error.message, ...(blocked ? ["重载后补装"] : []));
            if (answer === "重载后补装")
                await vscode.commands.executeCommand("workbench.action.reloadWindow");
            throw error;
        }
    }
    function install() {
        if (installing)
            return installing;
        installing = installCore().finally(() => { installing = undefined; });
        return installing;
    }
    const timer = setInterval(() => { if (!blocked && !installing)
        void check(false).catch(() => undefined); }, 30 * 60 * 1000);
    timer.unref?.();
    context.subscriptions.push(bar, vscode.commands.registerCommand(exports.CHECK_COMMAND, () => check(true)), vscode.commands.registerCommand(exports.INSTALL_COMMAND, install), { dispose() { disposed = true; clearInterval(timer); } });
    return { check, install, dispose: () => gate.end(), get blocked() { return blocked; } };
}
async function activateWithBusiness(context, vscode, loadBusiness, client, options) {
    service = registerUpdater(context, vscode, client, options);
    void service.check(false).catch(() => undefined);
    try {
        business = loadBusiness();
        await business.activate(context);
    }
    catch (error) {
        void vscode.window.showErrorMessage(`业务面板启动失败，独立更新命令仍可用：${error.message}`);
    }
}
async function activate(context) { await activateWithBusiness(context, require("vscode"), () => require("../extension")); }
async function deactivate() { try {
    await business?.deactivate?.();
}
finally {
    await service?.dispose();
    service = undefined;
} }
