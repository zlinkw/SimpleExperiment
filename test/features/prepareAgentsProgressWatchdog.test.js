const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const extension = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.legacy.ts"), "utf8");

test("Agent preparation stays pending while its real deployment continues", () => {
  const watchdog = extension.slice(extension.indexOf("uiCommandWatchdogMs(command)"), extension.indexOf("private postUiCommandStatus("));
  assert.match(watchdog, /return 0/);
  const ts = require('typescript');
  const html = require('../../dist/ui/PanelHtml').renderPanelHtml();
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).join('\n');
  const ast = ts.createSourceFile('panel.js', script, ts.ScriptTarget.Latest, true);
  let condition;
  function visit(node) {
    if (ts.isIfStatement(node) && node.expression.getText(ast).includes('command !== "prepareAgents"')) condition = node.expression.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(condition);
  const usesDeadline = new Function('command', 'return ' + condition);
  for (const command of ['prepareAgents', 'rebuildProjectResultTables', 'openSetupGuide', 'verifyAgentVersion', 'generateOutputAdapter'])
    assert.equal(usesDeadline(command), false, command);
  assert.equal(usesDeadline('snapshot'), true);
});
