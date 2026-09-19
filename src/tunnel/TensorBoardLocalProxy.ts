import * as http from "node:http";
import { assertLocalhost } from "./TunnelGateway";

export interface TensorBoardAgentEndpoint {
  localHost: string;
  localPort: number;
  token?: string;
}

interface ActiveProxy {
  server: http.Server;
  url: string;
  endpoint: TensorBoardAgentEndpoint;
  remotePort: number;
  sessionPrefix: string;
}

export class TensorBoardLocalProxy {
  private readonly active = new Map<string, ActiveProxy>();

  async open(serverId: string, endpoint: TensorBoardAgentEndpoint, remotePort: number, sessionPrefix: string): Promise<string> {
    assertLocalhost(endpoint.localHost);
    if (!Number.isInteger(endpoint.localPort) || endpoint.localPort < 1024 || endpoint.localPort > 65535)
      throw new Error("Agent 本机转发端口无效");
    if (!Number.isInteger(remotePort) || remotePort < 1024 || remotePort > 65535)
      throw new Error("TensorBoard 远端端口无效");
    const previous = this.active.get(serverId);
    if (previous && previous.remotePort === remotePort && previous.sessionPrefix === sessionPrefix &&
        previous.endpoint.localHost === endpoint.localHost &&
        previous.endpoint.localPort === endpoint.localPort &&
        previous.endpoint.token === endpoint.token) return previous.url;
    await this.close(serverId);

    const server = http.createServer((browserRequest, browserResponse) => {
      void this.forward(browserRequest, browserResponse, endpoint, remotePort, sessionPrefix);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.removeListener("error", reject);
          resolve();
        });
      });
    } catch (error) {
      server.close();
      throw error;
    }
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("无法确定 TensorBoard 本地入口端口");
    const url = `http://127.0.0.1:${address.port}/`;
    this.active.set(serverId, { server, url, endpoint, remotePort, sessionPrefix });
    return url;
  }

  url(serverId: string): string | undefined {
    return this.active.get(serverId)?.url;
  }

  async close(serverId: string): Promise<void> {
    const item = this.active.get(serverId);
    if (!item) return;
    this.active.delete(serverId);
    await new Promise<void>((resolve) => item.server.close(() => resolve()));
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.active.keys()].map((id) => this.close(id)));
  }

  private async forward(request: http.IncomingMessage, response: http.ServerResponse,
                        endpoint: TensorBoardAgentEndpoint, remotePort: number, sessionPrefix: string): Promise<void> {
    if (request.method !== "GET" && request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const chunks: Buffer[] = [];
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
    const headers: Record<string, string | number> = { Accept: String(request.headers.accept || "*/*") };
    if (endpoint.token) headers["X-Simple-Agent-Token"] = endpoint.token;
    if (body.length) {
      headers["Content-Type"] = String(request.headers["content-type"] || "application/octet-stream");
      headers["Content-Length"] = body.length;
    }
    const agentRequest = http.request({ host: endpoint.localHost, port: endpoint.localPort,
      path: agentPath, method: request.method, headers, timeout: 15000 }, (agentResponse) => {
      const outgoing: Record<string, string | string[]> = {};
      for (const name of ["content-type", "content-length", "cache-control", "location", "set-cookie"] as const) {
        const value = agentResponse.headers[name];
        if (value) outgoing[name] = value;
      }
      response.writeHead(agentResponse.statusCode || 502, outgoing);
      agentResponse.pipe(response);
    });
    agentRequest.once("timeout", () => agentRequest.destroy(new Error("Agent TensorBoard 代理超时")));
    agentRequest.once("error", (error) => {
      if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(`TensorBoard 代理失败：${error.message}`);
    });
    agentRequest.end(body);
  }
}
