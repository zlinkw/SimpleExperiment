"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postMessageWithTimeout = postMessageWithTimeout;
function postMessageWithTimeout(postMessage, timeoutMs, timers = globalThis) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = timers.setTimeout(() => {
            if (settled)
                return;
            settled = true;
            reject(new Error("Webview state delivery timed out"));
        }, Math.max(1, timeoutMs));
        Promise.resolve().then(postMessage).then((accepted) => {
            if (settled)
                return;
            settled = true;
            timers.clearTimeout(timer);
            resolve(accepted !== false);
        }, (error) => {
            if (settled)
                return;
            settled = true;
            timers.clearTimeout(timer);
            reject(error);
        });
    });
}
