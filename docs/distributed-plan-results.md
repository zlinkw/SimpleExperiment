# 按 GPU 槽位运行独立 job

项目在 `experiments/simple_project.yaml` 设置 `adapterRules.distributedResults: true` 后，`experiments/plans/comparison/*.yaml` 的正式 `runPlan` 使用持久化的本机 job 队列。其他 Plan 沿用整 Plan 调度。

队列记录 Plan revision、代码同步指纹、Case、seed、attempt、Worker、GPU、命令 ID、状态以及产物哈希。派发先处理旧 Plan 的就绪 job；旧 Plan 的任务已运行或完成后，新 Plan 可占用空卡。Agent 在接受任务时重新检测 GPU 进程并原子保留槽位。状态不明的任务不会自动重派；用户在任务页点击恢复时，插件先向原 Worker 核实终止状态并保存已有产物，随后建立新 attempt。不同代码指纹的任务不同时运行。

每个 job 的输出使用 `原输出目录/attempts/<运行 ID>/`，重跑保留旧 attempt。运行时写入 `job_config.yaml`；项目适配器须在该目录写 `best_model.pth`、`test_results/formal_result_rows.csv`、`test_results/four_state_metrics.csv`，并保留原始 TensorBoard 事件与日志。正式指标行和四态行的列、唯一键、双测试端点及检查点关系由项目校验。插件用 SimpleSFTP 读取 SHA256 清单，先同步配置与两个小型结果片段以生成非正式预览，再同步权重、原始曲线、日志及其余文件，并逐目标校验内容；离线 Worker 保留待镜像状态。同步使用文件清单，不执行目录删除。

项目提供 `python -m experiments.simple_adapter.distributed_results --manifest - --project-root <根目录> --publish`。清单通过标准输入传入，包含各 Plan 的 `expectedJobs` 与已完成 job，后者含 Case、seed、attempt、输出目录及检查点、正式指标、四态片段的 SHA256。Agent 在一个已具备全部所需文件的 Worker 上调用项目入口。项目入口只从当前清单的已校验 attempt 重建共享表，最终表最后发布。未完成的 Plan 不进入正式汇总；旧实验记录不导入。生成文件随后按 SHA256 镜像到其他在线 Worker。各 Worker 的原始 TensorBoard 可在运行期间独立查看；完整 Case 的均值曲线在原始事件同步后由项目入口重建。

旧版本仍在运行时提交新代码版本，插件会保存待校验提交；旧版任务及结果同步结束后，重新核对本机代码指纹，按原提交目标同步代码、校验 Plan 并派发。排队期间再次改动本机代码会阻止自动提交，需重新提交 Plan 以固定新版本。不得绕过此保护手动上传代码到运行中的 Worker。
