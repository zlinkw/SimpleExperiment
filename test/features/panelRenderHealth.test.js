const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const vm = require("node:vm");
const ts = require("typescript");

function loadSourceRenderer() {
  const sourcePath = path.resolve(__dirname, "../../src/ui/PanelHtml.legacy.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  loaded._compile(code, sourcePath);
  return loaded.exports.renderPanelHtml;
}

const renderPanelHtml = loadSourceRenderer();

function extractScript(html) {
  const start = html.indexOf("<script");
  const gt = html.indexOf(">", start);
  const end = html.indexOf("</script>", gt);
  assert.ok(start >= 0 && gt >= 0 && end > gt, "script tag missing");
  return html.slice(gt + 1, end);
}

function renderStampedPanelHtml() {
  return renderPanelHtml().replace("<html lang=", '<html data-panel-document-generation="doc-17" lang=');
}

function fakeBrowser(options = {}) {
  let now = 1_000_000;
  let nextTimerId = 0;
  let webviewState = options.initialState || {};
  const timers = new Map();
  const frames = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const sent = [];
  const elements = new Map();
  const addListener = (registry, type, callback) => {
    const entries = registry.get(type) || new Set();
    entries.add(callback);
    registry.set(type, entries);
  };
  const element = (id) => {
    if (elements.has(id)) return elements.get(id);
    const attributes = new Map();
    const classes = new Set();
    const item = {
      id, isConnected: true, hidden: false, textContent: "", innerHTML: "", value: "", checked: false,
      dataset: {}, style: {}, children: [], classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle: (name, force) => {
          if (options.renderThrows && id === "projectOnboardingNotice") throw new Error("fake render failure");
          return force === undefined ? (classes.has(name) ? classes.delete(name) : classes.add(name)) : (force ? classes.add(name) : classes.delete(name));
        },
      },
      addEventListener(type, callback) { addListener(this.listeners || (this.listeners = new Map()), type, callback); },
      removeEventListener(type, callback) { this.listeners?.get(type)?.delete(callback); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) || null; },
      hasAttribute(name) { return attributes.has(name); },
      removeAttribute(name) { attributes.delete(name); },
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      replaceChildren(...children) { this.children = children; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, matches(selector) { return selector.includes('data-command="selectExperiment"') && this.dataset.command === "selectExperiment"; },
      getClientRects() { return id === "mainColumn" ? [{}] : []; }, getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; },
      focus() {}, click() {}, scrollIntoView() {}, remove() {},
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }, contains() { return false; },
      get options() { return []; }, get selectedOptions() { return []; },
    };
    elements.set(id, item);
    return item;
  };
  const documentElement = element("documentElement");
  documentElement.getAttribute = (name) => name === "data-panel-document-generation" ? (options.documentGeneration || "doc-17") : null;
  const document = {
    hidden: !!options.hidden, documentElement, body: element("body"),
    activeElement: options.fastPath ? { dataset: { configInput: "hub" } } : null,
    getElementById: (id) => options.missingRoots?.has(id) ? null : element(id),
    createElement: (tag) => element("created-" + tag + "-" + (++nextTimerId)),
    querySelector() { return null; }, querySelectorAll(selector) {
      if (selector === "[data-config-input][data-key]" && options.selectConfigInputs) return [...elements.values()].filter((item) => item.dataset.configInput && item.dataset.key);
      if (selector === 'input[type="checkbox"][data-command="selectExperiment"]' && options.taskCheckboxes) return options.taskCheckboxes;
      return [];
    },
    addEventListener(type, callback) { addListener(documentListeners, type, callback); },
    removeEventListener(type, callback) { documentListeners.get(type)?.delete(callback); },
  };
  const window = {
    innerWidth: 1000, innerHeight: 800,
    addEventListener(type, callback) { addListener(windowListeners, type, callback); },
    removeEventListener(type, callback) { windowListeners.get(type)?.delete(callback); },
    setTimeout(callback, delay) { const id = ++nextTimerId; timers.set(id, { callback, at: now + delay, interval: 0 }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const setTimeoutFake = (callback, delay) => window.setTimeout(callback, delay);
  const clearTimeoutFake = (id) => window.clearTimeout(id);
  const setIntervalFake = (callback, delay) => { const id = ++nextTimerId; timers.set(id, { callback, at: now + delay, interval: delay }); return id; };
  const clearIntervalFake = (id) => timers.delete(id);
  const advance = (amount) => {
    const end = now + amount;
    let executions = 0;
    for (;;) {
      const due = [...timers].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      assert.ok(++executions < 10000, "fake timer loop exceeded bound");
      const [id, item] = due;
      now = item.at;
      if (item.interval) item.at += item.interval;
      else timers.delete(id);
      item.callback();
    }
    now = end;
  };
  class FakeDate extends Date { static now() { return now; } }
  const context = {
    document, window, Date: FakeDate, console: { log() {}, warn() {}, error() {} },
    setTimeout: setTimeoutFake, clearTimeout: clearTimeoutFake,
    setInterval: setIntervalFake, clearInterval: clearIntervalFake,
    requestAnimationFrame(callback) { const id = ++nextTimerId; frames.set(id, () => { frames.delete(id); callback(); }); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    MutationObserver: class { observe() {} disconnect() {} },
    navigator: { clipboard: { writeText: async () => undefined } },
    acquireVsCodeApi: () => ({
      postMessage(message) { sent.push(message); },
      getState() { return webviewState; }, setState(value) { webviewState = value; },
    }),
  };
  return { context, document, documentListeners, windowListeners, elements, element, frames, timers, sent, advance, get webviewState() { return webviewState; } };
}

test("a retained rendered script reports a stalled state frame during a one-hour live heartbeat session", () => {
  const browser = fakeBrowser();
  const script = extractScript(renderStampedPanelHtml());
  assert.doesNotThrow(() => new vm.Script(script, { filename: "panel-render-health.js" }));
  vm.runInNewContext(script, browser.context, { filename: "panel-render-health.js" });
  const messageHandler = browser.windowListeners.get("message")?.values().next().value;
  assert.equal(typeof messageHandler, "function", "webview message listener installed");

  const send = (data) => messageHandler({ data });
  const initialFrameCount = browser.frames.size;
  const listenerCount = [...browser.documentListeners.values()].reduce((sum, entries) => sum + entries.size, 0)
    + [...browser.windowListeners.values()].reduce((sum, entries) => sum + entries.size, 0);
  const timerCount = browser.timers.size;
  send({ type: "state", state: { generation: 1, plans: [], recentPlans: [] } });
  send({ type: "panelHeartbeat", heartbeatId: 0 });
  for (let generation = 2; generation <= 121; generation++) {
    send({ type: "state", state: { generation, plans: [], recentPlans: [] } });
    browser.advance(30_000);
    send({ type: "panelHeartbeat", heartbeatId: generation });
  }
  assert.ok(browser.frames.size <= initialFrameCount + 1, "the render queue holds one latched frame");

  const acknowledgements = browser.sent.filter((message) => message.command === "webviewHeartbeatAck");
  assert.equal(acknowledgements.length, 121);
  assert.equal(acknowledgements.at(-1).documentGeneration, "doc-17");
  assert.equal(acknowledgements[0].renderHealth.status, "unknown");
  assert.equal(acknowledgements[0].renderHealth.reason, "state-render-pending");
  assert.equal(acknowledgements.at(-1).renderHealth.status, "unhealthy");
  assert.equal(acknowledgements.at(-1).renderHealth.reason, "state-render-frame-stalled");
  assert.ok(browser.frames.size <= initialFrameCount + 1, "stalled animation frame does not accumulate callbacks");
  assert.equal([...browser.documentListeners.values()].reduce((sum, entries) => sum + entries.size, 0)
    + [...browser.windowListeners.values()].reduce((sum, entries) => sum + entries.size, 0), listenerCount);
  assert.ok(browser.timers.size <= timerCount + 1, "one-hour run does not retain extra timers");
});

test("a retained rendered script detects one hour of RAF starvation without new state messages", () => {
  const browser = fakeBrowser({ fastPath: true });
  const script = extractScript(renderStampedPanelHtml());
  vm.runInNewContext(script, browser.context, { filename: "panel-render-health.js" });
  const onMessage = browser.windowListeners.get("message")?.values().next().value;
  const initialFrameCount = browser.frames.size;
  const listenerCount = [...browser.documentListeners.values()].reduce((sum, entries) => sum + entries.size, 0)
    + [...browser.windowListeners.values()].reduce((sum, entries) => sum + entries.size, 0);
  const timerCount = browser.timers.size;

  onMessage({ data: { type: "state", state: { plans: [], recentPlans: [] } } });
  [...browser.frames.values()].at(-1)();
  onMessage({ data: { type: "panelHeartbeat", heartbeatId: 0 } });
  const firstProbe = [...browser.frames.keys()].at(-1);
  browser.frames.get(firstProbe)();
  onMessage({ data: { type: "panelHeartbeat", heartbeatId: 1 } });
  assert.equal(browser.sent.at(-1).renderHealth.status, "ok");
  assert.equal(browser.sent.at(-1).renderHealth.reason, "render-completed");

  for (let heartbeatId = 2; heartbeatId <= 121; heartbeatId++) {
    browser.advance(30_000);
    onMessage({ data: { type: "panelHeartbeat", heartbeatId } });
  }
  const acknowledgements = browser.sent.filter((message) => message.command === "webviewHeartbeatAck");
  assert.equal(acknowledgements.length, 122);
  assert.equal(acknowledgements.at(-1).renderHealth.status, "unhealthy");
  assert.equal(acknowledgements.at(-1).renderHealth.reason, "animation-frame-probe-stalled");
  assert.ok(browser.frames.size <= initialFrameCount + 1, "only one health probe can remain queued");
  assert.equal([...browser.documentListeners.values()].reduce((sum, entries) => sum + entries.size, 0)
    + [...browser.windowListeners.values()].reduce((sum, entries) => sum + entries.size, 0), listenerCount);
  assert.ok(browser.timers.size <= timerCount + 1, "hourly heartbeat probes do not retain timers");
});

test("missing roots and a caught render failure are reported by actual heartbeat handling", () => {
  const script = extractScript(renderStampedPanelHtml());
  for (const [options, expected] of [
    [{ missingRoots: new Set(["mainColumn"]) }, "required-render-root-missing"],
    [{ hidden: true }, "document-hidden"],
  ]) {
    const browser = fakeBrowser(options);
    vm.runInNewContext(script, browser.context, { filename: "panel-render-health.js" });
    const onMessage = browser.windowListeners.get("message")?.values().next().value;
    onMessage({ data: { type: "panelHeartbeat", heartbeatId: 1 } });
    assert.equal(browser.sent.at(-1).renderHealth.reason, expected);
    assert.notEqual(browser.sent.at(-1).renderHealth.status, "ok");
  }

  const browser = fakeBrowser({ renderThrows: true });
  vm.runInNewContext(script, browser.context, { filename: "panel-render-health.js" });
  const onMessage = browser.windowListeners.get("message")?.values().next().value;
  onMessage({ data: { type: "state", state: { plans: [], recentPlans: [] } } });
  const pendingFrame = [...browser.frames.values()].at(-1);
  assert.equal(typeof pendingFrame, "function");
  pendingFrame();
  onMessage({ data: { type: "panelHeartbeat", heartbeatId: 2 } });
  assert.equal(browser.sent.at(-1).renderHealth.status, "unhealthy");
  assert.match(browser.sent.at(-1).renderHealth.reason, /^render-failed:/);
});

test("a completed rendered update reports healthy DOM state", () => {
  const browser = fakeBrowser({ fastPath: true });
  const script = extractScript(renderStampedPanelHtml());
  vm.runInNewContext(script, browser.context, { filename: "panel-render-health.js" });
  const onMessage = browser.windowListeners.get("message")?.values().next().value;
  onMessage({ data: { type: "state", state: { plans: [], recentPlans: [] } } });
  [...browser.frames.values()].at(-1)();
  onMessage({ data: { type: "panelHeartbeat", heartbeatId: 3 } });
  const probe = [...browser.frames.keys()].at(-1);
  browser.frames.get(probe)();
  onMessage({ data: { type: "panelHeartbeat", heartbeatId: 4 } });
  assert.equal(browser.sent.at(-1).renderHealth.status, "ok");
  assert.equal(browser.sent.at(-1).renderHealth.reason, "render-completed");
});

test("transient config drafts survive a generated document replacement through VS Code webview state", () => {
  const script = extractScript(renderStampedPanelHtml());
  const firstOptions = { taskCheckboxes: [] };
  const first = fakeBrowser(firstOptions);
  vm.runInNewContext(script, first.context, { filename: "panel-render-health.js" });
  const draft = first.element("config-draft");
  draft.dataset = { configInput: "hub", key: "host" };
  draft.value = "draft-host.example";
  draft.selectionStart = 5;
  draft.selectionEnd = 5;
  first.document.activeElement = draft;
  const selectedTask = first.element("selected-task");
  selectedTask.dataset = { command: "selectExperiment", workerId: "worker-a", taskUiKey: "task-a", actionKey: "run-a", planFile: "experiments/plans/a.yaml" };
  selectedTask.checked = true;
  firstOptions.taskCheckboxes.push(selectedTask);
  for (const listener of first.documentListeners.get("input") || []) listener({ target: draft });
  const toggle = first.element("config-toggle");
  toggle.dataset = { configInput: "hub", key: "enabled" };
  toggle.type = "checkbox";
  toggle.checked = true;
  for (const listener of first.documentListeners.get("input") || []) listener({ target: toggle });
  assert.equal(first.webviewState.transientPanelState.configDrafts.hub.host, "draft-host.example");
  assert.equal(first.webviewState.transientPanelState.activeInput.selectionStart, 5);
  assert.equal(first.webviewState.transientPanelState.selectedTaskTargets[0].workerId, "worker-a");

  const secondOptions = { initialState: first.webviewState, fastPath: true, selectConfigInputs: true, taskCheckboxes: [] };
  const second = fakeBrowser(secondOptions);
  const restored = second.element("restored-config-draft");
  restored.dataset = { configInput: "hub", key: "host" };
  const restoredTask = second.element("restored-task");
  const restoredToggle = second.element("restored-config-toggle");
  restoredToggle.dataset = toggle.dataset;
  restoredToggle.type = "checkbox";
  restoredToggle.checked = false;
  restoredTask.dataset = selectedTask.dataset;
  restoredTask.checked = false;
  secondOptions.taskCheckboxes.push(restoredTask);
  vm.runInNewContext(script, second.context, { filename: "panel-render-health.js" });
  const onMessage = second.windowListeners.get("message")?.values().next().value;
  onMessage({ data: { type: "state", state: { plans: [], recentPlans: [] } } });
  [...second.frames.values()].at(-1)();
  assert.equal(restored.value, "draft-host.example");
  assert.equal(restored.selectionStart, 5);
  assert.equal(restoredTask.checked, true);
  assert.equal(restoredToggle.checked, true);
});
