const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("remote file browser uses file transfer client paths, not scp or rsync", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /listRemoteFiles/);
  assert.match(source, /downloadSelectedRemoteFile/);
  assert.match(source, /uploadFileToCurrentRemoteDir/);
  assert.match(source, /client\.listRemoteFiles/);
  assert.match(source, /client\.downloadFile/);
  assert.match(source, /client\.uploadFile/);
  assert.doesNotMatch(source, /\bscp\b|\brsync\b|runSsh|execFile|spawn/i);
});