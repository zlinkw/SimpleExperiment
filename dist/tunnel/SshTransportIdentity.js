"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSshTransportIdentity = resolveSshTransportIdentity;
exports.buildSftpServerOptions = buildSftpServerOptions;
exports.inspectOpenSshAlias = inspectOpenSshAlias;
const child_process_1 = require("child_process");
function resolveSshTransportIdentity(target, _options = {}) {
    const configuredHost = firstConfiguredHost([
        target.transferHost,
        target.sftpHost,
        target.sshHost,
        target.host,
        target.workerHost,
        target.hubHost,
    ]);
    if (!configuredHost) {
        throw new Error(`${text(target.label) || text(target.displayName) || text(target.id) || "SSH 目标"} 缺少插件设置中的服务器地址或 SFTP 传输地址。`);
    }
    return {
        transportHost: configuredHost,
        sshConfigHost: "",
        sshConfigAlias: "",
        networkHost: configuredHost,
        source: "network_host",
    };
}
function buildSftpServerOptions(target, identity) {
    return {
        id: target.id,
        label: target.label,
        host: identity.transportHost,
        sftpHost: identity.transportHost,
        sshHost: identity.transportHost,
        transferHost: identity.transportHost,
        resolvedHost: identity.transportHost,
        user: target.user,
        username: target.username ?? target.user,
        port: target.port,
        sshPort: target.port,
        remotePath: target.remotePath,
        sshConfigHost: identity.sshConfigHost,
        sshConfigAlias: identity.sshConfigAlias,
        networkHost: identity.networkHost,
        savedSessionPath: target.savedSessionPath,
        source: "simple-experiment",
    };
}
async function inspectOpenSshAlias(alias, options = {}) {
    const name = String(alias || "").trim();
    const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 5000);
    try {
        const { stdout } = await new Promise((resolve, reject) => {
            const child = (0, child_process_1.execFile)(options.command || "ssh", ["-G", "--", name], { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
            });
            child.on("error", reject);
        });
        const values = new Map();
        for (const line of stdout.split(/\r?\n/)) {
            const match = /^(\S+)\s+(.+)$/.exec(line.trim());
            if (match)
                values.set(match[1].toLowerCase(), match[2].trim());
        }
        const hostname = values.get("hostname") || "";
        if (!hostname)
            throw new Error("ssh -G 未返回 hostname");
        return {
            ok: true,
            alias: name,
            hostname,
            user: values.get("user") || "",
            port: values.get("port") || "22",
            message: `SSH 别名可解析：alias=${name}，networkHost=${hostname}`,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            alias: name,
            hostname: "",
            user: "",
            port: "",
            message: `SSH 别名不可解析：alias=${name}。${message}`,
        };
    }
}
function firstConfiguredHost(values) {
    for (const value of values) {
        const candidate = text(value);
        if (candidate && candidate !== "-" && candidate !== "—" && !/[\s\\/@]/.test(candidate))
            return candidate;
    }
    return "";
}
function text(value) {
    return String(value ?? "").trim();
}
