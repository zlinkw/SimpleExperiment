import { OperationQueue } from "../core/OperationQueue";
import { normalizeZlkError } from "../core/ErrorModel";

export interface RemoteExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type RemoteRunner = (serverId: string, command: string, options: { purpose: string; timeoutMs: number; signal?: AbortSignal }) => Promise<RemoteExecutionResult>;

export class RemoteExecutionService {
  constructor(private readonly runner: RemoteRunner, private readonly queue = new OperationQueue()) {}

  run(serverId: string, command: string, options: { purpose?: string; timeoutMs?: number; priority?: "manual" | "background" | "realtime" | "user_blocking" } = {}): Promise<RemoteExecutionResult> {
    let result: RemoteExecutionResult = { code: 255, stdout: "", stderr: "not started" };
    return this.queue.enqueue({
      id: `remote-${serverId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "remote_command",
      priority: options.priority || "manual",
      targetServers: [serverId],
      exclusiveKeys: [`remote:${serverId}`],
      timeoutMs: options.timeoutMs || 30000,
      run: async (signal) => {
        result = await this.runner(serverId, command, { purpose: options.purpose || "manual", timeoutMs: options.timeoutMs || 30000, signal });
        if (result.code !== 0) throw normalizeZlkError(result.stderr || result.stdout || `remote command failed: ${result.code}`);
      },
    }).then(() => result);
  }
}



