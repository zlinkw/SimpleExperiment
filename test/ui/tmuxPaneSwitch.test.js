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
