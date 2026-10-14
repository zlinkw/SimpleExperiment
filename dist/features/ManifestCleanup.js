"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordedDeclarations = recordedDeclarations;
exports.discoverManifestCandidates = discoverManifestCandidates;
const PlanCleanup_1 = require("./PlanCleanup");
const spelling = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
function relativeTo(node, value) {
    const text = spelling(value), prefix = spelling(node.root).replace(/\/+$/, "") + "/";
    return (0, PlanCleanup_1.cleanupRelative)(text.startsWith(prefix) ? text.slice(prefix.length) : text);
}
function linkedPlan(node, value, file) {
    try {
        return relativeTo(node, value).toLowerCase() === spelling(file).toLowerCase();
    }
    catch {
        return false;
    }
}
/** Historical records locate exact paths only. Their status/revision is never an ownership gate. */
function recordedDeclarations(queue, file) {
    const result = [];
    for (const plan of queue.plans || [])
        if (spelling(plan.planFile).toLowerCase() === spelling(file).toLowerCase()) {
            for (const job of plan.jobs || [])
                result.push({ index: job.index, case: job.case, seed: job.seed,
                    output_dir: job.outputDir, result_csv: job.collectionResultCsv });
        }
    for (const job of queue.clearedJobs || [])
        if (spelling(job.planFile).toLowerCase() === spelling(file).toLowerCase())
            result.push({ index: job.experimentIndex, case: job.case, seed: job.seed, output_dir: job.outputDir, result_csv: job.collectionResultCsv });
    return result;
}
/** Only frozen declarations and actual per-output manifests authorize candidates. */
async function discoverManifestCandidates(host, root, file, nodes, queue, explicit = [], pathOnly = false) {
    const declarations = [...explicit, ...recordedDeclarations(queue, file)];
    const notices = [], blockers = [], candidates = [];
    // Describe is the existing Scheduler's pure expansion; no sync, preview attempt, or project callback.
    await Promise.all(nodes.filter(node => !explicit.length && node.kind === "remote" && !node.error).map(async (node) => {
        try {
            const worker = (host.setupConfig.workerTunnels || []).find((row) => row.id === node.id);
            const response = await host.client.getWorkerTasks(node.id, { signal: AbortSignal.timeout(10000),
                discovery: { planFile: file, condaEnv: worker?.condaEnv || "" } });
            if (Array.isArray(response?.declaredJobs))
                declarations.push(...response.declaredJobs);
        }
        catch (error) {
            notices.push({ code: "DECLARATIONS_QUERY_NOTICE", nodeId: node.id, detail: String(error.message || error) });
        }
    }));
    const unique = [...new Map(declarations.filter(row => row?.output_dir).map(row => [spelling(row.output_dir) + "\0" + spelling(row.result_csv), row])).values()]
        .sort((a, b) => spelling(a.output_dir).localeCompare(spelling(b.output_dir)) || spelling(a.result_csv).localeCompare(spelling(b.result_csv)));
    if (!unique.length && nodes.some(node => node.kind === "remote"))
        blockers.push({ code: "PLAN_DECLARATIONS_UNVERIFIED", detail: "无法取得所选 PLAN 的精确 job 声明；可恢复连接后主动重查，未推断目录归属。" });
    const selected = explicit.length ? unique.filter(row => explicit.some(item => spelling(item.output_dir) === spelling(row.output_dir)
        && spelling(item.result_csv) === spelling(row.result_csv))) : unique;
    const planKey = (0, PlanCleanup_1.cleanupDigest)([root, file]);
    for (const node of nodes) {
        if (node.error) {
            blockers.push({ code: "OFFLINE_NODE", nodeId: node.id, detail: node.error });
            continue;
        }
        for (const declaration of selected) {
            let output, csv = "";
            try {
                output = relativeTo(node, declaration.output_dir);
            }
            catch {
                blockers.push({ code: "UNSAFE_DECLARED_PATH", nodeId: node.id, detail: "output_dir：" + declaration.output_dir });
                continue;
            }
            // Older cleared-job indexes only retained outputDir. An absent CSV is
            // missing discovery information, not an unsafe output path on every node.
            if (spelling(declaration.result_csv)) {
                try {
                    csv = relativeTo(node, declaration.result_csv);
                }
                catch {
                    blockers.push({ code: "UNSAFE_DECLARED_PATH", nodeId: node.id, detail: "result_csv：" + declaration.result_csv });
                    continue;
                }
            }
            let info;
            try {
                info = await host.simpleSftpApiCall("files.cleanup.inspect", { node, target: { relativePath: output, type: "directory" }, manifestOnly: true, allowMissing: true });
            }
            catch (error) {
                blockers.push({ code: "NODE_UNREACHABLE", nodeId: node.id, detail: String(error.message || error) });
                continue;
            }
            if (info.target?.missing)
                continue;
            const records = info.target?.manifests || [];
            const linkedOwners = records.filter((record) => {
                const binding = record.binding || {};
                let ownedOutput = false;
                try {
                    ownedOutput = relativeTo(node, binding.outputDir) === output;
                }
                catch { }
                const linked = linkedPlan(node, binding.planFile, file) || (record.planHints || []).some((hint) => linkedPlan(node, hint, file));
                const logical = binding.index !== undefined && Number(binding.index) === Number(declaration.index)
                    || binding.case === declaration.case && Number(binding.seed) === Number(declaration.seed);
                return linked && ownedOutput && logical;
            });
            if (!linkedOwners.length) {
                if (pathOnly) {
                    notices.push({ code: "PATH_CONFIRMATION_REQUIRED", nodeId: node.id, detail: output + "：任务关联未核实，请直接核对服务器及完整路径后决定删除。" });
                    candidates.push({ nodeId: node.id, relativePath: output, type: "directory", category: "用户确认的任务输出目录",
                        owners: [planKey], evidence: ["PLAN/旧记录定位路径=" + declaration.output_dir], dependencies: [] });
                    if (csv && !csv.startsWith(output + "/"))
                        candidates.push({ nodeId: node.id, relativePath: csv, type: "file", category: "用户确认的结果文件",
                            owners: [planKey], evidence: ["声明结果路径=" + declaration.result_csv], dependencies: [] });
                    continue;
                }
                blockers.push({ code: "OWNERSHIP_UNVERIFIED", nodeId: node.id, detail: output + "：产物清单尚不能证明与所选 PLAN/job 的关联" });
                candidates.push({ nodeId: node.id, relativePath: output, type: "directory", category: "归属未核实产物",
                    owners: [], evidence: ["PLAN 精确声明=" + declaration.output_dir], dependencies: [], protectedReason: "清单关联未核实，只报告" });
                continue;
            }
            const owner = linkedOwners.find((record) => spelling(record.binding?.resultCsv)) || linkedOwners[0];
            if (!csv) {
                const manifestResults = new Set();
                let unsafeResult = false;
                for (const record of linkedOwners)
                    if (spelling(record.binding?.resultCsv)) {
                        try {
                            manifestResults.add(relativeTo(node, record.binding.resultCsv));
                        }
                        catch {
                            unsafeResult = true;
                            blockers.push({ code: "UNSAFE_MANIFEST_RESULT_PATH", nodeId: node.id,
                                detail: "产物清单中的结果路径无法安全解析：" + record.binding.resultCsv });
                        }
                    }
                if (unsafeResult && !pathOnly)
                    continue;
                if (manifestResults.size > 1) {
                    blockers.push({ code: "RESULT_MANIFEST_LINK_UNVERIFIED", nodeId: node.id, detail: output + "：清单记录了不同的结果路径，需要核对" });
                    if (!pathOnly)
                        continue;
                }
                csv = !unsafeResult && manifestResults.size <= 1 ? [...manifestResults][0] || "" : "";
                notices.push({ code: "RESULT_PATH_FROM_MANIFEST", nodeId: node.id, detail: csv
                        ? "旧记录未保存结果路径，已从匹配该任务的产物清单取得：" + csv
                        : "旧记录和清单未提供独立结果路径；本次只审核已证明关联的输出目录，不推测其他结果文件。" });
            }
            const evidence = ["PLAN=" + file, "job=" + declaration.index + "/" + declaration.case + "/seed" + declaration.seed,
                "产物清单=" + owner.relativePath, "清单 SHA256=" + owner.sha256, "run=" + String(owner.binding?.runId || "清单已关联")];
            const dependencies = [];
            for (const plan of queue.plans || [])
                if (spelling(plan.planFile) !== spelling(file))
                    for (const other of plan.jobs || [])
                        if ([other.outputDir, other.collectionResultCsv].some(path => path &&
                            [output, csv].some(selected => spelling(path) === selected || spelling(path).startsWith(selected + "/") || selected.startsWith(spelling(path) + "/"))))
                            dependencies.push(plan.planFile);
            for (const record of records)
                if (record.binding?.planFile && !linkedPlan(node, record.binding.planFile, file))
                    dependencies.push(String(record.binding.planFile));
            candidates.push({ nodeId: node.id, relativePath: output, type: "directory", category: "job 产物（清单关联）",
                owners: [planKey], evidence, dependencies: [...new Set(dependencies)] });
            if (csv && !csv.startsWith(output + "/")) {
                let boundCsv = "";
                try {
                    boundCsv = relativeTo(node, owner.binding?.resultCsv);
                }
                catch { }
                if (boundCsv !== csv && !pathOnly) {
                    blockers.push({ code: "RESULT_MANIFEST_LINK_UNVERIFIED", nodeId: node.id, detail: csv });
                }
                else
                    candidates.push({ nodeId: node.id, relativePath: csv, type: "file", category: "独立测试结果（清单关联）",
                        owners: [planKey], evidence, dependencies: [...new Set(dependencies)] });
            }
        }
    }
    return { candidates, blockers, notices, declarations: selected };
}
