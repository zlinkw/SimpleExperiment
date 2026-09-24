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
exports.directPlanSyncPreview = directPlanSyncPreview;
exports.transferPlanArtifacts = transferPlanArtifacts;
const path = __importStar(require("path"));
const PlanArtifactSync_1 = require("./PlanArtifactSync");
function checkedRoot(target) {
    const root = String(target.remotePath || "").replace(/\/+$/, "");
    if (!root.startsWith("/") || root === "/" || !target.host || !target.user || !Number.isInteger(target.port))
        throw new Error(`Worker ${target.id} 缺少安全的项目路径或连接信息。`);
    return root;
}
function directPlanSyncPreview(entry, source, destination) {
    const sourceRoot = checkedRoot(source);
    const destinationRoot = checkedRoot(destination);
    const copies = entry.artifactPaths.map((raw) => {
        const relative = (0, PlanArtifactSync_1.safePlanArtifactPath)(raw);
        if (!relative)
            throw new Error(`Plan 产物路径不安全：${raw}`);
        return `${path.posix.join(sourceRoot, relative)} → ${path.posix.join(destinationRoot, relative)}`;
    });
    const deletes = (entry.stalePaths || []).map((item) => {
        const relative = (0, PlanArtifactSync_1.safePlanArtifactPath)(item.path);
        if (!relative)
            throw new Error(`旧产物路径不安全：${item.path}`);
        return `清理旧产物：${path.posix.join(destinationRoot, relative)}`;
    });
    return [...deletes, ...copies];
}
async function transferPlanArtifacts(entry, source, destination, sftpCall) {
    checkedRoot(source);
    checkedRoot(destination);
    if (!entry.artifactPaths.length)
        throw new Error("Plan 没有可确认的产物路径，无法同步权重和结果。");
    let paths = 0;
    for (const stale of entry.stalePaths || []) {
        const relativePath = (0, PlanArtifactSync_1.safePlanArtifactPath)(stale.path);
        if (!relativePath || (stale.directory && relativePath.split("/").length < 2))
            throw new Error(`旧产物路径不安全：${stale.path}`);
        await sftpCall("sync.serverToServer", {
            source,
            destination: { ...destination, host: destination.networkHost || destination.host },
            relativePath,
            directory: stale.directory,
            deleteOnly: true,
            confirm: true,
            pathConfirmed: true,
        });
        paths++;
    }
    for (const raw of entry.artifactPaths) {
        const relativePath = (0, PlanArtifactSync_1.safePlanArtifactPath)(raw);
        if (!relativePath)
            throw new Error(`Plan 产物路径不安全：${raw}`);
        if (entry.directoryPaths.includes(relativePath) && relativePath.split("/").length < 2)
            throw new Error(`产物目录必须限定到 Plan 独立子目录：${relativePath}`);
        if (path.posix.dirname(relativePath) === "." && !entry.directoryPaths.includes(relativePath))
            throw new Error(`拒绝对项目根目录执行产物同步：${relativePath}`);
        await sftpCall("sync.serverToServer", {
            source,
            destination: { ...destination, host: destination.networkHost || destination.host },
            relativePath,
            directory: entry.directoryPaths.includes(relativePath),
            confirm: true,
            pathConfirmed: true,
        });
        paths++;
    }
    return { paths };
}
