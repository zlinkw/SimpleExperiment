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
exports.defaultSshConfigPath = defaultSshConfigPath;
exports.readLocalSshServers = readLocalSshServers;
exports.parseLocalSshConfig = parseLocalSshConfig;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function defaultSshConfigPath() {
    return path.join(os.homedir(), ".ssh", "config");
}
async function readLocalSshServers(configPath = defaultSshConfigPath()) {
    try {
        const text = await fs.readFile(configPath, "utf8");
        return parseLocalSshConfig(text, configPath);
    }
    catch {
        return [];
    }
}
function parseLocalSshConfig(text, sourcePath = defaultSshConfigPath()) {
    const blocks = [];
    let current;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = stripComment(rawLine).trim();
        if (!line)
            continue;
        const match = /^([A-Za-z][A-Za-z0-9_-]*)\s+(.+)$/.exec(line);
        if (!match)
            continue;
        const key = match[1].toLowerCase();
        const value = unquote(match[2].trim());
        if (key === "host") {
            current = { names: value.split(/\s+/).filter((item) => item && !hasPattern(item)) };
            if (current.names.length)
                blocks.push(current);
            else
                current = undefined;
            continue;
        }
        if (!current)
            continue;
        if (key === "hostname")
            current.hostName = value;
        else if (key === "user")
            current.user = value;
        else if (key === "port")
            current.port = normalizeSshPort(value);
        else if (key === "identityfile" && !current.identityFile)
            current.identityFile = expandHome(value);
    }
    const seen = new Set();
    const out = [];
    for (const block of blocks) {
        for (const name of block.names) {
            const hostName = block.hostName || name;
            const key = `${name}\n${hostName}\n${block.user || ""}\n${block.port || 22}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push({
                name,
                hostName,
                user: block.user || "",
                port: block.port || 22,
                identityFile: block.identityFile,
                sourcePath,
            });
        }
    }
    return out;
}
function stripComment(line) {
    let quoted = false;
    let quote = "";
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if ((ch === "'" || ch === "\"") && line[i - 1] !== "\\") {
            if (!quoted) {
                quoted = true;
                quote = ch;
            }
            else if (quote === ch) {
                quoted = false;
                quote = "";
            }
        }
        if (ch === "#" && !quoted)
            return line.slice(0, i);
    }
    return line;
}
function unquote(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}
function hasPattern(value) {
    return /[*?!]/.test(value);
}
function normalizeSshPort(value) {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}
function expandHome(value) {
    if (value === "~")
        return os.homedir();
    if (value.startsWith("~/") || value.startsWith("~\\"))
        return path.join(os.homedir(), value.slice(2));
    return value;
}
