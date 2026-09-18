"use strict";
/**
 * GitBackupSetup - 自动备份的激活接入与命令层
 *
 * 把 features/GitBackup 的纯逻辑接到 vscode 上：
 * - 激活时按配置自动安装（条件：git 仓库 + 有 remote + 凭据可用）
 * - 提供 setup / remove / status 三个命令
 *
 * 自动安装刻意保守：任一前置条件不满足只提示、不写入，
 * 避免在别人仓库里留下注定失败的 hook。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMD_PUBLISH_GITHUB = exports.CMD_SYNC_GITHUB = exports.CMD_STATUS = exports.CMD_REMOVE = exports.CMD_SETUP = void 0;
exports.maybeAutoInstallGitBackup = maybeAutoInstallGitBackup;
exports.setupGitBackupCommand = setupGitBackupCommand;
exports.removeGitBackupCommand = removeGitBackupCommand;
exports.showGitBackupStatusCommand = showGitBackupStatusCommand;
exports.registerGitBackupCommands = registerGitBackupCommands;
exports.registerGitHubSyncCommands = registerGitHubSyncCommands;
const GitBackup_1 = require("../features/GitBackup");
const CONFIG_SECTION = "simpleExperiment";
const KEY_ENABLED = "gitBackup.enabled";
const KEY_REMOTE = "gitBackup.remote";
const KEY_VERIFY = "gitBackup.verifyRemoteAccess";
const HINT_STATE_KEY = "simpleExperiment.gitBackup.hintedRepos";
exports.CMD_SETUP = "simpleExperiment.setupGitBackup";
exports.CMD_REMOVE = "simpleExperiment.removeGitBackup";
exports.CMD_STATUS = "simpleExperiment.showGitBackupStatus";
exports.CMD_SYNC_GITHUB = "simpleExperiment.syncToGitHub";
exports.CMD_PUBLISH_GITHUB = "simpleExperiment.publishToGitHub";
function loadVscode() {
    try {
        return require("vscode");
    }
    catch {
        return undefined;
    }
}
function loadConfig(vscode) {
    const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return {
        enabled: cfg.get(KEY_ENABLED, true),
        remote: String(cfg.get(KEY_REMOTE, "origin") || "origin"),
        verifyRemoteAccess: cfg.get(KEY_VERIFY, true),
    };
}
function resolveWorkspaceRoot(vscode) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || !folders.length)
        return "";
    return folders[0].uri.fsPath;
}
function describeRemote(inspection) {
    return `${inspection.remoteName} → ${inspection.remoteUrl || "(未设置 URL)"}`;
}
async function showSetupGuide(vscode) {
    const content = [
        "# SimpleExperiment：启用 GitHub 自动备份",
        "",
        "插件检测到以下条件全部满足时，会自动安装 `post-commit` hook，实现提交即备份：",
        "",
        "## 1. 工作区是 Git 仓库",
        "",
        "## 2. 已配置远程仓库",
        "",
        "```bash",
        "git remote add origin https://github.com/<user>/<repo>.git",
        "```",
        "",
        "## 3. 推送凭据可用",
        "",
        "hook 中设置了 `GIT_TERMINAL_PROMPT=0`（无法交互输入凭据），因此必须让 `git push` 静默成功：",
        "",
        "- **HTTPS**：配置 PAT 并启用凭据缓存",
        "  ```bash",
        "  git config --global credential.helper manager",
        "  ```",
        "- **SSH**：确认 `ssh -T git@github.com` 可通",
        "",
        "## 4. 触发配置",
        "",
        "条件满足后，重新加载窗口即会自动安装；也可手动执行命令：",
        "",
        "> **SimpleExperiment: 配置提交自动备份**",
        "",
        "安装后 hook 内容带标记段 `>>> simple-experiment git-backup >>>`，",
        "仓库原有的 `post-commit` 逻辑会被完整保留。",
    ].join("\n");
    try {
        const doc = await vscode.workspace.openTextDocument({ content, language: "markdown" });
        await vscode.window.showTextDocument(doc);
    }
    catch {
        void vscode.window.showInformationMessage("启用自动备份需要：1) 工作区是 Git 仓库 2) 已配置 remote 3) git push 凭据可用。");
    }
}
async function confirmRemoteAccess(vscode, inspection, interactive) {
    const run = () => Promise.resolve((0, GitBackup_1.checkRemoteAccess)(inspection.repoRoot, inspection.remoteName));
    const access = vscode.window.withProgress
        ? await vscode.window.withProgress({
            location: vscode.ProgressLocation?.Notification ?? 15,
            title: `正在校验远程可达性（${inspection.remoteName}）…`,
        }, run)
        : await run();
    if (access.ok)
        return true;
    const detail = (access.stderr || "").split(/\r?\n/).slice(0, 2).join(" ").trim();
    if (!interactive) {
        void vscode.window.showWarningMessage(`SimpleExperiment：无法访问远程 ${inspection.remoteName}，暂未启用自动备份。请先配置 Git 凭据（PAT 或 SSH key）。`);
        return false;
    }
    const pick = await vscode.window.showWarningMessage(`无法访问远程 ${inspection.remoteName}：${detail || "认证失败或网络不可达"}。仍要安装 hook 吗？`, "仍然安装", "取消");
    return pick === "仍然安装";
}
async function applyBackup(vscode, inspection, interactive) {
    const config = loadConfig(vscode);
    if (config.verifyRemoteAccess) {
        const granted = await confirmRemoteAccess(vscode, inspection, interactive);
        if (!granted)
            return;
    }
    const result = (0, GitBackup_1.installBackupHook)(inspection.repoRoot, inspection.remoteName);
    if (!result.changed) {
        if (interactive)
            void vscode.window.showInformationMessage(`SimpleExperiment：${result.reason}`);
        return;
    }
    const note = inspection.hookHasForeignContent ? "（已保留仓库原有 post-commit 逻辑）" : "";
    if (interactive) {
        void vscode.window.showInformationMessage(`SimpleExperiment：自动备份已启用${note}\n提交后将推送到 ${describeRemote(inspection)}`);
    }
    else {
        vscode.window.setStatusBarMessage(`SimpleExperiment：已启用提交自动备份（${inspection.remoteName}）`, 6000);
    }
}
/** 每个仓库只提示一次，避免每次启动都弹窗。 */
async function hintOnce(context, key, run) {
    const state = context.globalState;
    if (!state) {
        await run();
        return;
    }
    const seen = state.get(HINT_STATE_KEY, []);
    if (seen.includes(key))
        return;
    await state.update(HINT_STATE_KEY, [...seen, key].slice(-50));
    await run();
}
/** 激活时调用：条件全部满足才静默安装，否则最多提示一次。 */
async function maybeAutoInstallGitBackup(context) {
    const vscode = loadVscode();
    if (!vscode)
        return;
    const config = loadConfig(vscode);
    if (!config.enabled)
        return;
    const root = resolveWorkspaceRoot(vscode);
    if (!root)
        return;
    const inspection = (0, GitBackup_1.inspectGitBackup)(root, config.remote);
    if (!inspection.isGitRepo)
        return;
    if (inspection.hookInstalled)
        return;
    if (!inspection.hasRemote) {
        await hintOnce(context, inspection.repoRoot, async () => {
            const pick = await vscode.window.showWarningMessage("SimpleExperiment：当前仓库未配置 git remote，无法启用提交自动备份。", "查看配置说明", "不再提示");
            if (pick === "查看配置说明")
                await showSetupGuide(vscode);
        });
        return;
    }
    await applyBackup(vscode, inspection, false);
}
async function setupGitBackupCommand() {
    const vscode = loadVscode();
    if (!vscode)
        return;
    const root = resolveWorkspaceRoot(vscode);
    if (!root) {
        void vscode.window.showWarningMessage("SimpleExperiment：请先打开一个工作区文件夹。");
        return;
    }
    const config = loadConfig(vscode);
    const inspection = (0, GitBackup_1.inspectGitBackup)(root, config.remote);
    if (!inspection.isGitRepo) {
        void vscode.window.showWarningMessage("SimpleExperiment：当前工作区不是 Git 仓库，无法配置自动备份。");
        return;
    }
    if (!inspection.hasRemote) {
        await showSetupGuide(vscode);
        return;
    }
    if (inspection.hookInstalled) {
        const pick = await vscode.window.showInformationMessage(`自动备份已启用（${describeRemote(inspection)}）。`, "重新安装", "移除", "取消");
        if (pick === "移除") {
            await removeGitBackupCommand();
            return;
        }
        if (pick !== "重新安装")
            return;
    }
    await applyBackup(vscode, inspection, true);
}
async function removeGitBackupCommand() {
    const vscode = loadVscode();
    if (!vscode)
        return;
    const root = resolveWorkspaceRoot(vscode);
    if (!root)
        return;
    const config = loadConfig(vscode);
    const inspection = (0, GitBackup_1.inspectGitBackup)(root, config.remote);
    if (!inspection.isGitRepo) {
        void vscode.window.showWarningMessage("SimpleExperiment：当前工作区不是 Git 仓库。");
        return;
    }
    const result = (0, GitBackup_1.uninstallBackupHook)(inspection.repoRoot);
    void vscode.window.showInformationMessage(`SimpleExperiment：${result.reason}`);
}
async function showGitBackupStatusCommand() {
    const vscode = loadVscode();
    if (!vscode)
        return;
    const root = resolveWorkspaceRoot(vscode);
    if (!root) {
        void vscode.window.showWarningMessage("SimpleExperiment：请先打开一个工作区文件夹。");
        return;
    }
    const config = loadConfig(vscode);
    const inspection = (0, GitBackup_1.inspectGitBackup)(root, config.remote);
    if (!inspection.isGitRepo) {
        void vscode.window.showInformationMessage("SimpleExperiment：当前工作区不是 Git 仓库，自动备份不适用。");
        return;
    }
    const lines = [
        `仓库：${inspection.repoRoot}`,
        `远程：${inspection.hasRemote ? describeRemote(inspection) : "未配置"}`,
        `自动备份：${inspection.hookInstalled ? "已启用" : "未启用"}`,
        `hook：${inspection.hookPath}`,
        inspection.hookHasForeignContent ? "该仓库已有其他 post-commit 逻辑（插件为追加模式）" : "",
    ].filter(Boolean);
    const pick = await vscode.window.showInformationMessage(lines.join("\n"), "配置", "移除", "关闭");
    if (pick === "配置")
        await setupGitBackupCommand();
    if (pick === "移除")
        await removeGitBackupCommand();
}
/** 注册三个命令；返回已注册的命令 ID 列表。 */
function registerGitBackupCommands(context) {
    const vscode = loadVscode();
    if (!vscode)
        return [];
    const bind = (id, handler) => {
        context.subscriptions.push(vscode.commands.registerCommand(id, () => void handler()));
    };
    bind(exports.CMD_SETUP, setupGitBackupCommand);
    bind(exports.CMD_REMOVE, removeGitBackupCommand);
    bind(exports.CMD_STATUS, showGitBackupStatusCommand);
    return [exports.CMD_SETUP, exports.CMD_REMOVE, exports.CMD_STATUS];
}
/**
 * 把 provider 上既有的面板式 GitHub 同步方法补上命令面板入口。
 *
 * 这些方法原本只能通过面板按钮触发（webview 消息 syncGithub / publishGithub），
 * 在命令面板里不可见。此处仅做转发，不改变原有实现。
 */
function registerGitHubSyncCommands(context, provider) {
    const vscode = loadVscode();
    if (!vscode || !provider)
        return [];
    const registered = [];
    const bind = (id, method) => {
        const fn = provider[method];
        if (typeof fn !== "function")
            return;
        context.subscriptions.push(vscode.commands.registerCommand(id, () => void fn.apply(provider, [])));
        registered.push(id);
    };
    bind(exports.CMD_SYNC_GITHUB, "syncToGitHub");
    bind(exports.CMD_PUBLISH_GITHUB, "publishToGitHub");
    return registered;
}
