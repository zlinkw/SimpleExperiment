import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { callApi, optionalApi, businessError, emit } from "./Support";
import { fileExists, projectRoot, readJsonFile } from "./ProjectData";
import { loadExperiments, pickExperiment, type ExperimentRow } from "./Experiments";

export async function artifactList(experimentId: string): Promise<number> {
  emit((await listArtifacts(experimentId)).map(({ local: _local, ...row }) => row));
  return 0;
}
export async function artifactInspect(id: string): Promise<number> {
  const artifact = await findArtifact(id);
  if (!artifact) throw businessError(`artifact not found: ${id}`);
  const local = artifact.local && fileExists(artifact.local) ? artifact.local : "";
  const stat = local ? fs.statSync(local) : null;
  const remote = artifact.workerId ? (await workerInventory(artifact.workerId, artifact.path, true))[artifact.path] : undefined;
  if (artifact.workerId && !remote) throw businessError(`artifact not found on Worker: ${artifact.path}`);
  emit({ id, file: artifact.path, size: stat ? stat.size : remote ? remote.size : (artifact.size || ""),
    mtime: stat ? stat.mtime.toISOString() : remote ? new Date(remote.modifiedAtMs).toISOString() : "",
    hash: local ? crypto.createHash("sha256").update(fs.readFileSync(local)).digest("hex") : remote?.sha256 || "",
    ...(artifact.workerId ? { workerId: artifact.workerId } : {}) });
  return 0;
}
interface ArtifactRow { id: string; path: string; size: string; local?: string; workerId?: string; mtime?: string }
interface FileIdentity { size: number; modifiedAtMs: number; sha256?: string }

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/** Validate each existing component before following it, including links to outside the project. */
function localArtifactPath(candidate: string): string {
  const root = path.resolve(projectRoot()), absolute = path.resolve(root, candidate);
  if (!inside(root, absolute)) throw businessError("ARTIFACT_PATH_OUTSIDE_PROJECT: " + candidate);
  const physicalRoot = fs.realpathSync(root);
  let current = root;
  for (const part of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { fs.lstatSync(current); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
    if (!inside(physicalRoot, fs.realpathSync(current))) throw businessError("ARTIFACT_PATH_OUTSIDE_PROJECT: " + candidate);
  }
  return absolute;
}

function localArtifactFiles(dir: string, depth: number): string[] {
  if (depth < 0) return [];
  const files: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const file = localArtifactPath(path.join(dir, name));
    if (fs.statSync(file).isDirectory()) files.push(...localArtifactFiles(file, depth - 1));
    else files.push(file);
  }
  return files;
}

async function workerInventory(workerId: string, filePath: string, includeHashes = false): Promise<Record<string, FileIdentity>> {
  const response = asRecord(await callApi("mcp.call", { tool: "sftp_inventory", arguments: { workerId, paths: [filePath], ...(includeHashes ? { includeHashes: true } : {}) } }));
  if (response.ok === false || !response.files || typeof response.files !== "object" || Array.isArray(response.files))
    throw businessError("ARTIFACT_QUERY_UNVERIFIED：Worker 未返回有效文件清单。", String(response.error || ""));
  if (Object.keys(asRecord(response.unverifiedFiles)).length)
    throw businessError("ARTIFACT_QUERY_UNVERIFIED：部分文件未能核实。", JSON.stringify(response.unverifiedFiles));
  return response.files as Record<string, FileIdentity>;
}

async function listArtifacts(experimentId: string, knownExperiments?: ExperimentRow[]): Promise<ArtifactRow[]> {
  const experiments = knownExperiments || await loadExperiments();
  const experiment = pickExperiment(experiments, experimentId);
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
    const abs = localArtifactPath(outputDir);
    if (fileExists(abs)) {
      const manifest = readJsonFile<{ files?: Array<{ path?: string; size?: number }> }>(localArtifactPath(path.join(abs, "artifact_manifest.json")), {});
      const files = Array.isArray(manifest.files) && manifest.files.length
        ? manifest.files.map((file) => ({ path: localArtifactPath(path.resolve(abs, String(file.path || ""))), size: file.size }))
        : localArtifactFiles(abs, 2).map((file) => ({ path: file, size: fs.statSync(file).size }));
      for (const file of files) {
        rows.push({
          id: `${experimentId}:${path.relative(abs, file.path).replace(/\\/g, "/")}`,
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
      rows.push({ id: `${experimentId}:${filePath}`, path: filePath, size: String(file.size ?? "") });
    }
  }
  return rows;
}

async function findArtifact(id: string): Promise<{ path: string; size?: string; local?: string; workerId?: string } | null> {
  const experiments = await loadExperiments();
  const prefixes = (values: Array<string | undefined>) => values.filter((value): value is string => Boolean(value) && id.startsWith(`${value}:`)).sort((a, b) => b.length - a.length);
  const prefix = prefixes(experiments.map(row => row.id))[0] || prefixes(experiments.flatMap(row => [row.name, row.run_id]))[0];
  const experimentId = prefix || id.split(":")[0];
  const name = id.startsWith(`${experimentId}:`) ? id.slice(experimentId.length + 1) : experimentId;
  const listed = await listArtifacts(experimentId, experiments);
  const exact = listed.filter((row) => row.id === id);
  const matches = exact.length ? exact : listed.filter((row) => row.path.endsWith(name) || path.basename(row.path) === id);
  if (matches.length > 1) throw businessError("ARTIFACT_SELECTION_AMBIGUOUS：存在多个同名产物，请使用精确产物 ID。", JSON.stringify({ id, candidates: matches.map(row => row.id) }));
  const match = matches[0];
  if (match) {
    if (match.workerId) return match;
    const candidate = match.local || path.resolve(projectRoot(), match.path);
    if (!match.local && !inside(path.resolve(projectRoot()), candidate)) return match;
    const abs = localArtifactPath(candidate);
    const local = fileExists(abs) ? abs : undefined;
    return { path: match.path, size: local ? String(fs.statSync(local).size) : match.size, local };
  }
  if (prefix) return null;
  const abs = localArtifactPath(id);
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
