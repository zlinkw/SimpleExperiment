import {
  RuntimeComponentSource,
  RuntimeManifest,
  RuntimeVerifyResult,
  buildExpectedRuntimeManifest,
  parseRuntimeManifest,
  runtimeNeedsDeploy,
  verifyRuntimeHashes,
} from "./RuntimeManifest";

export interface RuntimeRemote {
  readText(remotePath: string): Promise<string | undefined>;
  writeText(remotePath: string, text: string): Promise<void>;
  run(command: string): Promise<{ code: number; stdout: string; stderr: string }>;
}

export interface RuntimeDeployResult {
  deployed: boolean;
  backupId?: string;
  manifest: RuntimeManifest;
  verify: RuntimeVerifyResult;
}

export class RuntimeManager {
  constructor(
    private readonly remote: RuntimeRemote,
    private readonly projectDir: string,
    private readonly pluginVersion: string,
    private readonly runtimeVersion: string,
    private readonly components: RuntimeComponentSource[],
  ) {}

  manifestPath(): string {
    return `${this.projectDir}/zlk_cluster/runtime/manifest.json`;
  }

  expectedManifest(installedAt?: string): RuntimeManifest {
    return buildExpectedRuntimeManifest(this.pluginVersion, this.runtimeVersion, this.components, installedAt);
  }

  async inspect(): Promise<RuntimeManifest | undefined> {
    const text = await this.remote.readText(this.manifestPath());
    return text ? parseRuntimeManifest(text) : undefined;
  }

  async verify(): Promise<RuntimeVerifyResult> {
    const expected = this.expectedManifest();
    const hashes: Record<string, string> = {};
    const command = [
      "python3 - <<'PY'",
      "import hashlib, json, os",
      `paths = ${JSON.stringify(Object.values(expected.components).map((item) => item.remotePath))}`,
      "out = {}",
      "for p in paths:",
      "    if os.path.isfile(p):",
      "        h = hashlib.sha256()",
      "        with open(p, 'rb') as f:",
      "            h.update(f.read())",
      "        out[p] = h.hexdigest()",
      "print(json.dumps(out))",
      "PY",
    ].join("\n");
    const result = await this.remote.run(command);
    if (result.code === 0 && result.stdout.trim()) {
      Object.assign(hashes, JSON.parse(result.stdout));
    }
    return verifyRuntimeHashes(hashes, expected);
  }

  async deploy(options: { force?: boolean } = {}): Promise<RuntimeDeployResult> {
    const actual = await this.inspect();
    const installedAt = new Date().toISOString();
    const expected = this.expectedManifest(installedAt);
    if (!options.force && !runtimeNeedsDeploy(actual, expected)) {
      return { deployed: false, manifest: expected, verify: await this.verify() };
    }
    const backupId = compactTimestamp(installedAt);
    await this.backup(backupId);
    try {
      for (const component of this.components) {
        await this.remote.writeText(component.remotePath, component.content);
      }
      await this.remote.writeText(this.manifestPath(), JSON.stringify(expected, null, 2));
      const verify = await this.verify();
      if (!verify.ok) throw new Error(`runtime verify failed: ${verify.components.filter((item) => item.status !== "ok").map((item) => `${item.component}:${item.status}`).join(", ")}`);
      return { deployed: true, backupId, manifest: expected, verify };
    } catch (error) {
      await this.rollback(backupId).catch(() => undefined);
      throw error;
    }
  }

  async rollback(backupId: string): Promise<void> {
    const backupDir = `${this.projectDir}/zlk_cluster/runtime/backups/${backupId}`;
    await this.remote.run(`if [ -d ${q(backupDir)} ]; then cp -a ${q(backupDir)}/. ${q(`${this.projectDir}/zlk_cluster/runtime`)}/; else exit 2; fi`);
  }

  private async backup(backupId: string): Promise<void> {
    const runtimeDir = `${this.projectDir}/zlk_cluster/runtime`;
    const backupDir = `${runtimeDir}/backups/${backupId}`;
    await this.remote.run(`mkdir -p ${q(backupDir)} && for f in manifest.json cluster_scheduler.py cluster_agent.py worker_probe.py state_migrator.py; do [ ! -e ${q(runtimeDir)}/$f ] || cp -a ${q(runtimeDir)}/$f ${q(backupDir)}/$f; done`);
  }
}

function compactTimestamp(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 14) || String(Date.now());
}

function q(value: string): string {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}



