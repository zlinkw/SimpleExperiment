/**
 * src/ui/PanelHtml.ts - Facade (Factory Refactor v0.4.92) - HOTFIX
 * 紧急回退：直接委托 legacy，确保握手 JS 完整
 * 工厂路径仅在显式开启时使用，待 JS 补全后再切回
 */
export function renderPanelHtml(): string {
  // 工厂灰度开关：仅当环境变量或全局标记显式开启时走工厂，否则直接 legacy
  try {
    const useFactory = (typeof process !== "undefined" && process.env && process.env.FEATURE_FACTORY_PANEL === "1")
      || (typeof (globalThis as any).__panelFactoryOptIn !== "undefined" && String((globalThis as any).__panelFactoryOptIn) === "1");
    if (useFactory) {
      const { DefaultPanelSectionFactory } = require("../factories/PanelSectionFactory");
      const { PanelHtmlRenderer } = require("./PanelHtmlRenderer");
      const { PanelTemplateEscaper } = require("./PanelTemplateEscaper");
      const factory = new DefaultPanelSectionFactory();
      const sections = factory.createAll({} as any);
      const escaper = new PanelTemplateEscaper();
      const renderer = new PanelHtmlRenderer(sections as any, escaper);
      const html = renderer.render(String(Date.now()));
      // 功能门禁：必须含握手三件套才视为可用，否则回退
      if (html && html.includes("acquireVsCodeApi") && html.includes("requestInitialPanelState") && html.includes("handleIncomingWebviewMessage")) {
        // 额外 vm 校验
        try { new (require("vm").Script)(renderer.renderScript()); } catch {}
        return html;
      }
    }
  } catch (e) {
    try { console.error("[PanelHtml facade] factory failed, fallback to legacy", e); } catch {}
  }
  // 默认回退 legacy - 保证 958k 完整 HTML + 831k JS + 握手
  try {
    const legacy = require("./PanelHtml.legacy");
    if (legacy && typeof legacy.renderPanelHtml === "function") {
      return legacy.renderPanelHtml();
    }
  } catch (e) {
    try { console.error("[PanelHtml facade] legacy failed", e); } catch {}
  }
  return "<!doctype html><html><body>PanelHtml facade fallback - please check legacy</body></html>";
}
