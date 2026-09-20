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
  const script = scalarDashboardHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1]?.replace("__SCALAR_VIEWER_SERVER__", "0").replace("__SCALAR_VIEWER_EPOCH__", '"test"');
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /renderCards\(tags\)/);
  assert.match(script, /call\('series',\{groups,tags\}\)/);
  assert.match(script, /scalarExtreme\(values,kind\)/);
  assert.match(script, /maxComparisonCases=19/);
  assert.match(script, /h=Math\.max\(190,rect\.height\)/);
  assert.match(fs.readFileSync(path.join(__dirname, "../dist/extension/legacy.js"), "utf8"), /params\.groups\.slice\(0, 20\)/);
});

test("hover details show one compact comparison row per case without an inner vertical scroller", () => {
  const vm = require("node:vm");
  const script = scalarDashboardHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
  const elSource = script.slice(script.indexOf("function el("), script.indexOf("function key("));
  const hoverSource = script.slice(script.indexOf("function nearestIndex("), script.indexOf("document.getElementById('refresh')"));
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.style = { props: {}, setProperty: (name, value) => { this.style.props[name] = value; } }; }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren(...children) { this.children = children.flatMap(child => child.tag === "fragment" ? child.children : [child]); }
    set textContent(value) { this.text = value; }
    get textContent() { return this.text || this.children.map(child => child.textContent).join(" "); }
  }
  const document = { createElement: tag => new Element(tag), createDocumentFragment: () => new Element("fragment") };
  const context = vm.createContext({ document });
  vm.runInContext(elSource + hoverSource + "globalThis.renderHoverDetails=renderHoverDetails;globalThis.hoverCard=hoverCard", context);
  const tooltip = new Element("div");
  const card = {
    tooltip, markers: [], smooth: { value: "0.4" },
    plot: { bounds: { x0: 1, x1: 3 }, left: 0, right: 100 },
    displaySeries: [
      { color: "#3766df", means: [0.8], row: { case: "bus_p30", points: [{ step: 2, mean: 0.79, std: 0.01, n: 2, seeds: { 42: 0.78, 43: 0.8 } }], expectedSeeds: 5 } },
      { color: "#d97706", means: [0.75], row: { case: "bus_p40", points: [{ step: 2, mean: 0.74, std: null, n: 1, seeds: { 44: 0.74 } }], expectedSeeds: 5 } },
    ],
  };
  context.hoverCard(card, { offsetX: 50, offsetY: 200 });
  assert.equal(tooltip.children.length, 1);
  const table = tooltip.children[0];
  assert.equal(table.tag, "table");
  assert.equal(table.children[0].tag, "colgroup");
  assert.equal(table.children[0].children.length, 7);
  assert.equal(table.style.props["--hover-case-width"], "9ch");
  assert.equal(table.style.props["--hover-step-width"], "6ch");
  assert.equal(table.style.props["--hover-seeds-width"], "23ch");
  const rows = table.children[2].children;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children.length, 7);
  assert.match(rows[0].title, /bus_p30.*step 2.*数值 0\.790000.*平滑 0\.800000.*标准差 0\.010000.*seed 2\/5.*42:0\.7800.*43:0\.8000/);
  assert.match(rows[1].title, /bus_p40.*标准差 —.*seed 1\/5.*44:0\.7400/);
  const css = scalarDashboardHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(css, /\.tooltip\{[^}]*overflow-y:auto/);
  assert.match(css, /col\.step-column\{width:var\(--hover-step-width,6ch\)\}/);
  assert.match(css, /col\.seed-column\{width:var\(--hover-seeds-width,36ch\)\}/);
  assert.doesNotMatch(css, /\.step-column\{display:none\}/);
  context.renderHoverDetails(card, Array.from({ length: 20 }, (_, index) => ({ case: "case_" + index, color: "#3766df", step: 7, mean: index, n: 1, expectedSeeds: 5 })));
  assert.equal(tooltip.children[0].children[2].children.length, 20);
  tooltip.clientWidth = 320;
  context.renderHoverDetails(card, [{ case: "very_long_case_name_for_small_cards", color: "#3766df", step: 7, mean: 0.7, seeds: { 42: 0.7, 43: 0.71, 44: 0.72 } }]);
  assert.equal(tooltip.children[0].style.props["--hover-case-width"], "18ch");
  assert.equal(tooltip.children[0].style.props["--hover-seeds-width"], "21ch");
  card.markers = [{ x: 50, y: 200, detail: { case: "bus_p30", color: "#3766df", label: "均值 最大", step: 2, value: 0.79 } }];
  context.hoverCard(card, { offsetX: 50, offsetY: 200 });
  assert.match(tooltip.children[0].children[2].children[0].title, /bus_p30 · 均值 最大.*step 2.*数值 0\.790000/);
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

