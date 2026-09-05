# SimpleExperiment / SimpleSFTP 项目对接硬性契约

本文档是研究项目接入两个插件的规范。新建或修改研究项目前必须先阅读本文；项目内的 `docs/project-constraints.md` 可以追加约束，但不能放宽本文要求。

## 版本与运行边界

- SimpleExperiment 必须 `>= 0.4.2`，SimpleSFTP 必须 `>= 0.2.4`。
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
    simple_project.yaml
    simple_adapter/
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
- 新项目的适配器固定放在 `experiments/simple_adapter/`；旧项目中的 `experiments/zlk_adapter/` 必须先等价迁移到 `experiments/simple_adapter/`，不要继续扩散旧目录。
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
- 命令形态向 MultiModal 对齐：train 仅传 `--output-dir`（不直接写大表），test 双写 `--output-dir {output_dir} --result-csv {result_csv}`（per-job 双 csv + 追加最终大表 `experiments/results/<method>.csv`）。
- 每 job 固定产出 `metrics_summary.csv` + `metrics_case.csv`（双 csv），外加 `stdout.log` + `stderr.log`（双 log）；最终大表为 `experiments/results/<method>.csv`（按实验类型命名，如 `baseline.csv`）。
- 试探/调试输出先落 `tmp/` 试探区，确认后再进入上述标准路径；`tmp/` 不进入归档、统计与论文证据。
- 结果路径必须是项目内相对路径，扩展名为 `.csv`、`.json`、`.txt`、`.log` 或 `.out`。
- 推荐 `paper.result_csv: "{output_dir}/metrics_summary.csv"`，并在 `expectedResults` 中声明同一文件。
- 不同 case 和 seed 不得写同一个结果文件；共享 CSV 会破坏并发、归档和统计配对。
- 注释里的路径不算输出证据。
- 命令模板只能使用插件支持的变量，白名单（Plan `runner.*_command` 与 `simple_project.entrypoints.*Template` 通用，Scheduler 渲染，未列变量不渲染）：`{config}`、`{config_path}`、`{suite}`、`{case}`、`{seed}`、`{index}`、`{output_dir}`（别名 `{outputDir}`）、`{result_csv}`（别名 `{resultCsv}`）、`{worker_id}`、`{gpu_ids}`、`{plan_file}`、`{job_name}`、`{experiment_name}`、`{python}`（Python 解释器占位，由执行环境解析为 `python`/`conda run -n <env> python` 等）、`{checkpoint}`（test 从 checkpoint 评估时的权重路径占位）。
- 命令不得要求交互输入；长命令可用引号或多行书写，但必须可被 Scheduler 渲染。

### Plan 字段表（类型-必填-默认-示例）

