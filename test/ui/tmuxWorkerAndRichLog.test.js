const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");
const { readSource } = require("../_helpers/sourceReader");

test("Rich progress redraws replace old lines in the log view", () => {
  const html = renderPanelHtml();
  const start = html.indexOf("function terminalDisplayText(raw)");
  const end = html.indexOf("async function refreshTmuxCapture()", start);
  assert.ok(start >= 0 && end > start);
  const display = vm.runInNewContext(html.slice(start, end) + "; terminalDisplayText;");
  const progress = "start\nTrain 1/3 0%\nVal 1/3 0%\r\x1b[2K\x1b[1A\x1b[2KTrain 1/3 50%\nVal 1/3 50%\r\x1b[2K\x1b[1A\x1b[2KTrain 1/3 100%\nVal 1/3 100%";
  const result = display(progress);
  assert.match(result, /start/);
  assert.match(result, /Train 1\/3 100%/);
  assert.match(result, /Val 1\/3 100%/);
  assert.doesNotMatch(result, /(?:^|\s)(?:0%|50%)|\x1b/);
});

test("tmux overview requests and retains all Worker session lists", () => {
  const panel = readSource("src/ui/PanelHtml.legacy.ts");
  const host = readSource("src/extension/legacy.ts");
  assert.match(panel, /allWorkers: true/);
  assert.match(panel, /tmuxListsByWorker\[item\.workerId\]/);
  assert.match(panel, /data-tmux-worker/);
  assert.match(host, /Promise\.all\(workerIds\.map\(\(workerId\) => this\.fetchOneTmuxListFromUi\(workerId\)\)\)/);
});
