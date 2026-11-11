const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const scrollFunction = require("../_helpers/panelFunction");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("card collapse preserves scroll and does not reorder every card", () => {
  const html = renderPanelHtml();
  assert.match(html, /event\.stopPropagation\(\)/);
  assert.match(html, /preserveScroll\(\(\) => applyUiLayout/);
  assert.match(html, /function preserveScroll\(work\)/);
  assert.match(html, /deck\.insertBefore\(card, cursor\)/);
  assert.doesNotMatch(html, /if \(card\) deck\.appendChild\(card\)/);
  assert.doesNotMatch(html, /deck\.appendChild\(card\)/);
});

for (const name of ['preserveScroll', 'preserveMainColumnAnchor']) {
  test(`${name} does not restore an old viewport over a new navigation`, () => {
    const main = { scrollTop: 100 }, frames = [];
    const context = { el: () => main, resourceTreeScrollLockUntil: 0, Date: { now: () => 100 },
      window: { scrollX: 0, scrollY: 0, scrollTo() {} }, document: { documentElement: {}, body: {} },
      mainVisibleAnchor: () => null, restoreMainColumnAnchor: (node, anchor, fallback) => { node.scrollTop = fallback; },
      requestAnimationFrame: callback => frames.push(callback) };
    vm.createContext(context);
    vm.runInContext(scrollFunction(name), context);
    context[name](() => {});
    context.resourceTreeScrollLockUntil = 750;
    main.scrollTop = 900;
    frames.forEach(callback => callback());
    assert.equal(main.scrollTop, 900);
  });
}

test('routine viewport restoration is immediate; explicit section navigation can still animate', () => {
  const css = [...renderPanelHtml().matchAll(/\.mainColumn\s*\{([^}]+)\}/g)]
    .find(rule => /overflow-anchor/.test(rule[1]))[1];
  assert.match(css, /scroll-behavior:\s*auto/);
});
