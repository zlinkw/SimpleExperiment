# 0.5.322 交付记录

## 发行与安装

- 验证源码提交：`98fe4ecdce15682821e5b55249e637831cee5618`。已普通推送至 origin/master，并 fetch 确认一致。
- 稳定发行：https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.322 。非 draft/prerelease，绑定上述提交。
- VSIX：`simple-experiment-0.5.322.vsix`，2,839,874 字节。
- SHA256：`f95342c071e63d8dff6c5064ed39382fa91be8b6151197a6f4616fb6c09dc64a`。同名 `.vsix.sha256` 绑定精确文件名，已上传发行源。
- 通过已安装 0.5.321 的实际 ReleaseClient 读取 Latest，确认可见更新；重新下载发行 VSIX 与校验文件，核对字节、哈希及 manifest。配套 SimpleSFTP 0.2.88 的发行资产再次核验，本轮未修改或重复安装。
- 全部验证后仅执行一次 `npm run install:latest`，确认已安装 SimpleExperiment 0.5.322、SimpleSFTP 0.2.88 及 simpleex 入口。安装后的显存调度、队列、Host、面板、Agent 与 Scheduler 文件逐项核对一致。安装后未继续操作当前插件面板或 API。

## 实现

- `src/features/GpuMemoryScheduling.ts`：共用容量、容差、额外上限、保留显存和槽位计算。默认每 24 GiB 一个自动任务，24/48/80/96 GiB 对应 1/2/3/4 个；未知容量保留原单卡单任务。
- `src/features/DistributedPlanQueue.ts` 与 Host：保留重复 GPU 槽位，预派发按份额计权，正在启动的任务计入数量，maxConcurrentGpus 继续限制物理卡数。手动派发规则保持不变。
- `src/runtime/TmuxTaskLifecycle.ts`：Scheduler 根据实际 tmux 窗口重建自动任务占用，同卡逐个准入，同时检查实际空闲显存与跨轮询份额；不新增服务器任务状态文件。
- Agent 与正在运行的 Scheduler 分别声明能力，客户端同时核对，旧运行控制进程保持原单任务规则；新共享请求遇旧控制进程明确拒绝，避免静默丢弃参数。
- 面板、VS Code 设置、Worker 规范化与保存链路贯通五个参数；Worker 留空继承全局，显式 false 与 0 正确保留。配置说明见 `docs/gpu-memory-ratio-scheduling.md`。

## 验证

- 最终 `npm run package` 退出码 0，串行单文件必需回归共 610/610 通过；包括构建、类型检查、面板脚本、Python/runtime、Windows 流程及 VSIX 模块闭包门禁。
- 新增实际 Host 消息、配置保存、实际渲染表单、继承、比例舍入、保留显存和预派发权重测试。额外配置输入边界单文件 7/7 通过。
- 真实隔离 tmux 使用合成 96 GiB 遥测与轻量 CPU 任务，验证同卡四任务并行、第五任务排队、旧控制进程能力门禁、控制进程重启与释放名额后继续调度。未运行科研训练。
- `vm.Script`、`git diff --check`、VSIX 秘密排除检查通过；361 个 dist 文件逐项匹配，244 个本地运行模块闭包验证通过。
- 开发中补充了跨轮询启动份额检查，最终重新完整打包验证，发行内容包含该修正。
- 额外可选的 `distributedPlanExecutionMode.test.js` 在当前实现及基线 `9615c152` 已提交编译文件下均为 3 通过、6 失败，原因包含旧夹具缺少 vscode 和方法抽取语法问题；不属于本轮 package 门禁，未计为通过，未为迎合旧夹具修改生产行为。
- 原有 pycache、迁移脚本、旧包校验文件等工作区内容未纳入提交或清理。

## 待实机验收

用户执行 Developer: Reload Window，通过插件更新远端 Agent 与 Scheduler 至 0.5.322 后，验证实际 GPU 共享准入。更新磁盘 runtime 不代表独立 Scheduler 控制进程已经更新；可只中断项目的 queue 控制标签并保留窗口，再使用既有恢复路径，具体见配置文档。不能关闭包含排队任务的整个 Scheduler 会话。

开发未部署生产服务器、训练、同步生产项目或删除真实产物。显存比例是准入估计，项目实际显存峰值仍可能变化；真实 H20 负载和重载后的插件界面尚待用户验收。
