const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  cleanGeneratedDirs,
  collectCleanupTargets,
  isInside,
} = require("../../scripts/clean-generated-dirs.js");

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

test("cleanup targets only exact generated directory names", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-clean-"));
  mkdirp(path.join(root, "src", "ui"));
  mkdirp(path.join(root, "src", "zlk_agent_backup"));
  mkdirp(path.join(root, "runs", "__pycache__"));
  mkdirp(path.join(root, "runs", "zlk_agent"));
  mkdirp(path.join(root, "runs", "nested", "zlk_cluster"));

  const targets = collectCleanupTargets(root).map((target) => path.basename(target));
  assert.deepEqual(targets.sort(), ["__pycache__", "zlk_agent", "zlk_cluster"]);

  cleanGeneratedDirs({ rootDir: root });
  assert.equal(fs.existsSync(path.join(root, "src", "ui")), true);
  assert.equal(fs.existsSync(path.join(root, "src", "zlk_agent_backup")), true);
  assert.equal(fs.existsSync(path.join(root, "runs", "__pycache__")), false);
  assert.equal(fs.existsSync(path.join(root, "runs", "zlk_agent")), false);
  assert.equal(fs.existsSync(path.join(root, "runs", "nested", "zlk_cluster")), false);
});

test("cleanup dry-run keeps targets and rejects root equality as inside", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-clean-"));
  mkdirp(path.join(root, "zlk_cluster"));

  const result = cleanGeneratedDirs({ rootDir: root, dryRun: true });
  assert.equal(result.targets.length, 1);
  assert.equal(fs.existsSync(path.join(root, "zlk_cluster")), true);
  assert.equal(isInside(fs.realpathSync(root), fs.realpathSync(root)), false);
});
