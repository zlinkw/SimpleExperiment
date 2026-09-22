"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliError = exports.EXIT_NETWORK = exports.EXIT_BUSINESS = exports.EXIT_ENV = exports.EXIT_USAGE = exports.EXIT_OK = void 0;
exports.usageError = usageError;
exports.envError = envError;
exports.businessError = businessError;
exports.networkError = networkError;
exports.jsonErrorBody = jsonErrorBody;
exports.asCliError = asCliError;
exports.EXIT_OK = 0;
exports.EXIT_USAGE = 1;
exports.EXIT_ENV = 2;
exports.EXIT_BUSINESS = 3;
exports.EXIT_NETWORK = 4;
class CliError extends Error {
    exitCode;
    code;
    detail;
    constructor(exitCode, code, message, detail = "") {
        super(message);
        this.name = "CliError";
        this.exitCode = exitCode;
        this.code = code;
        this.detail = detail;
    }
}
exports.CliError = CliError;
function usageError(message, detail = "") {
    return new CliError(exports.EXIT_USAGE, "USAGE", message, detail);
}
function envError(message, detail = "") {
    return new CliError(exports.EXIT_ENV, "ENV", message, detail);
}
function businessError(message, detail = "") {
    return new CliError(exports.EXIT_BUSINESS, "BUSINESS", message, detail);
}
function networkError(message, detail = "") {
    return new CliError(exports.EXIT_NETWORK, "NETWORK", message, detail);
}
function jsonErrorBody(error) {
    return {
        success: false,
        error: {
            code: error.code,
            message: error.message,
            detail: parseDetail(error.detail || ""),
        },
    };
}
function parseDetail(value) {
    const text = String(value || "");
    if (!text.startsWith("{"))
        return text;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function asCliError(error, fallback = exports.EXIT_BUSINESS) {
    if (error instanceof CliError)
        return error;
    const err = error;
    const message = error instanceof Error ? error.message : String(error);
    const code = String(err?.code || "");
    if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code) || /timed out|ECONNREFUSED/i.test(message)) {
        return networkError(message, code);
    }
    if (/discovery not found|discovery is invalid|Open VS Code/i.test(message)) {
        return envError(message, code);
    }
    return new CliError(fallback, code || "ERROR", message, code);
}
