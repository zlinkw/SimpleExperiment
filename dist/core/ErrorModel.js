"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleError = simpleError;
exports.normalizeSimpleError = normalizeSimpleError;
exports.isSimpleError = isSimpleError;
exports.userErrorMessage = userErrorMessage;
function simpleError(input) {
    return {
        code: input.code || "UNKNOWN",
        message: input.message,
        detail: input.detail,
        serverId: input.serverId,
        retryable: input.retryable,
        suggestion: input.suggestion,
        cause: input.cause,
    };
}
function normalizeSimpleError(error, fallback = "操作失败") {
    if (isSimpleError(error))
        return error;
    const text = error instanceof Error ? error.message : String(error || fallback);
    const lower = text.toLowerCase();
    if (lower.includes("timeout")) {
        return simpleError({ code: "TUNNEL_TIMEOUT", message: "本地隧道超时", detail: text, retryable: true, suggestion: "检查 Xshell 本地隧道和 Hub Agent。" });
    }
    if (lower.includes("unauthorized") || lower.includes("auth")) {
        return simpleError({ code: "TUNNEL_UNAUTHORIZED", message: "Hub Agent token 校验失败", detail: text, retryable: false, suggestion: "检查 token 配置。" });
    }
    if (lower.includes("econnrefused") || lower.includes("fetch failed")) {
        return simpleError({ code: "TUNNEL_UNAVAILABLE", message: "本地隧道不可用", detail: text, retryable: true, suggestion: "启动 Xshell 本地隧道或切换 offline_import。" });
    }
    if (lower.includes("agent incompatible")) {
        return simpleError({ code: "AGENT_INCOMPATIBLE", message: "Agent 协议不兼容", detail: text, retryable: true, suggestion: "更新 Hub Agent。" });
    }
    return simpleError({ code: "UNKNOWN", message: fallback, detail: text, retryable: true });
}
function isSimpleError(value) {
    const item = value;
    return Boolean(item && typeof item.code === "string" && typeof item.message === "string");
}
function userErrorMessage(error) {
    const normalized = normalizeSimpleError(error);
    return normalized.suggestion ? `${normalized.message}：${normalized.suggestion}` : normalized.message;
}
