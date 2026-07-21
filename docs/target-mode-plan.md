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

- [进行中] 双插件源码、安装目录、测试和打包内容逐文件校验。
- [阻塞] 两个恢复源码目录均缺少 `.git`；未确认可信远程前不得初始化、提交或推送。
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
