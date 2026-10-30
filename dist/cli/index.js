"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSimpleCli = runSimpleCli;
exports.isSimpleCommand = isSimpleCommand;
exports.emitCliFailure = emitCliFailure;
const action_1 = require("./commands/action");
const control_1 = require("./commands/control");
const errors_1 = require("./errors");
const plan_1 = require("./commands/plan");
const commands_1 = require("./commands");
const errors_2 = require("./errors");
const api_1 = require("./api");
const data_1 = require("./data");
const format_1 = require("./format");
const plugins_1 = require("./plugins");
const help_1 = require("./help");
const parse_1 = require("./parse");
// Old public entries revoked by user decision 2026-10-23 (no compatibility layer kept). Each prints an explicit refusal with the new path.
const REMOVED_ENTRIES = {
    api: "raw API passthrough removed: use the named domain commands (simpleex --help); live capability listing is printed by simpleex doctor and simpleex sftp capabilities",
    status: "old status stub removed: use simpleex project status",
    "self-check": "old self-check removed: use simpleex doctor",
    agent: "old agent health stub removed (it never reported live data): use simpleex experiment health or simpleex project status",
    experiments: "old experiments alias removed: use simpleex experiment list",
    metrics: "old metrics alias removed: use simpleex metric list | metric show <id> | metric leaderboard --file <metrics>",
    results: "old results alias removed: use simpleex result list | result parse --file <f> | result paper-table --file <registry.json>",
    run: "recorded local run removed: it executed arbitrary local commands outside the API. Experiment execution goes through simpleex experiment run (workflow.plan dry-run/upload then workflow.run); local metric/result analysis is available as metric leaderboard / result parse / result paper-table with --file",
};
const SIMPLE_DOMAINS = new Set(["project", "experiment", "plan", "result", "log", "metric", "compare", "gpu", "resource", "server", "artifact", "task", "draft", "agents", "actions", "sftp", "config", "state", "flow", "tmux", "panel"]);
async function runSimpleCli(argv) {
    // Refuse revoked entries before generic parsing, so their pointer message survives odd flags.
    if (argv[0] && REMOVED_ENTRIES[argv[0]])
        throw (0, errors_2.usageError)(`removed entry: simpleex ${argv[0]}`, REMOVED_ENTRIES[argv[0]]);
    let parsed;
    try {
        parsed = (0, parse_1.parseArgv)(argv);
    }
    catch (error) {
        throw (0, errors_2.usageError)(error instanceof Error ? error.message : String(error));
    }
    const { positionals, flags } = parsed;
    // The explicit --instance flag outranks SIMPLE_CLI_INSTANCE_ID for every domain from here on.
    (0, api_1.setInstancePin)(flags.instance || "");
    (0, api_1.setApiWorkspace)(flags.workspace || "");
    const [domain, action, ...rest] = positionals;
    if (!domain || domain === "help" || (flags.help && !action)) {
        (0, format_1.writeText)(domain && (SIMPLE_DOMAINS.has(domain) || domain === "doctor") ? (0, help_1.domainHelp)(domain) : help_1.SIMPLE_HELP);
        return errors_2.EXIT_OK;
    }
    if (flags.help) {
        (0, format_1.writeText)((0, help_1.domainHelp)(domain));
        return errors_2.EXIT_OK;
    }
    if (domain === "doctor")
        return (0, plugins_1.doctorCommand)(flags);
    if (domain === "sftp")
        return (0, plugins_1.sftpCommand)(action, rest, flags);
    // The drafts domain is pure RPC and never uses the local project root, so it routes BEFORE
    // initializeProjectRoot: that probe would otherwise fall back to optionalApi("status") in an
    // unfamiliar cwd and read capabilities/RPC even for usage refusals and the local promote refusal.
    // Root-dependent data domains below keep their existing root resolution untouched.
    if (domain === "draft") {
        if (!action)
            throw (0, errors_2.usageError)("missing draft action", (0, help_1.domainHelp)("draft"));
        return (0, commands_1.draftCommand)(action, rest, flags);
    }
    // plans.cleanup.* is pure RPC against the extension host (no local root use), so this subroute
    // also sits before the root probe; the rest of the plan domain (local list/build/validate files)
    // keeps its root resolution below, untouched.
    if (domain === "plan" && action === "cleanup")
        return (0, commands_1.planCleanupCommand)(rest[0] || "", rest.slice(1), flags);
    // project prepare/bootstrap/bootstrap-operation are pure-RPC, confirmation-gated entries (the host
    // resolves its own workspace), so they route before the root probe too; `project status` below keeps
    // its local root resolution untouched.
    if (domain === "project" && (action === "prepare" || action === "bootstrap" || action === "bootstrap-operation"))
        return (0, commands_1.projectOpsCommand)(action, rest, flags);
    // A agents.lifecycle is pure RPC against the extension host (its target dirs/tmux state are host-side),
    // so it also routes before the root probe. This is A's contract only — B's sftp agents lifecycle lives
    // under the sftp domain with its own server-file parameters.
    if (domain === "agents") {
        if (action !== "lifecycle")
            throw (0, errors_2.usageError)("simpleex agents 目前仅支持: agents lifecycle inspect|ensure|stop|restart|migrate", (0, help_1.domainHelp)("agents"));
        return (0, commands_1.agentsLifecycleCommand)(rest[0] || "", rest.slice(1), flags);
    }
    // The action catalog is a pure-RPC read-only discovery entry (live server-side table), so it also
    // routes before the root probe; there is no raw invoke route anywhere in this CLI.
    if (domain === "actions") {
        if (action === "list")
            return (0, commands_1.actionsListCommand)(rest, flags);
        return (0, action_1.actionCommand)(action || "", rest, flags);
    }
    // Same pure-RPC rule as drafts: the task domain never reads the local project root, so it routes
    // before the root probe (a foreign cwd must not turn usage refusals into optionalApi("status")
    // reads). Data domains below keep their root resolution untouched.
    if (domain === "task") {
        if (action === "analyze") {
            (0, format_1.writeJson)(await (0, api_1.callApi)("tasks.analyze", { workflowId: flags.workflow, index: flags.index, workerId: flags.worker,
                commandId: flags.command, outputDir: flags.out }));
            return errors_2.EXIT_OK;
        }
        if (action === "preflight") {
            // Contracts mirror src/extension/legacy.ts:14314-14362 (start: workerId+commandId, strict
            // booleans; status/cancel: operationId grammar at :14329). No confirmation factors exist at
            // this backend entry, so none are invented; flags are forwarded only when actually given.
            const sub = rest[0] || "";
            const usage = "用法：simpleex task preflight start --worker ID --command ID [--environment-only] [--completed-output-verify] | status|cancel --worker ID --operation-id formal-preflight-… [--json]";
            const workerId = String(flags.worker || "");
            if (!workerId)
                throw (0, errors_2.usageError)("task preflight 需要 --worker <ID>（backend: FORMAL_JOB_PREFLIGHT_WORKER_REQUIRED）", usage);
            if (sub === "start") {
                if (!flags.command)
                    throw (0, errors_2.usageError)("task preflight start 需要 --command <commandId>（backend: FORMAL_JOB_PREFLIGHT_COMMAND_REQUIRED）", usage);
                const params = { workerId, commandId: String(flags.command) };
                if (flags["environment-only"] === true)
                    params.environmentOnly = true;
                if (flags["completed-output-verify"] === true)
                    params.completedOutputVerify = true;
                (0, format_1.writeJson)(await (0, api_1.callApi)("tasks.preflight", params));
                return errors_2.EXIT_OK;
            }
            if (sub === "status" || sub === "cancel") {
                const operationId = String(flags["operation-id"] || "");
                // Input-deterministic grammar check (:14329): refuse locally with zero RPC, same reason the backend gives.
                if (!/^formal-preflight-[a-zA-Z0-9-]+$/.test(operationId))
                    throw (0, errors_2.usageError)("task preflight status|cancel 需要 --operation-id 匹配 ^formal-preflight-[a-zA-Z0-9-]+$（backend: FORMAL_JOB_PREFLIGHT_OPERATION_REQUIRED）", usage);
                (0, format_1.writeJson)(await (0, api_1.callApi)(sub === "status" ? "tasks.preflight.status" : "tasks.preflight.cancel", { workerId, operationId }));
                return errors_2.EXIT_OK;
            }
            throw (0, errors_2.usageError)(`unknown task preflight subcommand: ${sub || "(missing)"}`, usage);
        }
        if (action !== "dispatch")
            throw (0, errors_2.usageError)("用法：simpleex task dispatch --workflow ID --jobs 0,1 --worker ID --gpu 0 --confirm [--stop-running]");
        if (flags.remaining === true) {
            if (flags.all !== true && !flags.workflow)
                throw (0, errors_2.usageError)("请指定 --workflow ID 或 --all；仅选择尚未派发的剩余 job。");
            (0, format_1.writeJson)(await (0, api_1.callApi)("tasks.dispatch", { distribution: "quota_remaining", workflowId: flags.workflow, all: flags.all === true, confirm: flags.confirm === true }));
            return errors_2.EXIT_OK;
        }
        const jobs = String(flags.jobs || "").trim();
        if (!/^\d+(?:,\d+)*$/.test(jobs))
            throw (0, errors_2.usageError)("请用 --jobs 明确选择 job 索引，例如 --jobs 0,2。");
        const result = await (0, api_1.callApi)("tasks.dispatch", { workflowId: String(flags.workflow || ""), indices: jobs.split(",").map(Number),
            workerId: String(flags.worker || ""), ...(flags.gpu === "auto" ? { gpuSelection: "automatic" } : { gpuId: String(flags.gpu ?? "") }), confirm: flags.confirm === true, stopRunning: flags["stop-running"] === true });
        (0, format_1.writeJson)(result);
        return errors_2.EXIT_OK;
    }
    if (["config", "state", "flow", "tmux", "panel"].includes(domain)
        || domain === "gpu" && action === "history"
        || domain === "server" && action === "test-all"
        || domain === "plan" && action === "filter")
        return (0, control_1.controlCommand)(domain, action || "", rest, flags);
    if (domain === "plan" && action === "validate") {
        if (rest.length !== 1)
            throw (0, errors_2.usageError)("plan validate requires exactly one project-relative plan file");
        return (0, plan_1.planValidate)(rest[0], flags);
    }
    if (domain === "experiment" && action === "pause")
        throw (0, errors_1.businessError)("EXPERIMENT_PAUSE_UNSUPPORTED: the scheduler has no pause operation; use experiment stop or monitor.");
    if (flags.history) {
        if (!(domain === "result" && ["list", "show", "export"].includes(action) || domain === "metric" && ["list", "show"].includes(action) || domain === "compare" || domain === "experiment" && action === "results"))
            throw (0, errors_2.usageError)("--history 仅用于 result list|show|export、metric list|show、compare 或 experiment results。");
        if (flags.instance || process.env.SIMPLE_CLI_INSTANCE_ID)
            throw (0, errors_2.usageError)("--history 只读取本机项目；请用 --workspace 选择本机目录，不使用 --instance。");
        const root = (0, data_1.validProjectRoot)(flags.workspace || process.env.SIMPLE_EXPERIMENT_PROJECT_ROOT || process.cwd());
        if (!root)
            throw (0, errors_2.envError)("历史结果需要存在的本机项目目录。");
        (0, data_1.setProjectRoot)(root);
    }
    else
        await initializeProjectRoot();
    if (domain === "project") {
        if (action && action !== "status")
            throw (0, errors_2.usageError)(`unknown project action: ${action}`);
        return (0, commands_1.projectStatus)(flags);
    }
    if (domain === "experiment") {
        if (!action)
            throw (0, errors_2.usageError)("missing experiment action", (0, help_1.domainHelp)("experiment"));
        return (0, commands_1.experimentCommand)(action, rest, flags);
    }
    if (domain === "plan") {
        if (!action)
            throw (0, errors_2.usageError)("missing plan action", (0, help_1.domainHelp)("plan"));
        return (0, commands_1.planCommand)(action, rest, flags);
    }
    if (domain === "result") {
        if (!action)
            throw (0, errors_2.usageError)("missing result action", (0, help_1.domainHelp)("result"));
        return (0, commands_1.resultCommand)(action, rest, flags);
    }
    if (domain === "log") {
        if (!action)
            throw (0, errors_2.usageError)("missing log action", (0, help_1.domainHelp)("log"));
        return (0, commands_1.logCommand)(action, rest, flags);
    }
    if (domain === "metric") {
        if (!action)
            throw (0, errors_2.usageError)("missing metric action", (0, help_1.domainHelp)("metric"));
        return (0, commands_1.metricCommand)(action, rest, flags);
    }
    if (domain === "compare")
        return (0, commands_1.compareEntry)([action, ...rest].filter(Boolean), flags);
    if (domain === "gpu")
        return (0, commands_1.gpuCommand)(action || "status", rest, flags);
    if (domain === "resource")
        return (0, commands_1.resourceCommand)(action || "available", rest, flags);
    if (domain === "server")
        return (0, commands_1.serverCommand)(action || "list", rest, flags);
    if (domain === "artifact") {
        if (!action)
            throw (0, errors_2.usageError)("missing artifact action", (0, help_1.domainHelp)("artifact"));
        return (0, commands_1.artifactCommand)(action, rest, flags);
    }
    throw (0, errors_2.usageError)(`unknown domain: ${domain}`);
}
async function initializeProjectRoot() {
    const explicit = process.env.SIMPLE_EXPERIMENT_PROJECT_ROOT;
    if (explicit !== undefined) {
        const root = (0, data_1.validProjectRoot)(explicit);
        if (!root)
            throw (0, errors_2.envError)("SIMPLE_EXPERIMENT_PROJECT_ROOT must be an existing absolute directory");
        (0, data_1.setProjectRoot)(root);
        return;
    }
    const cwd = process.cwd();
    if ((0, data_1.isExperimentProjectRoot)(cwd)) {
        (0, data_1.setProjectRoot)(cwd);
        return;
    }
    let status = null;
    try {
        status = await (0, api_1.optionalApi)("status");
    }
    catch { /* Offline commands use cwd. */ }
    const workspace = (status && typeof status === "object" && !Array.isArray(status))
        ? status.workspace : "";
    (0, data_1.setProjectRoot)((0, data_1.validProjectRoot)(workspace) || cwd);
}
/**
 * The single dispatch owns every public entry since the compatibility layer was revoked
 * (user decision 2026-10-23). Kept exported so older imports keep resolving; it always routes
 * into runSimpleCli, which refuses removed entries explicitly instead of falling through.
 */
function isSimpleCommand(_argv) {
    return true;
}
function emitCliFailure(error, json, compact = false) {
    const mapped = (0, errors_2.asCliError)(error, 3);
    if (json)
        (0, format_1.writeJson)((0, errors_2.jsonErrorBody)(mapped), false);
    else {
        // Human mode keeps the refusal pointer/preview too, so revocations explain themselves without --json.
        process.stderr.write(mapped.detail ? `${mapped.message}\n${String(mapped.detail).trimEnd()}\n` : `${mapped.message}\n`);
    }
    return mapped.exitCode;
}
