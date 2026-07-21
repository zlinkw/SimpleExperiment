const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
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

function checker(folders) {
  const sandbox = { vscode: { workspace: { workspaceFolders: folders } } };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction("assertSingleProjectWorkspace") + "\nthis.check = assertSingleProjectWorkspace;", sandbox);
  return sandbox.check;
}

test("remote project operations require exactly one workspace folder", () => {
  assert.throws(() => checker([])("上传项目代码"), /需要先打开一个本地实验项目/);
  const one = [{ uri: { fsPath: "D:/projects/demo" } }];
  assert.equal(checker(one)("上传项目代码"), "D:/projects/demo");
  const many = [one[0], { uri: { fsPath: "D:/projects/other" } }];
  assert.throws(() => checker(many)("上传项目代码"), /检测到 2 个工作区文件夹/);
  assert.throws(() => checker(many)("上传项目代码"), /独立 VS Code 窗口中只打开目标实验项目/);
});

test("webview state exposes the local project identity and workspace count", () => {
  assert.match(source, /const workspace = workspaceContextForWebview\(\)/);
  assert.match(source, /workspace,\s*setup: compactXshellSetupForWebview/);
  assert.match(source, /function workspaceContextForWebview\(\)/);
  assert.match(source, /folderCount: folders\.length/);
  assert.match(source, /singleProject: folders\.length === 1/);
});

test("all project-binding entry points enforce the single-project boundary", () => {
  assert.match(source, /async prepareAgentsForFirstRun[\s\S]{0,420}assertSingleProjectWorkspace\("准备 Agent"\)/);
  assert.match(source, /async writeXshellAgentStartupCommands[\s\S]{0,180}assertSingleProjectWorkspace\("写入 Agent 自启动路径"\)/);
  assert.match(source, /async prepareSftpTargets[\s\S]{0,160}assertSingleProjectWorkspace\("SFTP 上传或目录配置"\)/);
  assert.match(source, /async bootstrapProjectFromUi[\s\S]{0,520}assertSingleProjectWorkspace\("接入当前项目"\)/);
  assert.match(source, /async runActionCommand[\s\S]{0,220}assertSingleProjectWorkspace\("远端实验操作"\)/);
});
