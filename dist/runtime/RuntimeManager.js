"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeManager = void 0;
const RuntimeManifest_1 = require("./RuntimeManifest");
class RuntimeManager {
    remote;
    projectDir;
    pluginVersion;
    runtimeVersion;
    components;
    constructor(remote, projectDir, pluginVersion, runtimeVersion, components) {
        this.remote = remote;
        this.projectDir = projectDir;
        this.pluginVersion = pluginVersion;
        this.runtimeVersion = runtimeVersion;
        this.components = components;
    }
    manifestPath() {
        return `${this.projectDir}/zlk_cluster/runtime/manifest.json`;
    }
    expectedManifest(installedAt) {
        return (0, RuntimeManifest_1.buildExpectedRuntimeManifest)(this.pluginVersion, this.runtimeVersion, this.components, installedAt);
    }
    async inspect() {
        const text = await this.remote.readText(this.manifestPath());
        return text ? (0, RuntimeManifest_1.parseRuntimeManifest)(text) : undefined;
    }
    async verify() {
        const expected = this.expectedManifest();
        const hashes = {};
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
        return (0, RuntimeManifest_1.verifyRuntimeHashes)(hashes, expected);
    }
    async deploy(options = {}) {
        const actual = await this.inspect();
        const installedAt = new Date().toISOString();
        const expected = this.expectedManifest(installedAt);
        if (!options.force && !(0, RuntimeManifest_1.runtimeNeedsDeploy)(actual, expected)) {
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
            if (!verify.ok)
                throw new Error(`runtime verify failed: ${verify.components.filter((item) => item.status !== "ok").map((item) => `${item.component}:${item.status}`).join(", ")}`);
            return { deployed: true, backupId, manifest: expected, verify };
        }
        catch (error) {
            await this.rollback(backupId).catch(() => undefined);
            throw error;
        }
    }
    async rollback(backupId) {
        const backupDir = `${this.projectDir}/zlk_cluster/runtime/backups/${backupId}`;
        await this.remote.run(`if [ -d ${q(backupDir)} ]; then cp -a ${q(backupDir)}/. ${q(`${this.projectDir}/zlk_cluster/runtime`)}/; else exit 2; fi`);
    }
    async backup(backupId) {
        const runtimeDir = `${this.projectDir}/zlk_cluster/runtime`;
        const backupDir = `${runtimeDir}/backups/${backupId}`;
        await this.remote.run(`mkdir -p ${q(backupDir)} && for f in manifest.json cluster_scheduler.py cluster_agent.py worker_probe.py state_migrator.py; do [ ! -e ${q(runtimeDir)}/$f ] || cp -a ${q(runtimeDir)}/$f ${q(backupDir)}/$f; done`);
    }
}
exports.RuntimeManager = RuntimeManager;
function compactTimestamp(value) {
    return value.replace(/[^0-9]/g, "").slice(0, 14) || String(Date.now());
}
function q(value) {
    return `'${String(value).replace(/'/g, "'\\''")}'`;
}
