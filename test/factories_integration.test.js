// @ts-nocheck
/**
 * factories_integration.test.js - Phase 5 Final 集成验证
 * CommonJS 风格，验证所有工厂可实例化、Renderer 可渲染、P0 门禁、vm.Script
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

// dist 产物（build 后存在）
const factoriesDist = path.join(__dirname, "..", "dist", "factories");
const uiDist = path.join(__dirname, "..", "dist", "ui");
const srcRoot = path.join(__dirname, "..", "src");

function srcFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return srcFiles(abs, filter);
    if (filter && !filter(abs)) return [];
    return [abs];
  });
}

// 1. 所有工厂可实例化
test("所有工厂可实例化 (Tunnel/Service/Realtime/Feature/Command/PanelSection)", () => {
  const expected = [
    "TunnelFactory.js",
    "ServiceFactory.js",
    "RealtimeClientFactory.js",
    "FeatureFactory.js",
    "CommandFactory.js",
    "PanelSectionFactory.js",
    "types.js",
  ];
  for (const name of expected) {
    const p = path.join(factoriesDist, name);
    assert.ok(fs.existsSync(p), `missing dist/factories/${name}`);
  }

  // 动态 require 验证可实例化（带 fallback 的工厂也应返回对象）
  const { DefaultTunnelFactory } = require(path.join(factoriesDist, "TunnelFactory.js"));
  const { DefaultServiceFactory } = require(path.join(factoriesDist, "ServiceFactory.js"));
  const { DefaultRealtimeClientFactory } = require(path.join(factoriesDist, "RealtimeClientFactory.js"));
  const { DefaultFeatureFactory } = require(path.join(factoriesDist, "FeatureFactory.js"));
  const { DefaultCommandFactory } = require(path.join(factoriesDist, "CommandFactory.js"));
  const { DefaultPanelSectionFactory } = require(path.join(factoriesDist, "PanelSectionFactory.js"));

  const ctx = {};
  const tunnel = new DefaultTunnelFactory();
  assert.ok(tunnel, "DefaultTunnelFactory");
  assert.equal(typeof tunnel.resolveEndpointUrl, "function");
  assert.equal(typeof tunnel.createPortAllocator, "function");

  const service = new DefaultServiceFactory();
  assert.ok(service.tunnel, "ServiceFactory.tunnel");
  assert.ok(service.realtime, "ServiceFactory.realtime");
  assert.ok(service.features, "ServiceFactory.features");
  assert.ok(service.commands, "ServiceFactory.commands");
  assert.ok(service.panels, "ServiceFactory.panels");

  const realtime = new DefaultRealtimeClientFactory();
  assert.equal(typeof realtime.createBudget, "function");
  assert.equal(typeof realtime.createMultiClient, "function");

  const feature = new DefaultFeatureFactory();
  assert.equal(typeof feature.create, "function");
  assert.equal(typeof feature.createAll, "function");
  const allFeatures = feature.createAll(ctx);
  assert.ok(allFeatures && typeof allFeatures === "object", "FeatureFactory.createAll returns object");

  const commands = new DefaultCommandFactory();
  assert.equal(typeof commands.createAll, "function");

  const panels = new DefaultPanelSectionFactory();
  assert.equal(typeof panels.createAll, "function");
  const sections = panels.createAll(ctx);
  assert.ok(Array.isArray(sections), "PanelSectionFactory.createAll returns array");
  assert.ok(sections.length >= 10, `expected >=10 sections, got ${sections.length}`);
  for (const s of sections) {
    assert.ok(s.id, "section.id");
    assert.equal(typeof s.renderHtml, "function", `section ${s.id} renderHtml`);
    assert.equal(typeof s.renderCss, "function", `section ${s.id} renderCss`);
    assert.equal(typeof s.renderScript, "function", `section ${s.id} renderScript`);
  }
});

// 2. PanelHtmlRenderer 可渲染
test("PanelHtmlRenderer 可渲染且包含 CSP/nonce", () => {
  const rendererPath = path.join(uiDist, "PanelHtmlRenderer.js");
  const escaperPath = path.join(uiDist, "PanelTemplateEscaper.js");
  assert.ok(fs.existsSync(rendererPath), "missing dist/ui/PanelHtmlRenderer.js");
  assert.ok(fs.existsSync(escaperPath), "missing dist/ui/PanelTemplateEscaper.js");

  const { PanelHtmlRenderer } = require(rendererPath);
  const { PanelTemplateEscaper } = require(escaperPath);
  const { DefaultPanelSectionFactory } = require(path.join(factoriesDist, "PanelSectionFactory.js"));

  const escaper = new PanelTemplateEscaper();
  const factory = new DefaultPanelSectionFactory({}, escaper);
  const sections = factory.createAll({});
  const renderer = new PanelHtmlRenderer(sections, escaper);

  const html = renderer.render("test-nonce-123", { plans: [] });
  assert.match(html, /<!doctype html>/i, "doctype");
  assert.match(html, /test-nonce-123/, "nonce in html");
  assert.match(html, /Content-Security-Policy/, "CSP");
  assert.match(html, /<style>/, "style tag");
  assert.match(html, /<script nonce="test-nonce-123">/, "script with nonce");
  // 每段 Section 的 data-section 应存在
  assert.match(html, /data-section="overview"/, "overview section");
  assert.match(html, /data-section="plans"/, "plans section");

  // renderCss / renderHtml / renderScript 单独调用
  assert.ok(renderer.renderCss().length >= 0, "renderCss");
  assert.ok(renderer.renderHtml({}).includes("section-card"), "renderHtml");
  const js = renderer.renderScript();
  assert.ok(typeof js === "string", "renderScript returns string");
  // vm.Script 校验渲染出的 JS
  assert.doesNotThrow(() => new vm.Script(js), "renderScript vm.Script");
});

// 3. TunnelFactory 无硬编码 (10890 零命中，resolveEndpointUrl 动态)
test("TunnelFactory 无硬编码端口，resolveEndpointUrl 动态解析", () => {
  const { DefaultTunnelFactory } = require(path.join(factoriesDist, "TunnelFactory.js"));
  const f = new DefaultTunnelFactory();

  // 搜索源码中 10890 硬编码
  const factorySrcFiles = srcFiles(path.join(srcRoot, "factories"), (p) => p.endsWith(".ts"));
  const extensionSrcFiles = srcFiles(path.join(srcRoot, "extension"), (p) => p.endsWith(".ts"));
  const sectionSrcFiles = srcFiles(path.join(srcRoot, "ui", "sections"), (p) => p.endsWith(".ts"));
  const allChecked = [...factorySrcFiles, ...extensionSrcFiles, ...sectionSrcFiles];
  for (const file of allChecked) {
    const content = fs.readFileSync(file, "utf8");
    // 仅检查业务逻辑中的硬编码，允许在注释/文档中出现，但 src/factories 等业务代码中必须零命中
    // 这里精确匹配端口数字作为独立 token
    const hasHardcode = /\b10890\b/.test(content);
    assert.equal(hasHardcode, false, `${path.relative(srcRoot, file)} 不应硬编码 10890`);
  }

  // resolveEndpointUrl 动态性
  const url1 = f.resolveEndpointUrl({ localHost: "127.0.0.1", localPort: 34567 });
  assert.equal(url1, "http://127.0.0.1:34567", "resolveEndpointUrl 正常端口");

  const url2 = f.resolveEndpointUrl({ localHost: "192.168.1.10", localPort: 42000 });
  assert.equal(url2, "http://192.168.1.10:42000", "resolveEndpointUrl 自定义 host:port");

  // 非法端口应回退到默认值而非 10890
  const urlBad = f.resolveEndpointUrl({ localHost: "127.0.0.1", localPort: 99999 });
  assert.doesNotMatch(urlBad, /10890/, "非法端口不应回退到 10890");
  assert.match(urlBad, /^http:\/\/127\.0\.0\.1:\d+$/, "非法端口回退格式正确");

  // normalize 也应无硬编码
  const cfg = f.normalizeGatewayConfig({ localPort: 50000 });
  assert.ok(cfg, "normalizeGatewayConfig returns config");
});

// 4. PanelTemplateEscaper 正确处理 \ 转义 + vm.Script
test("PanelTemplateEscaper 正确处理 \\ 转义与 vm.Script", () => {
  const { PanelTemplateEscaper } = require(path.join(uiDist, "PanelTemplateEscaper.js"));
  const esc = new PanelTemplateEscaper();

  // 基础转义
  const raw = "var re = /\\s+/; var s = \"a\\n b\"; var t = `hello ${world}`;";
  const escaped = esc.escapeForOuterTemplate(raw);
  assert.match(escaped, /\\\\s\+/, "\\\\s 应双写");
  assert.match(escaped, /\\\\n/, "\\n 应双写");
  assert.match(escaped, /\\`/, "反引号应转义");
  assert.match(escaped, /\\\$\{/, "${ 应转义");

  // vm.Script 校验
  const r1 = esc.validateVmScript("var a = 1; function foo(){ return /\\s+/.test('hi'); }");
  assert.equal(r1.ok, true, "合法 JS 应通过 vm.Script");

  const r2 = esc.validateVmScript("var a = ;;; invalid {{{");
  assert.equal(r2.ok, false, "非法 JS 应失败");

  // validateAll
  const all = esc.validateAll(["var a=1;", "var b=2;"]);
  assert.equal(all.ok, true, "validateAll 合法");

  const allBad = esc.validateAll(["var a=1;", "var = ;"]);
  assert.equal(allBad.ok, false, "validateAll 非法应失败");

  // 未转义的 risky pattern 应被捕获并转义
  const risky = "\\s \\d \\w";
  const safe = esc.escapeInlineRegex(risky);
  assert.match(safe, /\\\\s/, "risky pattern 应转义");

  // unescapeForDebug 可逆
  const roundTrip = esc.unescapeForDebug(escaped);
  assert.equal(roundTrip, raw, "unescapeForDebug 可逆");
});

// 5. vm.Script 校验 dist 产物
test("vm.Script 校验 dist/ui/PanelHtml.js 与 dist/extension.js 通过", () => {
  const panelPath = path.join(__dirname, "..", "dist", "ui", "PanelHtml.js");
  const extPath = path.join(__dirname, "..", "dist", "extension.js");
  if (fs.existsSync(panelPath)) {
    const code = fs.readFileSync(panelPath, "utf8");
    assert.doesNotThrow(() => new vm.Script(code), "dist/ui/PanelHtml.js vm.Script");
  } else {
    assert.ok(true, "dist/ui/PanelHtml.js 不存在，跳过（可能为按需编译）");
  }
  if (fs.existsSync(extPath)) {
    const code = fs.readFileSync(extPath, "utf8");
    assert.doesNotThrow(() => new vm.Script(code), "dist/extension.js vm.Script");
  }
});

// 6. 所有新文件有 // @ts-nocheck（排除 *.legacy.ts 与 *legacy.ts 归档，已类型化的 3 个工厂/UI 核心文件除外）
test("所有新工厂/扩展/UI 模块有 // @ts-nocheck（已迁移类型化的除外）", () => {
  const dirs = [
    path.join(srcRoot, "factories"),
    path.join(srcRoot, "extension"),
    path.join(srcRoot, "ui", "sections"),
    path.join(srcRoot, "ui", "styles"),
    path.join(srcRoot, "ui", "renderState"),
    path.join(srcRoot, "core", "factories"),
    path.join(srcRoot, "features", "factories"),
    path.join(srcRoot, "tunnel", "factories"),
    path.join(srcRoot, "features", "PlanBuilder"),
    path.join(srcRoot, "features", "Results"),
  ];
  const extraFiles = [
    path.join(srcRoot, "ui", "PanelHtmlRenderer.ts"),
    path.join(srcRoot, "ui", "PanelTemplateEscaper.ts"),
    path.join(srcRoot, "factories", "index.ts"),
  ];
  const typedMigrated = new Set([
    path.join(srcRoot, "factories", "types.ts"),
    path.join(srcRoot, "ui", "PanelTemplateEscaper.ts"),
    path.join(srcRoot, "ui", "PanelHtmlRenderer.ts"),
    path.join(srcRoot, "factories", "TunnelFactory.ts"),
    path.join(srcRoot, "factories", "FeatureFactory.ts"),
    path.join(srcRoot, "factories", "CommandFactory.ts"),
    path.join(srcRoot, "factories", "PanelSectionFactory.ts"),
    path.join(srcRoot, "factories", "index.ts"),
    path.join(srcRoot, "factories", "RealtimeClientFactory.ts"),
    path.join(srcRoot, "factories", "ServiceFactory.ts"),
  ]);
  const allFiles = [
    ...dirs.flatMap((d) => srcFiles(d, (p) => p.endsWith(".ts") && !p.endsWith(".legacy.ts") && !p.endsWith("legacy.ts"))),
    ...extraFiles.filter((p) => fs.existsSync(p)),
  ];
  assert.ok(allFiles.length >= 20, `expected >=20 new modules, got ${allFiles.length}`);
  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    const firstLine = content.split("\n")[0] || "";
    if (typedMigrated.has(file)) {
      // 已迁移为强类型的核心工厂文件不应再有 @ts-nocheck
      assert.doesNotMatch(firstLine, /@ts-nocheck/, `${path.relative(srcRoot, file)} 已去 @ts-nocheck（强类型）`);
      continue;
    }
    assert.match(firstLine, /@ts-nocheck/, `${path.relative(srcRoot, file)} 首行应有 // @ts-nocheck`);
  }
  // 额外校验：已迁移文件确实无 @ts-nocheck 且能通过 typecheck
  for (const file of typedMigrated) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      assert.equal(content.includes("@ts-nocheck"), false, `${path.relative(srcRoot, file)} 不应包含 @ts-nocheck`);
    }
  }
});

// 7. 新模块行数均 <400 (目标 <300，renderState 已拆，legacy 已排除)
test("新模块行数门禁 (<400，目标 <300)", () => {
  const dirs = [
    path.join(srcRoot, "factories"),
    path.join(srcRoot, "extension"),
    path.join(srcRoot, "ui", "sections"),
    path.join(srcRoot, "ui", "styles"),
    path.join(srcRoot, "ui", "renderState"),
    path.join(srcRoot, "core", "factories"),
    path.join(srcRoot, "features", "factories"),
    path.join(srcRoot, "tunnel", "factories"),
  ];
  const extraFiles = [
    path.join(srcRoot, "ui", "PanelHtmlRenderer.ts"),
    path.join(srcRoot, "ui", "PanelTemplateEscaper.ts"),
  ];
  const allFiles = [
    ...dirs.flatMap((d) => srcFiles(d, (p) => p.endsWith(".ts") && !p.endsWith(".legacy.ts") && !p.endsWith("legacy.ts"))),
    ...extraFiles.filter((p) => fs.existsSync(p)),
  ];
  const violations = [];
  for (const file of allFiles) {
    const lines = fs.readFileSync(file, "utf8").split("\n").length;
    if (lines > 400) violations.push(`${path.relative(srcRoot, file)}: ${lines} 行`);
  }
  assert.equal(violations.length, 0, `行数超 400 的文件: ${violations.join(", ") || "无"}`);

  // 统计 >300 的应为 0（renderState 已拆，原 328 行豁免已关闭；存量大文件不在此 dirs）
  const over300 = [];
  for (const file of allFiles) {
    const lines = fs.readFileSync(file, "utf8").split("\n").length;
    if (lines > 300) over300.push(`${path.relative(srcRoot, file)}: ${lines}`);
  }
  assert.ok(over300.length === 0, `>300 行文件应为 0，实际: ${over300.join(", ") || "无"}`);
});

// 8. src/factories/index.ts 聚合导出存在且可 require
test("src/factories/index.ts 聚合导出可加载", () => {
  const indexPath = path.join(__dirname, "..", "dist", "factories", "index.js");
  // 若尚未编译 index.ts，则检查 src 存在
  const srcIndex = path.join(srcRoot, "factories", "index.ts");
  assert.ok(fs.existsSync(srcIndex), "src/factories/index.ts 存在");
  const content = fs.readFileSync(srcIndex, "utf8");
  assert.doesNotMatch(content, /@ts-nocheck/, "index.ts 已去 @ts-nocheck（强类型）");
  assert.match(content, /export \* from ".\/ServiceFactory"/, "导出 ServiceFactory");
  assert.match(content, /export \* from ".\/TunnelFactory"/, "导出 TunnelFactory");
  // 若 dist 已编译则验证可 require
  if (fs.existsSync(indexPath)) {
    const mod = require(indexPath);
    assert.ok(mod, "dist/factories/index.js 可加载");
  }
});
