"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebviewBridge = void 0;
class WebviewBridge {
    webview;
    batchMs;
    timer;
    pending = [];
    constructor(webview, batchMs = 200) {
        this.webview = webview;
        this.batchMs = batchMs;
    }
    post(type, payload) {
        this.pending.push({ type, ...payload });
        if (this.timer)
            return;
        this.timer = setTimeout(() => void this.flush(), this.batchMs);
        this.timer.unref?.();
    }
    async flush() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = undefined;
        const batch = this.pending;
        this.pending = [];
        if (batch.length === 1)
            await this.webview.postMessage(batch[0]);
        else if (batch.length)
            await this.webview.postMessage({ type: "batch", messages: batch });
    }
}
exports.WebviewBridge = WebviewBridge;
