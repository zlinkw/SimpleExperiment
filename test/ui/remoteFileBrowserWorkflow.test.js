const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");

const root = path.resolve(__dirname, "..", "..");

test("panel delegates uploads to SimpleSFTP and limits direct file access to result inspection", () => {
  const source = readSource("src/extension.ts");
  assert.match(source, /"simpleSftp\.uploadWorkspace"/);
  assert.match(source, /"simpleSftp\.uploadFiles"/);
  assert.match(source, /async downloadRemoteResultFromUi\(message\)/);
  assert.match(source, /client\.downloadFile\(remotePath, localPath, \{ maxBytes: REMOTE_RESULT_INSPECTION_MAX_BYTES \}\)/);
  assert.doesNotMatch(source, /downloadSelectedRemoteFile|uploadFileToCurrentRemoteDir|selectRemoteFileFromUi|selectedRemoteFile/);
  assert.doesNotMatch(source, /client\.listRemoteFiles|client\.uploadFile/);
  assert.doesNotMatch(source, /\bscp\b|\brsync\b|runSsh|execFile|spawn/i);
});
