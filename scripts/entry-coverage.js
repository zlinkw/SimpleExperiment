"use strict";
/** Inventory only. Reachability is never recorded as an actual click or remote completion. */
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const { PROJECT_TOOLS } = require(path.join(root, "dist/mcp/ToolCatalog.js"));
const legacyText = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
const hostAst = ts.createSourceFile("legacy.ts", legacyText, ts.ScriptTarget.Latest, true);
const handlerBindings = new Map();
function bindHandlers(node, owner = "module") {
  if ((ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name) owner = node.name.getText(hostAst);
  let command;
  if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) command = node.expression.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      && node.left.getText(hostAst) === "command" && ts.isStringLiteral(node.right)) command = node.right.text;
  if (command) {
    const bindings = handlerBindings.get(command) || [];
    if (!bindings.some(row => row.function === owner)) bindings.push({ function: owner, source: "src/extension/legacy.ts", line: hostAst.getLineAndCharacterOfPosition(node.getStart(hostAst)).line + 1 });
    handlerBindings.set(command, bindings);
  }
  ts.forEachChild(node, child => bindHandlers(child, owner));
}
bindHandlers(hostAst);
const uiSource = fs.readFileSync(path.join(root, "src/ui/PanelHtml.legacy.ts"), "utf8");
const buttons = [...uiSource.matchAll(/data-command=["']([a-zA-Z][a-zA-Z0-9]*)["']/g)].map(match => ({
  command: match[1], source: "src/ui/PanelHtml.legacy.ts", line: uiSource.slice(0, match.index).split("\n").length,
  status: "not_tested", evidence: null,
  handlers: handlerBindings.get(match[1]) || [],
}));
function apiMethods(file, methodName) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const methods = new Set();
  function find(node) {
    if ((ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(source) === methodName) {
      const body = node.body;
      const objects = body.statements.filter(statement => ts.isReturnStatement(statement) && statement.expression && ts.isObjectLiteralExpression(statement.expression))
        .map(statement => statement.expression);
      for (const statement of body.statements) if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations) if (declaration.name.getText(source) === "methods" && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) objects.push(declaration.initializer);
      for (const object of objects) for (const property of object.properties) if (property.name) methods.add(property.name.getText(source).replace(/^["']|["']$/g, ""));
      return;
    }
    ts.forEachChild(node, find);
  }
  find(source);
  return [...methods].sort();
}
const apis = [{ plugin: "experiment", file: path.join(root, "src/extension/legacy.ts") }];
if (process.argv[2]) apis.push({ plugin: "sftp", file: path.join(path.resolve(process.argv[2]), "extension.js") });
const classifications = {
  "experiment:drafts.promote": ["retired", "DRAFT_PROMOTION_RETIRED; do not restore promotion"],
  "experiment:drafts.cleanup": ["human_review", "Existing draft cleanup UI; exact path confirmation is not an AI parameter"],
  "experiment:plans.cleanup.confirm": ["human_review", "Existing PLAN review pages call the confirmation phases"],
  "experiment:mcp.call": ["transport_internal", "Named MCP tools call this shared host boundary"],
  "experiment:mcp.catalog": ["transport_internal", "MCP tools/list uses the live host catalog"],
  "sftp:agents.lifecycle": ["mapped_via_host", "agent_inspect/ensure/stop/restart/migrate resolve the host-owned service identity"],
  "sftp:files.cleanup.confirm": ["human_review", "file_cleanup_review opens two local human review pages; factors are never AI arguments"],
  "sftp:files.cleanup.isolatedMaintenanceDelete": ["integration_internal", "Existing registered isolation lifecycle; no arbitrary maintenance delete tool"],
  "sftp:files.cleanup.isolationParentsPreview": ["integration_internal", "Existing PLAN replacement review owns these exact empty-parent previews"],
  "sftp:files.cleanup.stagedSlots": ["integration_internal", "Existing staging admission and cache review; no implicit cleanup authorization"],
  "sftp:project.create": ["human_target_setup", "Create/open a different workspace through the existing SimpleSFTP UI; then bind a separate MCP connection"],
  "sftp:sync.deletePath": ["mapped_via_protected_tools", "file_cleanup_preview/review/execute/status use a frozen typed path and stored confirmations"],
};
const migration = apis.flatMap(api => apiMethods(api.file, "createLocalApiMethods").map(method => {
  const tools = PROJECT_TOOLS.filter(tool => tool.plugin === api.plugin && tool.method === method).map(tool => tool.name);
  const classification = classifications[api.plugin + ":" + method];
  return { plugin: api.plugin, method, tools, status: tools.length ? "mapped_requires_validation" : classification?.[0] || "pending_classification",
    ...(classification ? { reason: classification[1] } : {}) };
}));
const inventory = { version: pkg.version,
  tools: PROJECT_TOOLS.map(({ name, method, plugin, action, permission, requiresUserApproval }) => ({ name, method, plugin, action, permission, requiresUserApproval: !!requiresUserApproval })),
  commands: pkg.contributes.commands.map(command => ({ ...command, status: "not_tested", evidence: null })),
  staticButtonOccurrences: buttons, dynamicControls: { status: "requires_live_inventory" }, migration,
  note: "Source inventory. Every actual control, contextual menu and dynamic row still needs live evidence. Counts are observations, not fixed acceptance limits.",
};
const output = process.argv.includes("--summary") ? { version: pkg.version, commands: inventory.commands.length, staticButtons: buttons.length,
  tools: PROJECT_TOOLS.length, pendingMethods: migration.filter(row => row.status === "pending_classification") } : inventory;
const serialized = JSON.stringify(output, null, 2) + "\n";
const outIndex = process.argv.indexOf("--out");
if (outIndex !== -1) {
  if (!process.argv[outIndex + 1]) throw Error("--out requires a path");
  fs.writeFileSync(path.resolve(process.argv[outIndex + 1]), serialized, "utf8");
} else process.stdout.write(serialized);
