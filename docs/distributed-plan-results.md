# 按 GPU 槽位运行独立 job

项目在 `experiments/simple_project.yaml` 设置顶层 `distributedResults: true` 后，匹配 `distributed.planPrefixes` 的正式 `runPlan` 使用持久化的本机 job 队列。默认匹配 `experiments/plans/comparison/`；其他 Plan 沿用整 Plan 调度。预演使用 Agent 校验返回的 job 清单及插件当前空卡快照，在本机调用与派发相同的分配器，不再重复启动远端 dry-run。实际派发前 Agent 仍重新核对显卡。

0.5.278 起，新任务默认采用正式 declared 路径；完整路径、来源证明、冲突规则、内存汇总及版本部署见 [正式 job 契约](formal-job-execution.md)。队列记录 PLAN revision、代码同步指纹、case、seed、globalJobId、Worker、GPU、commandId、状态及产物哈希。旧 attempt 仅供历史核验，不重新执行。派发沿用现有公平队列、并发上限及 GPU 原子槽位保护；状态不明不会自动重派，不同代码指纹的任务不同时运行。

每个新 job 直接使用 PLAN 的 `naming.sweep_dir/job_name` 与 `paper.result_csv`，不追加 attempts。已完成且归属、哈希均匹配的 job 可在 Worker 间镜像配置、权重、日志和独立结果；外置声明 CSV 单独按精确路径与所有者证明镜像。目标存在不同哈希则停止，不覆盖。旧 attempts 不自动移动、退休或清理。离线 Worker 保留待镜像状态；同步不执行目录删除。

结果汇总只经 SimpleSFTP 临时内存读取原始指标及 sidecar。仅生成的汇总表和必要的来源哈希记录保存到本机，原始文件不下载到 tmp 或结果缓存；没有磁盘兜底。已有缓存不自动删除。失败、不完整或不同 checkpoint 的 job 不进入正式指标。

每个 job 的独立输出目录必须至少包含一个 `.log` 文件；建议保存 `stdout.log` 和 `stderr.log`。插件同步并校验该目录中的日志。Agent 的 `tmp/tmux_logs/` 供运行时查看，属于各机器自己的状态，不能当作可镜像的 job 产物。

项目提供 `python -m <distributed.mergeModule> --manifest - --project-root <根目录> [--publish]`。清单通过标准输入传入，包含各 PLAN 的 expectedJobs、jobStates 及已完成 job。新 job 带 runId、globalJobId、commandId、PLAN revision、声明 CSV、输出目录、代码指纹及产物 SHA256；历史记录保留原 attempt 字段。为了兼容既有入口，仍附带配置、检查点、指标和四态片段的独立 SHA256。模块最后一行输出 JSON，含非空 outputPaths 相对路径数组。项目入口只使用当前清单内已核验的 job，不导入旧 seed，不将筛查结果自动发布成论文主表。原始 TensorBoard 独立保留；诊断身份使用稳定 run/job/command 字段。

## 新项目接入

在项目自己的 `experiments/simple_project.yaml` 中声明以下字段；插件只提供调度、清单、传输与验证，科学结果的含义和最终检验由项目模块负责：

```yaml
distributedResults: true
distributed:
  planPrefixes:
    - experiments/plans/formal/
  mergeModule: experiments.simple_adapter.distributed_results
  configPath: job_config.yaml
  checkpointPath: best_model.pth
  resultRowsPath: test_results/formal_result_rows.csv
  fourStatePath: test_results/four_state_metrics.csv
  fragmentPaths:
    - job_config.yaml
    - test_results/formal_result_rows.csv
    - test_results/four_state_metrics.csv
  requiredPaths:
    - job_config.yaml
    - best_model.pth
    - test_results/formal_result_rows.csv
    - test_results/four_state_metrics.csv
```

`fragmentPaths` 应只含较小且 job 结束后稳定的文件。`requiredPaths` 是正式发布前必须存在并完成哈希校验的文件；检查点必须列入。所有路径均相对 job 输出目录，不得为绝对路径或包含 `..`。`mergeModule` 必须是项目内可导入的 Python 模块名。项目测试应覆盖：重复回报的幂等性、缺失 seed/端点/检查点时拒绝正式发布、不同 Case 的 TensorBoard 不混合、并发完成后共享结果不丢行。未准备好独立片段和汇总模块的 Plan 不要放入 `planPrefixes`。

旧版本仍在运行时提交新代码版本，插件会保存待校验提交；旧版任务及结果同步结束后，重新核对本机代码指纹，按原提交目标同步代码、校验 Plan 并派发。排队期间再次改动本机代码会阻止自动提交，需重新提交 Plan 以固定新版本。不得绕过此保护手动上传代码到运行中的 Worker。
