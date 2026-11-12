const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function button(command, options = {}) {
  return {
    dataset: { command },
    disabled: Boolean(options.disabled),
    getAttribute(name) { return name === "title" ? (options.title || "") : name === "data-tip" ? (options.tip || "") : ""; },
  };
}

function trackedButtons(rows) {
  let iterations = 0;
  return {
    rows: {
      [Symbol.iterator]() {
        iterations += 1;
        return rows[Symbol.iterator]();
      },
    },
    iterations: () => iterations,
  };
}

test("Webview command audit derives button facts in one traversal with cached help", () => {
  let helpCalls = 0;
  const sandbox = {
    webviewHandledCommands: new Set(["known", "handledNoHelp"]),
    commandHelp(command) {
      helpCalls += 1;
      return command === "known" ? "Known command" : "";
    },
  };
  vm.createContext(sandbox);
  const source = extractFunction("webviewCommandButtonFacts");
  assert.doesNotMatch(source, /buttons\.(?:map|filter|some)\(/);
  vm.runInContext(`${source}\nthis.audit = webviewCommandButtonFacts;`, sandbox);
  const buttons = trackedButtons([
    button("known"),
    button("missing", { disabled: true }),
    button("missing"),
    button("handledNoHelp", { title: "Visible title" }),
    button("", { disabled: true }),
  ]);
  const facts = sandbox.audit(buttons.rows);

  assert.equal(buttons.iterations(), 1);
  assert.equal(helpCalls, 4);
  assert.deepEqual(Array.from(facts.commands), ["handledNoHelp", "known", "missing"]);
  assert.deepEqual(Array.from(facts.missingHandler), ["missing"]);
  assert.deepEqual(Array.from(facts.missingHelp), ["missing"]);
  assert.equal(facts.withoutTooltip, 3);
  assert.deepEqual(Array.from(facts.disabledWithoutReason), ["missing", "unknown"]);
});

test("Webview DOM audit consumes shared button facts and preserves adjacent audits", () => {
  const source = extractFunction("webviewDomCommandAudit");
  assert.match(source, /const facts = webviewCommandButtonFacts\(buttons\)/);
  assert.doesNotMatch(source, /buttons\.(?:map|filter|some)\(/);
  assert.match(source, /auditButtonPayloadWarnings\(buttons\)/);
  assert.match(source, /buttonSurfaceAudit\(buttons\)/);
  assert.match(source, /uniqueText\(facts\.disabledWithoutReason\)\.slice\(0, 12\)/);
});

test("command audit recognizes rendered custom tips and keeps unexplained occurrences visible", () => {
  const sandbox = { webviewHandledCommands: new Set(["custom", "mixed", "unexplained"]), commandHelp: () => "" };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction("webviewCommandButtonFacts") + ";this.audit=webviewCommandButtonFacts;", sandbox);
  const facts = sandbox.audit([
    button("custom", { tip: "Actual custom tooltip", disabled: true }),
    button("mixed"),
    button("mixed", { title: "Explanation on another occurrence" }),
    button("unexplained", { disabled: true }),
  ]);
  assert.deepEqual(Array.from(facts.missingHandler), []);
  assert.deepEqual(Array.from(facts.missingHelp), ["unexplained"]);
  assert.equal(facts.withoutTooltip, 2);
  assert.deepEqual(Array.from(facts.disabledWithoutReason), ["unexplained"]);
});

test("audit presentation separates handlers from help and exposes every detail without native titles", () => {
  const renderedFunction = require("../_helpers/panelFunction");
  const sandbox = { esc: String, escAttr: String, compactText: String,
    audit: { buttonCount: 3, commandCount: 2, missingHandler: [], missingHelp: ["undocumented"], withoutTooltip: 1 },
    detail: ["error-1", "error-2", "error-3", "error-4", "error-5", "error-6"] };
  vm.createContext(sandbox);
  vm.runInContext(renderedFunction("featureAuditPill") + renderedFunction("renderFeatureAuditPills"), sandbox);
  const html = vm.runInContext("renderFeatureAuditPills(audit)", sandbox);
  assert.match(html, /<span>接线<\/span><b>0<\/b>/);
  assert.match(html, /<span>说明<\/span><b>1<\/b>/);
  assert.match(html, /<span>悬浮<\/span><b>1<\/b>/);
  const details = vm.runInContext("featureAuditPill('接线',6,'error',detail)", sandbox);
  assert.match(details, /<details\b/);
  assert.match(details, /<summary\b/);
  assert.match(details, /<span class="featureAuditPill error"(?:\s[^>]*)?>/, "existing card-menu surface stays available");
  assert.match(details, /error-6/);
  assert.doesNotMatch(details, / title=/);
});

test("audit cards with the same value have independent stable collapse identities", () => {
  const renderedFunction = require("../_helpers/panelFunction");
  const sandbox = { esc: String, escAttr: String, compactText: String };
  vm.createContext(sandbox);
  vm.runInContext(renderedFunction("featureAuditPill"), sandbox);
  const key = (label, value) => sandbox.featureAuditPill(label, value, "good", [])
    .match(/data-status-card-key="([^"]+)"/)?.[1];
  assert.ok(key("接线", 0), "every audit card needs an explicit identity");
  assert.notEqual(key("接线", 0), key("说明", 0));
  assert.equal(key("接线", 0), key("接线", 1), "refreshing the count preserves this card's identity");
});
