"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submittedGpuJobs = submittedGpuJobs;
exports.projectGpuOwnership = projectGpuOwnership;
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
/** Only a locally recorded dispatch and its matching Worker receipt establish ownership.
 * Remote recovery, a Plan name, a login user and MANAGED_JOB are never ownership evidence. */
function submittedGpuJobs(queue, snapshots, projectId, projectDirs = {}, now = Date.now()) {
    const result = new Map();
    for (const plan of queue?.plans || []) {
        if (!projectId || plan.projectId !== projectId || plan.recoveryConflict)
            continue;
        for (const job of plan.jobs) {
            const dispatchedAt = Date.parse(String(job.lastDispatchAttemptAt || job.dispatchAcknowledgedAt || ""));
            if (!job.workerId || !job.commandId || job.recoveryConflict || !Number.isFinite(dispatchedAt)
                || dispatchedAt > now + 30_000)
                continue;
            const receipts = snapshots.filter(s => s.workerId === job.workerId && (0, DistributedPlanQueue_1.hasFreshDurableSnapshot)(s, now))
                .flatMap(s => s.tasks || []).filter(task => (0, DistributedPlanQueue_1.remoteTaskMatchesJob)(plan, job, task)
                && task.status === "running" && !task.identityConflict && !task.stale);
            if (receipts.length !== 1)
                continue;
            const task = receipts[0];
            const gpuId = String(task.gpuId ?? "");
            if (!gpuId)
                continue;
            const key = `${job.workerId}\0${gpuId}`;
            result.set(key, [...(result.get(key) || []), { plan, job, task, projectDir: projectDirs[job.workerId] }]);
        }
    }
    return result;
}
function cliValues(command, option) {
    // Read literal argv values; never execute a command. Reject duplicated identity options.
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:=|\\s+)(?:"([^"\\r\\n]*)"|'([^'\\r\\n]*)'|([^\\s]+))`, "g");
    return [...command.matchAll(regex)].map(match => match[1] ?? match[2] ?? match[3]);
}
function matchesProcess(process, binding) {
    if (!process || typeof process !== "object" || process.pluginManaged !== true)
        return false;
    const { plan, job, task, projectDir } = binding;
    const cwd = String(process.cwd || "").replace(/\/$/, "");
    if (cwd && projectDir && cwd !== projectDir.replace(/\/$/, ""))
        return false;
    const commandId = String(process.jobCommandId || "");
    if (commandId)
        return commandId === job.commandId && process.jobProjectId === plan.projectId;
    // Upgrade compatibility for already-running jobs: bind the exact attempt directory
    // and config from the verified receipt, rather than a Plan basename or GPU assignment.
    const output = String(job.outputDir || "");
    if (!output || output.split("/").some(part => !part || part === "." || part === "..") || output.startsWith("/"))
        return false;
    const command = String(process.command ?? process.cmdline ?? process.cmd ?? "");
    const outputs = [...cliValues(command, "--output-dir"), ...cliValues(command, "--output_dir")];
    const configs = cliValues(command, "--config");
    const cases = cliValues(command, "--case");
    const seeds = cliValues(command, "--seed");
    const exactPath = (value, relative) => value === relative
        || Boolean(projectDir && value === `${projectDir.replace(/\/$/, "")}/${relative}`);
    const config = String(task.configPath || "");
    return outputs.length === 1 && exactPath(outputs[0], output)
        && config.startsWith(output + "/") && configs.length === 1 && exactPath(configs[0], config)
        && cases.length === 1 && cases[0] === job.case && seeds.length === 1 && seeds[0] === String(job.seed);
}
/** Project before display truncation. Unmatched physical processes remain visible and busy. */
function projectGpuOwnership(gpu, submitted) {
    const out = {};
    for (const [workerId, source] of Object.entries(gpu || {})) {
        const rows = Array.isArray(source) ? source : source?.gpus || source?.gpu || source?.rows || [];
        const projected = Array.isArray(rows) ? rows.map(row => {
            if (!row || typeof row !== "object")
                return row;
            const candidates = submitted.get(`${workerId}\0${String(row.index ?? row.gpu_index ?? row.gpuId ?? row.gpu_id ?? row.id)}`) || [];
            const processes = Array.isArray(row.processes) ? row.processes : Array.isArray(row.procs) ? row.procs : [];
            return { ...row, processes: processes.map((process) => {
                    const matches = candidates.filter(binding => matchesProcess(process, binding));
                    return { ...process, submittedByThisClient: matches.length === 1,
                        submittedJobCommandId: matches.length === 1 ? matches[0].job.commandId : undefined };
                }) };
        }) : [];
        out[workerId] = Array.isArray(source) ? projected : { ...source, gpus: projected };
    }
    return out;
}
