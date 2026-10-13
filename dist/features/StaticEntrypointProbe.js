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
exports.staticEntrypointProbe = staticEntrypointProbe;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const cache = new Map();
const pending = new Map();
/** Static Windows entry probe. No imports, interpreter launch or environment management. */
async function staticEntrypointProbe(root, template) {
    const command = String(template || "").trim();
    if (!command)
        return { ok: false, error: "指令为空" };
    const match = command.match(/(?:^|\s)python(?:\d+(?:\.\d+)?)?\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
    const script = match?.[1] || match?.[2] || match?.[3] || "";
    if (!script || script.startsWith("-"))
        return { ok: true };
    const canonical = await fs.realpath(root), file = path.resolve(canonical, script);
    const relative = path.relative(canonical, file);
    if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
        return { ok: false, error: "入口文件不在当前项目内" };
    const key = JSON.stringify([canonical, file, command]);
    if (pending.has(key))
        return { ...await pending.get(key) };
    const work = (async () => {
        let before;
        try {
            before = await fs.stat(file, { bigint: true });
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
            return { ok: false, error: `入口文件不存在: ${script}`, tail: `${script} not found` };
        }
        if (!before.isFile())
            return { ok: false, error: `入口不是文件: ${script}` };
        const identity = [await fs.realpath(file), before.dev, before.ino, before.size, before.mtimeNs, before.ctimeNs].join(":");
        const saved = cache.get(key);
        if (saved?.identity === identity)
            return { ...saved.report, reused: true };
        const content = await fs.readFile(file, "utf8"), after = await fs.stat(file, { bigint: true });
        if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
            || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs)
            throw new Error("入口文件在检查期间变化，请重试");
        let report = { ok: true };
        if (/argparse/.test(content)) {
            if (/--config/.test(content) && !command.includes("{config}"))
                report = { ok: false, error: `参数不匹配: ${script} 需要 --config 但模板缺少 {config}`, tail: content.slice(-800) };
            else if (/output_dir|output-dir/.test(content) && !command.includes("{output_dir}"))
                report = { ok: false, error: `参数不匹配: ${script} 需要 --output_dir 但模板缺少 {output_dir}`, tail: content.slice(-800) };
        }
        // The entry bytes and file identity belong to this snapshot; execution still verifies its code proof.
        const sha256 = (0, node_crypto_1.createHash)("sha256").update(content).digest("hex");
        cache.delete(key);
        cache.set(key, { identity, sha256, report });
        while (cache.size > 128)
            cache.delete(cache.keys().next().value);
        return { ...report, reused: false };
    })();
    pending.set(key, work);
    try {
        return { ...await work };
    }
    finally {
        if (pending.get(key) === work)
            pending.delete(key);
    }
}
