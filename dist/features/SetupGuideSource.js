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
exports.experimentIntegrationGuideUrl = experimentIntegrationGuideUrl;
exports.experimentIntegrationAiTask = experimentIntegrationAiTask;
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
function setupGuideOnlineUrl(repositoryUrl, version) {
    const match = /^(?:https:\/\/github\.com[/:]|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(String(repositoryUrl || "").trim());
    const ref = /^\d+\.\d+\.\d+$/.test(String(version || "")) ? "v" + version : "master";
    return `https://github.com/${match?.[1] || "zlinkw/SimpleExperiment"}/blob/${ref}/docs/${exports.SETUP_GUIDE_FILE_NAME}`;
}
/** Short handoff task only; complete guides remain in the source repository. No network or project reads. */
function experimentIntegrationGuideUrl(repositoryUrl, version) {
    return setupGuideOnlineUrl(repositoryUrl, version).replace(exports.SETUP_GUIDE_FILE_NAME, "experiment-integration.md");
}
function experimentIntegrationAiTask(repositoryUrl, version) {
    const guide = experimentIntegrationGuideUrl(repositoryUrl, version);
    const practice = guide.replace("experiment-integration.md", "multimodal-integration-best-practice.md");
    return [
        "请把当前工作区项目接入 SimpleExperiment / SimpleSFTP。先核实当前项目规范根目录、AGENTS.md、已有训练/评估入口、配置及产物，不把示例命令当作真实接口。",
        ...(version ? ["当前插件版本：" + version + "。按对应版本指南接入；仍以现场 capabilities/OpenAPI 为准。"] : []),
        `完整接入指南（先完整阅读）：${guide}`,
        `MultiModal 已核对源码的最佳实践：${practice}`,
        "若无法读取链接，请明确请求指南正文，不凭记忆补造字段。按指南区分必需契约、可选增强和项目专用规则。先给出入口/参数/配置/seed/输出/指标映射，再在现有模块内做最小修改。",
        "优先复用真实命令；需要时仅加轻量适配入口、独立 job 结果 CSV、普通文本进度和 TensorBoard 标量。保留真实退出码，缺失/未定义指标不填 0，不把训练进度当作任务完成。",
        "参考 MultiModal 的终端进度、干净日志、逐 job 输出和曲线隔离；不要复制它的数据路径、分类指标、质量协议、服务器或项目专用 wrapper 依赖。不要伪造插件 manifest/commandId，不新增 attempt 目录。",
        "仅配置明确启用的单台或多台 Worker。所有科研运行与服务器传输使用实时插件 API，先读取匹配工作区/实例的 discovery 和 capabilities/OpenAPI；不猜端口、环境或方法。",
        "本次先完成源码接入、静态检查与可审核 PLAN。校验/预演按实时工作流执行，涉及同步写入须核实授权；真实训练、上传、覆盖和删除须另有明确授权，不能静默补 confirm/pathConfirmed。",
        "交付时列出修改文件、可执行入口与输出树、列映射/指标语义、已执行检查、未验证项，以及用户首次小规模调试的操作顺序。不要宣称适配所有未知项目或科学结果已经有效。",
    ].join("\n\n");
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
function resolveSetupGuideSource(extensionPath, repositoryUrl, existsSync = fs.existsSync, version) {
    const local = path.join(extensionPath, "docs", exports.SETUP_GUIDE_FILE_NAME);
    if (existsSync(local))
        return { kind: "file", path: local };
    return { kind: "online", url: setupGuideOnlineUrl(repositoryUrl, version) };
}
