"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSimpleCli = runSimpleCli;
exports.isSimpleCommand = isSimpleCommand;
exports.emitCliFailure = emitCliFailure;
const commands_1 = require("./commands");
const errors_1 = require("./errors");
const format_1 = require("./format");
const help_1 = require("./help");
const parse_1 = require("./parse");
const LEGACY_COMMANDS = new Set(["status", "api", "self-check", "agent", "experiments", "metrics", "results", "run"]);
const SIMPLE_DOMAINS = new Set(["project", "experiment", "plan", "result", "log", "metric", "compare", "gpu", "resource", "server", "artifact"]);
async function runSimpleCli(argv) {
    let parsed;
    try {
        parsed = (0, parse_1.parseArgv)(argv);
    }
    catch (error) {
        throw (0, errors_1.usageError)(error instanceof Error ? error.message : String(error));
    }
    const { positionals, flags } = parsed;
    const [domain, action, ...rest] = positionals;
    if (!domain || domain === "help" || (flags.help && !action)) {
        (0, format_1.writeText)(domain && SIMPLE_DOMAINS.has(domain) ? (0, help_1.domainHelp)(domain) : help_1.SIMPLE_HELP);
        return errors_1.EXIT_OK;
    }
    if (flags.help) {
        (0, format_1.writeText)((0, help_1.domainHelp)(domain));
        return errors_1.EXIT_OK;
    }
    if (domain === "project") {
        if (action && action !== "status")
            throw (0, errors_1.usageError)(`unknown project action: ${action}`);
        return (0, commands_1.projectStatus)(flags);
    }
    if (domain === "experiment") {
        if (!action)
            throw (0, errors_1.usageError)("missing experiment action", (0, help_1.domainHelp)("experiment"));
        return (0, commands_1.experimentCommand)(action, rest, flags);
    }
    if (domain === "plan") {
        if (!action)
            throw (0, errors_1.usageError)("missing plan action", (0, help_1.domainHelp)("plan"));
        return (0, commands_1.planCommand)(action, rest, flags);
    }
    if (domain === "result") {
        if (!action)
            throw (0, errors_1.usageError)("missing result action", (0, help_1.domainHelp)("result"));
        return (0, commands_1.resultCommand)(action, rest, flags);
    }
    if (domain === "log") {
        if (!action)
            throw (0, errors_1.usageError)("missing log action", (0, help_1.domainHelp)("log"));
        return (0, commands_1.logCommand)(action, rest, flags);
    }
    if (domain === "metric") {
        if (!action)
            throw (0, errors_1.usageError)("missing metric action", (0, help_1.domainHelp)("metric"));
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
            throw (0, errors_1.usageError)("missing artifact action", (0, help_1.domainHelp)("artifact"));
        return (0, commands_1.artifactCommand)(action, rest, flags);
    }
    throw (0, errors_1.usageError)(`unknown domain: ${domain}`);
}
function isSimpleCommand(argv) {
    const tokens = argv.filter((item) => item !== "--json" && item !== "--help" && item !== "-h" && !item.startsWith("--"));
    const first = tokens[0] || "";
    const second = tokens[1] || "";
    if (!first)
        return true;
    if (first === "plan" && second === "build")
        return false;
    if (SIMPLE_DOMAINS.has(first))
        return true;
    if (LEGACY_COMMANDS.has(first))
        return false;
    return first === "help";
}
function emitCliFailure(error, json, compact = false) {
    const mapped = (0, errors_1.asCliError)(error, 3);
    if (json)
        (0, format_1.writeJson)((0, errors_1.jsonErrorBody)(mapped), false);
    else
        process.stderr.write(`${mapped.message}\n`);
    return mapped.exitCode;
}
