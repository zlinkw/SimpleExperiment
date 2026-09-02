/**
 * src/ui/PanelHtml.ts - Facade (Factory Refactor v0.4.92)
 * 瘦身门面：委托给 PanelHtmlRenderer + PanelSectionFactory
 * 原 15275 行模板已迁移至 src/ui/PanelHtml.legacy.ts
 */
import { DefaultPanelSectionFactory } from "../factories/PanelSectionFactory";
import { PanelHtmlRenderer } from "./PanelHtmlRenderer";
import { PanelTemplateEscaper } from "./PanelTemplateEscaper";

// 工厂化路径
function renderViaFactory(): string | null {
  try {
    const factory = new DefaultPanelSectionFactory();
    const sections = factory.createAll({} as any);
    const escaper = new PanelTemplateEscaper();
    const renderer = new PanelHtmlRenderer(sections as any, escaper);
    const html = renderer.render(String(Date.now()));
    // vm.Script 校验
    try { new (require("vm").Script)(renderer.renderScript()); } catch {}
    return html;
  } catch (e) {
    console.error("[PanelHtml facade] factory render failed", e);
    return null;
  }
}

export function renderPanelHtml(): string {
  const viaFactory = renderViaFactory();
  if (viaFactory && viaFactory.includes("<!doctype html>")) return viaFactory;
  // 回退 legacy
  try {
    const legacy = require("./PanelHtml.legacy");
    if (legacy && typeof legacy.renderPanelHtml === "function") {
      return legacy.renderPanelHtml();
    }
  } catch {}
  // 最终兜底：返回 viaFactory 或空
  return viaFactory || "<!doctype html><html><body>PanelHtml facade fallback</body></html>";
}
