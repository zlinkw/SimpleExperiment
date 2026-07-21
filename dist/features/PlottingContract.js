"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plottingContractRequiredFields = exports.PLOTTING_CONTRACT_JSON_PATH = exports.PLOTTING_CONTRACT_DOC_PATH = void 0;
exports.buildPlottingOutputContract = buildPlottingOutputContract;
exports.plottingContractMarkdown = plottingContractMarkdown;
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
function buildPlottingOutputContract(generatedAt = new Date().toISOString()) {
    return {
        schemaVersion: 1,
        generatedAt,
        consumer: "D:/GitRepo/my_ppt_app",
        requiredFields: exports.plottingContractRequiredFields,
        files: {
            resultRegistry: {
                path: "zlk_cluster/results/result_registry.json",
                description: "实验结果注册表；适合 PPT 插件发现所有可绘图实验。",
                fields: ["resultId", "experimentId", "suite", "method", "dataset", "split", "fold", "seed", "metrics", "dimensions", "sourceFiles"],
            },
            statistics: {
                path: "zlk_cluster/results/statistics.json",
                description: "最终聚合统计；PPT 数值图默认使用这里的 mean/std/ci，而不是单个 seed 原始结果。",
                fields: ["suite", "group", "method", "dataset", "split", "metric", "value", "mean", "std", "ci", "n", "pValue", "adjustedPValue", "significant", "aggregationPolicy"],
            },
            paperTable: {
                path: "paper/tables/zlk_results_table.csv",
                description: "论文表格 CSV；机器可读长表，适合直接按 mean/std 生成柱状图、误差图或表格图。",
                fields: ["method", "dataset", "split", "suite", "group", "metric", "mean", "std", "ci", "n", "direction", "pValue", "adjustedPValue", "significant"],
            },
            caseLevel: {
                path: "zlk_cluster/results/case_level_index.json",
                description: "病例或样本级结果；适合错误案例、子组和泄漏图。",
                fields: ["case_id", "patient_id", "method", "dataset", "split", "metric", "value", "subgroup", "error_type"],
            },
            datasetProfile: {
                path: "zlk_cluster/datasets/profile.json",
                description: "轻量数据集画像；适合类别分布、split 分布和泄漏摘要图。",
                fields: ["dataset", "split", "class", "case_id", "patient_id", "classDistribution", "splitDistribution"],
            },
        },
        notes: [
            "字段使用 camelCase 或 snake_case 时，PPT 插件应优先按本文档稳定语义归一化。",
            "大文件、原始数据集和 checkpoint 不通过绘图契约传输，只引用 manifest 或统计摘要。",
            "集群插件只做结果文件发现、轻量请求和审计落盘；不在 VS Code 内绘图，不连接 Zotero，不读取 Zotero DB。",
            "PPT automation discovery 固定为 %LOCALAPPDATA%/RoughPptAddin/automation.json 和 automation.token；调用顺序固定为 GET /health 后 POST /api/zlk-cluster/plot。",
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
