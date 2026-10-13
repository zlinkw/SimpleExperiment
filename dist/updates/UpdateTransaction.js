"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTransaction = exports.TRANSACTION_KEY = void 0;
const node_crypto_1 = require("node:crypto");
const ExtensionUpdates_1 = require("../features/ExtensionUpdates");
exports.TRANSACTION_KEY = "simpleExperiment.update.transaction.v1";
/** Port of Mac's ordered transaction, with receipts reconciled from installed versions. */
class UpdateTransaction {
    io;
    active;
    constructor(io) {
        this.io = io;
    }
    install(components, signal) {
        if (this.active)
            return this.active;
        const frozen = structuredClone(components);
        this.active = this.run(frozen, signal).finally(() => { this.active = undefined; });
        return this.active;
    }
    async run(components, signal) {
        if (components.length !== 2 || new Set(components.map(c => c.id)).size !== 2)
            throw new Error("更新事务必须包含两个唯一配套组件。");
        const fingerprint = (0, node_crypto_1.createHash)("sha256").update(JSON.stringify(components)).digest("hex");
        const previous = this.io.readJournal();
        const mixed = Boolean(previous && (previous.installationRequested || previous.completed.length && previous.status !== "preparing"));
        if (mixed && previous?.fingerprint !== fingerprint)
            throw new Error("配套更新尚未完成；请先补装原版本并重载，不能替换已确认的更新批次。");
        const journal = { schemaVersion: 1, fingerprint, components, completed: [], status: "preparing",
            installationRequested: Boolean(previous?.fingerprint === fingerprint && previous.installationRequested) };
        const installed = (c) => (0, ExtensionUpdates_1.compareSemanticVersions)(this.io.currentVersion(c.id) || "0.0.0", c.latestVersion) >= 0;
        journal.completed = components.filter(installed).map(c => c.id);
        const pending = components.filter(c => !installed(c));
        if (!pending.length && !mixed)
            return { ...journal, status: "reload_required" };
        let gate = false, installationRequested = false;
        try {
            signal?.throwIfAborted();
            gate = true;
            await this.io.beginGate();
            await this.io.saveJournal(journal);
            await this.io.waitForTransfers(signal);
            const prepared = new Map();
            for (const component of pending) {
                signal?.throwIfAborted();
                prepared.set(component.id, await this.io.prepare(component));
            }
            journal.status = "installing";
            await this.io.saveJournal(journal);
            for (const component of pending) {
                signal?.throwIfAborted();
                if (!installed(component)) {
                    const file = prepared.get(component.id);
                    await this.io.verify(file, component);
                    // An installer may succeed before its promise/receipt fails. Once
                    // requested, keep admission closed until a reload reconciles disk state.
                    if (!installed(component)) {
                        installationRequested = true;
                        journal.installationRequested = true;
                        await this.io.saveJournal(journal);
                        await this.io.install(file);
                    }
                }
                journal.completed.push(component.id);
                await this.io.saveJournal(structuredClone(journal));
            }
            journal.status = "reload_required";
            await this.io.saveJournal(journal);
            await this.io.reload();
            return journal;
        }
        catch (error) {
            journal.status = "failed";
            journal.error = String(error?.message || error);
            await this.io.saveJournal(journal);
            throw Object.assign(new Error(`配套更新未完成：${journal.error}。已完成：${journal.completed.join("、") || "无"}；待完成：${components.filter(c => !journal.completed.includes(c.id)).map(c => c.id).join("、") || "无"}`), { journal });
        }
        finally {
            if (gate && !installationRequested && !mixed)
                await this.io.endGate();
        }
    }
}
exports.UpdateTransaction = UpdateTransaction;
