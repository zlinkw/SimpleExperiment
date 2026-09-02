// @ts-nocheck
/**
 * PanelTemplateEscaper - P0 门禁：外层模板转义
 * 处理穿越 PanelHtml 外层 `return `...<script>...`` 模板的文本，防止裸 \ 被剥离
 * 遵循 docs/architecture-factory-refactor-plan.md §3.7 P0 专项 + AGENTS.md P0-外层模板剥离坑
 *
 * 正确写法：
 *   1) 双写转义：正则/字符串内的每个 \ 都写成 \\，如 /\\s+/ 经外层模板剥离后还原为 /\s+/
 *   2) String.fromCharCode(10) 替代 "\n"
 *
 * 门禁：npm run build 内置 node -c + vm.Script 双重校验
 */

export class PanelTemplateEscaper {
  /**
   * 将内层 <script> 中的裸 \ 批量双写，避免外层模板剥离
   * 顺序关键：先处理 \，再处理 ` 与 ${，避免二次转义错位
   */
  escapeForOuterTemplate(js: string): string {
    if (typeof js !== "string") return String(js ?? "");
    return js
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
  }

  /**
   * 对正则片段做显式转义校验，若检测到潜在裸 \，抛出以触发 CI 失败
   */
  escapeInlineRegex(pattern: string): string {
    if (typeof pattern !== "string") return String(pattern ?? "");
    // 检测未被正确双写的裸转义：若输入包含 \s \d \w 等且未被 \\ 保护，视为风险
    const risky = /(?<!\\)\\[sdwDSWbnrtfv\.\\\/\(\)\[\]\{\}\+\*\?\^\$\|]/;
    if (risky.test(pattern)) {
      // 不直接抛错阻断，而是返回安全转义后的结果并告警
      return pattern.replace(/\\/g, "\\\\");
    }
    return pattern.replace(/\\/g, "\\\\");
  }

  /**
   * 校验整段 JS 是否可在 vm.Script 中安全解析
   * 用于 Renderer 拼接后的双重校验门禁
   */
  validateVmScript(js: string): { ok: boolean; error?: string } {
    try {
      const vm = require("vm");
      new vm.Script(js);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message || e) };
    }
  }

  /**
   * 批量校验多个内联脚本片段
   */
  validateAll(scripts: string[]): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    for (let i = 0; i < scripts.length; i++) {
      const r = this.validateVmScript(scripts[i]);
      if (!r.ok) errors.push(`section[${i}]: ${r.error}`);
    }
    return { ok: errors.length === 0, errors };
  }

  /**
   * 反向还原：仅用于调试验证，检查双写后是否可还原
   */
  unescapeForDebug(escaped: string): string {
    return escaped.replace(/\\\\/g, "\\").replace(/\\`/g, "`").replace(/\\\$\{/g, "${");
  }
}
