"use strict";
/**
 * PanelHtmlRenderer - PanelHtml 渲染器
 * 委托给 PanelSectionFactory 的各 Section，按 order 拼装 HTML+CSS+JS
 * 依赖 escaper 做转义 + vm.Script 双重校验门禁
 * 遵循 docs/architecture-factory-refactor-plan.md §6.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelHtmlRenderer = void 0;
const PanelTemplateEscaper_1 = require("./PanelTemplateEscaper");
class PanelHtmlRenderer {
    sections;
    escaper;
    constructor(sections, escaper) {
        this.sections = [...sections].sort((a, b) => a.order - b.order);
        this.escaper = escaper ?? new PanelTemplateEscaper_1.PanelTemplateEscaper();
    }
    /**
     * 渲染完整 HTML 文档
     * 注意：返回值将作为外层 `return `...<script>...`` 的内部内容，JS 已完成转义
     */
    render(nonce, state) {
        const effNonce = nonce ?? String(Date.now());
        const css = this.sections.map((s) => s.renderCss()).join("\n");
        const html = this.sections.map((s) => s.renderHtml(state)).join("\n");
        const rawJs = this.sections.map((s) => s.renderScript()).join("\n\n");
        const safeJs = this.escaper.escapeForOuterTemplate(rawJs);
        // 双重校验：vm.Script 确保转义后仍为合法 JS，失败则抛错让 CI 失败
        const vmCheck = this.escaper.validateVmScript(safeJs);
        if (!vmCheck.ok) {
            throw new Error(`Panel JS vm.Script 校验失败: ${vmCheck.error}`);
        }
        return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${effNonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SimpleExperiment</title>
<style>${css}</style></head><body>${html}<script nonce="${effNonce}">${safeJs}</script></body></html>`;
    }
    /**
     * 仅聚合：已渲染 CSS 聚合
     */
    renderCss() {
        return this.sections.map((s) => s.renderCss()).join("\n");
    }
    /**
     * 仅聚合：已渲染 HTML 聚合
     */
    renderHtml(state) {
        return this.sections.map((s) => s.renderHtml(state)).join("\n");
    }
    /**
     * 仅聚合：已渲染 JS 聚合（已转义）
     */
    renderScript() {
        const rawJs = this.sections.map((s) => s.renderScript()).join("\n\n");
        return this.escaper.escapeForOuterTemplate(rawJs);
    }
    /**
     * 快捷构造：从 Section 工厂直接创建 Renderer
     */
    static fromFactory(factory, ctx) {
        const sections = factory.createAll(ctx ?? {});
        return new PanelHtmlRenderer(sections, factory.escaper);
    }
}
exports.PanelHtmlRenderer = PanelHtmlRenderer;
