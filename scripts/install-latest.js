"use strict";

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { runInstallLatest } = require("./install-latest-policy");

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
  const vsix = path.join(__dirname, `../simple-experiment-${pkg.version}.vsix`);
  if (!fs.existsSync(vsix)) throw new Error(`VSIX not found: ${vsix}`);
  const outcome = await runInstallLatest({
    targetVersion: pkg.version,
    extensionId: `${pkg.publisher}.${pkg.name}`,
    vsixPath: vsix,
    listExtensions: () => execSync("code --list-extensions --show-versions", { encoding: "utf8", windowsHide: true }),
    install: (file) => execSync(`code --install-extension "${file}"`, { stdio: "inherit", windowsHide: true }),
  });
  if (outcome.status === "skip") console.log(`${outcome.version} 已安装，跳过重复安装。`);
  else console.log(`[install-latest] installed ${outcome.version} successfully`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[install-latest] failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
