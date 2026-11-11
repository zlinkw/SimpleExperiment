import { AsyncLocalStorage } from "node:async_hooks";

/** Per-call business context. CLI defaults remain unchanged; the host never changes cwd or stdout. */
export interface BusinessContext {
  root: string;
  rpc(method: string, params: Record<string, unknown>): Promise<unknown>;
  emit(value: unknown): void;
}
export const businessContext = new AsyncLocalStorage<BusinessContext>();
