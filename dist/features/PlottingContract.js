// @ts-nocheck
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
Object.defineProperty(exports, "__esModule", { value: true });
exports.plottingContractRequiredFields = exports.PLOTTING_CONTRACT_JSON_PATH = exports.PLOTTING_CONTRACT_DOC_PATH = void 0;
exports.buildPlottingOutputContract = buildPlottingOutputContract;
exports.plottingContractMarkdown = plottingContractMarkdown;
exports.planSlugFromPlanFile = planSlugFromPlanFile;
exports.planResultsArtifactRelPath = planResultsArtifactRelPath;
exports.plottingContractJsonPath = plottingContractJsonPath;
exports.plottingContractMarkdownPath = plottingContractMarkdownPath;
exports.statisticsJsonPath = statisticsJsonPath;
exports.resultRegistryJsonPath = resultRegistryJsonPath;
exports.caseLevelIndexJsonPath = caseLevelIndexJsonPath;
exports.datasetProfileJsonPath = datasetProfileJsonPath;
exports.paperTableCsvPath = paperTableCsvPath;
exports.PLOTTING_CONTRACT_DOC_PATH = "docs/output-contract-for-plotting.md";
exports.PLOTTING_CONTRACT_JSON_PATH = "zlk_cluster/results/plotting_contract.json";
exports.plottingContractRequiredFields = [
    "method",
    "dataset",
    "split",
    "fold",
    "seed",
    "metric",
    "value",
    "mean",
    "std",
    "ci",
    "pValue",
    "adjustedPValue",
    "significant",
    "case_id",
    "patient_id",
    "subgroup",
    "error_type",
];
function planSlugFromPlanFile(planFile) {
    const text = String(planFile || "").trim().replace(/\\/g, "/");
    if (!text)
        return "";
    const base = text.split("/").pop() || text;
    const stem = base.replace(/\.[^.]+$/, "");
    return stem.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}
