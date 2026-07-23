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
    GPU_HISTORY_COLORS: ["#2563EB", "#D97706", "#059669", "#DC2626", "#7C3AED", "#0891B2", "#A21CAF", "#4D7C0F", "#C2410C", "#0F766E", "#BE123C", "#475569"],
    GPU_HISTORY_LINE_STYLES: ["solid", "dash", "dot", "dashdot"],
    GPU_HISTORY_MARKERS: ["circle", "square", "triangle", "diamond"],
    GPU_HISTORY_MIN_COLOR_DISTANCE: 80,
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
    "gpuHistoryServerStyle", "chooseGpuHistoryColor", "gpuHistoryColorDistance", "gpuHistoryRgb",
    "gpuStableIndex", "lineDashForStyle",
    "finiteHistoryPercent",
  ]);
  for (const count of [1, 2, 8, 16]) {
    const styles = Array.from({ length: count }, (_, index) => context.gpuHistoryServerStyle("server-" + index));
    assert.equal(new Set(styles.map((style) => style.color)).size, Math.min(count, 12));
    assert.ok(styles.every((style) => style.dash && style.marker));
  }
  const before = JSON.stringify(context.gpuHistoryServerStyle("server-3"));
  context.gpuHistoryServerStyle("server-new");
  assert.equal(JSON.stringify(context.gpuHistoryServerStyle("server-3")), before);
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

test("GPU card hover text reports percentage and memory MB", () => {
  const context = chartContext(["finiteHistoryPercent", "historyPercentText", "historyMemoryText"]);
  assert.equal(context.historyPercentText(42.34), "42.3%");
  assert.equal(context.historyMemoryText({ memoryUsedMb: 1024.4, memoryTotalMb: 8192 }), "1024 / 8192 MB");
});
