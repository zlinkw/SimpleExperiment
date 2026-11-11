"use strict";
const path = require("node:path");
const { PROJECT_TOOLS } = require("../dist/mcp/ToolCatalog.js");
function configuration(workspace, launcher, server = "simple_experiment") {
  if (!path.isAbsolute(workspace) || !path.isAbsolute(launcher) || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(server)) throw Error("Use absolute workspace/launcher paths and an alphanumeric server name");
  const prefix = `mcp_servers.${server}`;
  const text = [`[${prefix}]`, 'command = "node"', `args = ${JSON.stringify([launcher.replace(/\\/g, "/"), "--workspace", workspace.replace(/\\/g, "/")])}`, 'default_tools_approval_mode = "prompt"'];
  for (const tool of PROJECT_TOOLS) {
    // The host grant still authorizes every ordinary write. Human-review and global-target tools keep prompts.
    if (tool.requiresUserApproval) continue;
    text.push("", `[${prefix}.tools.${tool.name}]`, 'approval_mode = "approve"');
  }
  return text.join("\n") + "\n";
}
if (require.main === module) {
  try { process.stdout.write(configuration(process.argv[2], process.argv[3], process.argv[4])); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
module.exports = { configuration };
