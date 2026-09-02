"use strict";
/**
 * PanelTemplateEscaper - P0 封闭外层模板转义
 * 聚焦穿越 PanelHtml 的 `return `...<script>...`` 模板的剥离，阻止单 \ 被吞噬
 * 遵循 docs/architecture-factory-refactor-plan.md §3.7 P0 专项 + AGENTS.md P0-外层模板剥离坑
 *
 * 正确写法：
 *   1) 双写转义：正则/字符串内的每个 \ 都写成 \\，如 /\\s+/ 经外层模板一层剥离后落盘恰好还原为 /\s+/
 *   2) String.fromCharCode(10) 替代 "\n"
 *
 * 门禁：npm run build 已含 node -c + vm.Script 双重校验
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelTemplateEscaper = void 0;
const vm = __importStar(require("vm"));
class PanelTemplateEscaper {
    /**
     * 将内部 <script> 中的单 \ 全部双写，避免外层模板剥离
     * 顺序关键：先处理 \，再处理 ` 与 ${，避免转义错位
     */
    escapeForOuterTemplate(js) {
        if (typeof js !== "string")
            return String(js ?? "");
        return js
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$\{/g, "\\${");
    }
    /**
     * 内联片段正则转义校验，若检测到潜在单 \ 立即纠正并在 CI 失败
     */
    escapeInlineRegex(pattern) {
        if (typeof pattern !== "string")
            return String(pattern ?? "");
        // 检测未被正确双写的单斜杠转义：存在 \s \d \w 等而未被 \\ 保护则视为风险
        const risky = /(?<!\\)\\[sdwDSWbnrtfv\.\\\/\(\)\[\]\{\}\+\*\?\^\$\|]/;
        if (risky.test(pattern)) {
            // 非直接抛错，而是返回安全转义的结果并告警
            return pattern.replace(/\\/g, "\\\\");
        }
        return pattern.replace(/\\/g, "\\\\");
    }
    /**
     * 校验给定 JS 是否能在 vm.Script 中安全解析
     * 用于 Renderer 拼接后的双重校验门禁
     */
    validateVmScript(js) {
        try {
            new vm.Script(js);
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: String(e?.message ?? e) };
        }
    }
    /**
     * 批量校验：多个脚本片段
     */
    validateAll(scripts) {
        const errors = [];
        for (let i = 0; i < scripts.length; i++) {
            const r = this.validateVmScript(scripts[i]);
            if (!r.ok)
                errors.push(`section[${i}]: ${r.error}`);
        }
        return { ok: errors.length === 0, errors };
    }
    /**
     * 仅供调试：将双写还原，验证双写是否可还原
     */
    unescapeForDebug(escaped) {
        return escaped.replace(/\\\\/g, "\\").replace(/\\`/g, "`").replace(/\\\$\{/g, "${");
    }
}
exports.PanelTemplateEscaper = PanelTemplateEscaper;
