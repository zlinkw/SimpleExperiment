"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteExecutionService = void 0;
const OperationQueue_1 = require("../core/OperationQueue");
const ErrorModel_1 = require("../core/ErrorModel");
class RemoteExecutionService {
    runner;
    queue;
    constructor(runner, queue = new OperationQueue_1.OperationQueue()) {
        this.runner = runner;
        this.queue = queue;
    }
    run(serverId, command, options = {}) {
        let result = { code: 255, stdout: "", stderr: "not started" };
        return this.queue.enqueue({
            id: `remote-${serverId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: "remote_command",
            priority: options.priority || "manual",
            targetServers: [serverId],
            exclusiveKeys: [`remote:${serverId}`],
            timeoutMs: options.timeoutMs || 30000,
            run: async (signal) => {
                result = await this.runner(serverId, command, { purpose: options.purpose || "manual", timeoutMs: options.timeoutMs || 30000, signal });
                if (result.code !== 0)
                    throw (0, ErrorModel_1.normalizeZlkError)(result.stderr || result.stdout || `remote command failed: ${result.code}`);
            },
        }).then(() => result);
    }
}
exports.RemoteExecutionService = RemoteExecutionService;
