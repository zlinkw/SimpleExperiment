const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

function inlineFunction(name) {
  const html = renderPanelHtml();
  const scriptStart = html.indexOf(">", html.indexOf("<script")) + 1;
  const script = html.slice(scriptStart, html.indexOf("</script>", scriptStart));
  const start = script.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "missing inline function " + name);
  const bodyStart = script.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < script.length; index += 1) {
    const char = script[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return script.slice(start, index + 1);
  }
  throw new Error("unclosed inline function " + name);
}

function chartContext(functionNames) {
  const context = {
    gpuHistoryServerStyles: {},
    gpuHistoryMeta: { bucketSeconds: 300 },
    gpuHistorySeriesCache: new Map(),
    gpuHistorySeriesRevision: 0,
    gpuHistoryOverviewCacheRevision: -1,
    gpuHistoryOverviewCacheState: null,
    gpuHistoryOverviewCacheServers: null,
    gpuHistoryOverviewCacheValue: [],
    gpuHistoryPointIndexCache: new WeakMap(),
    GPU_HISTORY_GAP_FACTOR: 1.75,
    GPU_HISTORY_COLORS: ["#2885EF", "#CD8300", "#03A14A", "#E64343", "#A95DDA", "#00A3B4", "#C952A8", "#849B11", "#DE6907", "#009F89", "#CE4A72", "#008DBE"],
    GPU_HISTORY_LINE_STYLES: ["solid", "dash", "dot", "dashdot"],
    GPU_HISTORY_MARKERS: ["circle", "square", "triangle", "diamond"],
    GPU_HISTORY_MIN_COLOR_DISTANCE: 0.09,
    saveGpuHistoryServerStyles() {},
    asArray(value) { return Array.isArray(value) ? value : []; },
    gpuServerDisplayName(_state, server) { return server.serverId; },
  };
  const source = functionNames.map(inlineFunction).join("\n");
  vm.runInNewContext(source, context);
  return context;
}

test("GPU history server styles remain stable and distinguish 1, 2, 8, and 16 servers", () => {
  const context = chartContext([
    "gpuHistoryServerStyle", "chooseGpuHistoryColor", "gpuHistoryColorDistance", "gpuHistoryOklab",
    "gpuStableIndex", "lineDashForStyle",
    "finiteHistoryPercent",
  ]);
  for (const count of [1, 2, 8, 16]) {
    const styles = Array.from({ length: count }, (_, index) => context.gpuHistoryServerStyle("server-" + index));
    const signatures = styles.map((style) => [style.color, JSON.stringify(style.dash), style.marker].join("|"));
    assert.equal(new Set(signatures).size, count);
    assert.ok(new Set(styles.map((style) => style.color)).size <= Math.min(count, 12));
    assert.ok(styles.every((style) => style.dash && style.marker));
  }
  const before = JSON.stringify(context.gpuHistoryServerStyle("server-3"));
  context.gpuHistoryServerStyle("server-new");
  assert.equal(JSON.stringify(context.gpuHistoryServerStyle("server-3")), before);
});

test("GPU history palette uses OKLCH candidates and OKLab color distance", () => {
  const context = chartContext(["chooseGpuHistoryColor", "gpuHistoryColorDistance", "gpuHistoryOklab", "gpuHistoryOklchToHex"]);
  assert.equal(context.gpuHistoryOklchToHex([0.62, 0.18, 255]), "#2885EF");
  const blueOrangeDistance = context.gpuHistoryColorDistance("#2885EF", "#CD8300");
  const blueOrangeRgbDistance = Math.sqrt((40 - 205) ** 2 + (133 - 131) ** 2 + (239 - 0) ** 2);
  assert.ok(blueOrangeDistance > 0.1);
  assert.notEqual(blueOrangeDistance, blueOrangeRgbDistance);
  assert.equal(context.chooseGpuHistoryColor(["#E64343"], ["#DE6907"]), "");
});

