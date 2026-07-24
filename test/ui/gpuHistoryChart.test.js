const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("GPU history UI provides overview and per-card expandable charts", () => {
  const html = renderPanelHtml();
  assert.match(html, /id="gpuHistoryOverview"/);
  assert.match(html, /data-gpu-history-scope="overview"/);
  assert.match(html, /data-gpu-history-scope="gpu"/);
  assert.match(html, /command: "loadGpuHistory"/);
  assert.match(html, /gpuHistoryOverviewSeries/);
  assert.match(html, /gpuHistorySeriesCache/);
  assert.match(html, /GPU_HISTORY_REQUEST_COOLDOWN_MS = 60_000/);
  assert.match(html, /gpuHistoryRequestLastAt/);
  assert.match(html, /const wasOpen = gpuHistoryOverviewOpen/);
  assert.match(html, /historyDetails\.open && !wasOpen/);
  assert.match(html, /const wasOpen = expandedGpuHistoryKeys\.has\(key\)/);
  assert.match(html, /if \(!wasOpen\) requestGpuHistory/);
});

test("GPU history chart keeps missing buckets as gaps and exposes accessible legends", () => {
  const html = renderPanelHtml();
  assert.match(html, /GPU_HISTORY_GAP_FACTOR/);
  assert.match(html, /缺口不会补零/);
  assert.match(html, /class="gpuLegendItem"/);
  assert.match(html, /data-gpu-history-focus/);
  assert.match(html, /tabindex="0" role="img"/);
  assert.match(html, /class="gpuHistoryTooltip" role="status"/);
  assert.match(html, /updateGpuHistoryTooltip/);
  assert.match(html, /historyMemoryText/);
  assert.match(html, /GPU_HISTORY_LINE_STYLES/);
  assert.match(html, /GPU_HISTORY_MARKERS/);
});

test("GPU history server styling persists by server id and has fallback patterns", () => {
  const html = renderPanelHtml();
  assert.match(html, /simpleExperiment\.gpuHistoryServerStyles/);
  assert.match(html, /gpuHistoryServerStyle\(serverId\)/);
  assert.match(html, /lineDashForStyle/);
  assert.match(html, /gpuStableIndex/);
  assert.match(html, /GPU_HISTORY_OKLCH_CANDIDATES/);
  assert.match(html, /gpuHistoryOklchToHex/);
  assert.match(html, /gpuHistoryOklab/);
  assert.match(html, /chooseGpuHistoryColor/);
  assert.match(html, /GPU_HISTORY_MIN_COLOR_DISTANCE/);
});
