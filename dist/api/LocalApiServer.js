"use strict";
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
exports.LocalApiServer = exports.LocalApiError = void 0;
exports.confirmationRequired = confirmationRequired;
exports.parseRemoteAddress = parseRemoteAddress;
exports.loopbackRequest = loopbackRequest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const path = __importStar(require("path"));
const LOOPBACK_REMOTE_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const DEFAULT_MAX_EVENTS = 64;
const DEFAULT_EVENT_BUFFER_LIMIT = 128;
const DEFAULT_SSE_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_PORT = 65535;
class LocalApiError extends Error {
    apiCode;
    apiData;
    constructor(code, message, data) {
        super(message);
        this.name = "LocalApiError";
        this.apiCode = code;
        if (data !== undefined)
            this.apiData = data;
    }
}
exports.LocalApiError = LocalApiError;
function confirmationRequired(preview) {
    return new LocalApiError(2001, "CONFIRM_REQUIRED", preview);
}
function parseRemoteAddress(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.startsWith("::ffff:") && raw.length > 7)
        return raw.slice(7);
    return raw;
}
function loopbackRequest(request) {
    return LOOPBACK_REMOTE_ADDRESSES.has(parseRemoteAddress(request.socket.remoteAddress));
}
function normalParams(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        request.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new LocalApiError(413, "PAYLOAD_TOO_LARGE"));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on("end", () => {
            try {
                const parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
                resolve(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {});
            }
            catch (error) {
                reject(new LocalApiError(-32700, "Parse error", { detail: error instanceof Error ? error.message : String(error) }));
            }
        });
        request.on("error", reject);
    });
}
function sendJson(response, status, value) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    response.end(`${JSON.stringify(value)}\n`);
}
function rpcError(id, code, message, data) {
    const error = { code, message };
    if (data !== undefined)
        error.data = data;
    return { jsonrpc: "2.0", id: id === undefined ? null : id, error };
}
function isPortConflict(error) {
    const value = error;
    return Boolean(value && ["EADDRINUSE", "EACCES"].includes(value.code || ""));
}
function positivePort(value, fallback) {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 && port <= MAX_PORT ? port : fallback;
}
function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
}
class LocalApiServer {
    name;
    version;
    host = "127.0.0.1";
    preferredPort;
    token;
    methods;
    discoveryPath;
    sseTimeoutMs;
    maxEvents;
    events = [];
    listeners = new Set();
    eventSequence = 0;
    server;
    port = 0;
    startedAt = "";
    disposed = false;
    constructor(options) {
        this.name = options.name;
        this.version = options.version;
        this.preferredPort = positivePort(options.preferredPort, 19766);
        this.token =
            options.token
                ? String(options.token)
                : crypto.randomBytes(32).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
        this.methods = options.methods && typeof options.methods === "object" ? options.methods : {};
        this.discoveryPath = options.discoveryPath || "";
        this.sseTimeoutMs = positiveNumber(options.sseTimeoutMs, DEFAULT_SSE_TIMEOUT_MS);
        this.maxEvents = Math.max(1, Math.min(1024, positiveNumber(options.maxEvents, DEFAULT_MAX_EVENTS)));
    }
    async start() {
        if (this.disposed)
            throw new Error("LocalApiServer is disposed");
        await this.listen();
        this.startedAt = new Date().toISOString();
        await this.writeDiscovery();
        return this.discovery();
    }
    async listen() {
        const startPort = Math.max(1024, Math.min(this.preferredPort, MAX_PORT));
        for (let port = startPort; port <= MAX_PORT; port += 1) {
            try {
                await this.listenOnce(port);
                this.port = port;
                return;
            }
            catch (error) {
                if (!isPortConflict(error) || port === MAX_PORT)
                    throw error;
            }
        }
    }
    listenOnce(port) {
        return new Promise((resolve, reject) => {
            const server = http.createServer((request, response) => {
                void this.handleRequest(request, response).catch((error) => {
                    if (!response.headersSent) {
                        sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
                    }
                    response.end();
                });
            });
            server.once("error", reject);
            server.listen(port, this.host, () => {
                server.removeListener("error", reject);
                this.server = server;
                resolve();
            });
        });
    }
    async handleRequest(request, response) {
        if (!loopbackRequest(request)) {
            sendJson(response, 403, { ok: false, error: "FORBIDDEN_REMOTE" });
            return;
        }
        const url = new URL(request.url || "/", `http://${this.host}`);
        const pathname = url.pathname.replace(/\/+$/, "") || "/";
        if (!this.authorized(request)) {
            sendJson(response, 401, { ok: false, error: "UNAUTHORIZED" });
            return;
        }
        if (request.method === "GET" && pathname === "/api/v1/health") {
            sendJson(response, 200, this.health());
            return;
        }
        if (request.method === "GET" && pathname === "/api/v1/capabilities") {
            sendJson(response, 200, this.capabilities());
            return;
        }
        if (request.method === "GET" && pathname === "/api/v1/openapi.json") {
            sendJson(response, 200, this.openapi());
            return;
        }
        if (request.method === "GET" && pathname === "/api/v1/events") {
            this.streamEvents(request, response, url);
            return;
        }
        if (request.method === "POST" && pathname === "/api/v1/rpc") {
            await this.handleRpc(request, response);
            return;
        }
        sendJson(response, 404, { ok: false, error: "NOT_FOUND" });
    }
    async handleRpc(request, response) {
        const payload = await readJsonBody(request);
        if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string" || !payload.method) {
            sendJson(response, 400, rpcError(payload?.id, -32600, "Invalid Request"));
            return;
        }
        const id = payload.id;
        try {
            const handler = this.methods[payload.method];
            if (typeof handler !== "function") {
                sendJson(response, 200, rpcError(id, -32601, "Method not found"));
                return;
            }
            const result = await handler(normalParams(payload.params), this);
            if (id === undefined) {
                response.writeHead(204);
                response.end();
                return;
            }
            sendJson(response, 200, {
                jsonrpc: "2.0",
                id,
                result: result === undefined ? null : result,
            });
        }
        catch (error) {
            if (id === undefined) {
                response.writeHead(204);
                response.end();
                return;
            }
            const code = Number(error instanceof LocalApiError ? error.apiCode : error?.apiCode) || -32000;
            const message = error instanceof Error ? error.message : String(error);
            const data = error instanceof LocalApiError && error.apiData !== undefined
                ? error.apiData
                : { method: payload.method };
            sendJson(response, 200, rpcError(id, code, message, data));
        }
    }
    authorized(request) {
        const expected = Buffer.from(String(this.token || ""));
        const header = String(request.headers.authorization || "");
        const match = /^Bearer\s+(.+)$/i.exec(header);
        if (!match || expected.length !== match[1].length)
            return false;
        const actual = Buffer.from(match[1]);
        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }
    publish(event) {
        const item = {
            seq: this.eventSequence + 1,
            type: String((event && event.type) || "event"),
            data: event && event.data !== undefined ? event.data : null,
            publishedAt: new Date().toISOString(),
        };
        this.eventSequence = item.seq;
        this.events.push(item);
        if (this.events.length > DEFAULT_EVENT_BUFFER_LIMIT) {
            this.events = this.events.slice(-DEFAULT_EVENT_BUFFER_LIMIT);
        }
        for (const listener of [...this.listeners])
            listener(item);
        return item;
    }
    streamEvents(request, response, url) {
        const since = positiveNumber(Number(url.searchParams.get("since") || 0), 0);
        response.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        let sent = 0;
        let closed = false;
        let timer;
        const close = () => {
            if (closed)
                return;
            closed = true;
            if (timer)
                clearTimeout(timer);
            this.listeners.delete(listener);
            response.end();
        };
        const sendEvent = (item) => {
            if (closed || sent >= this.maxEvents)
                return;
            response.write(`id: ${item.seq}\nevent: ${item.type}\ndata: ${JSON.stringify(item.data)}\n\n`);
            sent += 1;
            if (sent >= this.maxEvents)
                close();
        };
        const listener = (item) => sendEvent(item);
        this.listeners.add(listener);
        request.on("close", close);
        for (const item of this.events) {
            if (item.seq > since)
                sendEvent(item);
            if (closed)
                return;
        }
        if (sent >= this.maxEvents) {
            close();
            return;
        }
        timer = setTimeout(close, this.sseTimeoutMs);
    }
    health() {
        return {
            ok: true,
            schemaVersion: 1,
            name: this.name,
            version: this.version,
            pid: process.pid,
            port: this.port,
            startedAt: this.startedAt,
        };
    }
    capabilities() {
        return {
            schemaVersion: 1,
            name: this.name,
            version: this.version,
            transport: ["http", "cli"],
            rpc: "json-rpc-2.0",
            methods: Object.keys(this.methods).sort(),
            confirmation: { required: true, categories: ["confirm", "pathConfirmed"] },
        };
    }
    openapi() {
        const methods = Object.keys(this.methods).sort();
        return {
            openapi: "3.0.0",
            info: { title: `${this.name} Local API`, version: this.version },
            servers: [{ url: `http://127.0.0.1:${this.port}` }],
            security: [{ bearerAuth: [] }],
            components: {
                securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
            },
            paths: {
                "/api/v1/rpc": {
                    post: {
                        security: [{ bearerAuth: [] }],
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        required: ["jsonrpc", "method"],
                                        properties: {
                                            jsonrpc: { const: "2.0" },
                                            id: { type: ["string", "number", "null"] },
                                            method: { type: "string", enum: methods },
                                            params: { type: "object" },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: "JSON-RPC response" } },
                    },
                },
                "/api/v1/health": { get: { responses: { 200: { description: "Health" } } } },
                "/api/v1/capabilities": { get: { responses: { 200: { description: "Capabilities" } } } },
                "/api/v1/events": { get: { responses: { 200: { description: "Bounded SSE stream" } } } },
            },
        };
    }
    discovery() {
        return {
            schemaVersion: 1,
            name: this.name,
            version: this.version,
            baseUrl: `http://${this.host}:${this.port}`,
            host: this.host,
            port: this.port,
            token: this.token,
            pid: process.pid,
            startedAt: this.startedAt,
        };
    }
    async writeDiscovery() {
        if (!this.discoveryPath)
            return;
        fs.mkdirSync(path.dirname(this.discoveryPath), { recursive: true });
        const temp = `${this.discoveryPath}.${process.pid}.tmp`;
        fs.writeFileSync(temp, `${JSON.stringify(this.discovery(), null, 2)}\n`, "utf8");
        fs.renameSync(temp, this.discoveryPath);
    }
    removeDiscovery() {
        if (!this.discoveryPath)
            return;
        try {
            const current = JSON.parse(fs.readFileSync(this.discoveryPath, "utf8"));
            if (Number(current.pid) === process.pid)
                fs.unlinkSync(this.discoveryPath);
        }
        catch {
            // The discovery file is best effort and may already be gone.
        }
    }
    async dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const listener of [...this.listeners])
            listener({ seq: 0, type: "done", data: null, publishedAt: new Date().toISOString() });
        this.listeners.clear();
        this.removeDiscovery();
        if (!this.server)
            return;
        await new Promise((resolve) => this.server?.close(() => resolve()));
    }
}
exports.LocalApiServer = LocalApiServer;
