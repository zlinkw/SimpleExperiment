const test = require("node:test");
const assert = require("node:assert/strict");

const { isSafeRemotePath } = require("../../dist/tunnel/FileTransferTypes.js");

test("file api safe path blocks traversal and allows project roots", () => {
  assert.equal(isSafeRemotePath("work_dirs/run/metrics.csv"), true);
  assert.equal(isSafeRemotePath("zlk_cluster/debug/bundle.zip"), true);
  assert.equal(isSafeRemotePath("../secret"), false);
  assert.equal(isSafeRemotePath("C:/Users/a/key"), false);
  assert.equal(isSafeRemotePath("/etc/passwd"), false);
  assert.equal(isSafeRemotePath("random/file"), false);
});
