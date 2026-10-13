"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseClient = void 0;
exports.assertUpdateUrl = assertUpdateUrl;
const ExtensionUpdates_1 = require("../features/ExtensionUpdates");
const REPOS = [ExtensionUpdates_1.SFTP_UPDATE_REPO, ExtensionUpdates_1.EXPERIMENT_UPDATE_REPO];
function assertUpdateUrl(value, repo) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
        || !(repo ? [repo] : REPOS).some(r => url.hostname === "api.github.com" && url.pathname === `/repos/${r}/releases/latest`
            || url.hostname === "github.com" && url.pathname.startsWith(`/${r}/releases/download/`) && !/%2f|%5c|%2e/i.test(url.pathname)))
        throw new Error("更新来源不属于已配置的 Windows 插件公开 Release。");
}
/** Mac's ETag/single-flight/backoff client, using Windows' existing stable Releases. */
class ReleaseClient {
    fetcher;
    now;
    cache = new Map();
    inflight = new Map();
    checking;
    retryAt = 0;
    failures = 0;
    constructor(fetcher = fetch, now = Date.now) {
        this.fetcher = fetcher;
        this.now = now;
    }
    request(url, maxBytes, manual = false) {
        assertUpdateUrl(url);
        const pending = this.inflight.get(url);
        if (pending)
            return pending;
        const cached = this.cache.get(url);
        if (!manual && cached && cached.until > this.now())
            return Promise.resolve(cached.bytes);
        if (this.retryAt > this.now())
            return Promise.reject(new Error(`GitHub 限流；${new Date(this.retryAt).toISOString()} 后重试。`));
        const result = this.fetchBytes(url, maxBytes, cached).finally(() => this.inflight.delete(url));
        this.inflight.set(url, result);
        return result;
    }
    async fetchBytes(url, maxBytes, cached) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), maxBytes > 4 * 1024 * 1024 ? 120000 : 20000);
        try {
            const response = await this.fetcher(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "SimpleExperiment-Windows",
                    ...(cached?.etag ? { "If-None-Match": cached.etag } : {}) }, signal: controller.signal });
            if (response.status === 304 && cached) {
                cached.until = this.now() + 300000;
                return cached.bytes;
            }
            if (!response.ok) {
                const bytes = await this.readResponse(response, 16384).catch(() => Buffer.alloc(0));
                let rateMessage = false;
                try {
                    rateMessage = /secondary rate limit|API rate limit exceeded|abuse detection mechanism/i.test(JSON.parse(bytes.toString("utf8"))?.message || "");
                }
                catch { /* Unproven 403 is not quota exhaustion. */ }
                const retry = response.headers.get("retry-after");
                const retryMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - this.now()) : NaN;
                const primary = response.headers.get("x-ratelimit-remaining") === "0";
                if (response.status === 429 || response.status === 403 && (primary || Number.isFinite(retryMs) && retryMs >= 0 || rateMessage)) {
                    this.failures++;
                    const reset = primary ? Number(response.headers.get("x-ratelimit-reset")) * 1000 - this.now() : 0;
                    this.retryAt = this.now() + Math.min(86400000, Math.max(60000, Number.isFinite(retryMs) ? retryMs : 0, Number.isFinite(reset) ? reset : 0, Math.min(1800000, 60000 * 2 ** Math.min(this.failures - 1, 5))));
                    throw new Error(`GitHub HTTP ${response.status}；限流至 ${new Date(this.retryAt).toISOString()}。`);
                }
                throw new Error(`GitHub 检查失败：HTTP ${response.status}${response.status === 403 ? "，访问被拒绝；未确认限流" : ""}。`);
            }
            const bytes = await this.readResponse(response, maxBytes);
            this.failures = 0;
            if (maxBytes <= 4 * 1024 * 1024) {
                this.cache.set(url, { bytes, etag: response.headers.get("etag") || "", until: this.now() + 300000 });
                while (this.cache.size > 128)
                    this.cache.delete(this.cache.keys().next().value);
            }
            return bytes;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async readResponse(response, maxBytes) {
        const reader = response.body?.getReader();
        if (!reader)
            throw new Error("GitHub 响应为空。");
        const chunks = [];
        let size = 0;
        try {
            if (Number(response.headers.get("content-length")) > maxBytes)
                throw new Error("GitHub 响应过大。");
            for (;;) {
                const item = await reader.read();
                if (item.done)
                    break;
                size += item.value.byteLength;
                if (size > maxBytes)
                    throw new Error("GitHub 响应超出上限。");
                chunks.push(Buffer.from(item.value));
            }
        }
        catch (error) {
            await reader.cancel().catch(() => undefined);
            throw error;
        }
        return Buffer.concat(chunks, size);
    }
    check(installed, manual = false) {
        if (this.checking)
            return this.checking;
        this.checking = this.checkReleases(installed, manual).finally(() => { this.checking = undefined; });
        return this.checking;
    }
    async checkReleases(installed, manual) {
        const parts = await Promise.all(REPOS.map(async (repo) => {
            const raw = JSON.parse((await this.request(`https://api.github.com/repos/${repo}/releases/latest`, 4 * 1024 * 1024, manual)).toString("utf8"));
            if (raw.draft !== false || raw.prerelease !== false || typeof raw.tag_name !== "string" || !Array.isArray(raw.assets))
                throw new Error(`${repo} 不是有效的稳定 Release。`);
            for (const asset of raw.assets)
                if (typeof asset?.browser_download_url === "string")
                    assertUpdateUrl(asset.browser_download_url, repo);
            const experiment = repo === ExtensionUpdates_1.EXPERIMENT_UPDATE_REPO;
            const component = (0, ExtensionUpdates_1.componentUpdate)(experiment ? ExtensionUpdates_1.EXPERIMENT_EXTENSION_ID : ExtensionUpdates_1.SFTP_EXTENSION_ID, repo, experiment ? "SimpleExperiment" : "SimpleSFTP", installed(experiment ? ExtensionUpdates_1.EXPERIMENT_EXTENSION_ID : ExtensionUpdates_1.SFTP_EXTENSION_ID), { ...raw, tagName: raw.tag_name, htmlUrl: raw.html_url, publishedAt: raw.published_at }, experiment ? "simple-experiment" : "simple-sftp", (0, ExtensionUpdates_1.currentTargetPlatform)());
            if (component.vsix)
                component.vsix = { ...component.vsix, digest: `sha256:${await this.checksum(component)}` };
            return component;
        }));
        const plan = (0, ExtensionUpdates_1.planPairedUpdates)(parts[1], parts[0]);
        if (plan.status === "error")
            throw new Error(plan.message);
        return plan;
    }
    async checksum(component) {
        const direct = /^sha256:([a-f0-9]{64})$/i.exec(component.vsix?.digest || "")?.[1];
        if (direct)
            return direct.toLowerCase();
        if (!component.checksum)
            throw new Error(`${component.label} 缺少可信 SHA-256。`);
        assertUpdateUrl(component.checksum.url, component.repo);
        const text = (await this.request(component.checksum.url, 4096, true)).toString("utf8").trim();
        const match = /^([a-f0-9]{64})(?:\s+\*?([^\r\n]+))?$/i.exec(text);
        if (!match || match[2] && match[2] !== component.vsix?.name)
            throw new Error("更新 SHA-256 清单未绑定该精确资产。");
        return match[1].toLowerCase();
    }
}
exports.ReleaseClient = ReleaseClient;
