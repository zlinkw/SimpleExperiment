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
exports.RESULT_LAYOUT_PYTHON = void 0;
exports.datasetPathKey = datasetPathKey;
exports.datasetPartitions = datasetPartitions;
exports.planDirectoryKey = planDirectoryKey;
exports.tablePaths = tablePaths;
exports.workerDirectoryKey = workerDirectoryKey;
exports.planArtifactPath = planArtifactPath;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
// Shared path policy and generated Python counterpart. UI consumes catalog keys only.
const SAFE_RE = "[^A-Za-z0-9._-]+";
const DEVICE_RE = "^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:[.]|$)";
function datasetPathKey(value) {
    const raw = String(value ?? "").trim();
    if (!raw)
        return "_unassigned";
    if (raw.includes("..") || /[/\\:]/.test(raw) || ["_unassigned", "_shared"].includes(raw.toLowerCase()))
        throw new Error("数据集名称不安全或使用了保留分区：" + raw);
    const key = raw.replace(new RegExp(SAFE_RE, "g"), "_").replace(/^\.+|\.+$/g, "").slice(0, 80);
    if (!key || new RegExp(DEVICE_RE, "i").test(key))
        throw new Error("数据集名称不能映射到安全目录：" + raw);
    return key;
}
function datasetPartitions(values) {
    const keys = new Map();
    for (const value of values) {
        const dataset = String(value ?? "").trim();
        const key = datasetPathKey(dataset);
        const previous = keys.get(key.toLowerCase());
        if (previous !== undefined && previous !== dataset)
            throw new Error("不同数据集映射到同一目录：" + previous + "、" + dataset);
        keys.set(key.toLowerCase(), dataset);
    }
    return [...keys.values()].map(dataset => ({ dataset, datasetKey: datasetPathKey(dataset) }));
}
function planDirectoryKey(planFile) {
    const normalized = path.posix.normalize(String(planFile || "").trim().replace(/\\/g, "/")).replace(/^\.\//, "");
    if (!normalized || normalized === "." || normalized.startsWith("/") || normalized.split("/").includes("..") || /^[A-Za-z]:/.test(normalized))
        throw new Error("Plan 路径无效。");
    const stem = path.posix.basename(normalized, path.posix.extname(normalized)).replace(new RegExp(SAFE_RE, "g"), "_").replace(/^[._]+|[._]+$/g, "").slice(0, 60) || "plan";
    return stem + "__" + crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 8);
}
function tablePaths(datasetKey, name, kind) {
    const base = kind === "final" ? `${datasetKey}/final/final` : `${datasetKey}/methods/${name}/${name}`;
    return { tableKey: kind === "final" ? `${datasetKey}/final` : `${datasetKey}/method/${name}`, relativePath: base + ".csv", markdownPath: base + ".md" };
}
function workerDirectoryKey(workerId) {
    const id = String(workerId || "").trim();
    if (!id)
        return "";
    return id.replace(new RegExp(SAFE_RE, "g"), "_").replace(/^[._]+|[._]+$/g, "").slice(0, 60) + "__" + crypto.createHash("sha256").update(id).digest("hex").slice(0, 8);
}
function planArtifactPath(datasetKey, planFile, kind, filename, workerId = "") {
    if (!["raw", "detail", "trace"].includes(kind))
        throw new Error("结果产物类型无效。");
    return path.posix.join(datasetKey, "plans", planDirectoryKey(planFile), kind, ...(workerId ? [workerDirectoryKey(workerId)] : []), filename);
}
exports.RESULT_LAYOUT_PYTHON = String.raw `
def dataset_path_key(value):
    raw = str(value if value is not None else "").strip()
    if not raw:
        return "_unassigned"
    if ".." in raw or any(char in raw for char in ("/", chr(92), ":")) or raw.lower() in ("_unassigned", "_shared"):
        raise ValueError("Unsafe or reserved dataset name: " + raw)
    key = re.sub(${JSON.stringify(SAFE_RE)}, "_", raw).strip(".")[:80]
    if not key or re.search(${JSON.stringify(DEVICE_RE)}, key, re.I):
        raise ValueError("Unsafe dataset directory: " + raw)
    return key

def dataset_partitions(values):
    keys = {}
    for value in values:
        dataset = str(value if value is not None else "").strip()
        key = dataset_path_key(dataset)
        if key.lower() in keys and keys[key.lower()] != dataset:
            raise ValueError("Dataset directory collision: " + keys[key.lower()] + ", " + dataset)
        keys[key.lower()] = dataset
    return [{"dataset": value, "datasetKey": dataset_path_key(value)} for value in keys.values()]

def result_plan_directory_key(plan_file):
    import posixpath
    normalized = posixpath.normpath(str(plan_file or "").strip().replace(chr(92), "/"))
    if not normalized or normalized == "." or normalized.startswith("/") or ".." in normalized.split("/") or re.match(r"^[A-Za-z]:", normalized):
        raise ValueError("Invalid Plan path")
    stem = re.sub(${JSON.stringify(SAFE_RE)}, "_", posixpath.splitext(posixpath.basename(normalized))[0]).strip("._")[:60] or "plan"
    return stem + "__" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:8]
`;
