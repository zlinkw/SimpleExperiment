# Windows 配套更新优化

参考仓库 `D:\GitRepo\SimpleExperiment-Mac`，只读参考点 `627b12c`（0.5.313、master、工作区干净）。Windows 基线 `1802054c`（0.5.289）。两个平台分别维护版本和扩展身份，没有合并整仓或覆盖 Windows Scheduler/Agent。

## 本轮采用

- 参照 Mac Bootstrap：更新入口先于业务加载，业务面板异常时仍可从状态栏及命令面板检查/安装。启动检查一次，随后每 30 分钟检查；同一配套版本只提醒一次。原面板和本地 API 入口委托给同一实现。
- 参照 PreviewReleaseClient：请求合并、五分钟 ETag 缓存、有界响应、超时、真实限流退避。普通 403 不冒充限流；手动点击不能绕过限流。不要求 GitHub 登录或 repo 授权。
- 参照 UpdateTransaction：显式选择“安装并重载”后，阻止新本机业务、等待已有操作结束；两个包均下载并验证后，按 SimpleSFTP → SimpleExperiment 安装。保存冻结批次、安装请求和完成回执；部分失败保留门禁，重载后提示人工补装原批次。不会自动安装、取消传输、停止远端作业或重派失败任务。
- 额外采用 Mac VSIX 完整性校验：检查所有 ZIP 条目的 CRC、边界、重复/穿越/链接，以及 package.json 与 XML 的身份/版本、真实平台和 VS Code engine；安装前重新核验 SHA256 和文件身份。适配 Windows 大小写及 universal 包，暂存包使用哈希路径，无覆盖/自动删除。
- 额外优化配套租约：SimpleExperiment 与 SimpleSFTP 的已有传输可继续续租/验主，新传输仍受更新门禁阻断。过期但存活/无法证明退出的传输不会被当成已结束。取消等待仅取消更新，不取消传输。
- 修正 Windows 现有查询没有把 GitHub 的 `tag_name`、`html_url` 映射为内部字段的问题。

## 差异审核

| Mac 额外实现 | Windows 处理 |
| --- | --- |
| 独立更新、事务恢复、限流判别、完整 ZIP 校验 | 本轮按 Windows 身份和现有发行源适配 |
| preview.json 静态索引与 release.json 配套清单 | Mac 发布协议专用；Windows 当前没有相应发布索引，继续读取两个 Windows 仓库的公开稳定 Latest Release，不编造索引或读取 Mac 包 |
| Termius 手动隧道、M5/macOS 启动、CLI 安装目录和 POSIX 大小写 | 平台专用；保留 Windows Xshell、发现目录及路径规范 |
| CLI 工作区/seed 绑定、Plan 级只读证据读取模块 | 有参考价值，但涉及执行/采集消息契约；本轮列为后续独立适配项，不直接覆盖 Windows 的较新来源、内存汇总和正式任务门禁 |
| Mac 对 Windows 历史功能的同步及相应测试 | 大部分已有；Windows 0.5.285–0.5.289 的进度预检、真实 shell、失败 job 人工审核更新必须保留 |
| Mac 清理/句柄能力与配置差异 | 不移植成 Windows 清理兜底，现有人工授权、目录安全和所有权检查保留 |

## 入口与验证边界

命令面板：`SimpleExperiment：检查配套插件更新`、`SimpleExperiment：安装或补装配套更新并重载`。状态栏“配套更新”、面板设置中的原按钮使用同一服务。API 仍使用当前 capabilities 中的 `checkPluginUpdates` / `installPluginUpdates`，安装仍需用户确认，不自动传入任何清理授权。

本地单文件串行回归覆盖真实 GitHub JSON 字段、ETag/重复点击、403/429、错身份/平台/engine/CRC、暂存变化、下载验证失败、部分/不确定安装回执、补装、取消等待、跨插件资源租约，以及业务启动失败后独立入口。构建继续运行原有正式任务和清理门禁，额外 vm.Script 检查面板。打包后另行核验实际 VSIX；不把模拟安装或构建通过当成真实 GitHub 更新/重载验收。

本轮不读取/改写 MultiModal 结果，不调用科研运行或文件传输 API，不更新远端 Agent。安装后需用户 Developer: Reload Window；随后可手动“检查配套插件更新”。实际下载新版公开 Release、部分失败补装和多窗口重载仍待用户环境验收。

更新等待协议要求配套 SimpleSFTP ≥ 0.2.69；旧版在进入更新门禁前拒绝并要求安装配套包/重载，防止已有传输的旧版验主逻辑被打断。
