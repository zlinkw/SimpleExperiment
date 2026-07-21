import { createHash } from "crypto";

export type RemoteRuntimeComponent =
  | "cluster_scheduler"
  | "hub_agent"
  | "worker_probe"
  | "sync_helper"
  | "state_migrator";

export interface RuntimeManifestComponent {
  version: string;
  sha256: string;
  remotePath: string;
  installedAt?: string;
  lastVerifiedAt?: string;
}

export interface RuntimeManifest {
  schemaVersion: 1;
  pluginVersion: string;
  runtimeVersion: string;
  components: Record<string, RuntimeManifestComponent>;
}

export interface RuntimeComponentSource {
  component: RemoteRuntimeComponent;
  version: string;
  remotePath: string;
  content: string;
}

export interface RuntimeVerifyResult {
  schemaVersion: 1;
  ok: boolean;
  expectedRuntimeVersion: string;
  actualRuntimeVersion?: string;
  checkedAt: string;
  components: Array<{
    component: RemoteRuntimeComponent;
    remotePath: string;
    expectedSha256: string;
    actualSha256?: string;
    status: "ok" | "missing" | "hash_mismatch" | "manifest_missing";
    message?: string;
  }>;
}

export const RUNTIME_MANIFEST_SCHEMA_VERSION = 1;
export const CURRENT_RUNTIME_VERSION = "0.3.0";

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function buildExpectedRuntimeManifest(pluginVersion: string, runtimeVersion: string, components: RuntimeComponentSource[], installedAt?: string): RuntimeManifest {
  return {
    schemaVersion: RUNTIME_MANIFEST_SCHEMA_VERSION,
    pluginVersion,
    runtimeVersion,
    components: Object.fromEntries(components.map((item) => [
      item.component,
      {
        version: item.version,
        sha256: sha256Text(item.content),
        remotePath: item.remotePath,
        installedAt,
      },
    ])),
  };
}

export function parseRuntimeManifest(text: string): RuntimeManifest | undefined {
  try {
    const parsed = JSON.parse(text);
    return isRuntimeManifest(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function isRuntimeManifest(value: unknown): value is RuntimeManifest {
  const item = value as RuntimeManifest;
  return Boolean(item)
    && item.schemaVersion === RUNTIME_MANIFEST_SCHEMA_VERSION
    && typeof item.pluginVersion === "string"
    && typeof item.runtimeVersion === "string"
    && item.components
    && typeof item.components === "object";
}

export function runtimeNeedsDeploy(actual: RuntimeManifest | undefined, expected: RuntimeManifest): boolean {
  if (!actual) return true;
  if (actual.schemaVersion !== expected.schemaVersion) return true;
  if (actual.runtimeVersion !== expected.runtimeVersion) return true;
  for (const [component, info] of Object.entries(expected.components)) {
    const current = actual.components[component];
    if (!current || current.version !== info.version || current.sha256 !== info.sha256 || current.remotePath !== info.remotePath) return true;
  }
  return false;
}

export function verifyRuntimeHashes(actualHashes: Record<string, string>, expected: RuntimeManifest, checkedAt = new Date().toISOString()): RuntimeVerifyResult {
  const components = Object.entries(expected.components).map(([component, info]) => {
    const actualSha256 = actualHashes[info.remotePath] || "";
    const status = !actualSha256 ? "missing" : actualSha256 === info.sha256 ? "ok" : "hash_mismatch";
    return {
      component: component as RemoteRuntimeComponent,
      remotePath: info.remotePath,
      expectedSha256: info.sha256,
      actualSha256: actualSha256 || undefined,
      status,
      message: status === "ok" ? undefined : `${component} ${status}`,
    };
  });
  return {
    schemaVersion: RUNTIME_MANIFEST_SCHEMA_VERSION,
    ok: components.every((item) => item.status === "ok"),
    expectedRuntimeVersion: expected.runtimeVersion,
    actualRuntimeVersion: expected.runtimeVersion,
    checkedAt,
    components,
  };
}

