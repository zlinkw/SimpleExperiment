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
