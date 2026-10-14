import { randomUUID } from "node:crypto";

/** Only the pending exact payload can be answered, once. No persistent approval flag. */
export class RunConfirmation {
  private pending?: { id: string; payload: any; resolve(value: string): void };
  private opening = false;
  async ask(host: any, payload: any, signal?: AbortSignal): Promise<string> {
    if (this.pending || this.opening) throw new Error("已有路径确认窗口，请先完成或取消。");
    this.opening = true;
    try { await host.openPanelAt("execution", "execution-plan-list", { userInitiated: true }); }
    finally { this.opening = false; }
    if (signal?.aborted) return "cancel";
    return new Promise(resolve => {
      const finish = (value: string) => { clearTimeout(timer); signal?.removeEventListener("abort", cancel); this.pending = undefined;
        void host.view?.webview.postMessage({ type: "planRunConfirmationClosed" }); resolve(value); };
      const cancel = () => finish("cancel");
      const timer = setTimeout(cancel, 20 * 60 * 1000); timer.unref?.();
      this.pending = { id: randomUUID(), payload, resolve: finish };
      signal?.addEventListener("abort", cancel, { once: true });
      this.replay(host);
    });
  }
  replay(host: any): void {
    if (this.pending) void host.view?.webview.postMessage({ type: "planRunConfirmation", requestId: this.pending.id, payload: this.pending.payload });
  }
  answer(message: any): void {
    const pending = this.pending;
    if (!pending || pending.id !== message.requestId) return;
    const choice = String(message.choice || "cancel");
    if (choice !== "cancel" && !pending.payload.groups.some((group: any) => group.value === choice && !group.disabled)) return;
    pending.resolve(choice);
  }
  cancel(operationId?: string): void {
    if (!operationId || this.pending?.payload.operationId === operationId) this.pending?.resolve("cancel");
  }
}
