# 0.5.318 交付记录

日期：2026-10-15。范围：任务 tmux 会话配置与精确窗口日志读取。生产侧仅通过当前 discovery/capabilities 进行主动只读查询，未停止、搬动、重跑任务，未更改 H20 环境或科研项目。

## 实际核对

当前插件及核对的 NWPU3、H20 Agent 均运行 0.5.317。六个任务窗口真实存在，却落在 simple-gpu-0、simple-gpu-1、simple-gpu-2，界面配置前缀为 zlk。NWPU3 三个任务已输出训练进度；H20 初次只有启动命令，后续三个窗口均出现训练和验证进度，三张卡各占约 15.6 GB 显存。不能以最初显存为零推断窗口不存在。

用户随后提供的文字 `[simple-adapter] Prefer environment nvJitLink over system CUDA` 来自消费项目 run_wrapper 的显式信息输出，表示将当前环境的 nvJitLink 目录置于库搜索路径前部，然后以同一解释器和参数重新进入包装入口。该行不是异常，不构成修复或重装环境的依据。启动前段耗时原因未定位；没有声称已修复环境性能问题或完整验证全部依赖。

## 修改与回归

- Host 的 sendDistributedJob 将当前规范 tmuxSessionPrefix 同时放入顶层请求和 options，覆盖自动、手动派发；独立 Scheduler 已有对应字段处理，后续窗口进入配置的 GPU 会话，现存窗口保留原位。
- Agent capture 路由接受完整匹配的 @数字原生窗口 ID，兼容原命名目标，保留参数数组执行与非法字符拒绝。精确日志读取不依赖可改名的窗口标题。
- 新断言先复现 Host 消息没有配置前缀、原 capture 返回 invalid window name；修复后真实 Host 消息传入隔离 tmux，自动和手动任务使用指定会话，同卡并发和精确停止正常。真实 capture 分支验证 ID、改名后读取及非法目标拒绝。
- npm run build 与最终 npm run package 通过，包含串行单文件回归、隔离真实 tmux、Windows 流程及运行闭包；额外 tmuxCaptureHistory 单文件 3 项通过。Python 语法由实际提取执行及生成流程验证，面板 vm.Script、git diff --check 通过。未运行全仓库 npm test。

## 发行与安装

验证源码提交：`05d7ba963c1c6a66a45ea24305a368beff193a9b`。普通快进推送后 fetch 确认与 origin/master 一致。

稳定 Release：[v0.5.318](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.318)，绑定上述提交，非草稿、非预发行。VSIX 为 2815357 字节，SHA256 为 `0ec6f20031da27aaba301b17799412ee2b58edc35e3b90f66411a95234166e77`；包和精确文件名的 SHA256 清单均已发布。包内 360 个 dist 文件逐一与构建字节一致，身份、运行闭包与敏感内容排除验证通过。

使用已安装 0.5.317 的真实 ReleaseClient 验证 Latest 可见更新，并重新获取远端 VSIX、清单，确认提交、版本、平台、大小、SHA256 与本机字节一致。SimpleSFTP 0.2.86 配套包复核一致，未重复安装。

仅执行一次 npm run install:latest，已核对 SimpleExperiment 0.5.318、SimpleSFTP 0.2.86、simpleex 入口及安装后的 Host、Agent、Scheduler 和 manifest 字节。安装后停止面板/API 操作，等待用户 Developer: Reload Window。用户通过插件更新远端 Agent/Scheduler 后，精确 ID 日志读取及后续任务使用指定会话仍须实机验收；没有自动部署远端。
