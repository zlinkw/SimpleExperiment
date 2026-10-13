import * as fs from "node:fs";
import * as path from "node:path";
import { callApi } from "./api";
import { businessError, envError } from "./errors";
import { bindWorkflowWorkspace, assertWorkflowWorkspace, assertPlanSeedContract } from "../features/WorkflowWorkspaceBinding";
import type { CliFlags } from "./parse";
function record(value: unknown): Record<string, any> { if (!value || typeof value !== "object" || Array.isArray(value)) throw businessError("Invalid workflow API response"); return value as Record<string, any>; }
export function assertProjectPlan(root: string, file: string): string {
  const canonical = fs.realpathSync.native(root), target = fs.realpathSync.native(path.resolve(root, file)), relative = path.relative(canonical, target);
  if (!relative || path.isAbsolute(relative) || relative === ".." || relative.startsWith(".." + path.sep) || !fs.statSync(target).isFile()) throw businessError("Plan must be a file inside the current project");
  return canonical;
}
export async function requestWorkflowRun(root: string, planFile: string, flags: Pick<CliFlags, "seed" | "dryRun" | "check">): Promise<{ code: number; payload: Record<string, unknown> }> {
  assertPlanSeedContract(flags as unknown as Record<string, unknown>);
  const canonical = assertProjectPlan(root, planFile), binding = bindWorkflowWorkspace(canonical, canonical);
  const verify = async () => {
    const state = record(await callApi("status"));
    try { bindWorkflowWorkspace(state.workspace, binding.root); assertWorkflowWorkspace(binding, state.workspace); }
    catch { throw envError("CLI project differs from the current VS Code API workspace; open the intended project"); }
  };
  await verify();
  const params = { planFile, workspace: canonical, debugMode: false }, route = record(await callApi("workflow.plan", params));
  const normalize = (v: string) => process.platform === "win32" ? v.replace(/\\/g, "/").toLowerCase() : v;
  if (route.ok === true && route.ready === true && (typeof route.plan?.planFile !== "string" || normalize(route.plan.planFile) !== normalize(planFile))) throw businessError("Workflow selected a different Plan; no run requested");
  const base = { planFile, dryRun: flags.dryRun, submitted: false, requested: false, runner: "SimpleExperiment Local API", submitPath: "workflow.run", workflow: route, validation: "live_api", ready: route.ok === true && route.ready === true };
  if (!base.ready) return { code: 3, payload: { ...base, status: "blocked", blocker: route.blocker, nextAction: route.nextAction } };
  if (flags.dryRun || flags.check) return { code: 0, payload: { ...base, status: "preflight_ready" } };
  await verify();
  const result = record(await callApi("workflow.run", params)), requested = result.ok === true && result.started === true && typeof result.operationId === "string" && Boolean(result.operationId);
  return { code: requested ? 0 : 3, payload: { ...base, requested, result, operationId: result.operationId, status: result.status || "blocked", confirmation: result.confirmation || "none", nextAction: result.nextAction || "operations.list" } };
}
