# 任意实验项目的最小接入指南

目标是让现有项目按真实命令运行，声明独立产物，并在需要时输出可读取的指标。插件不会自动理解所有项目的配置、数据语义和指标口径。先选择最小路径；没有指标的任务也能作为通用命令管理，不必为接入而重写训练框架。

服务器配置与操作流程见 [完整使用说明](simple-experiment-setup.md)，约束见 [项目契约](plugin-project-contract.md)。本页所有模块名、命令参数和路径都是模板，须替换成项目已有的真实入口；示例不构成实验结果证据。

## 1. 三种接法

| 项目现状 | 最小改动 | 结果 |
| --- | --- | --- |
| 已有可非交互执行的命令和输出文件 | 新建一个 PLAN，写真实命令、输入、独立输出 | 可排队、监控、停止和核实声明产物；不要求论文指标 |
| 已有 CSV/JSON 指标 | 在 PLAN 指定实际结果路径，必要时配置列映射 | 不必改模型；插件核实运行与结果文件后汇总 |
| 指标只在函数返回值、控制台或自定义文件中 | 加一个轻量入口/适配函数，把真实指标写为每 job 独立 CSV | 模型、损失、数据处理保持项目自己的实现 |

无论哪种，都需要：准确的执行环境、各 Worker 可访问的输入、非交互命令、独立输出路径、正确退出码。失败时不要吞异常后返回 0。

项目命令不限 Python。Rscript、Julia、编译后的 C/C++ 程序或其他非交互工具都可以替换进 runner 命令；插件运行辅助设施仍需要 Python。非 Python 项目同样先采用通用产物声明，需要表格时再把真实输出转换为可读取的 CSV/JSON，不要求重写原算法。

## 2. 最小目录

~~~text
my_project/
  configs/                      # 需要配置文件时使用
  models/                       # 已有模型代码，无需照搬此目录名
  trainers/                     # 已有训练/评估逻辑
  experiments/
    plans/
      smoke.yaml                # 必需的 PLAN
    simple_adapter/
      entry.py                  # 仅在原项目不能直接提供结果时添加
  tools/                        # 已有通用工具命令
  work_dirs/                    # 各 job 独立产物
  requirements.txt              # 或 environment.yml / pyproject.toml
~~~

已有项目保留自己的模块组织。不要把整套业务代码塞进顶层入口，不创建散落的临时训练脚本，也不要求新项目创建历史 `experiments/simple_project.yaml`。

## 3. 路径 A：仅用 PLAN 管理现成命令

假设项目已有 `tools/build_artifact.py --output <file>`，脚本会创建真实输出文件：

~~~yaml
# experiments/plans/build_artifact.yaml
suite: build_artifact
mode: train
seeds: [42]
naming:
  output_dir: "work_dirs/{suite}/{case}/seed_{seed}"
runner:
  working_directory: "."
  train_command: 'python tools/build_artifact.py --output "{output_dir}/model.bin"'
  inputs:
    - data/manifest.json
  outputs:
    - "{output_dir}/model.bin"
  collect_metrics: false
cases:
  - name: baseline
~~~

替换为实际命令；不使用 `data/manifest.json` 的项目应删掉该示例输入或改成真实输入。`train` 在这里表示一个执行阶段，不要求命令必须训练神经网络。输出尚未生成或路径不安全时不能当作成功。没有指标时，不会自动生成有意义的统计表。

## 4. 路径 B：现有程序已经输出指标 CSV

假设真实入口支持 config、seed、output-dir 与 result-csv，且会把指标写入指定文件：

~~~yaml
# experiments/plans/baseline.yaml
suite: baseline
mode: train_test
base_config: configs/baseline.yaml
seeds: [42, 43, 44]
naming:
  output_dir: "work_dirs/{suite}/{case}/seed_{seed}"
paper:
  result_csv: "{output_dir}/metrics.csv"
