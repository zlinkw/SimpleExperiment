const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { FileTransferClient } = require("../../dist/tunnel/FileTransferClient.js");

test("download verify uses sha256 header", async () => {
  const body = Buffer.from("metric,value\nacc,1\n");
  const sha = crypto.createHash("sha256").update(body).digest("hex");
  const server = http.createServer((req, res) => {
    res.setHeader("X-ZLK-File-Sha256", sha);
    res.end(body);
  });
  await listen(server);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zlk-sha-"));
  const target = path.join(dir, "metrics.csv");
  try {
    const client = new FileTransferClient({ localHost: "127.0.0.1", localPort: server.address().port }, new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {} }));
    const task = await client.download("results/metrics.csv", target);
    const verify = await client.verify(task.transferId);
    assert.equal(verify.ok, true);
    assert.equal(verify.actualSha256, sha);
  } finally {
    server.close();
  }
});

function listen(server) { return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); }