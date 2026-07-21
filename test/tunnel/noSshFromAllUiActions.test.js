const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("all new ui actions use TunnelClient only and never invoke ssh scp rsync", () => {
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const commands = [
    "validatePlan", "dryRunPlan", "runPlan", "stopExperiment", "retryExperiment", "reproducePlan",
    "parseResults", "refreshResults", "runQualityGate", "runStatistics", "exportPaperTable",
    "archiveArtifacts", "syncArtifacts", "completeThreeWay", "deleteArtifacts", "reconcileDeletions",
    "selfCheck", "createDebugBundle", "downloadDebugBundle", "openAuditTail", "listRemoteFiles",
    "downloadRemoteFile", "uploadRemoteFile"
  ];
  for (const command of commands) assert.match(extension + panel, new RegExp(command), command);
  assert.doesNotMatch(extension + panel, /\bssh\b|\bscp\b|\brsync\b|ControlMaster|persistent_shell|oneshot|runSsh|execFile|spawn/i);
  assert.match(extension, /client\.postAction/);
  assert.match(extension, /client\.downloadFile/);
  assert.match(extension, /client\.uploadFile/);
});