"use strict";
/**
 * GitBackup - 为工作区 git 仓库自动配置「提交即推送」备份
 *
 * 纯逻辑模块（不依赖 vscode），供 Activation 与命令层调用。
 *
 * 设计要点：
 * - 只在仓库已配置 remote 时安装，避免写入注定失败的 hook
 * - 追加模式：保留仓库原有 post-commit 逻辑，用标记段包裹，可反复安装/卸载
 * - 幂等：重复安装替换标记段而非叠加
 * - hook 强制 LF 行尾 + 可执行位（Linux/macOS 下 git 要求）
 */
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
exports.DEFAULT_REMOTE = exports.HOOK_BLOCK_END = exports.HOOK_BLOCK_BEGIN = void 0;
exports.runGit = runGit;
exports.findRepoRoot = findRepoRoot;
exports.resolveHookPath = resolveHookPath;
exports.readHookFile = readHookFile;
exports.stripHookBlock = stripHookBlock;
exports.listRemotes = listRemotes;
exports.pickRemote = pickRemote;
exports.getRemoteUrl = getRemoteUrl;
exports.inspectGitBackup = inspectGitBackup;
exports.buildHookBlock = buildHookBlock;
exports.installBackupHook = installBackupHook;
exports.uninstallBackupHook = uninstallBackupHook;
exports.checkRemoteAccess = checkRemoteAccess;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.HOOK_BLOCK_BEGIN = "# >>> simple-experiment git-backup >>>";
exports.HOOK_BLOCK_END = "# <<< simple-experiment git-backup <<<";
exports.DEFAULT_REMOTE = "origin";
const REMOTE_NAME_PATTERN = /^[A-Za-z0-9._/-]+$/;
function toText(value) {
    if (value === undefined)
        return "";
    return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}
