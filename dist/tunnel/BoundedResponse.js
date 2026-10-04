"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoundedSseDecoder = exports.MAX_SSE_EVENT_BYTES = exports.MAX_CONTROL_RESPONSE_BYTES = void 0;
exports.readBoundedResponseText = readBoundedResponseText;
/** Control-plane JSON/events only. File transfers use their existing streaming path. */
exports.MAX_CONTROL_RESPONSE_BYTES = 32 * 1024 * 1024;
exports.MAX_SSE_EVENT_BYTES = 1024 * 1024;
async function readBoundedResponseText(response, onBytes, limit = exports.MAX_CONTROL_RESPONSE_BYTES) {
    const reader = response.body?.getReader();
    if (!reader)
        return "";
    let finished = false;
    try {
        if (Number(response.headers.get("content-length")) > limit)
            throw new Error("Agent response exceeds control-plane byte limit");
        const chunks = [];
        let received = 0;
        for (;;) {
            const chunk = await reader.read();
            if (chunk.done) {
                finished = true;
                break;
            }
            received += chunk.value.byteLength;
            if (received > limit)
                throw new Error("Agent response exceeds control-plane byte limit");
            chunks.push(chunk.value);
            onBytes(received);
        }
        return Buffer.concat(chunks, received).toString("utf8");
    }
    finally {
        // Cancellation must not hold the request slot if an upstream stream ignores cancel().
        if (!finished)
            void reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
/** SSE can split UTF-8 and delimiters across reads; bound each frame, not the session. */
class BoundedSseDecoder {
    limit;
    decoder = new TextDecoder();
    pending = "";
    constructor(limit = exports.MAX_SSE_EVENT_BYTES) {
        this.limit = limit;
    }
    push(chunk) {
        const text = this.pending + this.decoder.decode(chunk, { stream: chunk !== undefined });
        this.pending = "";
        const parts = text.split(/\r?\n\r?\n/);
        const tail = parts.pop() || "";
        for (const part of [...parts, tail]) {
            if (Buffer.byteLength(part, "utf8") > this.limit)
                throw new Error("Agent SSE frame exceeds control-plane byte limit");
        }
        if (chunk === undefined) {
            if (tail)
                parts.push(tail);
        }
        else
            this.pending = tail;
        return parts.map(part => part.split(/\r?\n/).filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trim()).join("\n")).filter(Boolean);
    }
}
exports.BoundedSseDecoder = BoundedSseDecoder;
