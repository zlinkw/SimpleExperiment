# 正式 job 与内存汇总契约

适用版本：本 Windows 仓库的 SimpleExperiment 0.5.278。正式表示执行及保存方式，不代表结果满足论文证据要求。未核验 Mac 仓库 ad87dbd 或其 0.5.310 安装包，也未部署、探测生产 Hub/Worker。

## 新任务路径

`case/runner.result_path_policy`、PLAN 的 `runner.result_path_policy` / `result_path_policy`、项目 `experiments/simple_project.yaml` 的 `resultPathPolicy` 按顺序取值，缺省为 `declared`。显式旧 `attempt` 策略被拒绝，不静默回退。

新任务直接使用 `naming.sweep_dir` / `naming.job_name` 与 `paper.result_csv` 的渲染结果。命令 `{result_csv}` / `--result-csv`、配置 `paper.result_csv`、`test.results_csv`、`runtime.result_csv`、收集路径必须一致。`runtime.result_path_contract` 保存：

```yaml
schemaVersion: 1
policy: declared
declared_output_dir: work_dirs/formal/case/seed42
execution_output_dir: work_dirs/formal/case/seed42
declared_result_csv: tmp/result/formal/case/seed42/metrics.csv
execution_result_csv: tmp/result/formal/case/seed42/metrics.csv
collection_result_csv: tmp/result/formal/case/seed42/metrics.csv
```

仍需先 validate/dryRun，再正式提交。项目的纯 `adapter.resultPathValidator` 接收实际配置及契约；预检不创建 preview attempt。拒绝共享 CSV、越界及链接路径、当前命令与配置不一致、过期 PLAN revision。正式 PLAN 使用 `tmp/result/` 合法，目录名中的 `tmp` 不触发草稿流程。旧 `tmp/plan/` 与 debug 隔离执行明确报 `DRAFT_EXECUTION_RETIRED`。

本机队列、Scheduler、Worker 入队、派发、失败重跑/召回、镜像和结果收集使用同一正式路径。三种执行模式 `train`、`test`、`train_test` 来自已核验 PLAN；`train` 不执行显式测试命令或默认 `test.py`。新运行使用 workflow/runId、globalJobId、commandId、PLAN/代码/配置/源资产及文件 SHA256 核验身份。内部旧 schema 的零值仅用于兼容匹配，不递增、不生成新 attempt ID；新持久队列、Worker 公共任务和汇总来源记录省略该零值。

## 并发、重入与已有权重

每个正式目录持久保存 `.formal_job.lock` 和 `formal_job_owner.json`。预检只读，运行时使用非阻塞文件锁并重新核验；活动目录或 CSV 已有其他写入者时报 `FORMAL_JOB_ACTIVE_WRITER`。重复 commandId 必须绑定相同 job、PLAN revision、执行模式、目录和 CSV。同一已完成身份且产物哈希均匹配时只返回完成证据，不启动任务。

新 commandId 面对已有结果、权重、失败残留或不同所有者时报 `FORMAL_JOB_CONFLICT`。重跑不加时间戳目录、不覆盖、不自动移走原文件。用户须自行发起独立清理或显式修改正式 case/job；尚未启动且有精确释放回执的任务可召回同一目录本机排队。旧 attempts 仅只读展示、核验和收集，不能恢复执行或自动迁移。

同一 job 的 train→test 可使用已核验的本 job checkpoint、最终训练配置及完成证据；测试失败保留训练完成证据。显式 resume 或另一个只测试 job 需要精确声明来源，例如：

```yaml
runtime:
  checkpoint_source:
    checkpoint_path: work_dirs/formal/source/seed42/best_model.pth
    checkpoint_sha256: <文件SHA256>
    config_path: work_dirs/formal/source/seed42/job_config.yaml
    config_sha256: <最终配置SHA256>
    plan_file: experiments/plans/formal/source.yaml
    plan_revision: <来源PLAN文件SHA256>
    code_fingerprint: <来源代码指纹>
test:
  checkpoint: work_dirs/formal/source/seed42/best_model.pth
```

resume 的配置/命令也必须指向同一个已核验 checkpoint。核对训练配置、seed/患者划分、来源 PLAN 和代码；代码同步指纹变化时仅允许最终快照内的源码 SHA256 与当前实际源码一致的明确来源证明。没有证据就阻断，不自动采用目录内任意权重。不修改 MultiModal 的模型、训练预算、划分、五指标、selection_only 或科学选择规则。

## 结果仅读入内存

“下载指标并重新汇总”“同步服务器结果并更新总表”和远端单文件查看均要求当前 SimpleSFTP `sync.downloadMappedPaths` 公布 `memoryOnly=true`、`memoryWrapperResults=true`。所有 wrapper 格式均内存接收，没有磁盘下载兜底。能力缺失明确失败，保留已有汇总。

原始 CSV/TSV/JSONL、配置快照、manifest、原始 sidecar 不写入本机 `tmp/` 或结果下载缓存。SHA256、文件大小、作业/命令/PLAN/权重归属与四态完整性仍核验。文本查看打开未保存文档；二进制只展示大小和哈希。流程结束不保留原始字节。

