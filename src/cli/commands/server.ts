import { optionalApi } from "../api";
import { usageError } from "../errors";
import { table, writeJson, writeText } from "../format";
import { CliFlags } from "../parse";

export async function serverCommand(action: string, _rest: string[], flags: CliFlags): Promise<number> {
  if (action !== "list") throw usageError(`unknown server action: ${action || "(missing)"}`);
  const [status, gpu, servers] = await Promise.all([
    optionalApi("status"),
    optionalApi("gpu.list"),
    optionalApi("server.testAll", { refresh: false }),
  ]);
  const rows = collectServers(status, gpu, servers);
  if (flags.json) {
    writeJson(rows, flags.compactJson);
    return 0;
  }
  writeText(table(["id", "online", "ssh", "gpu"], rows));
  return 0;
}

function collectServers(status: unknown, gpu: unknown, servers: unknown): Array<{ id: string; online: string; ssh: string; gpu: string }> {
  const byId = new Map<string, { id: string; online: string; ssh: string; gpu: string }>();
  const upsert = (id: string, patch: Partial<{ online: string; ssh: string; gpu: string }>) => {
    if (!id) return;
    const prev = byId.get(id) || { id, online: "unknown", ssh: "unknown", gpu: "unknown" };
    byId.set(id, { ...prev, ...patch, id });
  };
  const statusRecord = asRecord(status);
  const topology = asRecord(statusRecord.topology);
  for (const item of arrayOf(topology.workers || topology.endpoints || topology.servers)) {
    const record = asRecord(item);
    upsert(String(record.id || record.displayName || ""), {
      online: String(record.online ?? record.reachable ?? record.status ?? "unknown"),
    });
  }
  const gpuRecord = asRecord(asRecord(gpu).gpu || gpu);
  for (const [id, value] of Object.entries(gpuRecord)) {
    if (["source", "gpuHistory"].includes(id)) continue;
    const gpus = Array.isArray(value) ? value : asRecord(value).gpus;
    const count = Array.isArray(gpus) ? gpus.length : (value ? 1 : 0);
    upsert(id, { gpu: count ? `${count}` : "unknown", online: count ? "online" : "unknown" });
  }
  for (const item of arrayOf(asRecord(servers).rows)) {
    const record = asRecord(item);
    const id = String(record.serverId || record.id || "");
    upsert(id, {
      online: record.status === "ok" ? "online" : String(record.status || "unknown"),
      ssh: record.host ? `${record.user ? String(record.user) + "@" : ""}${record.host}:${record.port}` : "configured",
    });
  }
  if (!byId.size) {
    upsert("local", { online: status ? "online" : "offline", ssh: "n/a", gpu: "unknown" });
  }
  return Array.from(byId.values());
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
