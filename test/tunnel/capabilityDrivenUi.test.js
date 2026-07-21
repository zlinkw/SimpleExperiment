const test = require("node:test");
const assert = require("node:assert/strict");

const { isFeatureCapabilityAvailable } = require("../../dist/tunnel/AgentCapabilities.js");

test("capability-driven UI disables missing agent features before click", () => {
  const caps = {
    schemaVersion: 1,
    apiVersion: "1",
    agentVersion: "0.2.0",
    endpoints: {
      health: true,
      snapshot: true,
      websocketEvents: true,
      sseEvents: true,
      logsTail: false,
      fileList: true,
      fileDownload: true,
      fileRangeDownload: true,
      fileUploadChunk: false,
      fileTransferStatus: true,
      actions: true,
    },
    actionEndpoints: {
      "run-plan": true,
      "stop-experiment": true,
      "parse-results": true,
      "self-check": true,
      "create-debug-bundle": false,
    },
    limits: { maxUploadChunkBytes: 1024, maxConcurrentTransfers: 1 },
    auth: { required: false, scheme: "none" },
  };
  assert.equal(isFeatureCapabilityAvailable(caps, "runPlan").available, true);
  assert.equal(isFeatureCapabilityAvailable(caps, "fileUpload").available, false);
  assert.match(isFeatureCapabilityAvailable(caps, "debugBundle").reason, /升级 Hub Agent|capability/);
  assert.equal(isFeatureCapabilityAvailable(undefined, "runPlan").available, false);
});