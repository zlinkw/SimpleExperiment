# 目标计划：Docker Codex 插件兼容改造

## 状态

- 目标 ID：`docker-codex-plugin-compat`。
- 状态：执行中，当前批次 `docker-plugin-003`。
- 范围：只改造 SimpleExperiment 与 SimpleSFTP；不创建 Docker 容器、不配置 VS Code Profile、不安装 VSIX。
- 启动条件：收到并校验计划 A 生成的 `plugin-handoff.json` 与 `PLUGIN-HANDOFF.md`，且两个插件仓库均无未归属改动。
- 验证状态：远程工作区、Windows 回归、双插件联调和 VSIX 安装均为 `needs experiment`。

## 目标

让运行在 Windows UI Extension Host 的 SimpleExperiment 与 SimpleSFTP 正确服务 Dev Container 工作区，同时保持现有 Windows 本地工作区、Xshell、Agent、SFTP、命令 ID 和配置项行为不变。

容器工作区 `/workspaces/<相对路径>` 必须映射到 Windows 宿主路径 `D:\GitRepo\<相对路径>`。插件内部文件系统、Xshell、PowerShell 和 SFTP 操作使用宿主路径；VS Code 编辑器定位文件时保留原始远程 workspace URI。

## 输入接口

计划 A 在 `C:\Users\ZLK\Documents\Codex\docker-dev` 提供：

- `plugin-handoff.json`
- `PLUGIN-HANDOFF.md`

`plugin-handoff.json` 固定契约：

```json
{
  "schemaVersion": 1,
  "containerName": "codex-linux-dev",
  "hostWorkspaceRoot": "D:\\GitRepo",
  "containerWorkspaceRoot": "/workspaces",
  "workspaceUriScheme": "vscode-remote",
  "extensionHosts": {
    "openai.chatgpt": "workspace",
    "simple-local.simple-experiment": "ui",
    "simple-local.simple-sftp": "ui"
  },
  "pathSettings": {
    "clusterHostRoot": "zlkCluster.workspaceHostRoot",
    "clusterContainerRoot": "zlkCluster.workspaceContainerRoot",
    "sftpHostRoot": "simpleSftp.workspaceHostRoot",
    "sftpContainerRoot": "simpleSftp.workspaceContainerRoot"
  }
}
```

输入校验失败时停止改造验收，不猜测路径或降级为容器内本地路径。
schemaVersion 1 的未知扩展字段允许保留但不参与插件决策；所有上述必需字段仍必须逐项匹配。

## 强制边界

- 两个插件必须在 Windows UI Extension Host 运行；运行时 `process.platform` 必须为 `win32`，扩展清单必须声明 UI extension kind。
- 只接受等于 `/workspaces` 或位于其下的规范化容器路径；拒绝 `..`、编码后穿越、不同根、盘符混入、UNC 注入和非 `/workspaces` 路径。
- 映射后的 Windows 路径必须等于宿主根或位于宿主根下；大小写、分隔符和尾部斜杠规范化后再次执行边界校验。
- Node `fs`、Xshell、PowerShell、SimpleSFTP 上传下载和 Agent 文件操作只使用 Windows 宿主路径。
- VS Code 打开、定位和比较工作区文件时保留原始 `vscode-remote` URI；不得用 `file:///D:/...` 替代远程编辑器 URI。
- SimpleExperiment 继续访问 Windows `127.0.0.1` 上的 Xshell 隧道；不得改为容器 localhost。
- 两个插件不得在 Docker 内启动 Xshell、读取 Windows 凭据、启动 SSH Server、建立额外 SSH 隧道或访问 Docker socket。
- 保留全部现有命令 ID、配置项、Xshell 入口、SimpleSFTP 入口和旧配置迁移行为。
- 未配置映射的普通 Windows 本地工作区必须保持当前行为；不能强制所有用户填写 Docker 路径设置。
- 多窗口过渡期间，隧道启动、调度、部署、上传、下载、归档和删除等有副作用操作只能由一个窗口持有宿主操作租约；只读状态页可并行打开。

## 路径契约

新增可选设置：

- `zlkCluster.workspaceHostRoot`
- `zlkCluster.workspaceContainerRoot`
- `simpleSftp.workspaceHostRoot`
- `simpleSftp.workspaceContainerRoot`

两个插件使用同一映射语义：

1. 本地 `file` 工作区继续使用 `workspaceFolder.uri.fsPath`。
2. `vscode-remote` 工作区先保留原始 URI，再将 URI 路径按配置映射为 Windows 宿主路径。
3. 所有项目名、相对文件和上传目标从规范化的相对路径派生，不从扩展进程 cwd 推断。
4. UI 同时展示远程工作区 URI 与即将用于副作用操作的 Windows 宿主路径。
5. 映射缺失、越界或不一致时，在路径强确认窗口之前阻断副作用，并给出具体配置项名称。

## 单窗口操作租约

