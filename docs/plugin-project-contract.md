# SimpleExperiment / SimpleSFTP 项目对接硬性契约

本文档是研究项目接入两个插件的规范。新建或修改研究项目前必须先阅读本文；项目内的 `docs/project-constraints.md` 可以追加约束，但不能放宽本文要求。

## 版本与运行边界

- SimpleExperiment 必须 `>= 0.3.7`，SimpleSFTP 必须 `>= 0.2.4`。
- 所有实验提交、文件传输和远端操作必须通过本机插件 API；禁止用 `scp`、`rsync`、临时 SSH 或手写脚本绕过插件。
- 一个 VS Code 窗口只打开一个研究项目根目录。多根工作区会阻断项目接入、路径确认和远端副作用。
- 项目根目录名会作为远端项目名参与路径拼接，应使用稳定、不含空格的名称。

## 推荐项目结构

```text
project/
  README.md
  requirements.txt 或 environment.yml
  train.py
  test.py
  configs/
    base.yaml
    <case>.yaml
  models/
  data/
  trainers/
  metrics/
  utils/
  experiments/
    plans/
      smoke.yaml
      main.yaml
    zlk_project.yaml
    zlk_adapter/
      result_writer.py
      run_wrapper.py
      collect_results.py
      console_parser.py
      factory_hooks.py
    results/
  work_dirs/
  paper/
    claims.md
  tests/
  tools/
```

硬性要求：

- 核心逻辑放入 `configs/`、`data/`、`models/`、`trainers/`、`metrics/`、`losses/`、`optimizers/`、`utils/`、`comparison_methods/`、`experiments/`、`tools/` 等模块目录。
- 顶层只保留轻量入口，例如 `train.py`、`test.py`；不要新增一次性脚本作为正式训练入口。
- 新项目的适配器固定放在 `experiments/zlk_adapter/`；旧项目中已有 `zlk_adapter/` 只作兼容，不应继续扩散。
- 大型数据集、checkpoint、权重、缓存、虚拟环境和日志不应依赖代码同步上传；应加入 Git 和 SimpleSFTP 忽略范围。
- 项目内不得写入明文密码、token、私钥或内网地址清单。

## 实验配置

- 每个正式 Plan 必须有真实的基础配置文件，推荐放在 `configs/`。
- 配置必须可序列化为本次运行的快照；运行差异优先通过 Plan 的 `overrides` 表达。
- 随机种子必须显式声明并进入结果记录。
- 依赖必须由 `requirements.txt`、`environment.yml`、`pyproject.toml` 或等价锁文件声明。
- 远端 Python 环境必须能导入项目入口和输出接口所需依赖；TensorBoard 路线还必须能导入 `tensorboard`。

## Plan 契约

Plan 只能放在 `experiments/plans/**/*.yaml`，归档版本不得与活动 Plan 混放。推荐骨架：

```yaml
suite: baseline
mode: train_test
base_config: configs/base.yaml
seeds: [0, 1, 2]
naming:
  sweep_dir: work_dirs/baseline
  job_name: "{index}_{case}_seed{seed}"
paper:
  result_csv: "{output_dir}/metrics_summary.csv"
runner:
  train_command: "python train.py --config {config} --output-dir {output_dir} --seed {seed}"
  test_command: "python test.py --config {config} --output-dir {output_dir} --result-csv {result_csv}"
expectedResults:
  - "{output_dir}/metrics_summary.csv"
cases:
  - case: public
    overrides:
      dataset.split: public
```

硬性要求：

- `suite` 在活动 Plan 中保持稳定且唯一。
- `mode` 必须显式为 `train_test`、`train` 或 `test`。
- `seeds` 不能为空；只跑一次也写 `seeds: [0]`。
- 所选模式需要的入口命令必须有值：`train_test` 需要 `runner.train_command` 和 `runner.test_command`，`train` 需要训练命令，`test` 需要测试命令。
- 结果路径必须是项目内相对路径，扩展名为 `.csv`、`.json`、`.txt`、`.log` 或 `.out`。
- 推荐 `paper.result_csv: "{output_dir}/metrics_summary.csv"`，并在 `expectedResults` 中声明同一文件。
- 不同 case 和 seed 不得写同一个结果文件；共享 CSV 会破坏并发、归档和统计配对。
- 注释里的路径不算输出证据。
- 命令模板只能使用插件支持的变量，例如 `{config}`、`{config_path}`、`{suite}`、`{case}`、`{seed}`、`{index}`、`{output_dir}`、`{result_csv}`、`{worker_id}`、`{gpu_ids}` 和 `{plan_file}`。
- 命令不得要求交互输入；长命令可用引号或多行书写，但必须可被 Scheduler 渲染。

