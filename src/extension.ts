/**
 * src/extension.ts - Facade (Factory Refactor v0.4.92)
 * 瘦身门面：委托给 src/extension/Activation.ts 的工厂化实现
 * 原 22288 行逻辑已迁移至 src/extension/legacy.ts
 */
export * from "./extension/legacy";
export { RealtimeTunnelPanelProvider } from "./extension/legacy";
// 覆盖 activate/deactivate 走工厂路径
const activation = require("./extension/Activation");
export function activate(context: any) {
  // 优先工厂化路径，失败回退 legacy
  try {
    if (activation && typeof activation.activate === "function") {
      return activation.activate(context);
    }
  } catch (e) {
    console.error("[extension facade] factory activate failed, fallback to legacy", e);
  }
  const legacy = require("./extension/legacy");
  return legacy.activate(context);
}
export function deactivate() {
  try {
    if (activation && typeof activation.deactivate === "function") {
      return activation.deactivate();
    }
  } catch {}
  try {
    const legacy = require("./extension/legacy");
    if (typeof legacy.deactivate === "function") return legacy.deactivate();
  } catch {}
}
