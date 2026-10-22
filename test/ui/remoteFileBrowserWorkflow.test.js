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
  const memory = require('../_helpers/legacyMethod')(fs.readFileSync(path.join(root,'dist/extension/legacy.js'),'utf8'), 'downloadMetricMemoryBatch(');
  assert.match(memory, /partitionMappedDownloadTransfers\(transfers, 128, 4 \* 1024 \* 1024, 4 \* 1024 \* 1024\)/);
  assert.match(memory, /memoryOnly: true, metricsOnly: true, wrapperResults: true, maxFileBytes: 4 \* 1024 \* 1024/);
  assert.match(source, /sourceId: workerId, workerId, entries:/);
  assert.doesNotMatch(source, /downloadSelectedRemoteFile|uploadFileToCurrentRemoteDir|selectRemoteFileFromUi|selectedRemoteFile/);
  assert.doesNotMatch(source, /client\.listRemoteFiles|client\.uploadFile/);
  assert.doesNotMatch(source, /\bscp\b|\brsync\b|runSsh/i);
});