| 字段 | 类型 | 必填 | 默认 | 示例/说明 | 错误行为 |
|---|---|---|---|---|---|
| `suite` | string | 是 | 无（缺省按 Plan 文件名 slug） | `suite: baseline`；活动 Plan 内唯一稳定 | 缺省自动派生，不阻断但归档易混 |
| `mode` | enum `train_test\|train\|test` | 是 | 无 | `mode: train_test` | 非三值阻断 |
| `seeds` | int[] 非空 | 是 | 缺省 `[42]`（代码回退；文档仍要求显式写） | `seeds: [0, 1, 2]`；只跑一次写 `seeds: [0]` | 空数组阻断 |
| `base_config` | string 项目内相对路径 | 是 | 无 | `base_config: configs/base.yaml` | 文件不存在阻断 |
| `naming.sweep_dir` | string 模板 | 否 | `work_dirs/multirun/{suite}` | `sweep_dir: work_dirs/baseline` | — |
| `naming.job_name` | string 模板 | 否 | `{index}_{case}_seed{seed}` | `job_name: "{index}_{case}_seed{seed}"` | — |
| `naming.output_dir` / `output_dir` | string 模板（优先级最高） | 否 | 缺省 `sweep_dir/job_name` 拼接 | `output_dir: "work_dirs/{case}/seed_{seed}"` | 优先级：`case.output_dir > plan.output_dir > sweep_dir/job_name` 拼接 |
| `runner.train_command` | string 模板 | 按 mode（`train_test/train` 必填） | 无 | 见下“命令模板两种模式” | 所选模式缺命令阻断 |
| `runner.test_command` | string 模板 | 按 mode（`train_test/test` 必填） | 无 | 见下“命令模板两种模式” | 所选模式缺命令阻断 |
| `cases[].name` \| `cases[].case` | string（两种写法归一，`name` 优先） | 是 | 无 | `- name: smoke` 与 `- case: public` 等价 | 两者皆空阻断 |
| `cases[].config` | string 相对路径 | 否 | 继承 `base_config` | `config: configs/smoke.yaml` | — |
| `cases[].overrides` | map 点分键 | 否 | `{}` | `dataset.split: public`（点分写入配置快照） | 非 map 阻断 |
| `paper.result_csv`（含 `case.paper.result_csv`） | string 模板 | 否 | 见“`result_csv` 五级回退链” | 推荐 per-job：`"{output_dir}/metrics_summary.csv"`；大表覆盖：`experiments/results/demo.csv` | 未配置时按回退链派生，不阻断 |
| `expectedResults`（plan/case 级） | string[] 模板 | 否 | `[]` | `"{output_dir}/metrics_summary.csv"` | 仅声明不算输出接口通过（见下） |
| `debugMode` / `debug_run` | bool | 否 | `false` | `debugMode: true` → 隔离 `simple_cluster/debug_runs/<plan>/<runId>` | — |

### 命令模板两种模式（变量对齐说明）

- **模式一 Plan `runner.*_command`（MultiModal 对齐，面向单 job 执行）**：train 仅传 `--output-dir`（不直接写大表），test 双写 `--output-dir {output_dir} --result-csv {result_csv}`（per-job 双 csv + 追加最终大表 `experiments/results/<method>.csv`）。示例见本节骨架 `train_command/test_command`。
- **模式二 `simple_project.entrypoints.*Template`（项目级默认模板，面向脚手架生成）**：以代码模板 `src/templates/ProjectAdapterTemplates.legacy.ts:743-744` 为准，使用 `{python}` 解释器占位、下划线风格 `--output_dir`、test 用 `{checkpoint}`（从 checkpoint 评估）而非 `--result-csv`。Scheduler 渲染时两种分隔符按入口 `argparse` 实际定义为准，不要混写；`{python}` 不可写死为字面量 `python`（conda 环境下由执行环境替换）。
- 白名单外的 `{python}/{checkpoint}/{job_name}/{experiment_name}/{outputDir,resultCsv}` 均为合法变量；`{outputDir}` 是 `{output_dir}` 别名，`{resultCsv}` 是 `{result_csv}` 别名。

## 输出接口预检

Scheduler 会在 validate-plan 和 dry-run-plan 阶段检查“代码真的会产出可解析结果”。至少满足以下一种通道：

### 通道 A：run_wrapper（推荐）

- `experiments/simple_project.yaml` 配置 `adapter.runWrapper` 指向已存在的 `experiments/simple_adapter/run_wrapper.py`。
- 使用插件生成的 wrapper 包裹训练/测试命令，捕获 stdout/stderr，并生成标准结果和快照。
- 自定义 wrapper 也必须在命令结束后生成 `metrics_summary.csv`、`env_snapshot.json` 和 `config_snapshot.yaml`。

### 通道 B：显式 adapter 调用

- 被选中的 `train.py`、`test.py` 或命令中的 `.py` 入口直接调用 `collect_outputs(...)` 或 `write_metrics_summary(...)`。
- 只 import 不调用不算通过；把调用藏在未被入口执行的分支也不算可靠实现。
- 调用时必须传入 experiment、suite、method、dataset、split、seed 等上下文。
- 最小可运行片段（B-显式调用，入口末尾必须执行到）：

```python
from experiments.simple_adapter.result_writer import write_metrics_summary
write_metrics_summary(
    experiment_id="exp001", suite="baseline", method="ours",
    dataset="public", split="test", seed=0,
    metrics={"AUC": 0.91, "accuracy": 0.85},
    output_dir=output_dir,  # 与 Plan {output_dir} 同目录
)
```

