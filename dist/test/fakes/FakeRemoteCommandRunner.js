"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeRemoteCommandRunner = void 0;
class FakeRemoteCommandRunner {
    calls = [];
    handlers = [];
    on(match, result) {
        this.handlers.push({ match, result });
        return this;
    }
    async run(serverId, command, options = {}) {
        const call = { serverId, command, ...options };
        this.calls.push(call);
        const handler = this.handlers.find((item) => typeof item.match === "string" ? command.includes(item.match) : item.match.test(command));
        const result = handler
            ? typeof handler.result === "function" ? await handler.result(call) : handler.result
            : { code: 0, stdout: "", stderr: "" };
        if (result.delayMs && options.timeoutMs && result.delayMs > options.timeoutMs) {
            return { code: 255, stdout: "", stderr: "timeout" };
        }
        return result;
    }
}
exports.FakeRemoteCommandRunner = FakeRemoteCommandRunner;