## 输出接口预检

Scheduler 会在 validate-plan 和 dry-run-plan 阶段检查“代码真的会产出可解析结果”。至少满足以下一种通道：

### 通道 A：run_wrapper（推荐）

- `experiments/zlk_project.yaml` 配置 `adapter.runWrapper` 指向已存在的 `experiments/zlk_adapter/run_wrapper.py`。
- 使用插件生成的 wrapper 包裹训练/测试命令，捕获 stdout/stderr，并生成标准结果和快照。
- 自定义 wrapper 也必须在命令结束后生成 `metrics_summary.csv`、`env_snapshot.json` 和 `config_snapshot.yaml`。

### 通道 B：显式 adapter 调用

- 被选中的 `train.py`、`test.py` 或命令中的 `.py` 入口直接调用 `collect_outputs(...)` 或 `write_metrics_summary(...)`。
- 只 import 不调用不算通过；把调用藏在未被入口执行的分支也不算可靠实现。
- 调用时必须传入 experiment、suite、method、dataset、split、seed 等上下文。

### 通道 C：TensorBoard scalar

- 入口使用 TensorBoard `SummaryWriter` 或等价 writer 写 scalar。
- 远端环境必须能导入 `tensorboard`。
- 任务成功后 Scheduler 会读取每个 tag 的最终 scalar，转换成 Plan 声明的标准 CSV，并补齐配置和环境快照。

以下情况不能视为有效输出接口：

- 只在 Plan 中声明 `result_csv`、`output_dir` 或 `expectedResults`。
- 只有注释、README 说明或未执行的帮助函数。
- 只生成状态 JSON、manifest、jobs.csv 或没有数值指标的文本。
- 输出到项目外绝对路径，或多个任务覆盖同一个文件。

## 标准结果契约

首选 `metrics_summary.csv` 长表，一行一个指标。完整推荐列：

```text
experiment_id,attempt_id,study_id,plan_id,suite,method,dataset,split,fold,seed,metric,value,unit,higher_is_better,epoch,step,timestamp
```

必填列：

```text
experiment_id,suite,method,dataset,split,seed,metric,value
```

硬性要求：

- `value` 必须是有限数值；不得写 `NaN`、`Infinity` 或空字符串。
- 同一指标的不同 split、seed 或 method 分别成行。
- 文件使用 UTF-8，首行为表头；CSV 列名可通过 `csvColumnMapping` 兼容映射。
- 可选的 `metrics_case.csv` 用于病例级或样本级分析，必填列为 `experiment_id,case_id,dataset,split,method`。
- 每个任务目录必须有 `env_snapshot.json` 和 `config_snapshot.yaml`。
- `artifact_manifest.json` 推荐提供；大权重和数据集只记录路径，不默认同步回本机。

## zlk_project.yaml

`experiments/zlk_project.yaml` 是项目级接口契约，必须随 Git 提交。推荐字段：

```yaml
projectName: my_project
taskType: classification
primaryMetric: AUC
secondaryMetrics:
  - accuracy
  - F1
adapter:
  package: experiments.zlk_adapter
  resultWriter: experiments/zlk_adapter/result_writer.py
  runWrapper: experiments/zlk_adapter/run_wrapper.py
entrypoints:
  trainCommandTemplate: "python train.py --config {config} --output-dir {output_dir}"
  testCommandTemplate: "python test.py --config {config} --output-dir {output_dir} --result-csv {result_csv}"
outputs:
  summaryCsv: metrics_summary.csv
  caseCsv: metrics_case.csv
  consoleLogs:
    - stdout.log
    - stderr.log
  textLogs:
    - summary.txt
  candidateCsv:
    - "{output_dir}/metrics_summary.csv"
  candidateJson:
    - "{output_dir}/metrics.json"
  csvColumnMapping:
    metric: metric
    value: value
  metricAliases:
    acc: accuracy
    val_auc: AUC
  tensorboardLogDirs:
    - "{output_dir}"
```

