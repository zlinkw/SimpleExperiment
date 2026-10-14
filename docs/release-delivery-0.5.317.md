# 0.5.317 交付记录

日期：2026-10-15。范围：Worker 环境激活、运行状态与 PLAN 卡片错误摘要。未部署生产 Worker、停止真实任务、删除真实产物或重新运行训练。

## 实际证据与实现

通过当前 discovery/capabilities 只读查询 0.5.316 的任务窗口，NWPU3 报缺少 torch，NWPU5 的 run_wrapper 子命令找不到 python，相关窗口退出码为 1。本机项目 run_wrapper 的子进程继承 os.environ，只调整自己的库路径；未修改项目文件或环境。

最小夹具复现登录脚本重设 PATH 后，外层绝对 Python 能启动、内层裸 python 无法启动的问题。公共任务 shell 现在在登录脚本后激活配置环境并恢复子进程 PATH；Conda 可用时执行 activate，否则使用指定解释器目录与该环境的激活脚本。重新绑定 job 身份和 GPU，保留用户库配置及项目原始错误，不增加依赖检查、安装或库证明。

running 标记移至任务窗口内环境准备之后、启动命令之前。queued/bound/admitted/starting 不再折算运行中，未知阶段也不默认运行。后端摘要、选择器、概览、工作台及运行卡片区分提交、排队、启动与运行。

卡片错误最多 180 字符，优先显示异常原因。完整窗口输出不再嵌入卡片；保留按 Worker/commandId 定位的“查看窗口日志”。没有窗口的启动前拒绝保持说明及禁用跳转。

边界与实现说明见 [worker-command-start.md](worker-command-start.md)。

## 验证

- 最终 `npm run package` 完整通过，包含 typecheck、构建、单文件串行回归、真实隔离 tmux、Windows 流程、面板脚本及运行依赖闭包。
- 重点单文件：taskLifecycle 6、executionCompactOverview 28、planSelectorStatus 14、panelStateProjection 5、overviewProjectReadiness 4、projectRunPreflightWorkflow 11、planSubmissionVisiblePreflight 19、independentAgent 4、nvJitLinkShell 1，均通过。选择器、投影、概览及工作台另行在最终构建后重验。
- 临时环境验证裸 python 的子进程属于选中环境、模拟 Conda activate 确实执行、激活脚本执行且不能改掉当前 GPU/身份、原始失败退出码与用户库设置保留。无科研训练。
- 初次完整回归暴露 WSL 冷启动占满子进程预算。只读准备实测约 11948 ms，随后原登录测试约 249 ms。测试在 Linux 临时文件系统执行相同生成脚本，先准备 WSL，再进入测试计时；保留单文件 20 秒、Python 子进程 10 秒及脚本内 3 秒上限。未增加生产超时或删减登录输出断言。
- 修正要求“提交卡片必须是 running”的旧断言；本机提交操作仍可处于处理中，但 PLAN 卡片不能宣称任务已经运行。过时 Hub 源码断言更新为当前 Worker 准备流程，保留真实阶段回归。
- Python Agent/Scheduler/夹具语法、面板 vm.Script、辅助脚本语法与 git diff --check 通过。
- 未运行全仓库 npm test，不宣称所有历史测试通过。

## 发行与安装

验证源码提交：`10bea3d5686949c431fee08ed04841821c13626a`。普通快进推送并 fetch 核对 origin/master 一致。

稳定 Release：[v0.5.317](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.317)，绑定上述提交，非草稿、非预发行。VSIX 为 2811534 字节，SHA256 为 `56b213c286c02b23b6a5ac0c3698fff564e680b20a1f443761e2354086fd5eec`；VSIX 及同名校验文件已发布。

包内 360 个 dist 文件与最终验证构建字节一致，身份、运行闭包及敏感状态排除检查通过。已安装 0.5.316 的 ReleaseClient 可见更新，远端包、大小、清单、SHA256 和绑定提交逐项一致。SimpleSFTP 0.2.86 的发行包未变，无需重复安装。

仅执行一次 npm run install:latest，核对已安装 SimpleExperiment 0.5.317、SimpleSFTP 0.2.86 及 simpleex 入口。已安装生命周期、环境包装、状态摘要、面板和 Agent/Scheduler 与验证构建字节一致。

安装后停止当前面板/API 操作，等待 Developer: Reload Window。之后由用户通过插件更新 Worker Agent/Scheduler 到 0.5.317 并核对实际运行版本，再验收当前 PLAN。真实项目的环境激活和训练仍待实机核对；没有用本机通过冒充生产训练成功。
