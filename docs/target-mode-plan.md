# 目标模式当前计划：误删恢复一致性审计

## 当前目标

- 批次：`recovery-audit-001`。
- 只审计 `zlk-cluster-orchestrator` 与 `simple-sftp`。
- 以本机已安装的 `SimpleExperiment 0.2.0` 和 `SimpleSFTP 0.1.2` 为运行时参考，确认恢复源码、构建产物和新打包内容是否完整。
- 优先恢复可由本地证据确认的最新版一致性；不继续新功能开发。

## 范围与保护

- 范围：manifest、源码、测试、文档、`dist`、runtime、模板、构建和打包配置。
- 保护：不修改安装目录，不覆盖或安装 VSIX，不覆盖现有恢复副本，不删除任何文件。
- 新包只写入独立审计目录；比较时忽略 ZIP 时间戳和安装时生成的 `__metadata`。
- 不审计、不修改、不恢复 MCP 下其他项目或文件。
- 真实 SFTP、服务器和 PPT 行为均为 `needs field verification`。

## 当前状态

- [已完成] 创建独立私有仓库 `zlinkw/SimpleExperiment` 与 `zlinkw/SimpleSFTP`，本地 `master` 已推送并与 `origin/master` 对齐。
- [已完成] SimpleSFTP 运行文件与安装版一致；`package.json` 仅多末尾换行，测试 `2/2` 通过。
- [进行中] SimpleExperiment 恢复源码无法通过 TypeScript 构建，已确认存在跨模块版本混杂；安装版 `dist` 仍是可运行参考。
- [已完成] 修复 VSIX 排除规则；新包文件集合与安装版对齐，无恢复副产物、源码测试或运行时临时文件。
- [待处理] 仅修复有安装版、历史记录或测试明确支持的缺失项。

## 验证清单

- JavaScript、JSON、Python、PowerShell、TypeScript 可解析性。
- SimpleSFTP 全量测试；SimpleExperiment 全量测试、lint、acceptance。
- TypeScript 独立输出目录构建，不覆盖当前 `dist`。
- 两个 VSIX 输出到独立审计目录，解包后与安装目录规范化 SHA256 比较。

## 批次完成条件

- 记录差异、修复、验证、剩余风险和包 SHA256。
- 若恢复 Git 成功，每个修复批次单独提交并快进推送 `origin/master`。
- 若 Git 仍缺失，停止代码修复并明确记录阻塞，不伪造历史或远程。

## 本批记录

- SimpleSFTP 审计包 SHA256：`AE3EF1CC1049ACCFABB5CDF200E0E8187DBC138DE2B65017D0A3FB5E637454D0`；4 个运行文件逐字节一致，manifest 仅安装元数据不同。
- SimpleExperiment 审计包 SHA256：`B64B0071E99B5FFA141B710BC01AD9EF611481CBF0F3DD9DCB548C5B4EF9E9E2`；文件集合与安装版一致，但 106 个文件内容不同，不能视为最新版等价包。
- SimpleExperiment `dist` JavaScript 102/102、runtime Python 2/2、JSON 125/125 语法通过；恢复源码 TypeScript 构建失败，不能从当前源码安全重建安装版。
