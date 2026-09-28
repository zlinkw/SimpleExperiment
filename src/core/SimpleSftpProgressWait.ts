import { ProgressInactivity } from "./ProgressInactivity";

export async function callSftpWithProgress(
  method: string, params: Record<string, any>,
  discover: (method: string) => Promise<{ endpoint: URL; headers: Record<string, string> }>,
): Promise<any> {
  const { endpoint, headers } = await discover(method);
  const operationId = `sftp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fileOperation = /^(sync[.]|upload[.]|download[.]|remote[.])/.test(method);
  const requestAbort = new AbortController(), eventsAbort = new AbortController();
  let timer: NodeJS.Timeout | undefined, disposed = false;
  const knownIds = new Set<string>();
  async function cancelRemote(): Promise<void> {
    try {
      const current = await discover("transfers.cancel");
      await fetch(new URL("/api/v1/rpc", current.endpoint), {
        method: "POST", headers: { ...current.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.cancel", params: { operationId, reason: "调用方已取消或无真实进展" } }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch { /* Outcome remains unknown; never replay a modifying operation. */ }
  }
  const inactivity = new ProgressInactivity(fileOperation ? 120_000 : 30_000, () => {
    requestAbort.abort(new Error("无真实进展，执行结果待确认。请重新连接并检查目标状态，勿重复执行。"));
    void cancelRemote();
  });
  const onCancel = () => { requestAbort.abort(params.signal?.reason); void cancelRemote(); };
  if (params.signal?.aborted) onCancel();
  else params.signal?.addEventListener("abort", onCancel, { once: true });
  function accept(item: any): void {
    if (disposed || requestAbort.signal.aborted || item?.operationId !== operationId) return;
    if (item.id) knownIds.add(item.id);
    inactivity.update({ phase: item.phase, scope: item.progressScope || item.id, processedBytes: item.processedBytes ?? item.transferredBytes, processedFiles: item.processedFiles, status: item.status });
    if (item.status === "cancelled") requestAbort.abort(new Error(item.reason || "传输已取消"));
  }
  async function poll(): Promise<void> {
    if (disposed || requestAbort.signal.aborted) return;
    try {
      const current = await discover("transfers.list");
      const response = await fetch(new URL("/api/v1/rpc", current.endpoint), {
        method: "POST", headers: { ...current.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.list", params: {} }),
        signal: AbortSignal.any([eventsAbort.signal, AbortSignal.timeout(30_000)]),
      });
      const payload = await response.json() as any;
      for (const item of payload.result?.transfers || []) accept(item);
      if (!disposed && !requestAbort.signal.aborted) { timer = setTimeout(() => void poll(), 500); timer.unref?.(); }
    } catch { /* Manual recovery only. Do not restart a failed event connection or query. */ }
  }
  async function readEvents(): Promise<void> {
    try {
      const response = await fetch(new URL("/api/v1/events", endpoint), { headers, signal: eventsAbort.signal });
      if (!response.ok || !response.body) return;
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = "";
      while (!disposed) {
        const chunk = await reader.read(); if (chunk.done) break;
        pending += decoder.decode(chunk.value, { stream: true });
        const frames = pending.split(/\r?\n\r?\n/); pending = frames.pop() || "";
        for (const frame of frames) {
          const data = frame.split(/\r?\n/).filter(line => line.startsWith("data: ")).map(line => line.slice(6)).join("\n");
          if (data) { try { accept(JSON.parse(data)); } catch {} }
        }
      }
    } catch { /* Keep fallback reads; no event reconnect. */ }
  }
  if (fileOperation) { void readEvents(); timer = setTimeout(() => void poll(), 500); }
  try {
    const { signal: _signal, ...serializable } = params;
    const response = await fetch(new URL("/api/v1/rpc", endpoint), {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method, params: { ...serializable, _operationId: operationId } }),
      signal: requestAbort.signal,
    });
    if (!response.ok) throw new Error(`SimpleSFTP ${method} 失败：HTTP ${response.status}`);
    const payload = await response.json() as any;
    requestAbort.signal.throwIfAborted();
    if (payload.error) throw new Error(`SimpleSFTP ${method}：${payload.error.message || "未知错误"}`);
    if (payload.result?.ok === false) throw new Error(`SimpleSFTP ${method}：${payload.result.error || payload.result.message || "传输失败"}`);
    return payload.result;
  } finally {
    disposed = true; inactivity.dispose(); clearTimeout(timer); eventsAbort.abort();
    params.signal?.removeEventListener("abort", onCancel);
  }
}
