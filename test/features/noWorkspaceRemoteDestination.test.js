const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const readme = fs.readFileSync(path.join(__dirname, "../../README.md"), "utf8");
const guide = fs.readFileSync(path.join(__dirname, "../../docs/simple-experiment-setup.md"), "utf8");

function extractFunction(name) {
  const start = extension.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = extension.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < extension.length; index += 1) {
    if (extension[index] === "{") depth += 1;
    if (extension[index] === "}") depth -= 1;
    if (depth === 0) return extension.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

test("remote project name is empty until a real workspace is open", () => {
  const sandbox = {
    workspaceRoot: () => undefined,
    path: { basename: () => { throw new Error("basename must not run without workspace"); } },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("remoteProjectName")}\nthis.read = remoteProjectName;`, sandbox);
  assert.equal(sandbox.read(), "");
  assert.doesNotMatch(extractFunction("remoteProjectName"), /process\.cwd/);
  assert.match(extension, /\.\.\.\(projectName \? \{ workDir: `\$\{root\}\/\$\{projectName\}` \} : \{\}\)/);
});

test("UI keeps runtime visible but waits for a workspace before showing code destination", () => {
  assert.match(panel, /hasRoot && !projectName \? "打开本地项目后显示"/);
  assert.match(panel, /已保存服务器根目录；等待打开本地项目/);
  assert.match(panel, /打开本地项目后显示上传位置/);
  assert.match(panel, /data-project-name="' \+ escAttr\(projectName\)/);
  assert.doesNotMatch(panel, /data-project-name="' \+ escAttr\(item\.projectName \|\| "zlk_project"\)/);
  assert.match(readme, /未打开本地项目时不会使用扩展进程目录生成伪项目名/);
  assert.match(guide, /先打开目标本地项目后才显示代码上传位置/);
});