test("an open scalar tab retains its authenticated tunnel proxy after local API restart", async () => {
  const options = {
    name: "test", version: "0", preferredPort: 29181,
    viewerSessionKey: "a".repeat(64), viewerSessionScope: "project-a",
    scalarViewer: { html: "<h1>__SCALAR_VIEWER_SERVER__</h1>", query: async () => ({ plans: [] }), native: async () => ({ status: 200, body: Buffer.from("ok"), contentType: "text/plain" }) },
  };
  const first = new LocalApiServer(options);
  let second;
  let otherScope;
  try {
    await first.start();
    const entry = first.viewerUrl("worker-a");
    const page = await fetch(entry);
    const cookie = page.headers.get("set-cookie").split(";")[0];
    const root = new URL(entry).origin;
    assert.equal((await fetch(root + "/tensorboard/health?server=worker-a")).status, 401);
    const firstEpoch = (await (await fetch(root + "/tensorboard/health?server=worker-a", { headers: { cookie } })).json()).epoch;
    assert.match(firstEpoch, /^[a-f0-9]{24}$/);
    await first.dispose();
    second = new LocalApiServer(options);
    await second.start();
    const afterRestart = async (url, options) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try { return await fetch(url, options); }
        catch (error) { if (attempt === 3) throw error; await new Promise(resolve => setTimeout(resolve, 20)); }
      }
    };
    assert.equal((await afterRestart(entry, { headers: { cookie } })).status, 200);
    const health = await afterRestart(root + "/tensorboard/health?server=worker-a", { headers: { cookie } });
    assert.equal(health.status, 200);
    assert.notEqual((await health.json()).epoch, firstEpoch);
    const body = '{"action":"catalog"}';
    const headers = { cookie, origin: root, "content-type": "application/json" };
    assert.equal((await fetch(root + "/tensorboard/api?server=worker-a", { method: "POST", headers, body })).status, 200);
    assert.equal((await fetch(root + "/tensorboard/api?server=worker-b", { method: "POST", headers, body })).status, 401);
    const tampered = cookie.slice(0, -1) + (cookie.endsWith("a") ? "b" : "a");
    assert.equal((await fetch(root + "/tensorboard/api?server=worker-a", { method: "POST", headers: { ...headers, cookie: tampered }, body })).status, 401);
    await second.dispose();
    second = undefined;
    otherScope = new LocalApiServer({ ...options, viewerSessionScope: "project-b" });
    await otherScope.start();
    assert.equal((await afterRestart(root + "/tensorboard/api?server=worker-a", { method: "POST", headers, body })).status, 401);
  } finally {
    await first.dispose();
    if (second) await second.dispose();
    if (otherScope) await otherScope.dispose();
  }
});

test("local viewer waits briefly to reuse its previous browser port", async () => {
  const first = new LocalApiServer({ name: "test", version: "0", preferredPort: 29182 });
  const second = new LocalApiServer({ name: "test", version: "0", preferredPort: 29182, preferredPortRetryMs: 800 });
  try {
    await first.start();
    const pending = second.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    await first.dispose();
    assert.equal((await pending).port, 29182);
  } finally {
    await first.dispose();
    await second.dispose();
  }
});
