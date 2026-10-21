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
exports.SETUP_GUIDE_ONLINE_FALLBACK_URL = exports.SETUP_GUIDE_FILE_NAME = void 0;
exports.setupGuideOnlineUrl = setupGuideOnlineUrl;
exports.extensionRepositoryUrl = extensionRepositoryUrl;
exports.resolveSetupGuideSource = resolveSetupGuideSource;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 配置指南来源解析（0.5.400 发行包文档排除配套）。
 * 发行包不再随包 docs/；指南入口：本地安装存在文档时保持原预览/文本打开行为，
 * 否则回退到仓库在线文档链接（vscode.env.openExternal），不得内嵌整份指南规避排除。
 */
exports.SETUP_GUIDE_FILE_NAME = "simple-experiment-setup.md";
exports.SETUP_GUIDE_ONLINE_FALLBACK_URL = "https://github.com/zlinkw/SimpleExperiment/blob/master/docs/simple-experiment-setup.md";
function setupGuideOnlineUrl(repositoryUrl) {
    const match = /^(?:https:\/\/github\.com[/:]|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(String(repositoryUrl || "").trim());
    if (!match)
        return exports.SETUP_GUIDE_ONLINE_FALLBACK_URL;
    return `https://github.com/${match[1]}/blob/master/docs/${exports.SETUP_GUIDE_FILE_NAME}`;
}
/** 从 context.extension.packageJSON 提取 repository URL（string 或 {url} 两种写法均兼容）。 */
function extensionRepositoryUrl(extensionPackageJson) {
    const repository = extensionPackageJson?.repository;
    if (typeof repository === "string")
        return repository;
    if (repository && typeof repository === "object" && typeof repository.url === "string") {
        return repository.url;
    }
    return undefined;
}
function resolveSetupGuideSource(extensionPath, repositoryUrl, existsSync = fs.existsSync) {
    const local = path.join(extensionPath, "docs", exports.SETUP_GUIDE_FILE_NAME);
    if (existsSync(local))
        return { kind: "file", path: local };
    return { kind: "online", url: setupGuideOnlineUrl(repositoryUrl) };
}
