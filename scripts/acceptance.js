const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "zlk_cluster", "reports", "acceptance");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(name, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    shell: process.platform === "win32" && command === npm,
  });
  return {
    name,
    command: [command, ...args].join(" "),
    startedAt,
    passed: !result.error && result.status === 0,
    exitCode: result.status,
    error: result.error ? result.error.message : "",
    output: `${result.stdout || ""}${result.stderr || ""}`.trim(),
  };
}

function checkNoDatabaseDependency() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  const databaseDependency = Object.keys(dependencies).find((name) => /sqlite|postgres|mysql|mongodb|mongoose|typeorm|prisma/i.test(name));
  return {
    name: "no database dependency",
    command: "package.json dependency audit",
    startedAt: new Date().toISOString(),
    passed: !databaseDependency,
    exitCode: databaseDependency ? 1 : 0,
    error: databaseDependency ? `Unexpected database dependency: ${databaseDependency}` : "",
    output: databaseDependency || "No database dependency declared.",
  };
}

function checkReleaseDocs() {
  const required = ["docs/acceptance-matrix.md", "docs/feature-coverage.md", "docs/testing.md"];
  const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
  return {
    name: "release documentation",
    command: "required release docs",
    startedAt: new Date().toISOString(),
    passed: missing.length === 0,
    exitCode: missing.length ? 1 : 0,
    error: missing.length ? `Missing: ${missing.join(", ")}` : "",
    output: missing.length ? missing.join(", ") : required.join(", "),
  };
}

function compactOutput(output) {
  const text = String(output || "");
  return text.length > 8000 ? `${text.slice(0, 4000)}\n...\n${text.slice(-4000)}` : text;
}

function writeReports(checks) {
  fs.mkdirSync(reportDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const overall = checks.every((check) => check.passed) ? "passed" : "failed";
  const report = { generatedAt, overall, checks: checks.map((check) => ({ ...check, output: compactOutput(check.output) })) };
  fs.writeFileSync(path.join(reportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const markdown = [
    "# SimpleExperiment Acceptance",
    "",
    `overall=${overall}`,
    `generatedAt=${generatedAt}`,
    "",
    "| Check | Status | Command |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.name} | ${check.passed ? "passed" : "failed"} | \`${check.command}\` |`),
    "",
    ...report.checks.filter((check) => !check.passed).map((check) => `## ${check.name}\n\n${check.error || compactOutput(check.output)}`),
  ].join("\n");
  fs.writeFileSync(path.join(reportDir, "latest.md"), `${markdown}\n`, "utf8");
  return overall;
}

const checks = [
  run("build", npm, ["run", "build"]),
  run("lint", npm, ["run", "lint"]),
  run("unit tests", npm, ["test"]),
  run("feature regression tests", npm, ["run", "test:features"]),
  run("extension syntax", process.execPath, ["-c", "dist/extension.js"]),
  run("panel syntax", process.execPath, ["-c", "dist/panel.js"]),
  run("CLI status", process.execPath, ["dist/cli.js", "status"]),
  run("VSIX package", npm, ["run", "package"]),
  checkNoDatabaseDependency(),
  checkReleaseDocs(),
];

const overall = writeReports(checks);
console.log(`[acceptance] overall=${overall}`);
console.log(path.join(reportDir, "latest.md"));
process.exitCode = overall === "passed" ? 0 : 1;
