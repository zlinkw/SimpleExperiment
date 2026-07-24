"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPanelBootstrapDocument = renderPanelBootstrapDocument;
function bootstrapErrorMessage(error) {
    if (error instanceof Error && error.message)
        return error.message;
    const message = String(error || "面板 HTML 渲染失败。").trim();
    return message || "面板 HTML 渲染失败。";
}
function renderPanelBootstrapDocument(renderPanel, renderRecovery) {
    try {
        const html = renderPanel();
        if (!String(html || "").trim())
            throw new Error("面板 HTML 渲染结果为空。");
        return { html, recovered: false };
    }
    catch (error) {
        const message = bootstrapErrorMessage(error);
        return { html: renderRecovery(message), recovered: true, error: message };
    }
}