### 通道 C：TensorBoard scalar

- 入口使用 TensorBoard `SummaryWriter` 或等价 writer 写 scalar。
- 远端环境必须能导入 `tensorboard`。
- 任务成功后 Scheduler 会读取每个 tag 的最终 scalar，转换成 Plan 声明的标准 CSV，并补齐配置和环境快照。
- 最小可运行片段（C-TensorBoard，tag 即列名）：

```python
from torch.utils.tensorboard import SummaryWriter
writer = SummaryWriter(log_dir=output_dir)
writer.add_scalar("AUC/test", 0.91, global_step=100)
writer.add_scalar("accuracy/test", 0.85, global_step=100)
writer.close()
# tag 映射：`AUC/test` 取末段 `AUC` 为 metric 列，final scalar 为 value 列；
# split 从 tag 倒数第二段推断（无则用 Plan case split），seed/suite/method 由 Scheduler 补齐。
```

- 通道 A 最小判定：`simple_project.yaml` 中 `adapter.runWrapper` 存在且命令经 wrapper 包裹后产出 `metrics_summary.csv + env_snapshot.json + config_snapshot.yaml`；自定义 wrapper 同样必须在命令结束后生成这三件套（见通道 A 原三条）。

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
- per-job 双 csv：`metrics_summary.csv`（指标长表）+ `metrics_case.csv`（病例/样本级，必填列为 `experiment_id,case_id,dataset,split,method`）。
- `metrics_case.csv` 列级 Schema：`experiment_id:string 必填`、`case_id:string 必填`、`dataset:string 必填`、`split:string 必填`、`method:string 必填`、`metric:string 可空（单行多指标时必填）`、`value:number 有限数值可空（缺失记空行不记 NaN/Inf）`、`label/pred/score:string|number 可空`；宽容策略：缺可选列不阻断，缺必填列阻断；`csvColumnMapping` 仅做列名兼容，不掩盖缺列。
- `metrics_summary.csv` 扩展列口径：`mean/std/ci/pValue/adjustedPValue:number 可空`、`significant:boolean|可解析文本`、`unit:string 可空`、`higher_is_better:boolean 可空`、`epoch/step:int 可空`、`timestamp:ISO8601 可空`；`value` 必填有限数值。
- per-job 双 log：`stdout.log` + `stderr.log`（由 run_wrapper 捕获）。
- 最终大表：`experiments/results/<method>.csv`（只按实验类型命名，如 `baseline.csv`；test 命令经 `--result-csv` 追加写入）。
- 历史兼容文件名（`results.csv`/`metrics.csv`/`classification_report.*`/`train.log`/`summary.txt` 等白名单与符号推断）仅作识别红单参考，不作为新实验标准输出；新实验一律用上述双 csv + 大表 + 双 log。
- 每个任务目录必须有 `env_snapshot.json` 和 `config_snapshot.yaml`。
- `artifact_manifest.json` 推荐提供；大权重和数据集只记录路径，不默认同步回本机。

## simple_project.yaml

`experiments/simple_project.yaml` 是项目级接口契约，必须随 Git 提交。推荐字段：

