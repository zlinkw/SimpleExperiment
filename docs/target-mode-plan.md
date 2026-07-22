# 目标模式当前计划：恢复 SimpleExperiment 可构建基线

## 当前目标

- 批次：`recovery-build-001`。
- 只审计 `zlk-cluster-orchestrator` 与 `simple-sftp`。
- 以本机已安装的 `SimpleExperiment 0.2.0` 和删除前会话记录为运行时证据，逐批恢复可构建源码基线。
- 在 `npm run typecheck`、全量测试、lint 和 acceptance 恢复通过前暂停新功能开发。

## 范围与保护

- 范围：manifest、源码、测试、文档、`dist`、runtime、模板、构建和打包配置。
- 保护：不修改安装目录，不覆盖或安装 VSIX，不覆盖现有恢复副本，不删除任何文件。
- 新包只写入独立审计目录；比较时忽略 ZIP 时间戳和安装时生成的 `__metadata`。
- 不审计、不修改、不恢复 MCP 下其他项目或文件。
- 真实 SFTP、服务器和 PPT 行为均为 `needs field verification`。

## 当前状态

- [已完成] 创建独立私有仓库 `zlinkw/SimpleExperiment` 与 `zlinkw/SimpleSFTP`，本地 `master` 已推送并与 `origin/master` 对齐。
- [已完成] SimpleSFTP 运行文件与安装版一致；`package.json` 仅多末尾换行，测试 `2/2` 通过。
- [已完成] `recovery-build-001`：恢复 Xshell 配置主实现、隧道动作类型、实时事件基础契约和文件传输类型；定向检查通过。
- [已完成] 修复 VSIX 排除规则；新包文件集合与安装版对齐，无恢复副产物、源码测试或运行时临时文件。
- [待处理] 继续修复 Extension 缺失导入/成员、结果与计划导出、实时 authority 合并和剩余类型契约。

## 验证清单

- JavaScript、JSON、Python、PowerShell、TypeScript 可解析性。
- SimpleSFTP 全量测试；SimpleExperiment 全量测试、lint、acceptance。
- TypeScript 独立输出目录构建，不覆盖当前 `dist`。
- 两个 VSIX 输出到独立审计目录，解包后与安装目录规范化 SHA256 比较。

## 批次完成条件

- 记录差异、修复、验证、剩余风险和包 SHA256。
- 若恢复 Git 成功，每个修复批次单独提交并快进推送 `origin/master`。
- 若 Git 仍缺失，停止代码修复并明确记录阻塞，不伪造历史或远程。

## Git 同步规则

- 此后每个已验证批次都必须同时提交本地仓库并普通快进推送至该插件独立 GitHub 仓库的 `origin/master`。
- 推送后必须执行 `git fetch origin master`，确认本地 `HEAD` 与 `origin/master` 完全一致，才视为批次完成。
- 若插件尚无远程仓库，先在当前 GitHub 账号下创建该插件独立的私有仓库并配置 `origin`；不与其他插件共用仓库。
- 禁止强制推送、改写历史，或把一个插件的提交推送到另一个插件仓库。

## 本批记录

- SimpleSFTP 审计包 SHA256：`AE3EF1CC1049ACCFABB5CDF200E0E8187DBC138DE2B65017D0A3FB5E637454D0`；4 个运行文件逐字节一致，manifest 仅安装元数据不同。
- SimpleExperiment 审计包 SHA256：`B64B0071E99B5FFA141B710BC01AD9EF611481CBF0F3DD9DCB548C5B4EF9E9E2`；文件集合与安装版一致，但 106 个文件内容不同，不能视为最新版等价包。
- SimpleExperiment `dist` JavaScript 102/102、runtime Python 2/2、JSON 125/125 语法通过；恢复源码 TypeScript 构建失败，不能从当前源码安全重建安装版。
- `recovery-build-001`：依据已安装 `dist` 和会话历史恢复 Xshell 配置实现，解除 Xshell/MobaXterm 配置循环引用；补齐隧道动作、operation 查询、隐藏状态、worker 事件和文件传输类型契约。
- 定向 TypeScript 编译通过；Xshell、端点、命令与文件传输相关测试 `16/16` 通过。
- 全量 `npm run typecheck` 仍失败，剩余错误已收敛到 Extension、实验配置/结果、runtime、scenario、authority merge、RemoteFileBrowser、HubControlApi、TunnelOnlyPolicy 和端口冲突类型；后续批次继续处理。
- 下一批边界：只处理 Extension 缺失导入/成员和隧道 authority/文件浏览契约，不扩展到 UI 或新功能。
