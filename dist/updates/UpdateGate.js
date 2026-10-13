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
exports.UpdateGate = exports.UPDATE_ACTION = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const node_os_1 = require("node:os");
const HostOperationLease_1 = require("../core/HostOperationLease");
exports.UPDATE_ACTION = "paired-plugin-update";
class UpdateGate {
    leasePath;
    ownerAlive;
    held;
    constructor(leasePath = (0, HostOperationLease_1.defaultHostOperationLeasePath)(), ownerAlive = pid => {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch (error) {
            return error.code !== "ESRCH";
        }
    }) {
        this.leasePath = leasePath;
        this.ownerAlive = ownerAlive;
    }
    async begin(storagePath) {
        if (this.held) {
            await this.held.assertHeld();
            return;
        }
        const manager = new HostOperationLease_1.LegacyHostOperationLeaseManager({ leasePath: this.leasePath, windowId: `${(0, node_os_1.hostname)()}:${process.pid}:${exports.UPDATE_ACTION}:${(0, node_crypto_1.randomUUID)()}` });
        this.held = await manager.acquire({ pluginId: "simple-local.simple-experiment", workspaceUri: "untitled://paired-plugin-update", hostProjectPath: storagePath,
            actionType: exports.UPDATE_ACTION, actionLabel: "Windows 配套更新" });
    }
    async end() { const lease = this.held; this.held = undefined; await lease?.release(); }
    async wait(signal) {
        const directory = this.leasePath + ".resources-v2", started = Date.now();
        for (;;) {
            signal?.throwIfAborted();
            await this.held?.assertHeld();
            const names = await fs.readdir(directory).catch(error => error.code === "ENOENT" ? [] : Promise.reject(error));
            let active = false;
            for (const name of names.filter(n => /^[0-9a-f]{64}\.json$/.test(n))) {
                const file = path.join(directory, name), stat = await fs.lstat(file);
                if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024)
                    throw new Error("本地传输租约身份无效，已阻止安装。");
                const row = JSON.parse(await fs.readFile(file, "utf8"));
                if (row.schemaVersion !== 2 || !Array.isArray(row.leases) || !Number.isInteger(row.processId) || row.processId <= 0)
                    throw new Error("本地传输租约损坏，已阻止安装。");
                // Expired heartbeat of a live/unknown owner is not an exit proof.
                if ((row.leases.length || row.choosing || row.ticket) && this.ownerAlive(row.processId))
                    active = true;
            }
            if (!active)
                return;
            if (Date.now() - started >= 300000)
                throw new Error("本地操作尚未结束；停止更新等待，现有传输继续运行。请稍后重试。");
            await new Promise((resolve, reject) => {
                const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(signal?.reason); };
                const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 250);
                signal?.addEventListener("abort", abort, { once: true });
            });
        }
    }
}
exports.UpdateGate = UpdateGate;
