const assert = require("node:assert/strict");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

test("tmux detail exposes a button per pane and captures the selected pane", () => {
  const source = readSource("src/ui/PanelHtml.ts");
  assert.match(source, /data-tmux-pane=/);
  assert.match(source, /event\.target\.closest\("button\[data-tmux-pane\]"\)/);
  assert.match(source, /tmuxSelectedPaneTarget = String\(tmuxPaneButton\.getAttribute\("data-tmux-pane"\)/);
  assert.match(source, /return tmuxSelectedPaneTarget;/);
  assert.match(source, /panes\.some\(function\(p\)\{ return p\.target === tmuxSelectedPaneTarget; \}\)/);
});

test("tmux close has its own button and asks in the extension host", () => {
  const panel = readSource("src/ui/PanelHtml.legacy.ts");
  const extension = readSource("src/extension/legacy.ts");
  const render = panel.slice(panel.indexOf("function renderTmuxFilterBar("), panel.indexOf("function renderTmuxOverview("));
  const handler = panel.slice(panel.indexOf('const tmuxCloseTarget = event.target.closest("[data-tmux-close]")'), panel.indexOf('const tmuxPaneButton = event.target.closest("button[data-tmux-pane]")'));
  const host = extension.slice(extension.indexOf("async killTmuxWindowFromUi("), extension.indexOf("async openTensorBoardUrlFromUi("));
  assert.match(render, /<button type="button" class="tmuxClose"/);
  assert.match(render, /c\.category === "gpu" \|\| c\.synthetic/);
  assert.match(render, /: closeHtml/);
  assert.doesNotMatch(handler, /window\.confirm/);
  assert.match(handler, /vscode\.postMessage\(\{ command: "killTmuxWindow"/);
  assert.match(host, /showWarningMessage\([\s\S]*?\{ modal: true \}, "关闭窗口"/);
  assert.match(host, /const body = \{ target, window: win, session, confirm: true \}/);
});