允许保存生成的 dataset/method/final 汇总表、每 PLAN 汇总 JSON，以及必要的来源路径/哈希/大小/任务身份。汇总 JSON 只保存指标汇总与格式/行列计数及来源证据，不保存原始文件内容或原始逐行副本。再次同步重新内存读取；“刷新本地结果”可从已保存汇总重建，不需要原始下载缓存。相同 writer 的来源哈希变化或输入不完整时保留之前的完整表，不借用旧 seed。

已有本机原始副本、旧 attempts、结果、日志和权重保持原字节；本次不自动清理。独立清理入口继续遵守精确预览、人工确认和双确认永久删除边界。

## 协议与部署

- Host/Hub/Worker 使用 schema 1、formal job path protocol 1；Agent 的 `declaredJobPaths` 能力还核对安装的 Scheduler 协议标记及与 Agent 相同的 runtime 版本。
- 旧 Agent/Scheduler 在正式提交或实际消息入队前报 `WORKER_PROTOCOL_INCOMPATIBLE`，不能延迟到训练进程才发现。不假定只有升级本机扩展就升级远端。
- `drafts.list/validate/promotionPreview` 保留历史只读接口；实际 `drafts.promote` 路由明确退休，debug 新执行也阻断。现有独立人工审核/清理入口保留。
- Windows 安装 0.5.278 后执行 Developer: Reload Window。之后用户显式更新 Hub 及每个 Worker 的配套 Scheduler/Agent 到 0.5.278，并通过 live discovery/capabilities/OpenAPI 核验，再 validate/dryRun。当前正在训练的任务不重启。
- 本次没有调用研究项目 API、上传、服务器部署、GPU 调度、训练、重跑或清理。Mac 安装/部署与真实 Worker/UI 验收未执行；不能将 Windows 验证结果替代 Mac 0.5.310 的核验。

## 本地验证

每个测试文件串行使用 `node --test --test-force-exit --test-timeout 20000 <文件>`，Python 只 AST 提取被测生产函数，子进程上限 10 秒。使用保留的独立系统临时夹具、mock 多 Worker；没有执行清理器。

| 测试文件（test/features/） | 覆盖 |
| --- | --- |
| formalJobExecution.test.js | 真实 Scheduler/Agent 消息、正式目录锁/哈希冲突、checkpoint 来源、三种子本机/分布式路径、幂等、释放/召回、旧记录只读、TensorBoard/新适配器稳定身份 |
| planResultPathContract.test.js | MultiModal 七个实际 PLAN、实际 experiments/quality_paths.py 纯接口、命令/配置快照/manifest 同路径、零副作用预检、并发 CSV 隔离及旧缓存拒绝 |
| distributedPlanExecutionMode.test.js / planRunModeWorkflow.test.js | train/test/train_test 保存、恢复、派发及不重启活动记录；train 不测试 |
| planRunFreshness.test.js / planArtifactSyncStatus.test.js | 历史结果只读核验、当前身份/SHA256、跨 Worker 镜像及离线状态 |
| wrapperResultPersistence.test.js | 正式 declared/历史重试汇总、所有格式内存读取、零原始缓存、只存汇总、哈希变化/四态不完整拒绝、汇总事务回滚 |
| remoteResultInspectionWorkflow.test.js | 确认后的内存单文件查看、tmp/result 允许而 tmp/plan/cache 拒绝、来源隔离 |
| planOutputRetention.test.js | 自动退休关闭，人工清理双确认和原父目录安全门禁保留 |

构建另运行 14 项 Webview/清理消息桥测试及语法门禁，额外对 `dist/ui/PanelHtml.js` 运行 `vm.Script`。没有执行全套测试、真实训练、生产服务器检查、UI 点击验收或 Mac 验收。

## 0.5.279 启动前拒绝回执

`FORMAL_JOB_CONFLICT` 等启动前预检失败现在持久保存完整 job 身份、错误码、精确输出/结果路径、结束时间和 `neverStartedEvidence: formal_preflight_rejected`，返回 `failed`、`durableAccepted: false`、`admissionRejected: true`。首次派发、原 commandId 核查和重载后的 Worker 快照使用同一证据；不会将拒绝误报为持久接收，也不会一直显示待核实或自动重派。已接收的排队 job 在实际启动前发生路径冲突时也终止报错，代码同步等待仍保留原机制。

只有完整且匹配的 Worker 回执可以终结待核实。普通 HTTP 错误、丢失回执、身份不一致继续保留原 owner。若 durable 行丢失而执行快照或 formal owner 仍证明该 command 曾执行，禁止伪造未启动证据。GPU 繁忙仍返回本机等待，不计为预检失败。界面显示训练未启动，禁止跳转到不存在的 TMUX 日志；已有权重、日志、结果和历史 attempts 保留，路径冲突仍需用户显式处理或修改正式 job 声明。

需要 Windows 扩展与对应 Worker 的 Scheduler/Agent 一起更新到 0.5.279。本轮只读核验了 MultiModal 的本机状态及 Worker 回传快照，未部署 Worker、重启训练或清理目录。`preflightDispatchRejection.test.js` 回放提取的生产 Scheduler、Agent action、Host tick 和持久队列，覆盖首次拒绝、旧 unknown、重复提交、丢失响应、外来/不完整证据、GPU 繁忙和排队后冲突。