function planResultsArtifactRelPath(planFile, filename) {
    const slug = planSlugFromPlanFile(planFile);
    const name = String(filename || "").replace(/^\/+/, "");
    if (!name)
        throw new Error("artifact filename required");
    if (!slug)
        return `zlk_cluster/results/${name}`;
    return `zlk_cluster/results/by_plan/${slug}/${name}`;
}
function plottingContractJsonPath(planFile) {
    return planResultsArtifactRelPath(planFile, "plotting_contract.json");
}
function plottingContractMarkdownPath(planFile) {
    return planResultsArtifactRelPath(planFile, "output_contract_for_plotting.md");
}
function statisticsJsonPath(planFile) {
    return planResultsArtifactRelPath(planFile, "statistics.json");
}
function resultRegistryJsonPath(planFile) {
    return planResultsArtifactRelPath(planFile, "result_registry.json");
}
function caseLevelIndexJsonPath(planFile) {
    return planResultsArtifactRelPath(planFile, "case_level_index.json");
}
function paperTableCsvPath(planFile) {
    const slug = planSlugFromPlanFile(planFile);
    return slug ? `paper/tables/zlk_results_table__${slug}.csv` : "paper/tables/zlk_results_table.csv";
}
function datasetProfileJsonPath(planFile) {
    const slug = planSlugFromPlanFile(planFile);
    if (!slug)
        return "zlk_cluster/datasets/profile.json";
    return `zlk_cluster/datasets/by_plan/${slug}/profile.json`;
}
function buildPlottingOutputContract(generatedAt = new Date().toISOString(), planFile = "") {
    const plan = String(planFile || "").trim();
    return {
        schemaVersion: 1,
        generatedAt,
        consumer: "D:/GitRepo/my_ppt_app",
        planFile: plan || "",
        requiredFields: exports.plottingContractRequiredFields,
        files: {
            resultRegistry: {
                path: resultRegistryJsonPath(plan),
                description: "实验结果注册表；适合 PPT 插件发现所有可绘图实验。",
                fields: ["resultId", "experimentId", "suite", "method", "dataset", "split", "fold", "seed", "metrics", "dimensions", "sourceFiles"],
            },
            statistics: {
                path: statisticsJsonPath(plan),
                description: "最终聚合统计；PPT 数值图默认使用这里的 mean/std/ci，而不是单个 seed 原始结果。",
                fields: ["suite", "group", "method", "dataset", "split", "metric", "value", "mean", "std", "ci", "n", "pValue", "adjustedPValue", "significant", "aggregationPolicy"],
            },
            paperTable: {
                path: paperTableCsvPath(plan),
                description: "论文表格 CSV；机器可读长表，适合直接按 mean/std 生成柱状图、误差图或表格图。",
                fields: ["method", "dataset", "split", "suite", "group", "metric", "mean", "std", "ci", "n", "direction", "pValue", "adjustedPValue", "significant"],
            },
            caseLevel: {
                path: caseLevelIndexJsonPath(plan),
                description: "病例或样本级结果；适合错误案例、子组和泄漏图。",
                fields: ["case_id", "patient_id", "method", "dataset", "split", "metric", "value", "subgroup", "error_type"],
            },
            datasetProfile: {
                path: datasetProfileJsonPath(plan),
                description: "轻量数据集画像；适合类别分布、split 分布和泄漏摘要图。",
                fields: ["dataset", "split", "class", "case_id", "patient_id", "classDistribution", "splitDistribution"],
            },
        },
        notes: [
            "字段使用 camelCase 或 snake_case 时，PPT 插件应优先按本文档稳定语义归一化。",
            "大文件、原始数据集和 checkpoint 不通过绘图契约传输，只引用 manifest 或统计摘要。",
            "集群插件只做结果文件发现、轻量请求和审计落盘；不在 VS Code 内绘图，不连接 Zotero，不读取 Zotero DB。",
            "PPT automation discovery 固定为 %LOCALAPPDATA%/RoughPptAddin/automation.json 和 automation.token；调用顺序固定为 GET /health 后 POST /api/zlk-cluster/plot。",
            "automation endpoint 固定归一化为根地址后访问 /health 和 /api/zlk-cluster/plot；不得把 discovery 中的其它 path 拼进协议路由。",
            "绘图请求字段冻结为 schemaVersion/requestId/projectRoot/sourcePaths/plottingContractPath/selectedResultId/runKey/archiveKey/chartType/target/styleMode/sourceLabel/markdownSummary；新增字段只能 additive，优先放 optional extensions。",
            "sourcePaths 只能指向已存在的轻量 JSON、CSV、Markdown 或 TeX 文件；不得传目录、raw dataset、checkpoint 或大文件。",
            "SCI 数值绘图默认以 statistics.json 或 paper table 的 mean/std/ci 为准；result_registry.json 和单个结果 CSV 只用于发现、追踪和审计，不作为默认图表数值源。",
            "pValue/adjustedPValue 可以为空；significant 必须是布尔值或可解析布尔文本。",
        ],
    };
}
function plottingContractMarkdown(contract = buildPlottingOutputContract()) {
    const lines = [
        "# ZLK 输出到 PPT 绘图插件的稳定契约",
        "",
        `目标消费端：\`${contract.consumer}\``,
        "",
        "本契约只描述机器可读的轻量输出，不传输原始数据集、权重或 checkpoint 大文件。",
        "",
        "## 必备语义字段",
        "",
        ...contract.requiredFields.map((field) => `- \`${field}\``),
        "",
        "## 文件契约",
        "",
    ];
    for (const [key, file] of Object.entries(contract.files)) {
        lines.push(`### ${key}`, "", `路径：\`${file.path}\``, "", file.description, "", "字段：", ...file.fields.map((field) => `- \`${field}\``), "");
    }
    lines.push("## 兼容说明", "", ...contract.notes.map((note) => `- ${note}`), "");
    return lines.join("\n");
}
