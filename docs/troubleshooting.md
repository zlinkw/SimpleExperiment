# 故障排查

优先运行 `SimpleExperiment：打开面板` 后的“自检”。

常见状态：

- `Agent stale`：实时流心跳超时。插件会保留 last-known-good 数据。请部署最新版 runtime 或重启 Agent。
- `Hub offline`：Hub 本地隧道或 Agent 不可达。不会自动启动 Worker 扇出。
- `Worker degraded`：只有该 Worker 过期或离线，其他 Worker 继续工作。
- `Runtime outdated`：runtime manifest 或 hash 不一致。请运行“部署最新版 Agent 到全部服务器”。
- `Direct fallback disabled`：插件已禁用直接远端回退路径，所有访问必须走本机 Xshell 隧道。

需要定位问题时，运行“生成脱敏调试包”。调试包包含脱敏后的配置、诊断、操作记录、错误、审计日志尾部、runtime 状态、Agent 状态和自检结果，不包含实验产物或大日志。

## 远端执行（tmux / bash -lc / conda）专项坑

Agent、Scheduler、Worker 任务都通过 `tmux ... bash -lc "<script>"` 在远端运行。下列坑专门记录在此：
[bash -lc 远程执行踩坑记录](bash-lc-pitfalls.md)（conda 激活失败致会话自毁、嵌套双引号吞掉日志重定向、
tmux 继承 SERVER 环境、`>> log` 只重定向末条命令、Python 3.8 运行时兼容等）。改运行时模板前必读第 7 节自检清单。

---

## 运行进度（execution）与面板渲染踩坑

下列坑与面板 Webview（`src/ui/PanelHtml.ts`）的运行进度渲染、外层模板转义、vsix 安装路径相关，
记录在此防止再犯。改 Webview 模板或打包脚本前必读。

### 1. 外层模板转义：内层 JS 的 "\n" 被外层模板解释为换行 → Invalid token

**现象**：面板渲染失败，控制台报 `Invalid or unexpected token`，错误定位指向 `PanelHtml.ts` 外层
`return \`...<script>...\`` 模板内部某行的 JS 代码。

**根因**：`PanelHtml.ts` 最外层是模板字符串 `return \`...<script> ... </script>\``。模板字符串内层再写
JS 时，若直接裸写 `"\n"`（双引号包裹的反斜杠 n），外层模板会把它当作**真实换行符**解析，破坏内层
`<script>` 的语句结构，导致脚本出现非法 token。

**正确写法**（内层需要换行符时，不要裸写 `"\n"`，改用 `String.fromCharCode(10)` 或 `\\n` 双转义）：

```ts
const full = stack ? message + String.fromCharCode(10) + stack : message;
```

或在内层反引号/字符串中写成 `\\n`（两层转义，落盘后才变成真正的 `\n`）。判断标准：凡是拼进
`return \`...\`` 外层模板的内层脚本，换行字面量都不能以单引号/双引号内的单个 `"\n"` 出现。

相关代码：`src/ui/PanelHtml.ts:2526-2535`（catch 块已用 `String.fromCharCode(10)` 拼接 `message + stack`，
见 2529 行）。

### 2. payload 空指针：((op.payload || {}) && ...) 左半永远为真 → Cannot read properties of undefined

**现象**：渲染调度占位卡（`renderSchedulerPlaceholderCard`）时报
`Cannot read properties of undefined (reading 'logPath')`。

**根因**：原始写法 `const logPath = (op.payload || {}) && op.payload.logPath`。当 `op.payload` 为
`undefined` 时，左半 `(op.payload || {})` 求值为 `{}`（真值），短路运算继续向右取
`op.payload.logPath`，即 `undefined.logPath`，直接抛错。

**正确写法**（让左半在 `op.payload` 为空时整体为假，用 `op.payload &&` 短路）：

```ts
const logPath = String((op.logPath || (op.payload && op.payload.logPath)) || "").trim();
```