硬性要求：

- `runWrapper` 必须指向项目内存在的相对路径。
- 候选路径必须落在允许的结果目录内，不能包含 `..` 或绝对路径。
- `candidateCsv`、`candidateJson`、`consoleLogs`、`textLogs` 的扩展名必须可解析。
- 指标别名最终应映射到项目声明的主指标或次指标。

允许的结果根包括 `work_dirs/`、`outputs/`、`runs/`、`logs/`、`results/`、`test_results/`、`lightning_logs/`、`custom_results/`、`reports/`、`artifacts/`、`evals/`、`evaluation/`、`predictions/`、`submissions/`、`experiments/results/`、`experiments/runs/`，以及 `zlk_cluster/results/`、`zlk_cluster/logs/` 等受管目录。新实验优先使用 `work_dirs/<suite>/<case>_seed<seed>/`。

## Xshell 与 SimpleSFTP

- 先在 Xshell 中创建并验证会话；如使用 OpenSSH 别名，也必须在 `%USERPROFILE%\.ssh\config` 中配置正确。
- 插件优先使用已验证的 SSH/Xshell 别名；字面 IP 只作为 `networkHost` 诊断或无别名时回退。
- 本地转发 Source 和目标必须都是 `127.0.0.1`；插件不建立裸 IP 直连。
- NWPU3 的项目父目录固定为 `/data/qgking/zlk`；禁止 `/root/disk1/qgking/zlk`。
- 所有服务器通信和文件传输必须通过 SimpleExperiment/SimpleSFTP API。
- 上传、下载、删除和远端写入前必须向用户展示精确本地路径、服务器、端口和远端路径；只有人工确认后才传 `confirm: true` 或 `pathConfirmed: true`。
- 显式 `server` profile 加 `remotePath` 是稳定调用方式；不应要求项目依赖 `.vscode/sftp.json`。
- 默认代码同步会忽略数据集、checkpoint、权重、日志、结果、缓存和虚拟环境；不要假设这些内容会随工作区上传。
- 上传有连接超时、整体超时和取消按钮；长时间传输应通过 `transfers.list` 检查并用 `transfers.cancel` 停止。

## 拓扑模式

- `single_worker`：恰好一个 Worker，本机调度和保存。
- `worker_pool`：至少两个 Worker，各自独立分片调度和保存；不使用 Hub，不做跨节点备份。
- `hub_worker`：Hub 全局调度，Worker 执行，Hub 汇总状态。

Hub 是否可用始终由用户配置决定；不可用时必须手动切换到 Worker 模式，禁止自动降级。未选择 Hub 时只能选择仅 Worker 模式。

## Debug 与正式运行

- 首次接入或调试用 `debugMode: true`。
- Debug 输出隔离在 `zlk_cluster/debug_runs/`，不能归档，也不能进入质量门禁、统计、论文证据或 PPT。
- 正式运行必须经过人工审核的精确预览，然后由 `workflow.run` 或既有 `runPlan` 路线提交。
- 运行后先解析完整预览，人工筛除不良结果并归档；质量门禁、统计、论文表、claim 证据和 PPT 只读最终归档结果。

## 开发前检查清单

1. 已读本契约和项目内 `docs/project-constraints.md`。
2. 已运行 `simple-experiment self-check` 和 `simple-sftp-api self-check`，并读取 discovery/capabilities。
3. 项目只有一个根目录，核心代码和配置位于规定目录。
4. 已有真实 `configs/*.yaml` 和 `experiments/plans/*.yaml`。
5. 已选择 wrapper、显式 adapter 调用或 TensorBoard 三者之一，并在代码中落实。
6. Plan 的 mode、seeds、cases、commands 和 per-job 结果路径完整。
7. `experiments/zlk_project.yaml` 与实际代码一致。
8. 数据、权重、缓存和密钥不会进入 Git 或默认代码同步。
9. `plan.validate` 和 dry-run 通过；所有结构化 `missing` 已修复。
10. 正式提交目标、拓扑和远端路径已经过人工确认。
