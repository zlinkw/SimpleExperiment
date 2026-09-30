const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { runInstallLatest, parseInstalledVersion, compareVersions } = require("../../scripts/install-latest-policy");

test("same installed version skips without invoking the installer", async () => {
  const calls = [];
  const outcome = await runInstallLatest({
    targetVersion: "0.5.194", extensionId: "simple-local.simple-experiment",
    listExtensions: async () => "simple-local.simple-experiment@0.5.194\n",
    install: async (...args) => calls.push(args),
  });
  assert.deepEqual(outcome, { status: "skip", version: "0.5.194" });
  assert.equal(calls.length, 0);
});

test("older installed version installs once without force and verifies the result", async () => {
  const calls = [];
  let listed = 0;
  const outcome = await runInstallLatest({
    targetVersion: "0.5.194", extensionId: "simple-local.simple-experiment", vsixPath: "extension.vsix",
    listExtensions: async () => ++listed === 1 ? "simple-local.simple-experiment@0.5.193\n" : "simple-local.simple-experiment@0.5.194\n",
    install: async (...args) => calls.push(args),
  });
  assert.deepEqual(outcome, { status: "installed", version: "0.5.194" });
  assert.deepEqual(calls, [["extension.vsix"]]);
  assert.equal(JSON.stringify(calls).includes("--force"), false);
});

test("higher installed version blocks downgrade", async () => {
  let installs = 0;
  await assert.rejects(() => runInstallLatest({
    targetVersion: "0.5.193", extensionId: "simple-local.simple-experiment",
    listExtensions: async () => "simple-local.simple-experiment@0.5.194\n",
    install: async () => installs++,
  }), /downgrade/i);
  assert.equal(installs, 0);
});

test("repeating an install sees the installed target and skips", async () => {
  let version = "0.5.193", installs = 0;
  const dependencies = {
    targetVersion: "0.5.194", extensionId: "simple-local.simple-experiment", vsixPath: "extension.vsix",
    listExtensions: async () => `simple-local.simple-experiment@${version}\n`,
    install: async () => { installs++; version = "0.5.194"; },
  };
  assert.equal((await runInstallLatest(dependencies)).status, "installed");
  assert.equal((await runInstallLatest(dependencies)).status, "skip");
  assert.equal(installs, 1);
});

test("package lifecycle has no automatic install hook", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
  assert.equal(packageJson.scripts.postpackage, undefined);
  assert.doesNotMatch(packageJson.scripts.package, /install-latest|install:latest/);
});

test("installed version parsing and comparison are semantic", () => {
  assert.equal(parseInstalledVersion("other.ext@1.2.3\nsimple-local.simple-experiment@0.5.194\n", "simple-local.simple-experiment"), "0.5.194");
  assert.equal(compareVersions("0.5.9", "0.5.10"), -1);
});
