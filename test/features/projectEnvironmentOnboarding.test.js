const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(source, name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function extractConst(source, name) {
  const start = source.indexOf(`const ${name} =`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = source.indexOf(";", start);
  assert.ok(end > start, `unterminated ${name}`);
  return source.slice(start, end + 1);
}

test("new project scan exposes dependency manifests without making them a run gate", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-env-"));
  fs.mkdirSync(path.join(root, "requirements"), { recursive: true });
  fs.writeFileSync(path.join(root, "environment.yml"), "name: demo\n", "utf8");
  fs.writeFileSync(path.join(root, "pyproject.toml"), "[project]\nname='demo'\n", "utf8");
  fs.writeFileSync(path.join(root, "requirements-gpu.txt"), "torch\n", "utf8");
  fs.writeFileSync(path.join(root, "requirements", "base.txt"), "torch\n", "utf8");
  fs.writeFileSync(path.join(root, "requirements", "README.md"), "ignore\n", "utf8");

  const sandbox = {
    fs: fs.promises,
    path,
    existsAt: async (file) => fs.existsSync(file),
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractConst(extension, "heavyProjectDirNames"),
    extractFunction(extension, "isHeavyProjectDir"),
    extractFunction(extension, "walkProjectFiles"),
    extractFunction(extension, "existingRelativeFiles"),
    extractFunction(extension, "environmentRootManifestFileName"),
    extractFunction(extension, "environmentManifestFileName"),
    extractFunction(extension, "environmentManifestPriority"),
    extractFunction(extension, "detectEnvironmentFiles"),
    "this.detectEnvironmentFiles = detectEnvironmentFiles;",
  ].join("\n"), sandbox);
  const files = await sandbox.detectEnvironmentFiles(root);
  assert.deepEqual([...files], ["environment.yml", "pyproject.toml", "requirements-gpu.txt", "requirements/base.txt"]);

  assert.match(extension, /environmentFiles\.find\(/);
  assert.match(extension, /environmentFiles,/);
  assert.match(panel, /function projectEnvironmentSummary\(/);
  assert.match(panel, /projectQuickRow\("环境", environment\.summary/);
  assert.match(panel, /未发现依赖清单，请确认执行环境已安装项目依赖/);
  assert.match(panel, /Conda 环境（可选）/);
  assert.match(panel, /留空使用系统 Python，不执行 Conda 激活/);
  assert.match(panel, /return condaEnv \? "Conda " \+ condaEnv : "系统 Python"/);
  assert.doesNotMatch(panel, /readyToRun = [^;]*environment/);
  assert.match(panel, /environmentFiles: asArray\(item\.environmentFiles\).*\.map\(String\)/);
});
