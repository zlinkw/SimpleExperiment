export type ZlkErrorCode =
  | "TUNNEL_TIMEOUT"
  | "TUNNEL_UNAUTHORIZED"
  | "TUNNEL_UNAVAILABLE"
  | "AGENT_STALE"
  | "AGENT_INCOMPATIBLE"
  | "WORKER_OFFLINE"
  | "RUNTIME_DEPLOY_FAILED"
  | "STATE_SCHEMA_INVALID"
  | "SYNC_PARTIAL_FAILURE"
  | "ARTIFACT_RESIDUE"
  | "UNKNOWN";

export interface ZlkError {
  code: ZlkErrorCode;
  message: string;
  detail?: string;
  serverId?: string;
  retryable?: boolean;
  suggestion?: string;
  cause?: unknown;
}

export function zlkError(input: Partial<ZlkError> & { message: string }): ZlkError {
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

export function normalizeZlkError(error: unknown, fallback = "操作失败"): ZlkError {
  if (isZlkError(error)) return error;
  const text = error instanceof Error ? error.message : String(error || fallback);
  const lower = text.toLowerCase();
  if (lower.includes("timeout")) {
    return zlkError({ code: "TUNNEL_TIMEOUT", message: "本地隧道超时", detail: text, retryable: true, suggestion: "检查 Xshell 本地隧道和 Hub Agent。" });
  }
  if (lower.includes("unauthorized") || lower.includes("auth")) {
    return zlkError({ code: "TUNNEL_UNAUTHORIZED", message: "Hub Agent token 校验失败", detail: text, retryable: false, suggestion: "检查 token 配置。" });
  }
  if (lower.includes("econnrefused") || lower.includes("fetch failed")) {
    return zlkError({ code: "TUNNEL_UNAVAILABLE", message: "本地隧道不可用", detail: text, retryable: true, suggestion: "启动 Xshell 本地隧道或切换 offline_import。" });
  }
  if (lower.includes("agent incompatible")) {
    return zlkError({ code: "AGENT_INCOMPATIBLE", message: "Agent 协议不兼容", detail: text, retryable: true, suggestion: "更新 Hub Agent。" });
  }
  return zlkError({ code: "UNKNOWN", message: fallback, detail: text, retryable: true });
}

export function isZlkError(value: unknown): value is ZlkError {
  const item = value as ZlkError;
  return Boolean(item && typeof item.code === "string" && typeof item.message === "string");
}

export function userErrorMessage(error: unknown): string {
  const normalized = normalizeZlkError(error);
  return normalized.suggestion ? `${normalized.message}：${normalized.suggestion}` : normalized.message;
}
