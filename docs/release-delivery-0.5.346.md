# 0.5.346 修复原生重排身份复用与调度轮次冲突

## 现场及复现

从当前 discovery/capabilities 和只读 state 核实运行版本 0.5.345。现场同一时刻记录 `distributedPlanQueue` 与 `retryDistributedJob` 的旧快照写入冲突；多项任务仍由本轮查询显示 execution=missing，保留原 commandId。没有通过 API 重跑、停止、清理或部署远端。

本轮补齐此前遗漏的重排后链路，明确复现两项插件缺陷：

- `returnPulledJobToLocal` 清除了 commandId，却未建立新的 nextCommandId。分配器在相同 PLAN、job、Worker、GPU 上再次算出同一确定性 commandId，命中原 Scheduler 的取消围栏。清空字段不等于创建新执行身份。
- 单 job 重排已原子写入后仍等待下一次调度 tick；该 tick 若与旧轮次或另一窗口的队列更新冲突，同一异常会冒泡成“重跑失败”。本轮以合成场景复现，不将截图中的每个历史冲突都归为已经证明的同一原因。

## 修改及边界

- 显式撤出原请求并通过既有产物确认后，为该 job 产生一次新的随机 commandId 输入，写入 nextCommandId。重载、换卡与再次分配复用已保存输入，不再重复生成。旧 commandId 留在历史与取消围栏；旧请求不会被重放。
- 本机重排同时清除旧启动意图、tmux 绑定、日志投影及终态展示，保留声明路径、checkpoint 声明与历史日志位置。公共返回本机函数核对原 commandId，拒绝覆盖已经替换的当前任务。
- 重排用 mutateLatest 在串行/租约写事务内修改当前队列，只改目标 job。成功发布后递增本机调度轮次、取消并脱离旧 tick；旧轮次不能覆盖新输入，其他任务的当前有效观测继续保留。
- 本机重排提交与实际派发分开返回。按钮明确显示“已重新进入本机待派队列”；派发异常单独记录为派发待核实，不把已提交重排改成失败，也不宣称任务已经运行。
- 未放宽真正的其他窗口冲突保护、原 commandId 核对、服务器主动查询、旧请求取消、路径双确认或原子写门禁。离线/查询失败仍不能授权重跑。没有修改科研代码、环境、产物或远端调度协议，本修复只需重载本机插件。

## 验证

先复现缺少 nextCommandId、已保存重排仍抛出 tick 异常、控制提交未隔离旧轮次三项失败，再修复。回归覆盖相同 Worker/GPU、序列化重载后身份稳定、旧任务保护、无关任务进度保留、真实磁盘冲突不覆盖、已提交后的失败 tick、明确的按钮反馈。

真实隔离 tmux 合成任务验证原请求取消后晚到 POST 被拒绝，新 commandId 的同一声明 job 能在原路径真正启动、退出 0 并产生本次清单；没有运行科研任务。新增断言起初错误读取查询数组首项，改为按精确 commandId 选取目标后通过，未放宽生产逻辑或等待上限。测试启动中一次手动目标测试与尚未退出的 build 测试重叠；已等待全部结束后独立复验，最终交付只采纳后续完整串行门禁。

目标任务控制 4 项、重排/日志 Host 11 项、队列存储 14 项及隔离 tmux 3 项通过。最终 `npm run package` 完成 116 次串行单文件执行，778 项通过、零失败；另行串行运行的队列存储 14 项通过。最终日志为临时目录 `simpleex-0.5.346-package.log`。

TypeScript/build、额外 vm.Script 模块及 3 段实际渲染脚本、8 个 Python AST、运行闭包、ZIP、身份/版本/universal 平台、370 个 dist 文件逐字节比对和秘密排除均通过。包内本文为发行前快照，本次只补记交付，未重建或替换包。

## 已完成交付

- 源码提交 `7be451a706e34718dda7692e436cd0a819abe477` 已普通快进推送 origin/master，并 fetch 核对一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.346>。重新查询真实 Latest、tag 与绑定提交，确认 draft=false、prerelease=false。
- `simple-experiment-0.5.346.vsix`：2,978,233 字节；SHA256 `68d7880ec31fad6ad844dfbc12fa8bd98e968d9aae40c20245d1eab9a4350110`。逐包 `.vsix.sha256` 绑定精确文件名；公开资产大小、GitHub digest、下载内容与本机已验证包完全一致。
- 使用已安装 0.5.345 的更新客户端，真实解析公开 Latest 为 update_available，下载 VSIX/校验和并逐字节比对。SimpleSFTP 0.2.90 的公开配套包和指纹也核对一致，未重复安装；验证目录为临时目录 `simpleex-0346-release-verify-z2N5rr`。
- 显式执行一次 `npm run install:latest` 安装 0.5.346，无 force、无降级。VS Code 已安装版本、370 个 dist 文件字节、包身份和 simpleex 入口核对通过。安装后停止访问当前插件面板与 API。

实际界面点击仍待用户 Developer: Reload Window 后验收。本次没有新增远端协议要求，不需要为此修复重新部署 Agent/Scheduler；没有自动重跑、停止、清理或修改现有任务、环境与产物。若现场仍有真正的离线、源码变化或其他窗口冲突，保留明确错误，不以本机入队当作远端已经运行。