runner:
  train_command: 'python train.py --config "{config}" --seed {seed} --output-dir "{output_dir}"'
  test_command: 'python test.py --config "{config}" --seed {seed} --output-dir "{output_dir}" --result-csv "{result_csv}"'
  outputs:
    - "{output_dir}/metrics.csv"
cases:
  - name: baseline
expectedResults:
  - "{output_dir}/metrics.csv"
~~~

这些 CLI 参数不是插件强制参数。原项目用 `--cfg`、`--save-dir` 或 `--csv`，就在命令模板中对应替换；原程序不会因为 PLAN 写了某个参数就自动支持它。只评估已有权重可用 `mode: test` 和真实测试命令，只训练可用 `mode: train`。

最小指标表推荐长表形式：

~~~csv
case,seed,dataset,method,metric,value
~~~

数据行必须写本次实际计算值。不同 seed 与 case 的 CSV 互不共享，禁止所有任务并发追加同一个最终大表。数据集、方法等列按项目需要提供；字段名称不同可在“项目输出接入”中配置 CSV 列映射及指标别名。已有宽表（例如 accuracy、loss 列）也可走相应项目解析规则，不必为了插件改变科研指标定义。

## 5. 路径 C：添加一个轻量 Python 入口

原项目只需暴露一个可调用入口，或在这里调用现成 API。下面保存为 `experiments/simple_adapter/entry.py`；唯一需要按项目改写的业务部分标在注释中。不要在此复制模型训练实现。

~~~python
import argparse
import csv
import math
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--case", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--result-csv", required=True)
    args = parser.parse_args()
    output = Path(args.output_dir)
    result = Path(args.result_csv)
    output.mkdir(parents=True, exist_ok=True)

    # 按项目改写这两行；让真实入口接收 seed、配置和独立输出目录。
    from your_package.runner import run_experiment
    metrics = run_experiment(config=args.config, seed=args.seed, output_dir=output)

    if not isinstance(metrics, dict) or not metrics:
        raise ValueError("项目入口必须返回非空的真实指标字典")
    rows = []
    for name, value in metrics.items():
        number = float(value)
        if not math.isfinite(number):
            raise ValueError(f"指标不是有限数值: {name}")
        rows.append({"case": args.case, "seed": args.seed,
                     "metric": str(name), "value": number})
    result.parent.mkdir(parents=True, exist_ok=True)
    with result.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["case", "seed", "metric", "value"])
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
~~~

入口用模块方式启动，确保项目根目录可导入 `your_package`；这不是可原样运行的第三方包名，必须替换。随机性控制、checkpoint 选取和真正计算指标都由 `run_experiment` 或原项目完成，适配器不应填默认分数、捕获所有异常后宣称成功，也不能复用旧结果文件冒充本次输出。

对应的单阶段 PLAN：

~~~yaml
# experiments/plans/adapted.yaml
suite: adapted
mode: train
base_config: configs/baseline.yaml
seeds: [42, 43, 44]
naming:
  output_dir: "work_dirs/{suite}/{case}/seed_{seed}"
paper:
  result_csv: "{output_dir}/metrics.csv"
runner:
  train_command: 'python -m experiments.simple_adapter.entry --config "{config}" --seed {seed} --case "{case}" --output-dir "{output_dir}" --result-csv "{result_csv}"'
  outputs:
    - "{output_dir}/metrics.csv"
cases:
  - name: baseline
expectedResults:
  - "{output_dir}/metrics.csv"
~~~

如果原项目需要训练后再单独评估，拆成 train_command/test_command；如果只要保存预处理产物，用路径 A，不要硬塞空指标。指标文件在训练阶段生成也可按声明读取，不要求所有项目必须有单独 test.py。

## 6. case、seed 与配置差异

