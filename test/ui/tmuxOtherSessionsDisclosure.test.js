const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

function harness() {
  const html = renderPanelHtml();
  const between = (start, end) => {
    const from = html.indexOf(start), to = html.indexOf(end, from + start.length);
    assert.ok(from >= 0 && to > from, start);
    return html.slice(from, to);
  };
  const elements = {};
  const sessions = [0, 1].map(gpu => ({ name: "zlk-gpu-" + gpu, windows: [
    { index: "0", name: "bash", panes: [] },
    { index: "1", name: "run-" + gpu, task: { case: "case-" + gpu, seed: 42, status: gpu ? "running" : "failed" }, panes: [] },
  ] }));
  sessions.push({ name: "m1mechanism", windows: Array.from({ length: 17 }, (_, i) => ({ index: String(i), name: "mechanism-" + i, panes: [{ target: "m1mechanism:" + i + ".0", command: "bash" }] })) });
  sessions.push({ name: "zlk-worker-agent", windows: [{ index: "0", name: "agent", panes: [] }] });
  const context = vm.createContext({
    tmuxListCache: { workerId: "NWPU5", sessions, gpuIds: ["0", "1"], fetchedAt: "t0" },
    tmuxWindowFilter: "all", tmuxSelectedTaskTarget: "", tmuxSelectedPaneTarget: "", tmuxSelectedWorkerId: "NWPU5", tmuxClearTaskTabsBusy: false,
    el: id => elements[id] || (elements[id] = { innerHTML: "", textContent: "", value: "", options: [], open: false }),
  });
  vm.runInContext(between("function esc(value)", "function cssEscape(") + between("function normalizeTmuxWindowFilter(", "function renderTmuxWorkersOverview("), context);
  const render = () => vm.runInContext("renderTmuxOverview(tmuxListCache.sessions)", context);
  return { context, elements, render };
}

test("unrelated tmux windows are folded outside the GPU cards and overview", () => {
  const { elements, render } = harness();
  render();
  const bar = elements.tmuxFilterBar.innerHTML;
  const folded = bar.indexOf('<details id="tmuxOtherSessions"');
  assert.ok(folded > 0, "ordinary sessions need a collapsed disclosure");
  assert.equal((bar.slice(0, folded).match(/data-tmux-filter=/g) || []).length, 3);
  assert.doesNotMatch(bar.slice(0, folded), /m1mechanism|zlk-worker-agent/);
  assert.match(bar.slice(folded), /其他会话.*18/);
  assert.doesNotMatch(bar.slice(folded, bar.indexOf(">", folded) + 1), /\bopen\b/);
  assert.match(bar.slice(folded), /data-tmux-filter="m1mechanism:16"/);
  assert.match(bar.slice(folded), /data-tmux-close="m1mechanism:16"/);
  const overview = elements.tmuxOverview.innerHTML;
  const overviewFolded = overview.indexOf('<details id="tmuxOtherOverview"');
  assert.ok(overviewFolded > 0);
  assert.doesNotMatch(overview.slice(0, overviewFolded), /m1mechanism|zlk-worker-agent/);
  assert.match(elements.tmuxListMeta.textContent, /GPU 2.*任务标签 2.*其他会话 2/);
});

test("selecting an ordinary window reveals its exact target and pane", () => {
  const { context, elements, render } = harness();
  context.tmuxWindowFilter = "m1mechanism:12";
  render();
  assert.match(elements.tmuxFilterBar.innerHTML, /<details id="tmuxOtherSessions"[^>]*\bopen\b/);
  assert.match(elements.tmuxFilterBar.innerHTML, /data-tmux-filter="m1mechanism:12" aria-pressed="true"/);
  assert.match(elements.tmuxOverview.innerHTML, /data-tmux-pane="m1mechanism:12\.0"/);
});

test("expanded disclosures survive polling and GPU order stays physical", () => {
  const { context, elements, render } = harness();
  render();
  elements.tmuxOtherSessions.open = true;
  elements.tmuxOtherOverview.open = true;
  context.tmuxListCache.sessions[1].windows[1].active = true;
  render();
  assert.match(elements.tmuxFilterBar.innerHTML, /<details id="tmuxOtherSessions"[^>]*\bopen\b/);
  assert.match(elements.tmuxOverview.innerHTML, /<details id="tmuxOtherOverview"[^>]*\bopen\b/);
  assert.ok(elements.tmuxFilterBar.innerHTML.indexOf('data-tmux-filter="zlk-gpu-0"') < elements.tmuxFilterBar.innerHTML.indexOf('data-tmux-filter="zlk-gpu-1"'));
});

test("GPU selection retains job labels and a synthetic idle GPU stays visible", () => {
  const { context, elements, render } = harness();
  context.tmuxWindowFilter = "zlk-gpu-1";
  context.tmuxListCache.gpuIds.push("2");
  render();
  assert.match(elements.tmuxFilterBar.innerHTML, /data-tmux-filter="gpu-slot:2"/);
  assert.match(elements.tmuxOverview.innerHTML, /case-1 · seed 42 · 运行中/);
  assert.match(elements.tmuxOverview.innerHTML, /data-tmux-task-target="zlk-gpu-1:1"/);
  assert.doesNotMatch(elements.tmuxOverview.innerHTML, /m1mechanism/);
});

test("a Worker with only ordinary sessions still offers their windows without inventing GPU tasks", () => {
  const { context, elements, render } = harness();
  context.tmuxListCache.sessions = context.tmuxListCache.sessions.filter(session => !session.name.startsWith("zlk-gpu-"));
  context.tmuxListCache.gpuIds = [];
  render();
  assert.match(elements.tmuxFilterBar.innerHTML, /GPU 总览<\/span><b>0/);
  assert.match(elements.tmuxFilterBar.innerHTML, /data-tmux-filter="m1mechanism:0"/);
  assert.match(elements.tmuxOverview.innerHTML, /<details id="tmuxOtherOverview"[^>]*><summary>/);
  assert.match(elements.tmuxListMeta.textContent, /GPU 0.*任务标签 0.*其他会话 2/);
});

test("empty inventory keeps idle GPU slots and does not leave an empty ordinary-session disclosure", () => {
  const { context, elements, render } = harness();
  context.tmuxListCache.sessions = [];
  render();
  assert.match(elements.tmuxFilterBar.innerHTML, /data-tmux-filter="gpu-slot:0"/);
  assert.match(elements.tmuxFilterBar.innerHTML, /data-tmux-filter="gpu-slot:1"/);
  assert.doesNotMatch(elements.tmuxFilterBar.innerHTML, /<details/);
});