或最小修复：`((op.payload || {}) && op.payload.logPath)` → `(op.payload && op.payload.logPath)`。

相关代码：`src/ui/PanelHtml.ts:9501`。

### 3. vsix 安装路径：相对路径装错目录 → ENOENT

**现象**：在 `MultiModal` 目录执行 `code --install-extension simple-experiment-*.vsix` 报
`ENOENT: no such file or directory`（找不到 vsix）。

**根因**：`code --install-extension <path>` 以**当前终端工作目录**解析相对路径；在 `MultiModal` 等错误目录
执行时，该目录下不存在 `simple-experiment-*.vsix`，于是 file not found。

**正确写法**（用绝对路径，或先切到 vsix 所在目录）：

```powershell
code --install-extension "D:\GitRepo\MCP\zlk-cluster-orchestrator\simple-experiment-*.vsix" --force
```

或 `cd D:\GitRepo\MCP\zlk-cluster-orchestrator` 后再执行。也可直接依赖 `npm run install:latest`：其内部
`scripts/install-latest.js` 用 `path.join(__dirname, "..", ...)` 生成绝对路径，不受终端目录影响。

相关代码：`package.json` 的 `postpackage` 脚本（`node scripts/install-latest.js`）；
`scripts/install-latest.js:5`（绝对路径拼接）、`:12`（安装命令）。

### 4. 外层模板剥离坑（P0）：26 处正则 `\` 被外层 ``return `...<script>...` `` 吞噬 → 握手超时 `Unexpected token const`

**严禁** 在 `src/ui/PanelHtml.ts` 最外层 `return `...<script>...</script>`` 模板字符串内部裸写单反斜杠正则/字符串。

**现象**：
- 面板打开后长时间白屏，握手超时；DevTools 控制台报 `Unexpected token 'const'` / `Invalid or unexpected token`，堆栈指向内层 `<script>` 顶部。
- 实际是 26 处正则（如 `/\s+/` `/\d+/` `/\./` `/\//` `/\{/` `/\}/` `/\(/` 等）与 `"\n"` 字符串在外层模板解析阶段被吞噬，落盘后变为 `/s+/` `/d+/` 非法语法，导致整个 Webview 脚本解析失败、握手回调永不注册。

**根因**：
- `PanelHtml.ts` 最外层是 JS 模板字符串 `` return `<!doctype ...><script> ... </script>` ``。
- JS 模板字符串会先对内容做转义预处理：`\s`→`s`（`\s` 非合法转义被剥掉 `\`）、`\n`→真实换行、`\.`→`.`、`\/`→`/`。内层脚本写入的正则/字符串经此一层剥离后已与源码不一致。
- 例如源码写 `const re = /\s+/`，落盘后变为 `const re = /s+/`；源码写 `"\n"`，落盘后变为真实换行把语句切断。

**正确写法（二选一，择一即合规）**：

1. **双写转义（推荐用于正则）**：内层脚本中所有 `\` 都写成 `\\`，经外层剥离一层后恰好还原。
   ```ts
   // 源码（PanelHtml.ts 内层脚本）应写：
   const ws = /\\s+/;
   const date = /\\d{4}-\\d{2}-\\d{2}/;
   const dot = /\\./;
   const slash = /\\//;
   const nl = "\\n"; // 或 "\\t"
   // 落盘后还原为 /\s+/ /\d{4}-\d{2}-\d{2}/ /\./ /\// "\n"
   ```

2. **`String.fromCharCode` 规避（推荐用于换行拼接）**：已有先例 `PanelHtml.ts:2529`
   ```ts
   // 严禁： message + "\n" + stack   // 会被外层模板展开为真实换行
   // 正确：
   const full = stack ? message + String.fromCharCode(10) + stack : message;
   ```

**门禁（提交前必跑，双重校验缺一不可）**：
1. `npm run build` 内置语法门禁：`node -c dist/extension.js && node -c dist/ui/PanelHtml.js`（见 `package.json#scripts.build`），**严禁** 跳过 build 直接提交。
2. `vm.Script` 二次校验（捕捉 `node -c` 漏过的模板剥离后语法断裂）：
   ```powershell
   node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"
   ```
   必须零异常退出；任一失败即视为 P0 回归。