`cases` 和 `seeds` 展开为独立 job。基础配置由 `base_config` 指定，每个 case 可用 `config` 换文件，或使用支持的 `overrides` 点分键修改生成的配置快照。项目必须真正读取 `{config}`；若忽略它，PLAN 展开并不意味着参数已经应用。

~~~yaml
cases:
  - name: model_a
    overrides:
      model.name: model_a
  - name: model_b
    overrides:
      model.name: model_b
~~~

可以先单 case、单 seed、极少步数验证命令与输出，再扩大正式批次。不同服务器目录不同的输入，通过项目自己的配置映射处理，不靠插件猜数据集位置。

## 7. 模板变量、目录与 GPU

常用命令变量：`{config}` / `{config_path}`、`{suite}`、`{case}`、`{seed}`、`{index}`、`{output_dir}` / `{outputDir}`、`{result_csv}` / `{resultCsv}`、`{working_directory}` / `{workingDirectory}`、`{worker_id}`、`{gpu_ids}`、`{plan_file}`、`{job_name}`、`{experiment_name}`、`{python}`、`{checkpoint}`。具体来源与适用阶段以校验、预演为准；未列出的变量不能当成自动替换变量使用。

- 文件模板需要 shell 引号时加引号；不要把密码、token 和私钥内容嵌进命令。
- `runner.working_directory` 默认为项目根目录。新模板优先用 `.`，减少模块导入和相对路径歧义。
- `output_dir` 与 `result_csv` 是 PLAN 声明的项目内路径；新任务按声明执行，不默认改成 attempts 子目录。
- 不手工覆盖插件设置的 GPU 可见性，也不把另一张物理卡硬编码进项目。命令里的多 GPU 训练参数仍须与实际支持方式一致。
- 前台运行真实进程，不在结尾加 `&`、nohup 或 exec bash，不后台脱离 tmux。
- 由插件管理最终运行身份与 artifact manifest。项目可声明自己的附加产物，但不应伪造 commandId、退出码和完成事实。

## 8. 第一次实际接入的操作顺序

1. 本机识别项目，填写真实训练/评估命令和输出接入规则。
2. 配置并检查全部启用 Worker；由用户准备相应环境、数据与必要权重。
3. 将 PLAN、入口、配置与小输入纳入代码同步范围；检查大数据没有被误选。
4. 通过插件进行 PLAN 校验和预演，核对 job 数、展开参数、路径与服务器。
5. 先调试，再确认正式运行。正式实验使用 SimpleExperiment 工作流/API，不绕过插件直接启动脚本。
6. 查看实际窗口日志与退出码，主动查询产物；整批未结束时也可点击更新结果汇总。
7. 确认每个结果来自当前精确 job，检查是否有未知、冲突、失败或不完整项，再由科研项目做科学有效性判断。

## 9. 常见最小修改

| 原项目问题 | 最小处理 |
| --- | --- |
| 固定写 `results.csv` | 加结果路径参数，或把现有配置中的结果路径设为 `{result_csv}` |
| 所有 seed 写同一工作目录 | 接收独立 output-dir，PLAN 路径包含 suite/case/seed |
| 只打印指标 | 用现有日志解析规则；格式不稳定时在计算位置返回字典并用轻量入口写 CSV |
| argparse 参数名不同 | 只改 PLAN 命令中的参数名，不修改模型逻辑 |
| 输出 TensorBoard | 配置已有 scalar 接入规则；事件文件不等于所有科学指标都已正确解释 |
| 需要用户按键或输入密码 | 改为非交互命令；认证由系统密钥/ssh-agent或支持的插件流程处理 |
| 失败仍返回 0 | 保留异常或传播实际子进程退出码 |
| 想重跑覆盖旧文件 | 先走精确产物审核与两次确认，不在入口里自动删整个输出根目录 |

不存在能保证“任何项目零修改且自动理解所有指标”的模板。本页把改动限制在命令、配置和结果边界；项目特有数据协议、训练依赖、分布式策略和科学结论仍由项目负责。
