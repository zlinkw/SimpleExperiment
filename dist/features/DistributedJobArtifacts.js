"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDistributedJobArtifacts = collectDistributedJobArtifacts;
const path_1 = __importDefault(require("path"));
function collectDistributedJobArtifacts(outputDir, inventory) {
    const prefix = `${outputDir}/`;
    const artifacts = {};
    for (const [file, entry] of Object.entries(inventory)) {
        if (!file.startsWith(prefix) || /(?:\.lock|\.pid|\.exit_code)$/i.test(path_1.default.posix.basename(file)))
            continue;
        const hash = String(entry?.sha256 || "").toLowerCase();
        if (/^[a-f0-9]{64}$/.test(hash))
            artifacts[file] = hash;
    }
    if (!Object.keys(artifacts).some((file) => /\.log$/i.test(file)))
        throw new Error(`job 产物目录缺少独立运行日志：${outputDir}`);
    return artifacts;
}
