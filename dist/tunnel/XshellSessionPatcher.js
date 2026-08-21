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
exports.updateXshellSessionLoginCommand = updateXshellSessionLoginCommand;
exports.setLoginCommand = setLoginCommand;
exports.getLoginCommand = getLoginCommand;
exports.isSimpleManagedLoginCommand = isSimpleManagedLoginCommand;
const fs = __importStar(require("fs/promises"));
async function updateXshellSessionLoginCommand(filePath, command, options = {}) {
    const original = await fs.readFile(filePath);
    const encoding = detectEncoding(original);
    const text = decodeText(original, encoding);
    const existingCommand = getLoginCommand(text);
    if (existingCommand && options.skipIfRemoteCommandIncludes?.some((marker) => marker && existingCommand.includes(marker))) {
        return { filePath, command, changed: false, skippedReason: "existing_simple_command" };
    }
    const existing = String(existingCommand || "").trim();
    if (existing) {
        const targetSession = simpleAgentSessionName(command);
        const existingSession = simpleAgentSessionName(existing);
        if (!isSimpleManagedLoginCommand(existing)) {
            return { filePath, command, changed: false, skippedReason: "non_simple_remote_command" };
        }
        if (existingSession && targetSession && existingSession !== targetSession) {
            return { filePath, command, changed: false, skippedReason: "different_simple_agent_session" };
        }
    }
    const nextText = setLoginCommand(text, command);
    if (nextText === text)
        return { filePath, command, changed: false };
    let backupPath;
    if (options.backup !== false) {
        backupPath = `${filePath}.simple-backup`;
        await fs.copyFile(filePath, backupPath);
    }
    await fs.writeFile(filePath, encodeText(nextText, encoding));
    return { filePath, command, backupPath, changed: true };
}
function setLoginCommand(text, command) {
    const normalized = text.replace(/^\uFEFF/, "");
    const lines = normalized.split(/\r?\n/);
    let replaced = false;
    const next = lines.map((line) => {
        if (/^RemoteCommand=/i.test(line.trim())) {
            replaced = true;
            return `RemoteCommand=${command}`;
        }
        return line;
    });
    if (!replaced)
        next.push(`RemoteCommand=${command}`);
    return next.join("\r\n");
}
function getLoginCommand(text) {
    const normalized = text.replace(/^\uFEFF/, "");
    for (const line of normalized.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!/^RemoteCommand=/i.test(trimmed))
            continue;
        return trimmed.slice(trimmed.indexOf("=") + 1);
    }
    return undefined;
}
function isSimpleManagedLoginCommand(command) {
    const text = String(command || "");
    if (!text.trim())
        return false;
    if (/SIMPLE_EXPERIMENT_AGENT_TMUX_V\d+=1/.test(text))
        return true;
    if (/\bcluster_agent\.py\b/.test(text) && /\bSESSION=/.test(text))
        return true;
    return Boolean(simpleAgentSessionName(text) && /\btmux\b/.test(text));
}
function simpleAgentSessionName(command) {
    const text = String(command || "");
    const patterns = [
        /\bSESSION=(['"])([a-z0-9][a-z0-9._-]*-agent)\1/,
        /\bSESSION=([a-z0-9][a-z0-9._-]*-agent)\b/,
        /\btmux\s+(?:new-session|attach(?:-session)?|has-session|kill-session)[^;\r\n]*\s(?:-s|-t)\s+(['"]?)([a-z0-9][a-z0-9._-]*-agent)\1/,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        const session = match?.[2] || "";
        if (session)
            return session;
    }
    return "";
}
function detectEncoding(buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe)
        return "utf16le";
    if (buffer.includes(0))
        return "utf16le";
    return "utf8";
}
function decodeText(buffer, encoding) {
    return buffer.toString(encoding).replace(/^\uFEFF/, "");
}
function encodeText(text, encoding) {
    if (encoding === "utf16le")
        return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
    return text;
}