- 使用两个插件都可访问的 Windows 用户级状态目录保存租约，不依赖 workspaceState 或容器文件。
- 租约至少包含插件 ID、窗口/进程标识、工作区 URI、宿主项目路径、动作类型、创建时间、心跳时间和过期时间。
- 获取使用原子排他创建或等价 Windows 文件锁；持有者定期续租，进程退出或租约过期后才允许接管。
- 只读检测不获取租约；隧道启动、调度、Agent 部署和 SFTP 文件操作必须先获取。
- UI 必须显示当前持有窗口和恢复方式；不得通过强制删除活动租约绕过保护。

## 实施批次

### docker-plugin-001 共享路径契约

- 在两个仓库分别增加纯路径映射模块、配置声明和单元测试。
- 覆盖 Windows 本地 URI、Dev Container URI、嵌套项目、分隔符、大小写、尾部斜杠和所有越界输入。
- 固定 URI 用于编辑器、宿主路径用于副作用的双路径模型。

### docker-plugin-002 SimpleExperiment 接入

- 将项目检测、Plan/结果文件读取、Agent runtime、PowerShell、Xshell 和路径确认接入宿主路径映射。
- 保持 Agent HTTP/realtime 访问 Windows `127.0.0.1`，验证不使用容器 localhost。
- 保留现有 Windows 工作区、命令 ID、设置、抽屉/三列布局和任务/结果生命周期。

验收记录：已完成。`npm test` 通过 644/644；远程工作区映射、Windows 宿主副作用路径、远程编辑器 URI 保留和结果文件远程打开均有本地自动化覆盖。Dev Container UI Host、Xshell `127.0.0.1` 联调仍为 `needs field verification`。

### docker-plugin-003 SimpleSFTP 接入（当前）

- 将工作区上传、文件上传、下载、忽略规则、共享目标和路径确认接入同一宿主路径语义。
- 验证容器编辑后的文件从 `D:\GitRepo` 对应位置上传，且编辑器仍打开远程 URI。
- 保留现有服务器配置、命令 ID、旧任务和 Windows 本地工作区行为。

### docker-plugin-004 多窗口与双插件联调

- 实现共享宿主操作租约并覆盖过期、崩溃恢复、只读并行和冲突阻断。
- 在一个 Dev Container 窗口同时验证 Codex、SimpleExperiment 和 SimpleSFTP 面板。
- 验证集群状态、调度和上传使用同一个宿主项目路径。

### docker-plugin-005 打包与交付

- 分别运行两个插件的 build、typecheck、lint、测试、Windows 回归、远程工作区测试和公开打包检查。
- 每个验证批次在对应仓库独立提交并普通快进推送 `origin/master`；禁止跨仓库混合提交或历史改写。
- 只把通过验收的两个 VSIX 与兼容结果写入 `plugin-drop`，不安装、不覆盖当前 Profile 插件。

## 输出接口

输出目录：

```text
C:\Users\ZLK\Documents\Codex\docker-dev\plugin-drop\
```

必须包含：

```text
simple-experiment-<version>.vsix
simple-sftp-<version>.vsix
plugin-compat-result.json
```

`plugin-compat-result.json` 固定契约：

```json
{
  "schemaVersion": 1,
  "status": "passed",
  "extensions": [
    {"id": "simple-local.simple-experiment", "extensionKind": "ui", "version": "<version>"},
    {"id": "simple-local.simple-sftp", "extensionKind": "ui", "version": "<version>"}
  ],
  "pathMappingTest": "passed",
  "windowsRegressionTest": "passed",
  "remoteWorkspaceTest": "passed"
}
```

任何测试未执行、失败或仅人工推断时，`status` 不得写为 `passed`，也不得生成伪造的通过结果。

## 验收矩阵

- Windows 本地单项目：所有原入口和路径行为不变。
- Dev Container 单项目：`/workspaces/<项目>` 正确映射到 `D:\GitRepo\<项目>`。
- 非法路径：穿越、越界、错误根和非远程工作区配置全部阻断。
- 编辑器 URI：打开文件继续使用 `vscode-remote` URI。
- SimpleSFTP：容器修改文件后从宿主路径上传同一字节内容。
- SimpleExperiment：继续通过 Windows Xshell 与 `127.0.0.1` 接收实时状态并执行控制。
- 多窗口：第二个窗口的副作用操作被租约阻断，只读状态仍可查看。
- 交付：两个 VSIX 与 JSON 版本、扩展 ID、extension kind 和测试结果一致。

## 完成条件

- 两个插件在 Dev Container 窗口显示于 Windows UI Extension Host，Codex 位于 Linux workspace host。
- 双路径模型、越界拒绝、Windows 回归、远程工作区和单窗口操作租约均有自动化测试。
- SimpleSFTP 上传文件与 `D:\GitRepo` 对应文件一致；SimpleExperiment 集群通信仍走 Windows Xshell 和 `127.0.0.1`。
- `plugin-compat-result.json` 的 `status` 及三个测试字段均为 `passed`，且有本地命令输出或测试报告证据。
- 产物仅写入 `plugin-drop`，未安装、未替换当前 Profile 中正在运行的插件。
