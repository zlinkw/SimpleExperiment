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
exports.RUNS_DIR = exports.DEFAULT_PLAN_DIR = exports.RESULT_REGISTRY_LOCAL_REL = exports.RESULT_REGISTRY_REL = exports.PLAN_REGISTRY_REL = exports.EXPERIMENT_INDEX_REL = void 0;
exports.projectRoot = projectRoot;
exports.resolveProjectPath = resolveProjectPath;
exports.readJsonFile = readJsonFile;
exports.readTextFile = readTextFile;
exports.fileExists = fileExists;
exports.listFilesRecursive = listFilesRecursive;
exports.readTail = readTail;
exports.copyFile = copyFile;
exports.packageMeta = packageMeta;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.EXPERIMENT_INDEX_REL = path.join("simple_cluster", "experiment_index.json");
exports.PLAN_REGISTRY_REL = path.join("simple_cluster", "plans", "plan_registry.json");
exports.RESULT_REGISTRY_REL = path.join("simple_cluster", "results", "result_registry.json");
exports.RESULT_REGISTRY_LOCAL_REL = path.join("simple_cluster", "results", "result_registry.local.json");
exports.DEFAULT_PLAN_DIR = path.join("experiments", "plans");
exports.RUNS_DIR = path.join("experiments", "runs");
function projectRoot() {
    return process.cwd();
}
function resolveProjectPath(...parts) {
    return path.resolve(projectRoot(), ...parts);
}
function readJsonFile(file, fallback) {
    if (!fs.existsSync(file))
        return fallback;
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return fallback;
    }
}
function readTextFile(file) {
    return fs.readFileSync(file, "utf8");
}
function fileExists(file) {
    try {
        return fs.existsSync(file);
    }
    catch {
        return false;
    }
}
function listFilesRecursive(dir, matcher, depth = 3) {
    if (!fileExists(dir) || depth < 0)
        return [];
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        let stat;
        try {
            stat = fs.statSync(full);
        }
        catch {
            continue;
        }
        if (stat.isDirectory())
            out.push(...listFilesRecursive(full, matcher, depth - 1));
        else if (matcher(name))
            out.push(full);
    }
    return out;
}
function readTail(file, maxLines = 20) {
    if (!fileExists(file))
        return "";
    const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const lines = text.split("\n");
    return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
}
function copyFile(src, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}
function packageMeta() {
    const candidates = [
        path.join(__dirname, "..", "..", "package.json"),
        path.join(__dirname, "..", "package.json"),
    ];
    for (const file of candidates) {
        if (!fileExists(file))
            continue;
        const json = readJsonFile(file, {});
        return { name: String(json.name || "simple-experiment"), version: String(json.version || "") };
    }
    return { name: "simple-experiment", version: "" };
}
