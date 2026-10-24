const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.join(__dirname, "../..");

test("VSIX includes every local CommonJS dependency of extension and CLI entrypoints", () => {
  const command = process.platform === "win32" ? "node.exe" : process.execPath;
  const result = spawnSync(command, [path.join(root, "scripts", "verify-vsix-runtime.js")], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000, // 旧 10000 在 9p 冷读实测 9558ms（r27-vvr-time.txt）下仅剩 4% 余量被掐死；对齐 verifier 自身 30000ms 既有契约（同文件第二断言），断言与 DEP0190 约束不变。
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /VSIX runtime closure verified/);
  assert.doesNotMatch(result.stderr, /DEP0190|DeprecationWarning/);
});

/* r27: 旧断言匹配 acceptance.js 的 function runNpm 实现形状；r22 起 acceptance 委托单一 runner，
 * npm/vsce 解析集中在 scripts/npm-command.js 与 runner resolveStepCommand（安装 bin 元数据）。
 * 迁移保持同一 testID 的保护目的：锁定本地 CLI、Node 原生无 shell、原超时、委托到同一正确执行器，
 * 并用真实解析函数的输出验证，而非仅新文本自证。第一项（实际闭包验证与 stderr/Deprecation 约束）原样保留。 */
test("tooling uses pinned local VSCE and npm-cli without shell argument concatenation", () => {
  const fs = require("node:fs");
  const helper = fs.readFileSync(path.join(root, "scripts", "npm-command.js"), "utf8");
  const verifier = fs.readFileSync(path.join(root, "scripts", "verify-vsix-runtime.js"), "utf8");
  const acceptance = fs.readFileSync(path.join(root, "scripts", "acceptance.js"), "utf8");
  assert.match(helper, /command: process\.execPath/);
  assert.match(verifier, /require\.resolve\("@vscode\/vsce\/vsce"\)/);
  assert.match(verifier, /spawnSync\(process\.execPath/);
  assert.match(verifier, /timeout: 30000/);
  assert.doesNotMatch(verifier, /npmCommand|"exec"/);
  // 旧: acceptance 自带 runNpm 帮助函数（Node 原生 + npm-cli 固定）。新: acceptance 委托同一 runner，
  // 由薄入口 spawnSync(process.execPath, [test-workflow.js, "acceptance", ...]) 原生执行。
  assert.match(acceptance, /spawnSync\(process\.execPath, \[path\.join\(__dirname, "test-workflow\.js"\), "acceptance"/);
  assert.doesNotMatch(verifier, /shell\s*:/);
  assert.doesNotMatch(acceptance, /shell\s*:/);
  // npm/vsce 必须由单源解析为锁定本地 CLI（Node 原生 argv，无 shell 拼接）——真实调用解析函数验证。
  const runner = require(path.join(root, "scripts", "test-workflow.js"));
  const npm = runner.resolveStepCommand(root, ["npm", "run", "typecheck"]);
  assert.equal(npm.command, process.execPath, "npm must run through Node with npm-cli.js, not a shell shim");
  assert.match(npm.args[0], /npm-cli\.js$/, "npm must pin the local npm-cli.js entry");
  const vsce = runner.resolveStepCommand(root, ["vsce", "package", "--no-dependencies"]);
  assert.equal(vsce.command, process.execPath, "vsce must run through Node via installed bin metadata");
  assert.match(vsce.args[0], /node_modules[\\/]@vscode[\\/]vsce[\\/]/, "vsce must resolve the pinned local package bin");
  assert.ok(fs.existsSync(vsce.args[0]), "resolved vsce entry must actually exist on disk");
  assert.doesNotMatch(fs.readFileSync(path.join(root, "scripts", "test-workflow.js"), "utf8"), /shell\s*:\s*true/);
});