test("GPU history gap detection distinguishes explicit gaps from regular downsampling", () => {
  const context = chartContext(["historyExpectedStep", "historyPointStartsGap", "historyGapCount"]);
  context.GPU_HISTORY_GAP_FACTOR = 1.75;
  const sampled = [0, 2700, 5400].map((bucketEpoch) => ({ bucketEpoch }));
  assert.equal(context.historyGapCount(sampled), 0);
  const raw = Array.from({ length: 10 }, (_, index) => ({ bucketEpoch: index < 5 ? index * 300 : index * 300 + 300 }));
  assert.equal(context.historyGapCount(raw), 1);
  assert.equal(context.historyPointStartsGap({ bucketEpoch: 300, gapBefore: true }, { bucketEpoch: 0 }, 300), true);
});

test("GPU overview curve uses per-time-bucket server GPU peak without zero filling", () => {
  const context = chartContext(["gpuHistoryOverviewSeries", "finiteHistoryPercent"]);
  context.gpuHistorySeriesCache.set("server-a::0", {
    serverId: "server-a", gpuId: "0", points: [
      { bucketEpoch: 100, timestamp: "t1", gpuUtilPercent: 20 },
      { bucketEpoch: 200, timestamp: "t2", gpuUtilPercent: 80 },
    ],
  });
  context.gpuHistorySeriesCache.set("server-a::1", {
    serverId: "server-a", gpuId: "1", points: [
      { bucketEpoch: 100, timestamp: "t1", gpuUtilPercent: 70 },
    ],
  });
  const result = context.gpuHistoryOverviewSeries({}, [{ serverId: "server-a" }]);
  assert.equal(JSON.stringify(result[0].points.map((point) => [point.bucketEpoch, point.gpuUtilPercent])), JSON.stringify([[100, 70], [200, 80]]));
  assert.equal(result[0].points.some((point) => point.gpuUtilPercent === 0), false);
});

test("GPU overview curve reuses aggregation until history revision changes", () => {
  const context = chartContext(["gpuHistoryOverviewSeries", "finiteHistoryPercent"]);
  const state = {};
  const servers = [{ serverId: "server-a" }];
  context.gpuHistorySeriesCache.set("server-a::0", {
    serverId: "server-a", gpuId: "0", points: [{ bucketEpoch: 100, gpuUtilPercent: 20 }],
  });
  const first = context.gpuHistoryOverviewSeries(state, servers);
  const reused = context.gpuHistoryOverviewSeries(state, servers);
  assert.equal(reused, first);

  context.gpuHistorySeriesCache.set("server-a::0", {
    serverId: "server-a", gpuId: "0", points: [{ bucketEpoch: 100, gpuUtilPercent: 80 }],
  });
  context.gpuHistorySeriesRevision += 1;
  const refreshed = context.gpuHistoryOverviewSeries(state, servers);
  assert.notEqual(refreshed, first);
  assert.equal(refreshed[0].points[0].gpuUtilPercent, 80);
});

test("GPU card hover text reports percentage and memory MB", () => {
  const context = chartContext(["finiteHistoryPercent", "historyPercentText", "historyMemoryText"]);
  assert.equal(context.historyPercentText(42.34), "42.3%");
  assert.equal(context.historyMemoryText({ memoryUsedMb: 1024.4, memoryTotalMb: 8192 }), "1024 / 8192 MB");
});

test("GPU history point index caches sorted points and uses gap-aware binary lookup", () => {
  const context = chartContext([
    "historyExpectedStep", "gpuHistoryPointIndex", "nearestHistoryPointFromIndex", "nearestHistoryPoint",
    "gpuHistoryTimeRange", "gpuHistoryNearestTimestamp",
  ]);
  const points = [
    { id: "late", bucketEpoch: 300 },
    { id: "early", bucketEpoch: 100 },
    { id: "middle", bucketEpoch: 200 },
  ];
  const firstIndex = context.gpuHistoryPointIndex(points);
  assert.equal(context.gpuHistoryPointIndex(points), firstIndex);
  assert.deepEqual(Array.from(firstIndex.times), [100, 200, 300]);
  assert.equal(context.nearestHistoryPoint(points, 220).id, "middle");
  assert.equal(context.nearestHistoryPoint(points, 2000), null);
  assert.equal(JSON.stringify(context.gpuHistoryTimeRange([{ points }])), JSON.stringify({ min: 100, max: 300 }));
  assert.equal(context.gpuHistoryNearestTimestamp([{ points }], 260), 300);
});
