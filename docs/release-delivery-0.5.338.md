# 0.5.338 交付记录

## 根因与修复

0.5.337 对没有新版日志标记的任务要求逐 commandId 手动授权分析。升级前已结束的正常任务也会一直显示“产物完整，运行日志待核实”；上轮现场批量分析只更新了内存观察，没有修复此行为。

`src/runtime/RuntimeLogDiagnostics.ts` 现对当前主动查询中的已结束任务，自动增量核实按 commandId 计算的精确原始控制台日志。兼容入口必须匹配项目内唯一日志路径；任意旧登记路径不能获得自动兼容。新版日志继续按命令标记隔离。Agent 重启后重新读取，无需历史授权或新状态文件。

完整正常日志进入 verified；异常进入 review_required；未取到完整证据保持 unverified。非零退出仍失败，执行状态与产物完整性继续独立。API、UI、PLAN 计数和结果收集均复用现有主动查询链路，不改写任务历史、最终清单、指标、日志或权重。用户主动重新分析入口保留。

同步修改 runtime manifest、package/lock 和生成 runtime；协议文档见 `docs/runtime-diagnostics.md`。两个 Python 夹具新增自动兼容、重启、大日志分块、身份隔离及实际查询/结果收集回归。

## 验证

- 先加入回归，确认旧实现因“旧任务日志尚未主动分析”失败，再修改实现使其通过。
- 隔离 Linux CPU 夹具覆盖六种真实前台执行，并将夹具日志和清单转换为升级前格式，直接检查 Agent public observation 和结果收集的自动判断。
- 初次完整打包被既有 localStopControl 的十秒 WSL 子进程超时阻断。测试脚本增加既有 WSL 准备入口，保留原十秒子进程和二十秒单文件上限；单文件及重新执行的完整打包通过，没有修改停止生产代码或跳过检查。
- 最终 `npm run package`：113 次串行单文件执行，737 项通过，零失败；包含真实渲染面板脚本检查。额外 `vm.Script` 模块校验通过。
- VSIX ZIP、身份、版本、universal 平台、367 个 dist 文件字节一致性、8 个 Python AST、运行闭包和秘密排除检查通过。
- 最终打包日志：本机临时目录 `simpleex-0.5.338-package-final.log`；首次失败日志 `simpleex-0.5.338-package-release.log` 保留，不进入仓库。

## 发布与安装

- 修复提交 `39ca3cf589854169124fe9b15e1312def91b6d28` 已普通快进推送 origin/master，fetch 核对相等。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.338>。重新读取真实 Latest，确认 tag、绑定提交、draft=false、prerelease=false 及两个资产。
- 包 `simple-experiment-0.5.338.vsix`，2,927,470 字节。
- SHA256 `552c4140fa237e39dd745bbb245ea66a8b600e4887b2b30adfa2876512ddd126`；同名 `.vsix.sha256` 绑定精确文件名。
- 实际已安装 0.5.337 更新客户端发现 update_available；重新下载公开发行包及校验和，与本机已验证字节一致。配套 SimpleSFTP 0.2.90 发行包及指纹一致，未修改或重复安装。
- 显式执行一次 `npm run install:latest` 安装 0.5.338，无 force、无降级。已安装全部 367 个 dist 文件与该 VSIX 一致，扩展版本和 simpleex 入口正常。

## 实机边界

安装后未再操作当前面板或 API。用户需 **Developer: Reload Window**，再通过插件更新匹配的 Agent/Scheduler，验收自动查询旧任务的实际入口。未自动部署远端，未停止、重跑现有任务，未修改科研项目、服务器环境或真实产物。新版本自动兼容的远端实机验收待执行。
