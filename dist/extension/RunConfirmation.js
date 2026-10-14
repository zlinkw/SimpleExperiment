"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunConfirmation = void 0;
const node_crypto_1 = require("node:crypto");
/** Only the pending exact payload can be answered, once. No persistent approval flag. */
class RunConfirmation {
    pending;
    async ask(host, payload, signal) {
        if (this.pending)
            throw new Error("已有路径确认窗口，请先完成或取消。");
        await host.openPanelAt("execution", "execution-plan-list", { userInitiated: true });
        if (signal?.aborted)
            return "cancel";
        return new Promise(resolve => {
            const finish = (value) => {
                clearTimeout(timer);
                signal?.removeEventListener("abort", cancel);
                this.pending = undefined;
                void host.view?.webview.postMessage({ type: "planRunConfirmationClosed" });
                resolve(value);
            };
            const cancel = () => finish("cancel");
            const timer = setTimeout(cancel, 20 * 60 * 1000);
            timer.unref?.();
            this.pending = { id: (0, node_crypto_1.randomUUID)(), payload, resolve: finish };
            signal?.addEventListener("abort", cancel, { once: true });
            this.replay(host);
        });
    }
    replay(host) {
        if (this.pending)
            void host.view?.webview.postMessage({ type: "planRunConfirmation", requestId: this.pending.id, payload: this.pending.payload });
    }
    answer(message) {
        const pending = this.pending;
        if (!pending || pending.id !== message.requestId)
            return;
        const choice = String(message.choice || "cancel");
        if (choice !== "cancel" && !pending.payload.groups.some((group) => group.value === choice && !group.disabled))
            return;
        pending.resolve(choice);
    }
    cancel(operationId) {
        if (!operationId || this.pending?.payload.operationId === operationId)
            this.pending?.resolve("cancel");
    }
}
exports.RunConfirmation = RunConfirmation;
