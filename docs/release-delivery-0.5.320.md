# 0.5.320 / SimpleSFTP 0.2.88 交付记录

日期：2026-10-15。范围：其他 tmux 会话的整组关闭、PLAN 覆盖预览中的硬链接、同步范围批量删除的锁等待及实际进度。开发只使用临时夹具与隔离 tmux，未关闭真实窗口、删除生产产物、清空旧状态、部署远端或重跑科研任务。

## 修改与证据

- 其他会话行提供“关闭全部窗口”，一次确认展示完整 windowId/paneId 批次。复用原 GPU 协调器及单窗口执行器，逐项主动核实，不使用 kill-session/kill-server 或 PID。保留单标签入口、GPU 前缀约束及 Agent 保护。渲染与点击、Host、取消、服务器变化、窗口重排和变化回归通过。
- SHARED_HARDLINK 来自 SimpleSFTP 对普通文件实际硬链接数的检查。运行 PLAN 在已有产物覆盖分支生成 cleanup.preview，这一步只读；该错误不表示已经删除文件。确认路径删除支持仅解除批准范围内的名称，保留其他硬链接内容。普通移动/恢复、符号链接、类型、根目录和直接父目录保护不变。
- 同步范围删除原先并发 2 条路径，但远端执行器使用项目级 OS 互斥锁；固定 15 秒总等待又会在前一个窗口仍处理时推进下一项。路径批次现在串行，未核实结束时停止后续目标。只有明确被锁拒绝、未准入的原请求允许继续准入；响应丢失后只查询，不因 pending 重新删除。
- 活动清理查询扫描冻结清单内的实际目录项，不读取权重、不跟随链接或扫描清单外子树。实际消失的项数及字节数前进时更新无进展预算；心跳与时间戳不能维持等待。模拟时钟验证持续进展可超过旧总时限，无进展仍结束本轮查询。真实临时文件夹具验证统计来自文件系统；没有生产耗时或吞吐测试，未将模拟时间当作实机性能。

实现边界见 [tmux-session-close-and-hardlinks.md](tmux-session-close-and-hardlinks.md)。

## 验证

两个仓库的最终 npm run package 均通过，包含单文件串行测试、Python/JS 语法、隔离真实 tmux、Windows 流程、面板脚本及运行闭包检查。SimpleExperiment 额外门禁包含 tmuxGpuSessionClose 10 项、tmuxOtherSessionsDisclosure 13 项、syncScopeDelete 5 项。SimpleSFTP 的 confirmedPathDelete 4 项、cleanupManaged 5 项及额外 cleanupFiles 18 项通过。

硬链接夹具覆盖同目录多名称、跨 job 冻结批次、最后一个内部硬链接、范围外副本保留、写入变化拒绝及普通模式限制。删除进度夹具读取真实剩余文件数和字节数。清理锁准入以受控传输返回复现；不是对生产服务器执行删除。未运行全仓库 npm test。

git diff --check、面板 vm.Script、包内逐文件字节比对、身份、平台、运行闭包及敏感状态排除检查通过。主包 360 个 dist 文件、SimpleSFTP 23 个声明运行文件均与验证构建相同。

## 发行

SimpleExperiment 验证源码：`8c6d76ba79af957b781252b0161f9e3bd19af076`，包含前批会话关闭提交 `36a9c46f05ca06ba54445c6e2d79c15d4a33b416`。SimpleSFTP 验证源码：`46e6c351d4d8b60d411369954ef44294cfe45b82`，包含前批硬链接提交 `c8bd052bebddec1ac369264c3b1351e21fb50624`。各批普通快进 push 后 fetch 核对 origin/master 一致。

- [SimpleExperiment v0.5.320](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.320)：2821229 字节，SHA256 `a1e0dae67789ca3fc63ce9a47a5632bb2c46fff4d59142dce7e38260f2fcda9c`。
- [SimpleSFTP v0.2.88](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.88)：167886 字节，SHA256 `ecb1db2d3d41ba54453ea0d357eb4e4202bff0f851f72a6988253a449a92528c`。

两个稳定 Release 均绑定上述源码，含 VSIX 与精确文件名的 SHA256 清单，非草稿、非预发行。安装前使用实际 0.5.318 ReleaseClient，按原已安装 0.5.318 / 0.2.86 检查，两项 updateAvailable 均为 true；重新下载的远端字节、大小、校验清单、平台 manifest 和提交绑定一致。

## 安装与待验收

最终各执行一次 npm run install:latest，按 SimpleSFTP 0.2.88 → SimpleExperiment 0.5.320 顺序安装。未安装中间主包 0.5.319。已核对两项已安装版本、simpleex/simple-sftp-api 入口以及已安装关闭协调器、删除协调器、面板、SimpleSFTP 引擎和 API 字节。

安装后停止面板/API 操作，等待用户 Developer: Reload Window。新按钮、用户刚才的实际删除批次、停止后覆盖重跑仍待通过真实插件入口验收。此次本机修改未更新远端 Agent/Scheduler；运行 PLAN 若检查到 runtime 版本不同，按既有插件准备流程更新至 0.5.320 后核对实际运行版本，不将磁盘文件版本当作运行版本。
