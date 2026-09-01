
Path
----
D:\GitRepo\MCP\simple-experiment

## 展示规范

- 对用户展示会话名称（title/slug），agent 间仍用 ses_... ID 精准拉取（捕获-转发-校验：从 Task 工具返回 JSON 的 SubtaskPart.sessionID/Message.id 原样转发，校验 ses_[a-zA-Z0-9]{20,}/msg_...，NotFound 回报“会话引用失效，请重试”）
- 主调度总结：首段 1 句人话结论 + 3-5 bullets（改了什么/为何/下一步），文件:行号仅放附录；对外展示不影响内部 handoff 仍为可执行 session.messages
- 共享上下文包引用优先级高于 caveman 精简，Batch complete 与 Final-Only 不得覆盖“一次读取、全员共用”硬门控

## 红线约束（严禁再犯）

### P0 — 外层模板剥离坑：`src/ui/PanelHtml.ts` 的 `return `...<script>...`` 外层模板吞噬正则 `\`

**严禁** 在 `PanelHtml.ts` 最外层 `return `...<script>...</script>`` 模板字符串内部裸写任何单反斜杠转义的正则/字符串字面量（`\s` `\d` `\w` `\.` `\/` `\{` `\}` `\(` `\)` `\n` `\t` 等），**严禁** 直接写 `/\s+/` `/\d+/` `"\n"` 这类裸 `\`。

- **现象**：面板握手超时，控制台 `Unexpected token 'const'` / `Invalid or unexpected token`，26 处正则的 `\` 被外层模板层吞噬后语法断裂，内层 `<script>` 直接解析失败。
- **根因**：外层是 JS 模板字符串，内层脚本中的 `\s` `\d` 等会被外层模板预解析为转义序列（`\s`→`s`、`\n`→真实换行），落盘后正则已损坏。
- **正确写法（二选一，择一即合规）**：
  1. **双写转义**：正则/字符串内的每个 `\` 都写成 `\\`，如 `/\\s+/` `/\\d{4}-\\d{2}-\\d{2}/` `"\\n"`。经外层模板一层剥离后落盘恰好还原为 `/\s+/`。
  2. **`String.fromCharCode` 规避**：需换行时用 `String.fromCharCode(10)` 替代 `"\n"`（已有先例 `PanelHtml.ts:2529`）。
- **门禁（提交前必跑，双重校验缺一不可）**：
  1. `npm run build` 已内置 `node -c dist/extension.js && node -c dist/ui/PanelHtml.js` 语法门禁（见 `package.json#scripts.build`），**严禁** 跳过 build 直接提交。
  2. 额外 `vm.Script` 校验：`node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"` 或等效脚本，必须零异常；`node -c` 只查语法，`vm.Script` 进一步确保模板剥离后仍为合法 JS。
- **自检口诀**：改 `PanelHtml.ts` 内层脚本前，先全局搜索外层模板内的 `/\` 与 `"\`；凡见裸 `\` 即视为 P0 缺陷，批量替换为 `\\` 后再验证门禁。
- 详见 `docs/troubleshooting.md#外层模板剥离坑-P0` 与 `docs/bash-lc-pitfalls.md` 交叉引用。

### P0 — 禁止硬编码隧道端口/IP，隧道按每服务器用户配置动态解析

**严禁** 在任何业务逻辑中硬编码隧道端口（如 `10890`）或固定假设 `127.0.0.1:18765` 为唯一可达的 Agent 地址。隧道由用户为每台服务器通过 Xshell/SSH 配置（`*.xsh` 会话、`~/.ssh/config`、`settings.json` 的每服务器 `host/port/forward` 配置）动态决定，必须在运行时从该配置解析实际 `localForwardHost/localForwardPort/remoteAgentHost/remoteAgentPort`。

- **现象**：`10890` 写死导致用户自定义隧道不可用；写死 `127.0.0.1:18765` 导致 Worker Telemetry 校验无回调、GPU tmux 无法打开、job 调度静默失败（`ModuleNotFoundError: torch` 等未回传到 UI）。
- **正确做法**：
  1. 所有探活/校验/版本比对必须读取 `TunnelEndpointConfig`/`XshellRealtimeTunnelConfig`/`TunnelEndpointPortAssignment` 中的 `localForwardHost/localForwardPort` 与 `remoteAgentHost/remoteAgentPort`，动态拼装 `baseUrl`（如 `http://${host}:${port}`），不得回退到固定端口检测。
  2. 展示层（`PanelHtml.ts`）的端口输入框以配置为准，`TunnelGateway`/`XshellTunnelSetup` 不得 `throw` 限制只能 `127.0.0.1`；默认值可为 `127.0.0.1:18765` 做兼容，但校验逻辑需接受用户配置的任意 `host:port`。
  3. Agent 侧兼容：`/health` 与 `/api/health`（以及 `/version` 与 `/api/version`）均为健康检查别名，`worker_telemetry` 模式必须放行健康与版本接口，避免前端 404 无回调。
- **门禁**：`Select-String -Pattern "10890"` 在 `src/**`/`dist/**` 业务逻辑中必须零命中（仅允许在 `docs/`/`AGENTS.md` 约束说明中出现）；`127.0.0.1:18765` 不得作为探测硬编码，改为读取配置；`npm run build` 与 `vm.Script` 双重校验仍需通过。
- 详见 `docs/troubleshooting.md#禁止硬编码隧道端口-P0` 与 `docs/adr/003-tunnel-dynamic-endpoint.md`。

