# 0.5.446 试行交付

基于最新试行版 0.5.445（`3f52688c43d67cf5cb9dbb5e29243c2d58e6c5b5`），独立分支 `codex/trial-live-review-20261030`。用户确认四项全部修复。权威版仍为 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117；[release-policy.json](release-policy.json) 未改，继续 Prerelease、latest=false，不自动提升权威版。

## 修改范围与保护

1. 结果读取按实际接收文件关联的逻辑 job 保存归属，其他 job 正常开始运行不再取消查询。实际读取目标出现新 commandId、Worker、版本身份或声明路径变化，仍取消旧请求。工作区、服务器、PLAN 文件与用户取消保护保留；不从历史或队列补指标。
2. CLI 的 results.list/tasks.dispatch 不再被客户端固定 15 秒截止打断，直接等待同一请求的实际回执。身份握手与普通状态查询继续有界；结果服务原有声明/产物预算、只读 120 秒无进展保护以及不自动重发规则保留，没有扩大到其他方法。
3. 手动及批量派发只在等待用户产物确认时暂时释放全局调度门禁。所选 job 保留 preparing 预约，自动分配仍排除这些 job，其他任务可以按原预算和并行配额运行。确认返回后重新取得提交门禁、等待既有轮次结束并核实身份；队列事务读取最新快照，保留其他任务新完成证据。拒绝并发重复审核；原路径确认、同步、全 Worker 校验、产物隔离和双确认流程不减少。
4. show/export 优先精确结果 ID。运行别名只在唯一匹配时兼容，多行返回 RESULT_SELECTION_AMBIGUOUS 与候选精确 ID/种子/维度；不会静默导出第一行或覆盖原导出。

批量审核的本地预约在正常取消/失败后只清理本批标记。重载留下的批量预约可以由原“剩余 job 入服务器队列”入口显式完整重审；取消重审保留原预约，不凭旧确认自动启动。该恢复不处理已完成、已运行或其他意图身份。

README、配置说明与 CLI 输出说明同步更新。显存/OOM、并行准入、已确认完成事实及产物安全模块未改，低流量仍严格手动刷新。远端 runtime 生成物仅版本常量更新；未部署 Agent/Scheduler，未运行科研任务、连接训练服务器传输或清理产物。原目录与既有工作副本保留。

## 本轮验证与原始失败

- 必要编译 `npm run compile -- --max-parallel 1` 退出 0，最新记录 `simple_cluster/reports/test-workflow/2026-10-30T03-50-44-512Z-88136-compile/`。
- 定向检查全部按单文件 `node --test --test-force-exit --test-timeout 20000` 顺序执行：serverQueueDispatch 13 用例、freshResultHost 25 用例、manualDispatchHost 10 用例、simpleCli 18 用例、simpleCliControl 4 用例最终通过。Control 文件为本轮额外定向检查，未把它伪称为最终清单自动覆盖。没有新增性能压测、性能阈值、测试文件或修改既有超时。
- 初轮 serverQueueDispatch 11 通过、1 失败：外部任务身份变化时，本批 preparing 标记未释放。修正为只根据本批精确 batchId 和 preparing 阶段解除自己的标记，不覆盖外部新状态，完整文件随后通过。补重载恢复断言时另有 12 通过、1 失败，原因是新增测试把 gpuSlots 误写为对象；改为实际数组协议并用真实 allocateAvailable 检查“其他任务可派、所选任务不派”，完整文件 13 用例通过。
- 初轮 simpleCliControl 3 通过、1 失败：旧控制夹具的显式 workspace 缺少实例登记，实际握手找不到目标。只补该夹具的 workspace、独立实例记录，未改变运行路由或放宽断言；完整文件 4 用例通过。上述真实失败与堆栈保留在本会话原始工具输出，不以最终绿灯覆盖。
- 最终 `npm run package -- --max-parallel 1` 退出 0：318 个规定作业全部通过，按需未运行文件为 0，maxObservedConcurrent=1。包含 build 域的语法门禁及完整规定回归；输入、清单、日志、包指纹和真实退出码见 `simple_cluster/reports/test-workflow/2026-10-30T03-51-39-320Z-77604-package/run.json` 及同目录。总耗时 681028 毫秒，完整检查 670157 毫秒。编译复用原生增量缓存，组装消费同一已验证输出。
- `npm run verify:package-runtime` 通过：311 模块、2 入口。精确 VSIX 清单检查通过：361 项，泄漏、缺失资源及 README 违规均为 0。
- vm.Script 对编译面板模块与真实渲染的 3 段脚本检查通过，git diff --check 通过。未把重载后 UI 或真实科研任务流程记为已验收。

## 精确包与发行边界

资产 `simple-experiment-0.5.446.vsix`，2769730 字节，universal，扩展 `simple-local.simple-experiment`，engine `^1.100.0`，本机 VS Code 1.144.0 x64。

SHA256：`ac86c0f5dee5b3ef34932daa57c3bdd96c19dc8a45d0dd96360dd6bc11cff66f`。同名 `.vsix.sha256` 绑定精确文件名。

试行地址：[v0.5.446](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.446)。提交并普通 fast-forward 推送后，发行绑定本次提交和以上同一 VSIX/SHA256；实际下载比较字节、核对 tag/提交/资产并通过真实更新客户端确认权威 Latest 仍为 0.5.440 / 0.2.117，且不对试行版推送降级。历史资产不覆盖。

全部发行验证结束后仅安装上述同一包一次，不 force、不降级；立即核对安装版本和 simpleex，之后等待用户 Developer: Reload Window。各阶段以实际命令及验证回执为准，失败须单独说明；本文件不是未执行环节的成功回执。远端部署和权威版提升不在本轮执行范围。
