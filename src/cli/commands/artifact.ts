import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { callApi, optionalApi } from "../api";
import { copyFile, fileExists, listFilesRecursive, projectRoot, readJsonFile, resolveProjectPath } from "../data";
import { businessError, envError, usageError } from "../errors";
import { table, writeJson, writeText } from "../format";
import { CliFlags, requirePositional } from "../parse";
import { loadExperiments } from "./experiment";

export async function artifactCommand(action: string, rest: string[], flags: CliFlags): Promise<number> {
  if (action === "list") return artifactList(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "download") return artifactDownload(requirePositional(rest, 0, "artifact id"), flags);
  if (action === "inspect") return artifactInspect(requirePositional(rest, 0, "artifact id"), flags);
  throw usageError(`unknown artifact action: ${action || "(missing)"}`);
}

export async function artifactList(experimentId: string, flags: CliFlags): Promise<number> {
  const rows = (await listArtifacts(experimentId)).map(({ local: _local, ...row }) => row);
  if (flags.json) {
    writeJson(rows, flags.compactJson);
    return 0;
  }
  writeText(table(["id", "path", "size"], rows));
  return 0;
}

export async function artifactDownload(id: string, flags: CliFlags): Promise<number> {
  const artifacts = await findArtifact(id);
  if (!artifacts) throw businessError(`artifact not found: ${id}`);
  const dest = path.resolve(flags.out || path.join(projectRoot(), "experiments", "downloads", path.basename(artifacts.path)));
  if (artifacts.local && fileExists(artifacts.local)) {
    copyFile(artifacts.local, dest);
    const payload = { id, path: dest, source: "local" };
    if (flags.json) writeJson(payload, flags.compactJson);
    else writeText(`downloaded ${id} -> ${dest}`);
    return 0;
  }
  throw envError("旧中心节点文件中转已移除。请在插件对应 Worker 的结果行下载，或通过 SimpleSFTP 选择精确来源与目标路径。");
}

export async function artifactInspect(id: string, flags: CliFlags): Promise<number> {
  const artifact = await findArtifact(id);
  if (!artifact) throw businessError(`artifact not found: ${id}`);
  const local = artifact.local && fileExists(artifact.local) ? artifact.local : "";
  const stat = local ? fs.statSync(local) : null;
  const remote = artifact.workerId ? (await workerInventory(artifact.workerId, artifact.path, true))[artifact.path] : undefined;
  if (artifact.workerId && !remote) throw businessError(`artifact not found on Worker: ${artifact.path}`);
  const payload = {
    id,
    file: artifact.path,
    size: stat ? stat.size : remote ? remote.size : (artifact.size || ""),
    mtime: stat ? stat.mtime.toISOString() : remote ? new Date(remote.modifiedAtMs).toISOString() : "",
    hash: local ? crypto.createHash("sha256").update(fs.readFileSync(local)).digest("hex") : remote?.sha256 || "",
    ...(artifact.workerId ? { workerId: artifact.workerId } : {}),
  };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(`${payload.file} size=${payload.size} mtime=${payload.mtime} hash=${payload.hash}`);
  return 0;
}

interface ArtifactRow { id: string; path: string; size: string; local?: string; workerId?: string; mtime?: string }
interface FileIdentity { size: number; modifiedAtMs: number; sha256?: string }

async function workerInventory(workerId: string, filePath: string, includeHashes = false): Promise<Record<string, FileIdentity>> {
  const response = asRecord(await callApi("mcp.call", { tool: "sftp_inventory", arguments: { workerId, paths: [filePath], ...(includeHashes ? { includeHashes: true } : {}) } }));
  if (response.ok === false || !response.files || typeof response.files !== "object" || Array.isArray(response.files))
    throw businessError("ARTIFACT_QUERY_UNVERIFIED：Worker 未返回有效文件清单。", String(response.error || ""));
  if (Object.keys(asRecord(response.unverifiedFiles)).length)
    throw businessError("ARTIFACT_QUERY_UNVERIFIED：部分文件未能核实。", JSON.stringify(response.unverifiedFiles));
  return response.files as Record<string, FileIdentity>;
}

