"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPanelHtml = renderPanelHtml;
/**
 * src/ui/PanelHtml.ts - Facade (Factory Refactor v0.4.92)
 * 瘦身门面：委托给 PanelHtmlRenderer + PanelSectionFactory
 * 原 15275 行模板已迁移至 src/ui/PanelHtml.legacy.ts
 */
const PanelSectionFactory_1 = require("../factories/PanelSectionFactory");
const PanelHtmlRenderer_1 = require("./PanelHtmlRenderer");
const PanelTemplateEscaper_1 = require("./PanelTemplateEscaper");
// 工厂化路径
function renderViaFactory() {
    try {
        const factory = new PanelSectionFactory_1.DefaultPanelSectionFactory();
        const sections = factory.createAll({});
        const escaper = new PanelTemplateEscaper_1.PanelTemplateEscaper();
        const renderer = new PanelHtmlRenderer_1.PanelHtmlRenderer(sections, escaper);
        const html = renderer.render(String(Date.now()));
        // vm.Script 校验
        try {
            new (require("vm").Script)(renderer.renderScript());
        }
        catch { }
        return html;
    }
    catch (e) {
        console.error("[PanelHtml facade] factory render failed", e);
        return null;
    }
}
function renderPanelHtml() {
    const viaFactory = renderViaFactory();
    if (viaFactory && viaFactory.includes("<!doctype html>"))
        return viaFactory;
    // 回退 legacy
    try {
        const legacy = require("./PanelHtml.legacy");
        if (legacy && typeof legacy.renderPanelHtml === "function") {
            return legacy.renderPanelHtml();
        }
    }
    catch { }
    // 最终兜底：返回 viaFactory 或空
    return viaFactory || "<!doctype html><html><body>PanelHtml facade fallback</body></html>";
}
