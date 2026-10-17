const crypto = require("node:crypto");

function createPanelBuildManifest(version, entries) {
  const files = [...entries]
    .map((entry) => ({
      path: String(entry.path).replace(/\\/g, "/"),
      sha256: crypto.createHash("sha256").update(entry.content).digest("hex"),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const normalizedVersion = String(version || "");
  const buildId = crypto.createHash("sha256").update(JSON.stringify({ schemaVersion: 1, version: normalizedVersion, files })).digest("hex");
  const manifest = { schemaVersion: 1, version: normalizedVersion, buildId, files };
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestHash = crypto.createHash("sha256").update(text).digest("hex");
  return { manifest, text, manifestHash };
}

function writePanelBuildManifest(file, text, fsApi = require("node:fs")) {
  const exists = fsApi.existsSync(file);
  if (exists && fsApi.readFileSync(file, "utf8") === text) return;
  // Keep the existing file identity: Windows readers can deny CREATE_ALWAYS
  // while allowing in-place writes, as in the Agent runtime writer.
  const descriptor = fsApi.openSync(file, exists ? "r+" : "w");
  try {
    fsApi.writeFileSync(descriptor, text, "utf8");
    fsApi.ftruncateSync(descriptor, Buffer.byteLength(text, "utf8"));
  } finally { fsApi.closeSync(descriptor); }
}

module.exports = { createPanelBuildManifest, writePanelBuildManifest };
