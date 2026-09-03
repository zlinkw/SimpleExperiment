"use strict";
/**
 * PanelSectionFactory - 面板 Section 工厂
 * 管理 10 个板块的 HTML/CSS/JS 切片，负责排序与外层模板转义门禁接入
 * 遵循 docs/architecture-factory-refactor-plan.md §3.7
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPanelSectionFactory = void 0;
const PanelTemplateEscaper_1 = require("../ui/PanelTemplateEscaper");
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function getSectionsMod() {
    return tryRequire("../ui/sections");
}
class BaseSection {
    id;
    order;
    title;
    icon;
    clientEvents;
    constructor(opts) {
        this.id = opts.id;
        this.order = opts.order;
        this.title = opts.title;
        this.icon = opts.icon;
        this.clientEvents = opts.clientEvents;
    }
    renderHtml(_state) {
        return `<section class="section-card" data-section="${this.id}" data-anchor="${this.id}"><div class="section-head"><div class="section-title"><h2>${this.title}</h2></div></div><div id="${this.id}Root" class="section-body"></div></section>`;
    }
    renderCss() { return ""; }
    renderScript() {
        return `function render${capitalize(this.id)}(state){ var el=document.querySelector('[data-section="${this.id}"]'); if(!el) return; }`;
    }
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
const SECTION_DEFS = [
    { id: "plans", order: 1, title: "计划", icon: "📋" },
    { id: "results", order: 2, title: "结果", icon: "📊" },
    { id: "execution", order: 3, title: "执行", icon: "▶" },
    { id: "servers", order: 4, title: "服务器", icon: "🖥" },
    { id: "settings", order: 5, title: "设置", icon: "⚙" },
    { id: "gpu", order: 6, title: "GPU", icon: "🎮" },
    { id: "diagnostics", order: 8, title: "诊断", icon: "🩺" },
    { id: "operations", order: 9, title: "操作", icon: "⚡" },
];
function toPanelSection(s) {
    const rec = s;
    return {
        id: rec.id,
        order: rec.order,
        title: rec.title,
        icon: rec.icon || "",
        clientEvents: rec.clientEvents || undefined,
        renderHtml: (state) => (typeof rec.renderHtml === "function" ? rec.renderHtml(state) : ""),
        renderCss: () => (typeof rec.renderCss === "function" ? rec.renderCss() : ""),
        renderScript: () => (typeof rec.renderScript === "function" ? rec.renderScript() : ""),
    };
}
class DefaultPanelSectionFactory {
    escaper;
    deps;
    constructor(deps = {}, escaper) {
        this.deps = deps;
        this.escaper = escaper || new PanelTemplateEscaper_1.PanelTemplateEscaper();
    }
    create(id, _ctx) {
        const def = SECTION_DEFS.find((s) => s.id === id);
        if (!def)
            throw new Error(`Unknown section: ${id}`);
        // 1. 若 deps 中有定制 Section，优先使用
        const custom = this.deps["sections"]?.[id];
        if (custom)
            return custom;
        // 2. 尝试真实 Section（逐个导入/聚合导入）
        const sectionsMod = getSectionsMod();
        if (sectionsMod) {
            if (typeof sectionsMod.createSectionById === "function") {
                const real = sectionsMod.createSectionById(id);
                if (real)
                    return toPanelSection(real);
            }
            if (typeof sectionsMod.createAllSections === "function") {
                const all = sectionsMod.createAllSections();
                const found = all.find((x) => x.id === id);
                if (found)
                    return toPanelSection(found);
            }
        }
        // 3. Fallback 到 BaseSection
        return new BaseSection(def);
    }
    createAll(_ctx) {
        // 优先尝试真实 Sections 聚合
        const sectionsMod = getSectionsMod();
        if (sectionsMod && typeof sectionsMod.createAllSections === "function") {
            const realSections = sectionsMod.createAllSections();
            if (Array.isArray(realSections) && realSections.length >= 8) {
                const mapped = realSections.map(toPanelSection);
                // 合并 deps 定制覆盖（若有）
                const customMap = this.deps["sections"] || {};
                const merged = mapped.map((s) => customMap[s.id] || s);
                // 若 customMap 中有额外 id，补充
                for (const [k, v] of Object.entries(customMap)) {
                    if (!merged.find((m) => m.id === k))
                        merged.push(v);
                }
                return merged.sort((a, b) => a.order - b.order);
            }
        }
        // Fallback：BaseSection
        const customMap = this.deps["sections"] || {};
        const sections = SECTION_DEFS.map((def) => customMap[def.id] || new BaseSection(def));
        return sections.sort((a, b) => a.order - b.order);
    }
    createByName(name, ctx) {
        const def = SECTION_DEFS.find((s) => s.id === name);
        if (!def)
            return undefined;
        return this.create(def.id, ctx);
    }
}
exports.DefaultPanelSectionFactory = DefaultPanelSectionFactory;
