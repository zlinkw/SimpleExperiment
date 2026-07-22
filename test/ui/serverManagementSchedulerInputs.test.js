const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("all visible panel commands have extension handlers", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");

  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  for (const match of html.matchAll(/actionButton\("([^"]+)",\s*"([^"]+)"/g)) {
    const command = /^[A-Za-z][A-Za-z0-9]+$/.test(match[2]) ? match[2] : match[1];
    if (/^[A-Za-z][A-Za-z0-9]+$/.test(command)) commands.add(command);
  }
  for (const command of ["selectLogRunKey", "stopExperiment", "retryExperiment", "parseResults", "archiveArtifacts", "deleteArtifacts"]) {
    commands.add(command);
  }

  const handled = new Set();
  for (const match of extension.matchAll(/case "([^"]+)"/g)) handled.add(match[1]);
  const uiActionBlock = extension.match(/const uiActionCommands = new Set<WebviewActionCommand>\(\[([\s\S]*?)\]\);/);
  if (uiActionBlock) {
    for (const match of uiActionBlock[1].matchAll(/"([A-Za-z][A-Za-z0-9]+)"/g)) handled.add(match[1]);
  }

  const missing = [...commands].filter((command) => !handled.has(command)).sort();
  assert.deepEqual(missing, []);
});

test("visible command buttons receive Chinese hover explanations", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");

  assert.match(html, /function decorateCommandTooltips/);
  assert.match(html, /document\.querySelectorAll\("button:not\(\[data-tooltip-ready='1'\]\)"\)/);
  assert.match(html, /function genericButtonHelp/);
  assert.match(html, /button\.setAttribute\("title", help\)/);
  assert.match(html, /button\.setAttribute\("aria-label"/);
  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  for (const pattern of [/actionButton\("([^"]+)",\s*"([^"]+)"/g, /rowActionButton\("([^"]+)",\s*"([^"]+)"/g]) {
    for (const match of html.matchAll(pattern)) {
      const command = /^[A-Za-z][A-Za-z0-9]+$/.test(match[2]) ? match[2] : match[1];
      if (/^[A-Za-z][A-Za-z0-9]+$/.test(command)) commands.add(command);
    }
  }
  for (const command of commands) {
    assert.match(html, new RegExp(`${command}: "`), `missing Chinese tooltip for ${command}`);
  }
  assert.match(html, /pending \? "执行中" : commandHelp\(command\)/);
});

test("server management config fields receive Chinese hover explanations", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");

  assert.match(html, /function configHelp/);
  assert.match(html, /hubDisplayName: "面板中显示的 Hub 名称/);
  assert.match(html, /agentProjectDir: "服务器上存放项目的父目录/);
  assert.match(html, /savedSessionPath: "负责保持 127\.0\.0\.1 本地端口转发的 Xshell 隧道会话文件"/);
  assert.match(html, /configSessionSelect\(scope, key, label, value\)[\s\S]*helpBadge\(help\)/);
  assert.match(html, /configPortPair\(scope, label, localKey, remoteKey[\s\S]*helpBadge\(pairHelp\)/);
  assert.match(html, /configSelect\(scope, key, label, value[\s\S]*helpBadge\(help\)/);
});