async function listArtifacts(experimentId: string): Promise<ArtifactRow[]> {
  const experiments = await loadExperiments();
  const experiment = experiments.find((row) => row.id === experimentId || row.name === experimentId);
  const jobs = experiment?.type === "worker_run" ? [experiment] : experiment?.type === "workflow"
    ? experiments.filter(row => row.type === "worker_run" && row.parent_id === experiment.id) : [];
  if (jobs.some(row => row.native_state)) {
    const rows: ArtifactRow[] = [];
    for (const job of jobs) {
      const output = job.native_state?.output_dir;
      if (!output || !job.worker_id) throw businessError("ARTIFACT_WORKER_REQUIRED：任务缺少明确的 Worker 或输出路径。");
      for (const [filePath, info] of Object.entries(await workerInventory(job.worker_id, output))) {
        if (!filePath.startsWith(output.replace(/\/+$/, "") + "/")) throw businessError("ARTIFACT_PATH_OUTSIDE_RUN: " + filePath);
        rows.push({ id: `${job.id}:${filePath}`, path: filePath, size: String(info.size), workerId: job.worker_id,
          mtime: new Date(info.modifiedAtMs).toISOString() });
      }
    }
    return rows;
  }
  const outputDir = experiment?.raw ? String(experiment.raw.hub_job_dir || experiment.raw.outputDir || experiment.raw.runDir || runDirFromLog(experiment.raw.stdout) || "") : "";
  const rows: Array<{ id: string; path: string; size: string; local?: string }> = [];
  if (outputDir) {
    const abs = path.isAbsolute(outputDir) ? outputDir : resolveProjectPath(outputDir);
    if (fileExists(abs)) {
      const manifest = readJsonFile<{ files?: Array<{ path?: string; size?: number }> }>(path.join(abs, "artifact_manifest.json"), {});
      const files = Array.isArray(manifest.files) && manifest.files.length
        ? manifest.files.map((file) => ({ path: path.join(abs, String(file.path || "")), size: file.size }))
        : listFilesRecursive(abs, () => true, 2).map((file) => ({ path: file, size: fs.statSync(file).size }));
      for (const file of files) {
        rows.push({
          id: `${experimentId}:${path.basename(file.path)}`,
          path: path.relative(projectRoot(), file.path).replace(/\\/g, "/") || file.path,
          size: String(file.size ?? ""),
          local: file.path,
        });
      }
    }
  }
  const remote = await optionalApi("results.list", { planFile: experiment?.plan || experimentId });
  const response = asRecord(remote), summary = asRecord(response.summary);
  if (response.source === "active_query" && summary.current !== true)
    throw businessError("ARTIFACT_QUERY_UNVERIFIED：本轮服务器产物未核实，请检查 Worker 的项目归属和查询错误。", JSON.stringify(summary.issueGroups || []));
  const results = (Array.isArray(summary.results) ? summary.results : Array.isArray(response.results) ? response.results : []) as Array<Record<string, unknown>>;
  for (const result of results) {
    if (experiment?.type === "worker_run" && result.runId && String(result.runId) !== (experiment.run_id || experiment.id)) continue;
    if (experiment?.type === "workflow" && result.workflowId && result.workflowId !== experiment.id) continue;
    const files = Array.isArray(result.sourceFiles) ? result.sourceFiles as Array<Record<string, unknown>> : [];
    for (const file of files) {
      const filePath = String(file.path || "");
      if (!filePath) continue;
      if (experiment?.type === "worker_run" && !result.runId) {
        const normalized = filePath.replace(/\\/g, "/"), output = outputDir.replace(/\\/g, "/").replace(/\/+$/, "");
        if (!output || normalized !== output && !normalized.startsWith(output + "/")) continue;
      }
      rows.push({ id: `${String(result.resultId || experimentId)}:${path.basename(filePath)}`, path: filePath, size: String(file.size || "") });
    }
  }
  return rows;
}

async function findArtifact(id: string): Promise<{ path: string; size?: string; local?: string; workerId?: string } | null> {
  const [experimentId, ...rest] = id.split(":");
  const name = rest.join(":") || experimentId;
  const listed = await listArtifacts(experimentId);
  const match = listed.find((row) => row.id === id || row.path.endsWith(name) || path.basename(row.path) === id);
  if (match) {
    if (match.workerId) return match;
    const abs = match.local || (path.isAbsolute(match.path) ? match.path : resolveProjectPath(match.path));
    const local = fileExists(abs) ? abs : undefined;
    return { path: match.path, size: local ? String(fs.statSync(local).size) : match.size, local };
  }
  const abs = path.isAbsolute(id) ? id : resolveProjectPath(id);
  if (fileExists(abs)) return { path: id, size: String(fs.statSync(abs).size), local: abs };
  return null;
}

function runDirFromLog(value: unknown): string {
  const text = String(value || "").replace(/\\/g, "/");
  const match = text.match(/^(.*)\/(?:stdout|stderr)\.log$/);
  return match ? match[1] : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
