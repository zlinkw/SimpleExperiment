const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["exec", "--", "@vscode/vsce", "ls", "--no-dependencies"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "vsce ls failed\n");
  process.exit(result.status || 1);
}

const packaged = new Set(
  String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\.\//, "").replace(/\\/g, "/"))
    .filter((line) => line && !line.startsWith("INFO ") && !line.startsWith("WARNING ")),
);
const entrypoints = [packageJson.main, ...Object.values(packageJson.bin || {})]
  .filter(Boolean)
  .map((entry) => String(entry).replace(/^\.\//, "").replace(/\\/g, "/"));
const missing = [];
const visited = new Set();
const queue = entrypoints.map((entry) => ({ file: entry, chain: [entry] }));

while (queue.length) {
  const item = queue.shift();
  const normalized = item.file.replace(/\\/g, "/");
  if (visited.has(normalized)) continue;
  visited.add(normalized);
  if (!packaged.has(normalized) && !packaged.has(`extension/${normalized}`)) {
    missing.push({ importer: item.chain.at(-2) || "package.json", required: normalized, chain: item.chain });
    continue;
  }
  const absolute = path.join(root, normalized);
  if (!fs.existsSync(absolute) || path.extname(absolute) !== ".js") continue;
  const source = fs.readFileSync(absolute, "utf8");
  const requires = [...source.matchAll(/require\(\s*["'](\.[^"']+)["']\s*\)/g)].map((match) => match[1]);
  for (const specifier of requires) {
    const resolved = resolveLocalModule(path.dirname(absolute), specifier);
    if (!resolved) continue;
    const relative = path.relative(root, resolved).replace(/\\/g, "/");
    queue.push({ file: relative, chain: [...item.chain, relative] });
  }
}

if (missing.length) {
  process.stderr.write(`VSIX runtime closure missing ${missing.length} file(s):\n`);
  for (const item of missing) process.stderr.write(`- ${item.required} <- ${item.chain.join(" <- ")}\n`);
  process.exit(1);
}

process.stdout.write(`VSIX runtime closure verified: ${visited.size} local module(s), ${entrypoints.length} entrypoint(s).\n`);

function resolveLocalModule(directory, specifier) {
  const base = path.resolve(directory, specifier);
  const candidates = [base, `${base}.js`, `${base}.json`, path.join(base, "index.js")];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}