**自检清单**：
- [ ] 全局搜索外层模板区间内的 `/\` 与 `"\`，确认无裸 `\s` `\d` `\w` `\.` `\/` `\{` `\}` `\(` `\)` `\n` `\t`
- [ ] `npm run build` 通过
- [ ] `node -c dist/ui/PanelHtml.js` 通过
- [ ] `vm.Script` 校验通过

相关代码：`src/ui/PanelHtml.ts` 全文件（外层 `return `...``）；修复对照 `PanelHtml.ts:2529`（`String.fromCharCode(10)` 正确示例）。

> 交叉引用：`docs/bash-lc-pitfalls.md` 亦强调脚本拼装时的转义剥离风险；`AGENTS.md#红线约束-P0` 为提交强约束。

### 5. 禁止硬编码隧道端口-P0：`10890`/`127.0.0.1:18765` 写死导致隧道不可用与校验无回调

**严禁** 在业务逻辑中硬编码 `10890` 或假设 `127.0.0.1:18765` 为唯一 Agent 地址。隧道由用户每服务器通过 Xshell/SSH 配置（`*.xsh`、`~/.ssh/config`、`settings.json` per-server host/port/forward）动态决定。

**现象**：
- 用户自定义隧道端口（如非 18765）时，写死 `127.0.0.1:18765` 导致 `校验 Agent 版本` 点击无反应（`worker_telemetry` 模式下 `/health` vs `/api/health` 路径不一致，前端无回调）。
- 写死 `10890` 导致部分机器隧道检测失效；GPU tmux 窗口 `无法打开`，job 调度静默失败（`ModuleNotFoundError: torch` 未回传到 UI，任务列表 `pending` 无报错）。

**正确做法**（见 `AGENTS.md#P0`）：
1. 所有探活/校验/版本比对读取 `XshellRealtimeTunnelConfig`/`TunnelEndpointPortAssignment` 的 `localForwardHost/localForwardPort` 与 `remoteAgentHost/remoteAgentPort`，动态拼装 `http://${host}:${port}`，不得回退到固定端口检测。
2. `TunnelGateway`/`XshellTunnelSetup` 不得 `throw` 限制只能 `127.0.0.1`；`XshellTunnelPortProbe` 的 `base` 与 `tcpOpen` 必须用 `resolveProbeHost(config)` 动态 host，健康探测走 `fetchHealthWithFallback`（`/api/health` → `/health` → `/api/version` 兼容降级）。
3. Agent 侧：`/health` 与 `/api/health`（以及 `/version`/`/api/version`）互为别名；`worker_telemetry` 白名单必须包含健康与版本接口，否则前端校验 404 无回调。

**门禁**：`Select-String -Pattern "10890"` 在 `src/**`/`dist/**` 业务逻辑零命中；`npm run build` 与 `vm.Script` 双重校验通过。

相关代码：`src/tunnel/XshellTunnelPortProbe.ts`（`resolveProbeBase/fetchHealthWithFallback`）、`src/tunnel/TunnelGateway.ts`（`normalizeHost/localBaseUrl`）、`src/tunnel/XshellTunnelSetup.ts`（动态 host）、`src/extension.ts#verifyDeployedAgentRuntime`（动态 `base` + 兼容降级）、`src/clusterAgentRuntime.ts`（`route in ("/api/health","/health")` 与 worker_telemetry 白名单）。

> 交叉引用：`AGENTS.md#P0 — 禁止硬编码隧道端口/IP`、`docs/adr/003-tunnel-dynamic-endpoint.md`。
