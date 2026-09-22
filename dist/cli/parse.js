"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgv = parseArgv;
exports.requirePositional = requirePositional;
const errors_1 = require("./errors");
const VALUE_FLAGS = new Set(["--status", "--limit", "--lines", "--experiment", "--format", "--seed", "--from", "--out", "--output", "--file", "--type"]);
function parseArgv(argv) {
    const positionals = [];
    const flags = { json: false, compactJson: false, full: false, help: false, dryRun: false, check: false, watch: false };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--") {
            positionals.push(...argv.slice(i + 1));
            break;
        }
        if (token === "--json") {
            flags.json = true;
            continue;
        }
        if (token === "--compact-json") {
            flags.json = true;
            flags.compactJson = true;
            continue;
        }
        if (token === "--help" || token === "-h") {
            flags.help = true;
            continue;
        }
        if (token === "--dry-run") {
            flags.dryRun = true;
            continue;
        }
        if (token === "--check") {
            flags.check = true;
            continue;
        }
        if (token === "--watch") {
            flags.watch = true;
            continue;
        }
        if (token === "--full") {
            flags.full = true;
            continue;
        }
        const eq = token.indexOf("=");
        if (token.startsWith("--") && eq > 2) {
            applyFlag(flags, token.slice(0, eq), token.slice(eq + 1));
            continue;
        }
        if (VALUE_FLAGS.has(token)) {
            const value = argv[i + 1];
            if (value === undefined || value.startsWith("-"))
                throw (0, errors_1.usageError)(`missing value for ${token}`);
            applyFlag(flags, token, value);
            i += 1;
            continue;
        }
        if (token.startsWith("-"))
            throw (0, errors_1.usageError)(`unknown option: ${token}`);
        positionals.push(token);
    }
    return { positionals, flags };
}
function applyFlag(flags, name, value) {
    if (name === "--status")
        flags.status = value;
    else if (name === "--limit" || name === "--lines") {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0)
            throw (0, errors_1.usageError)(`invalid ${name}: ${value}`);
        if (name === "--limit")
            flags.limit = parsed;
        else
            flags.lines = parsed;
    }
    else if (name === "--experiment")
        flags.experiment = value;
    else if (name === "--format")
        flags.format = value;
    else if (name === "--seed")
        flags.seed = value;
    else if (name === "--from")
        flags.from = value;
    else if (name === "--out" || name === "--output")
        flags.out = value;
    else if (name === "--file")
        flags.file = value;
    else if (name === "--type") {
        if (!["workflow", "worker_run"].includes(value))
            throw (0, errors_1.usageError)(`invalid --type: ${value}`);
        flags.type = value;
    }
    else
        throw (0, errors_1.usageError)(`unknown option: ${name}`);
}
function requirePositional(positionals, index, name) {
    const value = String(positionals[index] || "").trim();
    if (!value)
        throw (0, errors_1.usageError)(`missing ${name}`);
    return value;
}
