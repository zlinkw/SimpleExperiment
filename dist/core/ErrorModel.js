"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zlkError = zlkError;
exports.normalizeZlkError = normalizeZlkError;
exports.isZlkError = isZlkError;
exports.userErrorMessage = userErrorMessage;
function zlkError(input) {
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
function normalizeZlkError(error, fallback = "操作失败") {
    if (isZlkError(error))
        return error;
    const text = error instanceof Error ? error.message : String(error || fallback);
    const lower = text.toLowerCase();
    if (lower.includes("timeout")) {
        return zlkError({ code: "TUNNEL_TIMEOUT", message: "本地隧道超时", detail: text, retryable: true, suggestion: "检查 MobaXterm tunnel 和 Hub Agent。" });
    }
    if (lower.includes("unauthorized") || lower.includes("auth")) {
        return zlkError({ code: "TUNNEL_UNAUTHORIZED", message: "Hub Agent token 校验失败", detail: text, retryable: false, suggestion: "检查 token 配置。" });
    }
    if (lower.includes("econnrefused") || lower.includes("fetch failed")) {
        return zlkError({ code: "TUNNEL_UNAVAILABLE", message: "本地隧道不可用", detail: text, retryable: true, suggestion: "启动 MobaXterm tunnel 或切换 offline_import。" });
    }
    if (lower.includes("agent incompatible")) {
        return zlkError({ code: "AGENT_INCOMPATIBLE", message: "Agent 协议不兼容", detail: text, retryable: true, suggestion: "更新 Hub Agent。" });
    }
    return zlkError({ code: "UNKNOWN", message: fallback, detail: text, retryable: true });
}
function isZlkError(value) {
    const item = value;
    return Boolean(item && typeof item.code === "string" && typeof item.message === "string");
}
function userErrorMessage(error) {
    const normalized = normalizeZlkError(error);
    return normalized.suggestion ? `${normalized.message}：${normalized.suggestion}` : normalized.message;
}
