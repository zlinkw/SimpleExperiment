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
exports.TensorBoardLocalProxy = void 0;
const http = __importStar(require("node:http"));
const TunnelGateway_1 = require("./TunnelGateway");
class TensorBoardLocalProxy {
    active = new Map();
    async open(serverId, endpoint, remotePort, sessionPrefix) {
        (0, TunnelGateway_1.assertLocalhost)(endpoint.localHost);
        if (!Number.isInteger(endpoint.localPort) || endpoint.localPort < 1024 || endpoint.localPort > 65535)
            throw new Error("Agent 本机转发端口无效");
        if (!Number.isInteger(remotePort) || remotePort < 1024 || remotePort > 65535)
            throw new Error("TensorBoard 远端端口无效");
        const previous = this.active.get(serverId);
        if (previous && previous.remotePort === remotePort && previous.sessionPrefix === sessionPrefix &&
            previous.endpoint.localHost === endpoint.localHost &&
            previous.endpoint.localPort === endpoint.localPort &&
            previous.endpoint.token === endpoint.token)
            return previous.url;
        await this.close(serverId);
        const server = http.createServer((browserRequest, browserResponse) => {
            void this.forward(browserRequest, browserResponse, endpoint, remotePort, sessionPrefix);
        });
        try {
            await new Promise((resolve, reject) => {
                server.once("error", reject);
                server.listen(0, "127.0.0.1", () => {
                    server.removeListener("error", reject);
                    resolve();
                });
            });
        }
        catch (error) {
            server.close();
            throw error;
        }
        const address = server.address();
        if (!address || typeof address === "string")
            throw new Error("无法确定 TensorBoard 本地入口端口");
        const url = `http://127.0.0.1:${address.port}/`;
        this.active.set(serverId, { server, url, endpoint, remotePort, sessionPrefix });
        return url;
    }
    url(serverId) {
        return this.active.get(serverId)?.url;
    }
    async close(serverId) {
        const item = this.active.get(serverId);
        if (!item)
            return;
        this.active.delete(serverId);
        await new Promise((resolve) => item.server.close(() => resolve()));
    }
    async dispose() {
        await Promise.all([...this.active.keys()].map((id) => this.close(id)));
    }
    async forward(request, response, endpoint, remotePort, sessionPrefix) {
        if (request.method !== "GET" && request.method !== "POST") {
            response.writeHead(405).end();
            return;
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += bytes.length;
            if (size > 1024 * 1024) {
                response.writeHead(413).end();
                return;
            }
            chunks.push(bytes);
        }
        const body = Buffer.concat(chunks);
        const path = String(request.url || "/");
        const agentPath = `/api/tensorboard/proxy?port=${remotePort}&sessionPrefix=${encodeURIComponent(sessionPrefix)}&path=${encodeURIComponent(path)}`;
        const headers = { Accept: String(request.headers.accept || "*/*") };
        if (endpoint.token)
            headers["X-Simple-Agent-Token"] = endpoint.token;
        if (body.length) {
            headers["Content-Type"] = String(request.headers["content-type"] || "application/octet-stream");
            headers["Content-Length"] = body.length;
        }
        const agentRequest = http.request({ host: endpoint.localHost, port: endpoint.localPort,
            path: agentPath, method: request.method, headers, timeout: 15000 }, (agentResponse) => {
            const outgoing = {};
            for (const name of ["content-type", "content-length", "cache-control", "location", "set-cookie"]) {
                const value = agentResponse.headers[name];
                if (value)
                    outgoing[name] = value;
            }
            response.writeHead(agentResponse.statusCode || 502, outgoing);
            agentResponse.pipe(response);
        });
        agentRequest.once("timeout", () => agentRequest.destroy(new Error("Agent TensorBoard 代理超时")));
        agentRequest.once("error", (error) => {
            if (!response.headersSent)
                response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
            response.end(`TensorBoard 代理失败：${error.message}`);
        });
        agentRequest.end(body);
    }
}
exports.TensorBoardLocalProxy = TensorBoardLocalProxy;
