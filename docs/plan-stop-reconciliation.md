# PLAN 中止与本机残留清理

## 0.5.316 修复范围

2026-10-15 通过当前 SimpleExperiment API 只读核对，运行版本为 0.5.315。`corim.yaml` 的中止先报 `TMUX_QUERY_FAILED: can't find pane: %23`，随后因没有旧 operationId 记录报 `missing-evidence`；`comparison_tuning/cpsc.yaml` 也有相同缺记录错误。未对生产任务执行停止、删除或重跑。

旧窗口查询先列 pane，再逐 pane 读取退出状态；用户或停止操作在两次读取之间关闭窗口，会使整个任务查询失败。现在 pane、归属、退出状态在同次 tmux 清单中取得。读取失败日志时窗口消失，只影响日志展示；真实 tmux 查询故障仍报告失败，不伪造停止完成。

本机队列和进度丢失时，从当前 Worker 查询中的原生窗口绑定找回停止目标，使用项目、Worker、commandId 和精确 windowId/paneId，不要求旧 Scheduler operationId、revision 或快照存在。名称不作为关闭依据。旧父操作不会替代实时任务，也不阻断其停止。

全部启用 Worker 的完整主动查询确认没有该 PLAN 的任务后，允许清除残留提示和旧进度。两次确认后再次查询；若任务出现、连接失败或本机新增队列，保留记录并要求重新核对。旧记录的 running 状态不能推翻当前窗口清单。查询不完整或协议未知不能当作“没有任务”。

明确选择只清除本机已结束历史时，移除对应本机操作载荷及旧状态查询缓存；不只是隐藏。其他 PLAN 的记录保留。小型取消身份仍用于阻止延迟请求重新启动同一任务，不能被用作远端运行状态。

## 边界

- 原生停止仍先撤出 Scheduler 并绑定原 commandId，再主动查询窗口关闭与取消事实；POST 返回、旧回执或旧任务文件都不是完成依据。
- 失联、未完成查询和真实归属冲突保持可重查状态，不关闭名称相似的窗口，不扫描或杀 PID。
- 本入口清除运行卡片、调度输入和旧操作状态；产物删除仍通过独立精确路径双确认流程。不会删除日志、权重、结果或科研配置。
- 自动同步、入口探针、全部 Worker 准备、输出目录创建与手动派发保持原有流程。

## 回归

`planStopClear.test.js` 覆盖缺历史后的重复清理、旧 running 操作、查询失败、确认期间断线，以及原生任务没有旧 operationId 时的精确停止。`terminalPlanHistory.test.js` 验证移除选中记录且保留其他 PLAN。`pulledTaskControl.test.js` 验证丢失停止响应、完整主动查询及失败保护。

`tmuxStopRace.fixture.py` 提取生产函数，在独立真实 tmux 中制造列窗口后立即关窗；`tmuxTaskLifecycle.test.js`、`localStopControl.test.js` 验证排队、停止和其他窗口保留。仅使用临时夹具和轻量 CPU 命令，不运行科研训练。

发行验证和安装状态另见对应交付记录。生产 Worker 必须通过插件更新 Agent/Scheduler 的实际运行版本后验收；不能以磁盘文件版本代替运行版本。
