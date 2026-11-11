import { AsyncLocalStorage } from "node:async_hooks";
import type { Permission } from "./ToolCatalog";
import type { AuthorizedWorker } from "./ProjectAuthorization";

export const mcpInvocation = new AsyncLocalStorage<{
  permission(permission: Permission): void;
  workers(): AuthorizedWorker[];
}>();

export function authorizedRemoteTargets(targets: any[]): boolean {
  const invocation = mcpInvocation.getStore();
  if (!invocation) return false;
  invocation.permission("sync");
  const workers = invocation.workers();
  for (const target of targets) {
    const worker = workers.find(row => row.id === target.id);
    if (!worker || worker.host !== target.host || worker.port !== target.port || worker.user !== target.user
        || worker.projectRoot.replace(/\/+$/, "") !== String(target.remotePath).replace(/\/+$/, "")) throw Error("MCP_REMOTE_TARGET_NOT_AUTHORIZED");
  }
  return true;
}

export function authorizedEmptyRunChoice(payload: any): string | undefined {
  const invocation = mcpInvocation.getStore();
  if (!invocation) return undefined;
  invocation.permission("experiment");
  const group = payload.phase === 1 && payload.groups.find((row: any) => row.value === "rerun_missing" && !row.disabled && row.targets.length === 0);
  return group ? "rerun_missing" : undefined;
}
