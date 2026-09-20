const assert = require("node:assert/strict");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { aggregateSeedScalars } = require("../dist/tensorboard/ScalarAggregation");
const { smoothScalarValues, scalarExtreme } = require("../dist/tensorboard/ScalarChartMath");
const { scalarDashboardHtml } = require("../dist/tensorboard/ScalarDashboardHtml");
const { LocalApiServer } = require("../dist/api/LocalApiServer.legacy");

test("exact-step mean, sample SD, missing values and cross-Worker seed deduplication", () => {
  const result = aggregateSeedScalars([
    { seed: "42", serverId: "a", updatedAt: 1, points: [[1, 1], [2, 3]] },
    { seed: "42", serverId: "b", updatedAt: 2, points: [[1, 5], [2, NaN]] },
    { seed: "43", serverId: "c", updatedAt: 1, points: [[1, 3], [3, 9]] },
    { seed: "", serverId: "d", updatedAt: 9, points: [[1, 99]] },
  ]);
  assert.deepEqual(result.points, [
    { step: 1, mean: 4, std: Math.SQRT2, n: 2, seeds: { "42": 5, "43": 3 } },
    { step: 3, mean: 9, std: null, n: 1, seeds: { "43": 9 } },
  ]);
});

test("smoothing preserves constant values and extreme markers use raw values", () => {
  assert.deepEqual(smoothScalarValues([2, 2, 2], 0.7).map((value) => Math.round(value * 1e9) / 1e9), [2, 2, 2]);
  assert.deepEqual(smoothScalarValues([1, 9, 1], 0), [1, 9, 1]);
  assert.deepEqual(scalarExtreme([{ step: 1, value: 2 }, { step: 2, value: 7 }, { step: 3, value: 7 }], "max"), { step: 2, value: 7 });
  assert.deepEqual(scalarExtreme([{ step: 1, value: 2 }, { step: 2, value: NaN }, { step: 3, value: -1 }], "min"), { step: 3, value: -1 });
});

test("case selection loads every metric and viewer script compiles", () => {
  const vm = require("node:vm");
  const script = scalarDashboardHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1]?.replace("__SCALAR_VIEWER_SERVER__", "0");
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /renderCards\(tags\)/);
  assert.match(script, /call\('series',\{groups,tags\}\)/);
  assert.match(script, /scalarExtreme\(values,kind\)/);
  assert.match(script, /maxComparisonCases=19/);
  assert.match(fs.readFileSync(path.join(__dirname, "../dist/extension/legacy.js"), "utf8"), /params\.groups\.slice\(0, 20\)/);
});

test("old and tensor scalar records, incomplete tail, overwrite and CRC", () => {
  const script = path.join(__dirname, "tensorboard_scalar_agent.py");
  const result = spawnSync("python", ["-X", "utf8", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("viewer ticket is single use and curve API requires a local browser session", async () => {
  const nativeCalls = [];
  const server = new LocalApiServer({
    name: "test", version: "0", preferredPort: 29180,
    scalarViewer: {
      html: "<h1>__SCALAR_VIEWER_SERVER__</h1>",
      query: async () => ({ plans: [] }),
      native: async (_method, route, _body, _type, endpointId) => {
        nativeCalls.push({ route, endpointId });
        return { status: 200, body: Buffer.from("native"), contentType: "text/plain" };
      },
    },
  });
  try {
    await server.start();
    const entry = server.viewerUrl();
    const root = new URL(entry).origin;
    assert.equal((await fetch(root + "/tensorboard/api", { method: "POST" })).status, 401);
    const page = await fetch(entry);
    assert.equal(page.status, 200);
    const cookie = page.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(root + "/tensorboard/api", { method: "POST", headers: { cookie } })).status, 403);
    const data = await fetch(root + "/tensorboard/api", { method: "POST", headers: { cookie, origin: root, "content-type": "application/json" }, body: '{"action":"catalog"}' });
    assert.equal(data.status, 200);
    assert.deepEqual(await data.json(), { plans: [] });
    assert.equal((await fetch(root + "/api/tensorboard/ui/")).status, 401);
    assert.equal((await fetch(root + "/api/tensorboard/ui/", { headers: { cookie } })).status, 200);
    assert.equal((await fetch(entry)).status, 401);
    const other = server.viewerUrl("worker-b");
    const otherPage = await fetch(other);
    const otherCookie = otherPage.headers.get("set-cookie").split(";")[0];
    assert.notEqual(otherCookie.split("=")[0], cookie.split("=")[0]);
    assert.equal((await fetch(root + "/tensorboard/api?server=worker-b", { method: "POST", headers: { cookie, origin: root } })).status, 401);
    assert.equal((await fetch(root + "/tensorboard/api?server=worker-b", { method: "POST", headers: { cookie: otherCookie, origin: root } })).status, 200);
    assert.equal((await fetch(root + "/api/tensorboard/ui/data", { headers: { cookie: otherCookie, referer: root + "/api/tensorboard/ui/?server=worker-b" } })).status, 200);
    assert.deepEqual(nativeCalls.at(-1), { route: "/api/tensorboard/ui/data", endpointId: "worker-b" });
  } finally {
    await server.dispose();
  }
});
