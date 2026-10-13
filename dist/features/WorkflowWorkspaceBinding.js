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
exports.probeWorkspace = probeWorkspace;
exports.assertPlanSeedContract = assertPlanSeedContract;
exports.bindWorkflowWorkspace = bindWorkflowWorkspace;
exports.assertWorkflowWorkspace = assertWorkflowWorkspace;
exports.assertWorkflowContext = assertWorkflowContext;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function absolute(value) {
    if (typeof value !== "string" || !value || /[\x00-\x1f\x7f]/.test(value) || !path.isAbsolute(value))
        throw new Error("workflow 工作区必须是已打开的绝对目录。");
    return value;
}
const key = (value) => process.platform === "win32" ? value.replace(/\\/g, "/").toLowerCase() : value;
function probeWorkspace(root) {
    const canonical = fs.realpathSync.native(root), stat = fs.statSync(canonical, { bigint: true });
    if (!stat.isDirectory())
        throw new Error("workflow 工作区必须是现有目录。");
    return { canonical: key(canonical), device: stat.dev.toString(), inode: stat.ino.toString() };
}
function same(a, b) { return key(a.canonical) === key(b.canonical) && a.device === b.device && a.inode === b.inode; }
function assertPlanSeedContract(params) {
    if (params.seed !== undefined)
        throw new Error("workflow 不支持 seed 覆盖；请在保存的 PLAN 中配置 seeds，移除 --seed 后重新预检。");
}
function bindWorkflowWorkspace(requested, current, probe = probeWorkspace) {
    const root = absolute(current), target = requested === undefined ? root : absolute(requested), identity = probe(root);
    if (!same(identity, probe(target)))
        throw new Error("workflow workspace 必须是当前打开的项目；未执行准备或提交。");
    return { root, identity };
}
function assertWorkflowWorkspace(binding, current, probe = probeWorkspace) {
    if (!same(binding.identity, probe(absolute(current))) || !same(binding.identity, probe(binding.root)))
        throw new Error("workflow 工作区或目录身份已变化，未继续准备或提交。");
}
/** Cheap async-boundary guard; the native directory check remains at entry and before writes. */
function assertWorkflowContext(binding, current, currentGeneration, expectedGeneration) {
    if (currentGeneration !== expectedGeneration || key(absolute(current)) !== key(binding.root))
        throw new Error("workflow 工作区已变化，未继续准备或提交。");
}