function runGit(args, cwd, timeoutMs = 15000) {
    try {
        const stdout = (0, child_process_1.execFileSync)("git", args, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: timeoutMs,
            windowsHide: true,
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        });
        return { ok: true, stdout: toText(stdout), stderr: "" };
    }
    catch (error) {
        const err = error;
        const stderr = toText(err.stderr).trim();
        return { ok: false, stdout: toText(err.stdout), stderr: stderr || String(err.message || error) };
    }
}
function findRepoRoot(cwd) {
    const result = runGit(["rev-parse", "--show-toplevel"], cwd);
    if (!result.ok)
        return "";
    return result.stdout.trim();
}
function resolveHookPath(repoRoot) {
    const result = runGit(["rev-parse", "--git-path", "hooks/post-commit"], repoRoot);
    const raw = result.ok ? result.stdout.trim() : "";
    if (raw)
        return path.isAbsolute(raw) ? raw : path.join(repoRoot, raw);
    return path.join(repoRoot, ".git", "hooks", "post-commit");
}
function readHookFile(hookPath) {
    try {
        return fs.readFileSync(hookPath, "utf8");
    }
    catch {
        return "";
    }
}
/** 移除插件写入的标记段，保留仓库原有 hook 逻辑。 */
function stripHookBlock(content) {
    const begin = content.indexOf(exports.HOOK_BLOCK_BEGIN);
    if (begin < 0)
        return content;
    const end = content.indexOf(exports.HOOK_BLOCK_END, begin);
    const before = content.slice(0, begin);
    const after = end < 0 ? "" : content.slice(end + exports.HOOK_BLOCK_END.length);
    return (before + after).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function listRemotes(repoRoot) {
    const result = runGit(["remote"], repoRoot);
    if (!result.ok)
        return [];
    return result.stdout
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function pickRemote(repoRoot, preferred) {
    const remotes = listRemotes(repoRoot);
    if (!remotes.length)
        return "";
    const wanted = (preferred || "").trim();
    if (wanted && remotes.includes(wanted))
        return wanted;
    if (remotes.includes(exports.DEFAULT_REMOTE))
        return exports.DEFAULT_REMOTE;
    return remotes[0];
}
function getRemoteUrl(repoRoot, remoteName) {
    if (!remoteName)
        return "";
    const result = runGit(["remote", "get-url", remoteName], repoRoot);
    return result.ok ? result.stdout.trim() : "";
}
function inspectGitBackup(cwd, preferredRemote) {
    const empty = {
        isGitRepo: false,
        repoRoot: "",
        hookPath: "",
        hookExists: false,
        hookInstalled: false,
        hookHasForeignContent: false,
        hasRemote: false,
        remoteName: "",
        remoteUrl: "",
        remotes: [],
    };
    const repoRoot = findRepoRoot(cwd);
    if (!repoRoot)
        return empty;
    const hookPath = resolveHookPath(repoRoot);
    const hookContent = readHookFile(hookPath);
    const hookExists = fs.existsSync(hookPath);
    const stripped = stripHookBlock(hookContent).trim();
    const hookHasForeignContent = stripped.length > 0 && stripped !== "#!/bin/sh";
    const remotes = listRemotes(repoRoot);
    const remoteName = pickRemote(repoRoot, preferredRemote);
    return {
        isGitRepo: true,
        repoRoot,
        hookPath,
        hookExists,
        hookInstalled: hookContent.includes(exports.HOOK_BLOCK_BEGIN),
        hookHasForeignContent,
        hasRemote: remotes.length > 0,
        remoteName,
        remoteUrl: getRemoteUrl(repoRoot, remoteName),
        remotes,
    };
}
/** 生成插件写入的 hook 片段（shell，LF）。 */
function buildHookBlock(remoteName) {
    const remote = REMOTE_NAME_PATTERN.test(remoteName) ? remoteName : exports.DEFAULT_REMOTE;
    return [
        exports.HOOK_BLOCK_BEGIN,
        "# 由 SimpleExperiment 插件写入：提交后自动推送当前分支到远程",
        "__se_branch=$(git symbolic-ref --short HEAD 2>/dev/null) || __se_branch=\"\"",
        'if [ -n "$__se_branch" ]; then',
        `  if ! GIT_TERMINAL_PROMPT=0 git push --quiet ${remote} "$__se_branch"; then`,
        `    printf "\\n[SimpleExperiment] 备份失败：分支 %s 未推送到 ${remote}。请手动执行：git push ${remote} %s\\n\\n" "$__se_branch" "$__se_branch"`,
        "  fi",
        "fi",
        exports.HOOK_BLOCK_END,
    ].join("\n");
}
/** 安装或更新备份 hook。已有标记段则替换，否则追加，绝不丢弃仓库原有逻辑。 */
function installBackupHook(repoRoot, remoteName) {
    const hookPath = resolveHookPath(repoRoot);
    const existing = readHookFile(hookPath);
    const hadBlock = existing.includes(exports.HOOK_BLOCK_BEGIN);
    let base = stripHookBlock(existing);
    if (base && !base.startsWith("#!")) {
        base = `#!/bin/sh\n${base}`;
    }
    const block = buildHookBlock(remoteName);
    const next = `${base ? `${base}\n\n` : "#!/bin/sh\n\n"}${block}\n`;
    if (next === existing) {
        return { changed: false, reason: "已是最新，无需变更", hookPath };
    }
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.writeFileSync(hookPath, next.replace(/\r\n/g, "\n"), { encoding: "utf8", mode: 0o755 });
    try {
        fs.chmodSync(hookPath, 0o755);
    }
    catch {
        /* Windows 上可执行位无意义，忽略 */
    }
    let reason = "已创建";
    if (hadBlock)
        reason = "已更新标记段";
    else if (base)
        reason = "已追加（原有逻辑保留）";
    return { changed: true, reason, hookPath };
}
/** 移除插件写入的标记段；若文件因此为空则删除文件。 */
function uninstallBackupHook(repoRoot) {
    const hookPath = resolveHookPath(repoRoot);
    const existing = readHookFile(hookPath);
    if (!existing.includes(exports.HOOK_BLOCK_BEGIN)) {
        return { changed: false, reason: "未检测到插件 hook", hookPath };
    }
    const stripped = stripHookBlock(existing);
    if (!stripped || stripped === "#!/bin/sh") {
        try {
            fs.unlinkSync(hookPath);
        }
        catch {
            /* ignore */
        }
        return { changed: true, reason: "已移除（原文件为空，已删除）", hookPath };
    }
    fs.writeFileSync(hookPath, `${stripped}\n`, { encoding: "utf8", mode: 0o755 });
    try {
        fs.chmodSync(hookPath, 0o755);
    }
    catch {
        /* ignore */
    }
    return { changed: true, reason: "已移除标记段（原有逻辑保留）", hookPath };
}
/** 探测远程可达性与凭据是否可用。 */
function checkRemoteAccess(repoRoot, remoteName, timeoutMs = 10000) {
    if (!remoteName)
        return { ok: false, stdout: "", stderr: "未配置 remote" };
    return runGit(["ls-remote", "--exit-code", remoteName, "HEAD"], repoRoot, timeoutMs);
}
