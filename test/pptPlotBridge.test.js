const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

test("PptPlotBridge builds stable request schema and resolves md to sibling json", async () => {
  const { buildPptPlotRequest } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-schema-"));
  fs.mkdirSync(path.join(project, "zlk_cluster", "results", "anomaly"), { recursive: true });
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "plotting_contract.json"), "{}", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "anomaly", "latest.md"), "# root cause\n", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "anomaly", "latest.json"), "{\"ok\":true}\n", "utf8");
  const req = await buildPptPlotRequest({
    projectRoot: project,
    sourcePaths: ["zlk_cluster/results/anomaly/latest.md"],
    selectedResultId: "r1",
    runKey: "run-a",
    archiveKey: "archive-a",
    chartType: "auto",
    presentationPath: "D:/tmp/result.pptx",
    styleMode: "activePpt",
    sourceLabel: "异常报告",
  }, "req-1");
  assert.equal(req.schemaVersion, 1);
  assert.equal(req.requestId, "req-1");
  assert.equal(req.projectRoot, project);
  assert.deepEqual(req.sourcePaths, ["zlk_cluster/results/anomaly/latest.json"]);
  assert.equal(req.plottingContractPath, "zlk_cluster/results/plotting_contract.json");
  assert.equal(req.target.presentationPath, "D:/tmp/result.pptx");
  assert.equal(req.target.createIfMissing, true);
  assert.equal(req.target.slideMode, "append");
  assert.equal(req.styleMode, "activePpt");
  assert.equal(req.markdownSummary, null);
});

