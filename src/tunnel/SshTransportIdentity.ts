import { execFile } from "child_process";
import { LocalSshServerInfo } from "./LocalSshConfig";

export interface SshTransportTarget {
  id?: unknown;
  label?: unknown;
  displayName?: unknown;
  host?: unknown;
  networkHost?: unknown;
  displayHost?: unknown;
  transferHost?: unknown;
  resolvedHost?: unknown;
  sftpHost?: unknown;
  sshHost?: unknown;
  sshConfigHost?: unknown;
  sshConfigAlias?: unknown;
  savedSessionPath?: unknown;
  sessionName?: unknown;
  workerHost?: unknown;
  hubHost?: unknown;
}

export interface SshTransportSession {
  name?: unknown;
  host?: unknown;
}

export interface SshTransportIdentity {
  transportHost: string;
  sshConfigHost: string;
  sshConfigAlias: string;
  networkHost: string;
  source: "ssh_config_alias" | "saved_ssh_host" | "xshell_alias" | "ssh_config_match" | "network_host";
}

export interface SftpServerOptions {
  id: unknown;
  label: unknown;
  host: string;
  sftpHost: string;
  sshHost: string;
  transferHost: string;
  resolvedHost: string;
  user: unknown;
  username: unknown;
  port: unknown;
  sshPort: unknown;
  remotePath: unknown;
  sshConfigHost: string;
  sshConfigAlias: string;
  networkHost: string;
  savedSessionPath: unknown;
  source: "simple-experiment";
}

export function resolveSshTransportIdentity(
  target: SshTransportTarget,
  options: {
    sshServers?: readonly LocalSshServerInfo[];
    session?: SshTransportSession;
  } = {},
): SshTransportIdentity {
  const servers = Array.isArray(options.sshServers) ? options.sshServers : [];
  const session = options.session && typeof options.session === "object" ? options.session : {};
  const explicitAlias = text(target.sshConfigAlias);
  const savedHost = text(target.sshConfigHost);
  const sessionAlias = text(session.name ?? target.sessionName);
  const networkHost = firstNetworkHost([
    target.networkHost,
    target.displayHost,
    session.host,
    target.host,
    target.transferHost,
    target.resolvedHost,
    target.sftpHost,
    target.sshHost,
    target.workerHost,
    target.hubHost,
  ]);

  const explicitMatch = exactSshServer(servers, [explicitAlias]);
  const savedMatch = exactSshServer(servers, [savedHost]);
  const sessionMatch = exactSshServer(servers, [sessionAlias]);
  const identityMatch = exactSshServer(servers, [
    target.host,
    target.transferHost,
    target.resolvedHost,
    target.sftpHost,
    target.sshHost,
    target.workerHost,
    target.hubHost,
    networkHost,
    target.label,
    target.displayName,
    target.id,
  ]);

  if (explicitAlias && explicitMatch) {
    return identity(explicitAlias, networkHost || explicitMatch.hostName, "ssh_config_alias");
  }
  if (savedHost && savedMatch && !isNetworkHost(savedHost)) {
    return identity(savedHost, networkHost || savedMatch.hostName, "saved_ssh_host");
  }
  if (sessionAlias && sessionMatch && !isNetworkHost(sessionAlias)) {
    return identity(sessionAlias, networkHost || sessionMatch.hostName, "xshell_alias");
  }
  if (identityMatch) {
    return identity(identityMatch.name, networkHost || identityMatch.hostName, "ssh_config_match");
  }
  if (!networkHost) {
    throw new Error(`${text(target.label) || text(target.displayName) || text(target.id) || "SSH 目标"} 缺少可用的 SSH 别名或网络地址。`);
  }
  return {
    transportHost: networkHost,
    sshConfigHost: "",
    sshConfigAlias: "",
    networkHost,
    source: "network_host",
  };
}

export function buildSftpServerOptions(
  target: SshTransportTarget & {
    user?: unknown;
    username?: unknown;
    port?: unknown;
    remotePath?: unknown;
  },
  identity: SshTransportIdentity,
): SftpServerOptions {
  return {
    id: target.id,
    label: target.label,
    host: identity.transportHost,
    sftpHost: identity.transportHost,
    sshHost: identity.transportHost,
    transferHost: identity.transportHost,
    resolvedHost: identity.transportHost,
    user: target.user,
    username: target.username ?? target.user,
    port: target.port,
    sshPort: target.port,
    remotePath: target.remotePath,
    sshConfigHost: identity.sshConfigHost,
    sshConfigAlias: identity.sshConfigAlias,
    networkHost: identity.networkHost,
    savedSessionPath: target.savedSessionPath,
    source: "simple-experiment",
  };
}

export interface OpenSshAliasInspection {
  ok: boolean;
  alias: string;
  hostname: string;
  user: string;
  port: string;
  message: string;
}

export async function inspectOpenSshAlias(
  alias: string,
  options: { timeoutMs?: number; command?: string } = {},
): Promise<OpenSshAliasInspection> {
  const name = String(alias || "").trim();
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 5000);
  try {
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child = execFile(options.command || "ssh", ["-G", "--", name], { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
      });
      child.on("error", reject);
    });
    const values = new Map<string, string>();
    for (const line of stdout.split(/\r?\n/)) {
      const match = /^(\S+)\s+(.+)$/.exec(line.trim());
      if (match) values.set(match[1].toLowerCase(), match[2].trim());
    }
    const hostname = values.get("hostname") || "";
    if (!hostname) throw new Error("ssh -G 未返回 hostname");
    return {
      ok: true,
      alias: name,
      hostname,
      user: values.get("user") || "",
      port: values.get("port") || "22",
      message: `SSH 别名可解析：alias=${name}，networkHost=${hostname}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      alias: name,
      hostname: "",
      user: "",
      port: "",
      message: `SSH 别名不可解析：alias=${name}。${message}`,
    };
  }
}

function identity(alias: string, networkHost: string, source: SshTransportIdentity["source"]): SshTransportIdentity {
  return {
    transportHost: alias,
    sshConfigHost: alias,
    sshConfigAlias: alias,
    networkHost,
    source,
  };
}

function exactSshServer(servers: readonly LocalSshServerInfo[], values: readonly unknown[]): LocalSshServerInfo | undefined {
  for (const value of values) {
    const key = text(value).toLowerCase();
    if (!key) continue;
    const match = servers.find((server) => server.name.toLowerCase() === key || server.hostName.toLowerCase() === key);
    if (match) return match;
  }
  return undefined;
}

function firstNetworkHost(values: readonly unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate && isNetworkHost(candidate)) return candidate;
  }
  return "";
}

function isNetworkHost(value: unknown): boolean {
  const textValue = String(value || "").trim();
  if (!textValue || /[\s\\/@]/.test(textValue)) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(textValue)) {
    return textValue.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
  }
  if (textValue.includes(":") && /^[0-9a-fA-F:]+$/.test(textValue)) return true;
  return textValue.includes(".")
    && /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(textValue)
    && textValue.split(".").every((label) => label.length <= 63 && !label.startsWith("-") && !label.endsWith("-"));
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}
