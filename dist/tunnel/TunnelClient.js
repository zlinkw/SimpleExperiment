"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpTunnelClient = exports.tunnelActions = void 0;
const RequestBudget_1 = require("./RequestBudget");
const TunnelGateway_1 = require("./TunnelGateway");
exports.tunnelActions = [
    "run-plan", "stop-experiment", "retry-experiment", "reproduce-plan", "validate-plan", "dry-run-plan",
    "archive-artifacts", "exclude-results", "sync-artifacts", "complete-three-way", "delete-artifacts", "reconcile-deletions",
    "parse-results", "refresh-results", "self-check", "rescan-results", "run-quality-gate", "run-statistics", "export-paper-table",
    "check-claim-evidence", "deploy-runtime", "restart-agent", "create-debug-bundle", "create-offline-bundle", "cancel-operation",
    "check-output-contract", "parse-case-level", "run-leakage-check", "run-subgroup-analysis", "export-case-analysis", "plan-checkpoint-retention",
    "inspect-dataset", "export-plotting-contract", "infer-config-from-run", "recover-plan-from-run", "diagnose-result-anomaly", "compare-with-best-config",
    "start-worker-task", "stop-worker-task", "retry-worker-task", "delete-worker-artifacts", "archive-worker-artifacts", "finalize-worker-operation",
];
const getPurposeByPath = new Map([
    ["/api/health", "health"],
    ["/api/snapshot", "snapshot"],
    ["/api/gpu", "snapshot"],
    ["/api/scheduler", "snapshot"],
    ["/api/traces", "snapshot"],
    ["/api/live-output", "snapshot"],
    ["/api/results/summary", "snapshot"],
    ["/api/diagnostics", "diagnostics"],
    ["/api/audit/tail", "diagnostics"],
]);
const actionPurpose = {
    "validate-plan": "run_plan",
    "dry-run-plan": "run_plan",
    "run-plan": "run_plan",
    "stop-experiment": "stop",
    "retry-experiment": "run_plan",
    "reproduce-plan": "run_plan",
    "parse-results": "parse_results",
    "refresh-results": "manual_refresh",
    "run-quality-gate": "parse_results",
    "run-statistics": "parse_results",
    "export-paper-table": "parse_results",
    "archive-artifacts": "manual_refresh",
    "sync-artifacts": "manual_refresh",
    "complete-three-way": "manual_refresh",
    "delete-artifacts": "manual_refresh",
    "reconcile-deletions": "manual_refresh",
    "self-check": "diagnostics",
    "create-debug-bundle": "diagnostics",
    "rescan-results": "manual_refresh",
};
class HttpTunnelClient {
    endpoint;
    budget;
    snapshotPromise;
    constructor(endpoint, budget) {
        this.endpoint = endpoint;
        this.budget = budget;
        (0, TunnelGateway_1.assertLocalhost)(endpoint.localHost);
    }
    getHealth(options = {}) {
        return this.requestJson("/api/health", "health", undefined, {
            method: "GET",
            userInitiated: options.userInitiated,
        });
    }
    getSnapshot(options = {}) {
        if (options.manual) {
            return this.requestJson("/api/snapshot", "manual_refresh", undefined, {
                method: "GET",
                userInitiated: true,
            });
        }
        if (!this.snapshotPromise) {
            this.snapshotPromise = this.requestJson("/api/snapshot", "snapshot", undefined, { method: "GET" })
                .finally(() => {
                this.snapshotPromise = undefined;
            });
        }
        return this.snapshotPromise;
    }
    getGpu() {
        return this.getPath("/api/gpu");
    }
    getGpuHistory(query = {}) {
        const params = new URLSearchParams();
        if (query.serverId)
            params.set("serverId", query.serverId);
        if (query.gpuId)
            params.set("gpuId", query.gpuId);
        if (query.start !== undefined)
            params.set("start", String(query.start));
        if (query.end !== undefined)
            params.set("end", String(query.end));
        if (query.maxPoints !== undefined)
            params.set("maxPoints", String(Math.max(1, Math.min(864, Math.trunc(query.maxPoints) || 1))));
        const suffix = params.size ? `?${params.toString()}` : "";
        return this.requestJson(`/api/gpu/history${suffix}`, "gpu_history", undefined, {
            method: "GET",
            userInitiated: false,
        });
    }
    getScheduler() {
        return this.getPath("/api/scheduler");
    }
    getTraces() {
        return this.getPath("/api/traces");
    }
    getLiveOutput(runKey, since = 0) {
        const params = new URLSearchParams({ runKey, since: String(Math.max(0, since)) });
        return this.getPath(`/api/live-output?${params.toString()}`);
    }
    getResultsSummary() {
        return this.getPath("/api/results/summary");
    }
    getDiagnostics() {
        return this.getPath("/api/diagnostics");
    }
    getAuditTail() {
        return this.getPath("/api/audit/tail");
    }
    getOperation(operationId) {
        const id = String(operationId || "").trim();
        if (!id)
            throw new Error("operationId is required.");
        return this.requestJson(`/api/operations/${encodeURIComponent(id)}`, "diagnostics", undefined, {
            method: "GET",
            userInitiated: true,
        });
    }
    async postAction(action, body) {
        if (!body || typeof body !== "object" || !("opId" in body) || !String(body.opId || "").trim()) {
            throw new Error("Tunnel action requires opId.");
        }
        return this.requestJson(`/api/actions/${action}`, actionPurpose[action] || "manual_refresh", body, {
            method: "POST",
            userInitiated: true,
        });
    }
    postAvailabilityBatch(body) {
        return this.requestJson("/api/worker/availability/batch", "manual_refresh", body, {
            method: "POST",
            userInitiated: false,
        });
    }
    async openEventStream() {
        throw new RequestBudget_1.RequestBudgetDeniedError("events", { allowed: false, reason: "offline" });
    }
    getPath(path) {
        const purpose = getPurposeByPath.get(path.split("?", 1)[0]);
        if (!purpose)
            throw new Error(`API path not allowed: ${path}`);
        return this.requestJson(path, purpose, undefined, { method: "GET" });
    }
    async requestJson(apiPath, purpose, body, options) {
        if (!apiPath.startsWith("/api/"))
            throw new Error("Only Hub Agent API paths are allowed.");
        const base = (0, TunnelGateway_1.localBaseUrl)(this.endpoint);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.endpoint.timeoutMs ?? 8_000);
        timeout.unref?.();
        try {
            return await this.budget.run(purpose, async () => {
                const response = await fetch(`${base}${apiPath}`, {
                    method: options.method,
                    signal: controller.signal,
                    headers: this.headers(body !== undefined),
                    body: body === undefined ? undefined : JSON.stringify(body),
                });
                const text = await response.text();
                if (!response.ok)
                    throw new Error(`Hub Agent HTTP ${response.status}: ${text.slice(0, 200)}`);
                if (!text.trim())
                    return {};
                return JSON.parse(text);
            }, { userInitiated: options.userInitiated });
        }
        finally {
            clearTimeout(timeout);
        }
    }
    headers(hasBody) {
        const headers = { Accept: "application/json" };
        if (hasBody)
            headers["Content-Type"] = "application/json";
        if (this.endpoint.token)
            headers["X-ZLK-Agent-Token"] = this.endpoint.token;
        return headers;
    }
}
exports.HttpTunnelClient = HttpTunnelClient;
