const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function method(name, nextName) {
  const start = source.indexOf(`async ${name}`);
  const end = source.indexOf(`async ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, name);
  return source.slice(start, end);
}

test("live output and audit reads ignore stale clients", () => {
  const live = method("fetchSelectedLiveOutput", "refreshLocalPlanMetadata");
  assert.match(live, /const client = this\.client/);
  assert.match(live, /client\.getLiveOutput/);
  assert.match(live, /generation !== this\.projectContextGeneration \|\| client !== this\.client/);

  const audit = method("openAuditTail", "refreshResultsSummary");
  assert.match(audit, /const client = this\.client/);
  assert.match(audit, /client\.getAuditTail\(\)/);
  assert.ok([...audit.matchAll(/client !== this\.client/g)].length >= 3);
  assert.ok(audit.indexOf("client !== this.client") < audit.indexOf("this.auditTail = auditTailSummaryForWebview"));
});

test("remote downloads do not open stale-client results", () => {
  const cases = [
    ["downloadDebugBundle", "downloadRemoteResultFromUi", /client\.downloadFile\(pathFromOps, picked\.fsPath\)/],
    ["downloadRemoteResultFromUi", "openResultArtifactFromUi", /client\.downloadFile\(remotePath, localPath/],
    ["openResultArtifactFromUi", "openAuditTail", /client\.downloadFile\(artifactPath, localCopyPath/],
  ];
  for (const [name, nextName, call] of cases) {
    const body = method(name, nextName);
    assert.match(body, /const client = this\.client/, name);
    assert.match(body, call, name);
    assert.match(body, /generation !== this\.projectContextGeneration \|\| client !== this\.client/, name);
  }
});