test("PptPlotBridge redirects raw single-seed result source to final statistics", async () => {
  const { buildPptPlotRequest } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-final-stats-"));
  fs.mkdirSync(path.join(project, "experiments", "results"), { recursive: true });
  fs.mkdirSync(path.join(project, "zlk_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(project, "experiments", "results", "seed1.csv"), "metric,value\nAUC,0.9\n", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "plotting_contract.json"), "{}", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "statistics.json"), JSON.stringify({ resultCount: 1, aggregationPolicy: { source: "archived_only" }, rows: [{ group: "ours", metrics: { AUC: { mean: 0.91, std: 0.01 } } }] }), "utf8");
  const req = await buildPptPlotRequest({
    projectRoot: project,
    sourcePaths: ["experiments/results/seed1.csv"],
    sourceLabel: "单次结果",
  }, "final-stats-1");
  assert.deepEqual(req.sourcePaths, ["zlk_cluster/results/statistics.json"]);
  assert.equal(req.sourceLabel, "单次结果");
});

test("PptPlotBridge rejects raw single-seed result source when final statistics are missing", async () => {
  const { buildPptPlotRequest } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-missing-stats-"));
  fs.mkdirSync(path.join(project, "experiments", "results"), { recursive: true });
  fs.mkdirSync(path.join(project, "zlk_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(project, "experiments", "results", "seed1.csv"), "metric,value\nAUC,0.9\n", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "plotting_contract.json"), "{}", "utf8");
  await assert.rejects(
    () => buildPptPlotRequest({ projectRoot: project, sourcePaths: ["experiments/results/seed1.csv"] }, "missing-stats-1"),
    /SCI 绘图需要先生成聚合统计/,
  );
});

test("PptPlotBridge sends markdownSummary when md has no sibling json", async () => {
  const { buildPptPlotRequest } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-md-"));
  fs.mkdirSync(path.join(project, "zlk_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "plotting_contract.json"), "{}", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "storyline.md"), "# storyline\n中文摘要\n", "utf8");
  const req = await buildPptPlotRequest({
    projectRoot: project,
    sourcePaths: ["zlk_cluster/results/storyline.md"],
  }, "req-md");
  assert.deepEqual(req.sourcePaths, ["zlk_cluster/results/storyline.md"]);
  assert.equal(req.markdownSummary.path, "zlk_cluster/results/storyline.md");
  assert.match(req.markdownSummary.text, /中文摘要/);
});

test("PptPlotBridge reports Chinese error when automation server is offline", async () => {
  const { PptPlotBridge } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-offline-"));
  fs.mkdirSync(path.join(project, "zlk_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "plotting_contract.json"), "{}", "utf8");
  let launched = false;
  const bridge = new PptPlotBridge({
    localAppData: fs.mkdtempSync(path.join(os.tmpdir(), "rough-ppt-offline-")),
    requestIdFactory: () => "offline-1",
    launchPowerPoint: () => { launched = true; },
    sleep: () => new Promise((resolve) => setTimeout(resolve, 2)),
    healthTimeoutMs: 1,
    healthPollMs: 1,
  });
  await assert.rejects(
    () => bridge.plot({ projectRoot: project, sourcePaths: ["zlk_cluster/results/plotting_contract.json"] }),
    /PPT automation 未就绪/,
  );
  assert.equal(launched, true);
  assert.equal(fs.existsSync(path.join(project, "zlk_cluster", "results", "ppt_plot_requests", "offline-1.json")), true);
  assert.equal(fs.existsSync(path.join(project, "zlk_cluster", "results", "ppt_plot_requests", "offline-1.response.json")), true);
});

test("PptPlotBridge posts to online automation server and writes audit files", async () => {
  const { PptPlotBridge } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-online-"));
  const localAppData = fs.mkdtempSync(path.join(os.tmpdir(), "rough-ppt-online-"));
  fs.mkdirSync(path.join(project, "zlk_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "plotting_contract.json"), "{}", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "results", "statistics.json"), JSON.stringify({ resultCount: 1, aggregationPolicy: { source: "archived_only" }, rows: [] }) + "\n", "utf8");
  const seen = {};
  const server = await startMockPptServer(seen);
  const autoDir = path.join(localAppData, "RoughPptAddin");
  fs.mkdirSync(autoDir, { recursive: true });
  fs.writeFileSync(path.join(autoDir, "automation.json"), JSON.stringify({ baseUrl: `http://127.0.0.1:${server.port}`, schemaVersion: 1 }), "utf8");
  fs.writeFileSync(path.join(autoDir, "automation.token"), "token-1\n", "utf8");
  try {
    const bridge = new PptPlotBridge({
      localAppData,
      requestIdFactory: () => "online-1",
      launchPowerPoint: () => { throw new Error("server already online"); },
    });
    const result = await bridge.plot({
      projectRoot: project,
      sourcePaths: ["zlk_cluster/results/statistics.json"],
      presentationPath: "D:/tmp/target.pptx",
      sourceLabel: "SCI 统计",
    });
    assert.equal(result.requestId, "online-1");
    assert.equal(seen.healthAuth, "Bearer token-1");
    assert.equal(seen.plotAuth, "Bearer token-1");
    assert.equal(seen.body.target.presentationPath, "D:/tmp/target.pptx");
    assert.deepEqual(seen.body.sourcePaths, ["zlk_cluster/results/statistics.json"]);
    assert.equal(fs.existsSync(result.requestPath), true);
    assert.equal(fs.existsSync(result.responsePath), true);
    assert.equal(JSON.parse(fs.readFileSync(result.responsePath, "utf8")).ok, true);
  } finally {
    await new Promise((resolve) => server.server.close(resolve));
  }
});

test("ensureLocalPlottingContract writes local contract without Hub export fallback", async () => {
  const { ensureLocalPlottingContract } = require("../dist/PptPlotBridge.js");
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-ppt-contract-"));
  const rel = await ensureLocalPlottingContract(project);
  assert.equal(rel, "zlk_cluster/results/plotting_contract.json");
  assert.equal(fs.existsSync(path.join(project, rel)), true);
  assert.equal(fs.existsSync(path.join(project, "zlk_cluster", "results", "output_contract_for_plotting.md")), true);
});

function startMockPptServer(seen) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      if (request.url === "/health") {
        seen.healthAuth = request.headers.authorization;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, schemaVersion: 1 }));
        return;
      }
      if (request.url === "/api/zlk-cluster/plot" && request.method === "POST") {
        seen.plotAuth = request.headers.authorization;
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { body += chunk; });
        request.on("end", () => {
          seen.body = JSON.parse(body);
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ ok: true, slideCount: 1 }));
        });
        return;
      }
      response.writeHead(404);
      response.end();
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}