```yaml
projectName: my_project
taskType: classification
primaryMetric: AUC
secondaryMetrics:
  - accuracy
  - F1
adapter:
  package: experiments.simple_adapter
  resultWriter: experiments/simple_adapter/result_writer.py
  runWrapper: experiments/simple_adapter/run_wrapper.py
entrypoints:
  trainCommandTemplate: "{python} train.py --config {config} --output_dir {output_dir}"
  testCommandTemplate: "{python} test.py --config {config} --checkpoint {checkpoint} --output_dir {output_dir}"
# 注：与 Plan runner 模式差异（有意不同，非笔误）：Plan 侧用字面量 `python` + 连字符 `--output-dir/--result-csv`（MultiModal 单 job 执行）；
# 本模板用 `{python}` 解释器占位 + 下划线 `--output_dir` + `{checkpoint}`（脚手架默认从 checkpoint 评估）。
# 若 test 需追加最终大表，改为 `--output_dir {output_dir} --result-csv {result_csv}` 形式（见“命令模板两种模式”）。
outputs:
  summaryCsv: metrics_summary.csv
  caseCsv: metrics_case.csv
  consoleLogs:
    - stdout.log
    - stderr.log
  textLogs:
    - console.log
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

### `simple_project.yaml` Schema（必填-默认-校验时机）

| 字段 | 必填 | 默认（代码 `ProjectAdapterTemplates.legacy.ts:739-809`） | 说明 |
|---|---|---|---|
| `projectName/taskType/primaryMetric` | 是 | 无 | 声明口径，`metricAliases` 最终须映射到主/次指标（归档校验时检查） |
| `secondaryMetrics` | 否 | `[]` | 次指标列表 |
| `adapter.package` | 是 | `experiments.simple_adapter` | 固定包名 |
| `adapter.resultWriter/runWrapper` | `runWrapper` 是 | `experiments/simple_adapter/result_writer.py / run_wrapper.py` | 必须指向项目内存在相对路径（validate 时存在性检查） |
| `entrypoints.trainCommandTemplate/testCommandTemplate` | 是 | 见上代码模板（含 `{python}/{checkpoint}`） | 须可被 Scheduler 渲染 |
| `outputs.summaryCsv/caseCsv/manifest` | 否 | `metrics_summary.csv / metrics_case.csv / artifact_manifest.json` | 文件名（非路径），落 `{output_dir}/` 下 |
| `outputs.consoleLogs/textLogs` | 否 | `[stdout.log, stderr.log] / [console.log]` | 注：模板默认已去 `summary.txt`，`summary.txt` 仅保留识别白名单（`TEXT_CANDIDATES`/`TEXT_RESULT_NAMES`），新实验标准输出仍以双 csv+双 log 为准（见标准结果契约） |
| `outputs.candidateCsv/candidateJson` | 否 | `["{output_dir}/metrics_summary.csv"] / ["{output_dir}/metrics.json"]` | 模板另兼容 `results.csv` 等历史名仅作识别，不作新标准 |
| `outputs.csvColumnMapping` | 否 | `{metric: metric, value: value}` | 仅列名兼容；全量可映射列为标准结果契约列（`experiment_id/suite/method/...`），缺必填列仍阻断 |
| `outputs.metricAliases` | 否 | `{}` | 如 `acc→accuracy`；归档时校验须落到主/次指标 |
| `outputs.tensorboardLogDirs` | TensorBoard 通道必填 | `["{output_dir}"]` | `{output_dir}` 为占位渲染，非字面目录 |

### `result_csv` 五级回退链（代码 `src/clusterSchedulerRuntime.legacy.ts:1008`）

`result_csv_tpl = direct_result_field(case_item, case_paper, plan_paper, plan) or (case_expected + plan_expected + runner_expected + ["{defaultDir}/{suite}.csv"])[0]`，优先级从高到低：

1. 直接字段：`case.paper.result_csv > case.result_csv > plan.paper.result_csv > plan.result_csv`（最先命中即用）；
2. `case.expectedResults[0]`；
3. `plan.expectedResults[0]`；
4. `runner` 命令中 `--result-csv` 别名提取；
5. `normalize_default_result_csv_dir(default_result_csv_dir)/{suite}.csv`（默认 `experiments/results/<suite>.csv`，必须项目内相对，禁 `..`/绝对路径/盘符）。

### `paper.result_csv` 口径统一

- 本契约骨架 `paper.result_csv: "{output_dir}/metrics_summary.csv"` 为 per-job 默认（推荐新手照抄，避免并发覆盖）。
- `docs/simple-experiment-setup.md:221` 示例 `paper.result_csv: experiments/results/demo.csv` 为最终大表覆盖写法（test 经 `--result-csv` 追加），同样合法；两者区别仅在回退链第 1 级取不同值。
- 统一规则：`paper.result_csv` 与 `expectedResults` 声明同一文件时以直接字段为准；`expectedResults` 三项（含大表）写法表示同时断言 per-job 双 csv + 大表；不同 case/seed 不得共享同一大表外同一文件（并发覆盖阻断）。

### 不安全路径黑名单（代码 `src/security/RemotePathPolicy.ts:10`）

- 远端校验拒绝以下 6 个路径本身作为写入目标：`/`、`/home`、`/data`、`/mnt`、`work_dirs`、`simple_cluster`（`full !== root && !full.startsWith(root + "/")` 逃逸亦拒绝）。
- 含义：`work_dirs/`、`simple_cluster/results|logs/` 是“允许的结果根前缀”，但不可把结果根本身当文件/目录写入目标；必须写到其子路径如 `work_dirs/<suite>/<case>_seed<seed>/metrics_summary.csv`、`simple_cluster/results/statistics.json`。
- 另禁：`..`/绝对路径/项目外、`/root`、`/tmp`、数据集目录、`simple_agent` 占位目录作为项目父目录。

允许的结果根包括 `work_dirs/`、`outputs/`、`runs/`、`logs/`、`results/`、`test_results/`、`lightning_logs/`、`custom_results/`、`reports/`、`artifacts/`、`evals/`、`evaluation/`、`predictions/`、`submissions/`、`experiments/results/`、`experiments/runs/`，以及 `simple_cluster/results/`、`simple_cluster/logs/` 等受管目录。新实验优先使用 `work_dirs/<suite>/<case>_seed<seed>/`。

## Xshell 与 SimpleSFTP

- 先在 Xshell 中创建并验证会话；如使用 OpenSSH 别名，也必须在 `%USERPROFILE%\.ssh\config` 中配置正确。
- 多用户共用服务器时设置 `simpleExperiment.tunnel.remoteTmuxSessionPrefix`；推荐用稳定用户名或短项目标识。默认值是 `simple`，旧 `zlk-` 会话可在升级后继续保留该值作为前缀。
- 插件优先使用已验证的 SSH/Xshell 别名；字面 IP 只作为 `networkHost` 诊断或无别名时回退。
- 本地转发 Source 和目标必须都是 `127.0.0.1`；插件不建立裸 IP 直连。
- 远端项目父目录只来自用户配置：API 请求中的 `remoteRoot` / `agentProjectDir` 优先，其次是“设置 > 服务器”中保存的 Hub/Worker 配置。插件不得按服务器名改写该路径。
- 可用 `simpleExperiment.remote.allowedRoots` 和 `simpleExperiment.remote.deniedRoots` 配置额外安全边界。两个列表留空时不注入任何默认服务器路径。运行时仍会用真实路径检查项目内写入，拒绝符号链接逃逸。
- 首次升级到 `0.4.3` 时，插件可从未设置状态的旧服务器配置预填这两个数组；用户已显式设置的数组不会被覆盖。
- 历史缺陷记录：0.4.1 的全局命名迁移曾把部分用户的真实存储路径误当作插件品牌迁移。0.4.2 起删除这类服务器名到路径的硬编码映射。
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
- Debug 输出隔离在 `simple_cluster/debug_runs/`，不能归档，也不能进入质量门禁、统计、论文证据或 PPT。
- 正式运行必须经过人工审核的精确预览，然后由 `workflow.run` 或既有 `runPlan` 路线提交。
- 运行后先解析完整预览，人工筛除不良结果并归档；质量门禁、统计、论文表、claim 证据和 PPT 只读最终归档结果。

## 开发前检查清单

1. 已读本契约和项目内 `docs/project-constraints.md`。
2. 已运行 `simple-experiment self-check` 和 `simple-sftp-api self-check`，并读取 discovery/capabilities。
3. 项目只有一个根目录，核心代码和配置位于规定目录。
4. 已有真实 `configs/*.yaml` 和 `experiments/plans/*.yaml`。
5. 已选择 wrapper、显式 adapter 调用或 TensorBoard 三者之一，并在代码中落实。
6. Plan 的 mode、seeds、cases、commands 和 per-job 结果路径完整。
7. `experiments/simple_project.yaml` 与实际代码一致。
8. 数据、权重、缓存和密钥不会进入 Git 或默认代码同步。
9. `plan.validate` 和 dry-run 通过；所有结构化 `missing` 已修复。
10. 正式提交目标、拓扑和远端路径已经过人工确认。
