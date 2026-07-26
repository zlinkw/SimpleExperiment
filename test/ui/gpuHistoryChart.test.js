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
  assert.match(html, /gpuHistorySeriesRevision \+= 1/);
  assert.match(html, /gpuHistoryOverviewCacheRevision === gpuHistorySeriesRevision/);
  assert.match(html, /GPU_HISTORY_REQUEST_COOLDOWN_MS = 60_000/);
  assert.match(html, /gpuHistoryRequestLastAt/);
  assert.match(html, /const wasOpen = gpuHistoryOverviewOpen/);
  assert.match(html, /historyDetails\.open && !wasOpen/);
  assert.match(html, /const wasOpen = expandedGpuHistoryKeys\.has\(key\)/);
  assert.match(html, /if \(!wasOpen\) requestGpuHistory/);
});

test("GPU history chart connects explicitly zero-filled buckets and exposes accessible legends", () => {
  const html = renderPanelHtml();
  assert.match(html, /GPU_HISTORY_GAP_FACTOR/);
  assert.match(html, /缺失补零仅用于连接曲线，不代表真实负载/);
  assert.match(html, /GPU_HISTORY_SERIES_CACHE_LIMIT = 128/);
  assert.match(html, /point\.imputed === true/);
  assert.match(html, /class="gpuLegendItem"/);
  assert.match(html, /data-gpu-history-focus/);
  assert.match(html, /tabindex="0" role="img"/);
  assert.match(html, /class="gpuHistoryTooltip" role="status"/);
  assert.match(html, /updateGpuHistoryTooltip/);
  assert.match(html, /let activeGpuHistoryTooltip = null/);
  assert.match(html, /activeGpuHistoryTooltip !== tooltip/);
  assert.doesNotMatch(html, /querySelectorAll\("\.gpuHistoryTooltip:not\(\[hidden\]\)"\)/);
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
