"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationLedger = void 0;
class OperationLedger {
    records = [];
    errors = new Map();
    begin(kind, scope, options = {}) {
        const record = {
            opId: `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            kind,
            scope,
            targetKeys: options.targetKeys || [],
            serverIds: options.serverIds,
            seq: options.seq,
            startedAt: Date.now(),
            status: "running",
        };
        this.records.unshift(record);
        this.trim();
        return record;
    }
    finish(op, status, error) {
        if (!op)
            return;
        const record = this.records.find((item) => item.opId === op.opId) || op;
        record.status = status;
        record.finishedAt = Date.now();
        if (error) {
            record.error = error;
            this.noteError(error);
        }
    }
    stale(kind, scope, seq, targetKeys = []) {
        const record = this.begin(kind, scope, { seq, targetKeys });
        this.finish(record, "stale_dropped");
    }
    noteError(message) {
        const text = String(message || "").trim();
        if (!text)
            return;
        const now = Date.now();
        const prev = this.errors.get(text);
        if (prev) {
            prev.count += 1;
            prev.lastAt = now;
        }
        else {
            this.errors.set(text, { message: text, count: 1, firstAt: now, lastAt: now });
        }
        if (this.errors.size > 50) {
            const oldest = Array.from(this.errors.values()).sort((a, b) => a.lastAt - b.lastAt)[0];
            if (oldest)
                this.errors.delete(oldest.message);
        }
    }
    recent(limit = 20) {
        return this.records.slice(0, limit).map((item) => ({ ...item, targetKeys: [...item.targetKeys], serverIds: item.serverIds ? [...item.serverIds] : undefined }));
    }
    recentErrors(limit = 20) {
        return Array.from(this.errors.values()).sort((a, b) => b.lastAt - a.lastAt).slice(0, limit).map((item) => ({ ...item }));
    }
    trim() {
        this.records.splice(100);
    }
}
exports.OperationLedger = OperationLedger;
