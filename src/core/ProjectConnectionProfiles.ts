import { createHash } from "node:crypto";
import * as path from "node:path";

type Profile = { schemaVersion: 1; values: Record<string, any> };
const STORAGE_KEY = "simpleExperiment.sharedConnections.v1";
const SETUP_KEY = "simpleExperiment.xshellRealtimeTunnelConfig";
const CONNECTION_KEYS = [SETUP_KEY, "simpleExperiment.tunnelGatewayConfig", "simpleExperiment.setupConfigurationSignature"];
const migrations = new WeakMap<object, Profile>();
const pendingWrites = new WeakMap<object, Promise<void>>();
const empty: Profile = { schemaVersion: 1, values: {} };
function identity(root: string) {
  if (!root) return "";
  const normalized = path.resolve(root).replace(/\\/g, "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
/** Shared server settings, including parent directories. Queues, results, derived project directories and AI grants stay local. */
export function sharedConnectionProfile(context: any, root: string): Profile {
  const saved = context.globalState.get(STORAGE_KEY);
  if (saved !== undefined) {
    if (saved?.schemaVersion !== 1 || !saved.values || typeof saved.values !== "object" || Array.isArray(saved.values))
      throw new Error("SHARED_CONNECTION_CONFIG_INVALID：全局连接配置格式无效。");
    return saved;
  }
  const migrating = migrations.get(context);
  if (migrating) return migrating;
  const owner = identity(root);
  // This existing key is used only to migrate the old per-project format.
  const old = owner && context.workspaceState.get("simpleExperiment.projectConnections.v1." + createHash("sha256").update(owner).digest("hex"));
  if (old && (old.schemaVersion !== 1 || old.root !== owner || !old.values || typeof old.values !== "object"))
    throw new Error("PROJECT_CONNECTION_OWNER_MISMATCH：旧项目连接归属不匹配，未导入。");
  const legacyGlobal = Object.fromEntries(CONNECTION_KEYS.map(key => [key, context.globalState.get(key)]));
  const source = old?.values[SETUP_KEY]?.workerTunnels?.length ? old.values : legacyGlobal[SETUP_KEY] ? legacyGlobal : undefined;
  // Opening an unconfigured project first must not hide the configured project's servers.
  if (!source) return empty;
  const profile: Profile = { schemaVersion: 1, values: Object.fromEntries(CONNECTION_KEYS.filter(key => Object.hasOwn(source, key)).map(key => [key, structuredClone(source[key])])) };
  migrations.set(context, profile);
  const pending = Promise.resolve().then(() => context.globalState.update(STORAGE_KEY, profile));
  pendingWrites.set(context, pending);
  void pending.catch(() => undefined); // Activation and explicit saves await the same failure.
  return profile;
}
export async function flushSharedConnections(context: any, root: string): Promise<void> {
  sharedConnectionProfile(context, root);
  await pendingWrites.get(context);
}
/** Existing entry names remain available; storage is now shared across projects. */
export function readProjectConnectionValue(context: any, root: string, key: string): any {
  return sharedConnectionProfile(context, root).values[key];
}
export async function saveProjectConnectionValues(context: any, root: string, values: Record<string, any>) {
  sharedConnectionProfile(context, root);
  const changed = structuredClone(values);
  const pending = (pendingWrites.get(context) || Promise.resolve()).then(async () => {
    const current = sharedConnectionProfile(context, root);
    await context.globalState.update(STORAGE_KEY, { schemaVersion: 1, values: { ...current.values, ...changed } });
  });
  pendingWrites.set(context, pending);
  await pending;
}
