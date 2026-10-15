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
exports.LATEST_RESULT_FILE = void 0;
exports.readLatestResultExport = readLatestResultExport;
exports.regenerateLatestResultTables = regenerateLatestResultTables;
exports.publishLatestResult = publishLatestResult;
exports.latestResultCatalog = latestResultCatalog;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const net = __importStar(require("node:net"));
const StateStore_1 = require("../state/StateStore");
const ProjectResultTables_1 = require("./ProjectResultTables");
const FreshResults_1 = require("./FreshResults");
exports.LATEST_RESULT_FILE = "latest-results.json";
const writers = new Map();
/** Kernel-owned, crash-released coordination. No lease JSON, lock file, PID, or recovery record. */
async function withResultWriter(root, directory, current, work) {
    let canonical = path.join(await fs.realpath(root), (0, FreshResults_1.resultPath)(directory));
    if (process.platform === "win32")
        canonical = canonical.toLowerCase();
    const previous = writers.get(canonical) || Promise.resolve();
    const request = previous.catch(() => undefined).then(async () => {
        const digest = (0, FreshResults_1.resultDigest)(canonical), deadline = Date.now() + 5000;
        let server;
        for (;;) {
            if (!current())
                throw Error("结果导出已取消或工作区已变化");
            server = net.createServer(socket => socket.destroy());
            server.unref();
            try {
                await new Promise((resolve, reject) => {
                    server.once("error", reject);
                    // Windows uses a named pipe. The portable fallback is local IPC, never an Agent tunnel endpoint.
                    const address = process.platform === "win32" ? { path: "\\\\.\\pipe\\simpleex-results-" + digest }
                        : { host: "127.0.0.1", port: 49152 + parseInt(digest.slice(0, 4), 16) % 16384, exclusive: true };
                    server.listen(address, () => { server.removeListener("error", reject); resolve(); });
                });
                break;
            }
            catch (error) {
                server.close(() => undefined);
                if (error.code !== "EADDRINUSE")
                    throw error;
                if (Date.now() >= deadline)
                    throw Error("结果文件正在其他窗口更新，请稍后重试；未读取旧锁记录。");
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        try {
            return await work();
        }
        finally {
            await new Promise(resolve => server.close(() => resolve()));
        }
    });
    writers.set(canonical, request);
    try {
        return await request;
    }
    finally {
        if (writers.get(canonical) === request)
            writers.delete(canonical);
    }
}
async function safeFile(root, directory, relative) {
    const base = await fs.realpath(root), parts = ((0, FreshResults_1.resultPath)(directory) + "/" + (0, FreshResults_1.resultPath)(relative)).split("/");
    let current = base;
    for (const [index, leaf] of parts.entries()) {
        current = path.join(current, leaf);
        const stat = await fs.lstat(current).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
        if (stat && (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink > 1)))
            throw Error("RESULT_EXPORT_PATH_UNSAFE: " + current);
    }
    return current;
}
async function readLatestResultExport(root, directory) {
    const file = await safeFile(root, directory, exports.LATEST_RESULT_FILE);
    const stat = await fs.stat(file).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
    if (!stat)
        return undefined;
    if (stat.size > 32 * 1024 * 1024)
        throw Error("RESULT_EXPORT_TOO_LARGE");
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    if (value?.schemaVersion !== 1 || value.source !== "active_query" || !Array.isArray(value.jobs) || !Array.isArray(value.tables))
        throw Error("RESULT_EXPORT_INVALID");
    for (const table of value.tables) {
        (0, FreshResults_1.resultPath)(table.relativePath);
        (0, FreshResults_1.resultPath)(table.markdownPath);
        if (!Array.isArray(table.header) || !Array.isArray(table.rows) || typeof table.markdown !== "string")
            throw Error("RESULT_EXPORT_INVALID");
    }
    return value;
}
async function writeTables(root, directory, value, current) {
    for (const table of value.tables)
        for (const [relative, text] of [[table.relativePath, (0, ProjectResultTables_1.writeCsv)(table.header, table.rows)], [table.markdownPath, table.markdown]]) {
            if (!current())
                throw Error("结果导出已取消或工作区已变化");
            const file = await safeFile(root, directory, relative);
            await (0, StateStore_1.atomicWriteText)(file, text, { beforeRename: async () => { if (!current())
                    throw Error("结果导出已取消或工作区已变化"); await safeFile(root, directory, relative); } });
        }
}
async function regenerateLatestResultTables(root, directory, _value, current = () => true) {
    return withResultWriter(root, directory, current, async () => {
        const value = await readLatestResultExport(root, directory);
        if (!value)
            throw Error("最终汇总 JSON 已不存在，请重新查询服务器。");
        await writeTables(root, directory, value, current);
        return value;
    });
}
async function publishLatestResult(root, directory, result, tables, current = () => true) {
    if (!result.querySucceeded)
        return false;
    return withResultWriter(root, directory, current, async () => {
        const value = { schemaVersion: 1, source: "active_query", observedAt: result.observedAt,
            jobs: result.jobs, errors: result.errors, tables: Object.values(tables) };
        const file = await safeFile(root, directory, exports.LATEST_RESULT_FILE);
        await (0, StateStore_1.atomicWriteText)(file, JSON.stringify(value, null, 2) + "\n", { beforeRename: async () => {
                if (!current())
                    throw Error("结果导出已取消或工作区已变化");
                await safeFile(root, directory, exports.LATEST_RESULT_FILE);
            } });
        await writeTables(root, directory, value, current);
        return true;
    });
}
/** The saved export lists its own tables. Neither a directory scan nor an old registry can add rows. */
async function latestResultCatalog(root, directory) {
    const value = await readLatestResultExport(root, directory);
    const datasets = new Map();
    for (const table of value?.tables || []) {
        let dataset = datasets.get(table.datasetKey);
        if (!dataset) {
            dataset = { dataset: table.dataset, datasetKey: table.datasetKey, tables: [], plans: [] };
            datasets.set(table.datasetKey, dataset);
        }
        const values = {};
        table.header.forEach((field, index) => { values[field] = [...new Set(table.rows.map(row => String(row[index] ?? "")))]; });
        dataset.tables.push({ ...table, path: path.posix.join(directory, table.relativePath), markdownPath: path.posix.join(directory, table.markdownPath), values, rowCount: table.rows.length });
        for (const planFile of values.plan_file || [])
            if (planFile && !dataset.plans.some((plan) => plan.planFile === planFile))
                dataset.plans.push({ planFile, planKey: planFile, artifacts: [], assignment: { kind: table.dataset ? "single" : "unassigned", datasets: table.dataset ? [table.dataset] : [], source: "result-record" } });
    }
    const planDatasets = new Map();
    for (const dataset of datasets.values())
        for (const plan of dataset.plans) {
            if (!planDatasets.has(plan.planFile))
                planDatasets.set(plan.planFile, new Set());
            if (dataset.dataset)
                planDatasets.get(plan.planFile).add(dataset.dataset);
        }
    for (const dataset of datasets.values())
        for (const plan of dataset.plans) {
            const names = [...planDatasets.get(plan.planFile)];
            if (names.length > 1)
                plan.assignment = { kind: "multiple", datasets: names, source: "result-record" };
        }
    return { datasets: [...datasets.values()], legacyTables: [], unassignedPlans: [...datasets.values()].filter(row => !row.dataset).flatMap(row => row.plans),
        multiDatasetPlans: [...planDatasets].filter(([, names]) => names.size > 1).map(([planFile, names]) => ({ planFile, datasets: [...names] })),
        mappingConflicts: [], autoRecoverableCount: 0, observedAt: value?.observedAt, source: "local_export" };
}
