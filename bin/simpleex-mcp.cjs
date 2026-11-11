#!/usr/bin/env node
"use strict";
// SIMPLEEX_STABLE_ENTRY_V1
const fs = require("node:fs"), path = require("node:path"), { spawn } = require("node:child_process");
async function main() {
  const argv = process.argv.slice(2);
  const local = path.join(__dirname, "simpleex.cjs"), installed = path.join(__dirname, "simpleex-launcher.cjs");
  const { resolveCli } = require(path.basename(__filename) === "simpleex-mcp-launcher.cjs" ? installed : local);
  const cli = await resolveCli({ argv });
  const entry = path.join(path.dirname(cli), "mcp", "server.cjs");
  if (!fs.statSync(entry).isFile()) throw Error("The running SimpleExperiment version has no MCP server; install the paired release and reload VS Code.");
  const child = spawn(process.execPath, [entry, ...argv], { stdio: "inherit", windowsHide: true });
  child.on("error", error => { process.stderr.write(error.message + "\n"); process.exitCode = 1; });
  child.on("close", code => { process.exitCode = code === null ? 1 : code; });
}
if (require.main === module) main().catch(error => { process.stderr.write(error.message + "\n"); process.exitCode = 1; });
