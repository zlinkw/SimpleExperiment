import { asCliError } from "../../api/LocalApiErrors";
import { businessContext, BusinessContext } from "./ExecutionContext";
export { businessError, envError, usageError } from "../../api/LocalApiErrors";

export function queryContext(): BusinessContext {
  const context = businessContext.getStore();
  if (!context) throw new Error("MCP_QUERY_CONTEXT_REQUIRED");
  return context;
}
export function callApi(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return queryContext().rpc(method, params);
}
export async function optionalApi(method: string, params: Record<string, unknown> = {}): Promise<unknown | null> {
  const context = queryContext();
  try { return await context.rpc(method, params); }
  catch (error) {
    if (Number((error as { apiCode?: number }).apiCode) === -32601) return null;
    const mapped = asCliError(error, 4);
    if (mapped.exitCode === 4 || mapped.exitCode === 2) return null;
    throw mapped;
  }
}
export function emit(value: unknown): void { queryContext().emit(value); }
