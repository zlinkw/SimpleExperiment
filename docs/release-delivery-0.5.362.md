# 0.5.362 文件操作等待修复交付记录

## 范围与证据

当前截图的失败属于代码同步前置清单读取，不是训练运行状态过期。实际 Host、请求身份、143635ms 提交流程记录、同一清单的持续文件计数及逐入口审查见 [file-operation-progress-audit.md](file-operation-progress-audit.md)。未重新提交 PLAN，未启动、停止、重跑或重新派发科研任务，未修改科研项目、环境、指标、日志、权重或旧文件。

改动涵盖调用方/执行器/CLI 的文件等待边界、扫描进度、慢本机哈希、同步 proof 主动核实、隧道文件 HTTP 流、清理执行窗口观察及只读查询释放。无进展只提示等待；成功仍须原有文件/内容/退出核验。保留真实失败、未知写入防重放、手动取消、身份及工作区/连接换代、安全删除根/父目录/直接子项和双确认。

配套 SimpleSFTP 0.2.92 还区分了会写本机的 mapped 下载与 memoryOnly 读取，并使目录枚举/属性读取失败保持错误，不能冒充空清单。该插件的源码位于独立既有仓库 `D:/GitRepo/MCP/simple-sftp`。

## 已完成代码验证

- 最终 SimpleExperiment `npm run package` 退出 0，包含 build、类型检查、串行回归、Windows 流程与 256 个模块的运行闭包门禁；额外 lint、vm.Script 与目标回归通过。
- SFTP 等待回归 14 项、同步 proof 6 项、清理重连 13 项、慢清理执行 5 项、本机哈希 4 项通过。隧道上传、下载及进度目标回归通过；`test/fileTransfer` 全部 11 个文件、13 项通过。覆盖无新计数的慢文件、容量排队、进度恢复、短暂观察失败、实例换代、迟到响应、取消、非零退出、内容 SHA 和真实写入。
- SimpleSFTP 目标 API/CLI 20 项、哈希/枚举 12 项、目录读取 5 项、停滞 7 项等通过；最终 `npm run package -- --replace` 退出 0，23 个运行文件闭包、内置串行 build 门禁通过。replace 仅重建本轮未发行、未安装的 0.2.92 包，未触碰历史发行资产。
- 两个确定包的身份、版本、平台、engine、lock 版本、Python AST、当前运行文件逐字节一致及实际 discovery 秘密排除均通过。

| 包 | 大小 | SHA256 |
| --- | --- | --- |
| simple-experiment-0.5.362.vsix | 3064170 字节，532 个条目，376 个 dist 文件 | `2760d8080636bc9c4e34b3c1e5d5d4f64b0d1a5bd671c87e40290c5eb0316afb` |
| simple-sftp-0.2.92.vsix | 169720 字节，26 个条目，24 个源码/运行文件 | `ca05a0669600f6a0d3475bb67ca7bbc89a4c10edc989c2ae7ba1fdc97cddf00f` |

逐包 SHA256 清单使用精确包文件名。两包均为 universal；VS Code engine 分别为 ^1.100.0、^1.80.0；Python AST 分别为 8、5 份。

## 回归门禁处理

SimpleSFTP 全量串行回归曾在 `test/mappedBatchDownload.test.js` 的“API cancel during the real SSH stream kills that one child”失败后达到 20 秒上限，测试执行器已停止。静态复核显示，会写本机的下载被错误归入无需写事务回执的读取，取消按 operationId 找不到事务；旧夹具在断言失败时没有释放注入的子进程，导致后续等待挂起。已修正分类并增加测试退出保护；memoryOnly 保持独立只读请求。

仓库 AGENTS.md 明确要求“20 秒未退出即停止，不重试”，因此先停止并请求授权。用户明确允许修正后重测一次，随后该文件单独运行退出 0，26 项全部通过，约 2.87 秒。之后复用既有串行测试执行器及其每文件 20 秒上限，执行其余全部 41 个文件，243 项通过；没有重复执行已授权单独验收的 mapped 文件。最终完整覆盖 42 个测试文件、269 项，全部通过。重测只使用本机隔离夹具。

首次 Experiment 门禁还暴露了旧 fetch mock 不能拦截新原生 HTTP 传输的问题；测试现已使用随机端口的隔离 HTTP 服务器验证 maxBytes，目标测试及之后最终完整 package 均通过。未通过修改生产校验来迁就测试。

## 发行与现场状态

两个仓库本批均已通过适用的代码验证和包检查。SimpleExperiment 实现提交 `62ef6031b519e51aa1b0f26c2a262fd2e858ef2f`、SimpleSFTP 实现提交 `7a8d361f0d6577f146efab4bf1be638af7e1bee4` 已分别普通 fast-forward 推送各自 origin/master，fetch 核对 HEAD 一致，未包含原有 pyc、脚本、运行目录或历史包清单改动。

真实稳定 Latest 已重新读取核对：

- [SimpleExperiment v0.5.362](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.362)，tag 和 target_commitish 绑定 `62ef6031b519e51aa1b0f26c2a262fd2e858ef2f`。
- [SimpleSFTP v0.2.92](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.92)，tag 和 target_commitish 绑定 `7a8d361f0d6577f146efab4bf1be638af7e1bee4`。

两项均 draft=false、prerelease=false；包含表中相同字节的 VSIX 与同名 SHA256 清单，清单分别 97、90 字节。资产名、大小、GitHub digest、实际下载 SHA256 与精确清单文件名一致；未覆盖任何历史 tag 或资产。

使用实际已安装旧版 0.5.361 的 ReleaseClient，从真实公开 Latest 识别 0.5.362 / 0.2.92 Windows 更新，实际下载两包和清单，并核实身份、版本、平台和字节与本机确定包一致。隔离验证目录 `C:/Users/ZLK/AppData/Local/Temp/simpleex-0362-release-verify-MjlXCD` 保留。

发行验收后分别显式运行一次两个仓库的 `npm run install:latest`，无 force、无降级、无重复安装。VS Code 列表为 simple-local.simple-experiment@0.5.362、simple-local.simple-sftp@0.2.92，simpleex --help 和两个 CLI 入口核对通过。已安装 Experiment 全部 376 个 dist 文件、SFTP 全部 21 个 JS/Python 运行文件与确定包所用当前文件逐字节一致。

安装前最后主动核对的 Extension Host 仍为 Experiment 0.5.361、SFTP 0.2.91；19:15:49.735Z 的 SFTP 查询只有正在 hashing 的只读 inventory，2394 个文件，未见当前写入传输。安装后立即停止当前面板、API 及服务器操作，没有用磁盘新版本冒充已重载。此次未自动部署远端 Agent/Scheduler。

源码、稳定发行和本机一次安装均已完成。等待用户 Reload Window 后，再只读验收 H20 连续文件扫描/核实、取消恢复及 PLAN 提交计数；不自动补交原失败 PLAN。当前没有新版现场验收结论，不能宣称现场问题已经解决。本节为交付后的文档补记，不更改 tag、发行包或安装字节。
