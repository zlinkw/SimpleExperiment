"use strict";
/** r22: acceptance 非测试审计门禁（自 scripts/acceptance.js 原样迁出，语义不变）。 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let failed = false;

{
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  const databaseDependency = Object.keys(dependencies).find(name => /sqlite|postgres|mysql|mongodb|mongoose|typeorm|prisma/i.test(name));
  if (databaseDependency) { failed = true; process.stderr.write(`Unexpected database dependency: ${databaseDependency}\n`); }
  else process.stdout.write("No database dependency declared.\n");
}

{
  const required = ["docs/acceptance-matrix.md", "docs/feature-coverage.md", "docs/testing.md"];
  const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
  if (missing.length) { failed = true; process.stderr.write(`Missing release docs: ${missing.join(", ")}\n`); }
  else process.stdout.write(required.join(", ") + "\n");
}

process.exitCode = failed ? 1 : 0;
