# ZLK 输出接入模板

本目录由插件自动生成，用于把项目训练或测试输出接入结果解析、质量门禁、统计分析和论文表格流程。

标准位置：`experiments/zlk_adapter/`。兼容副本：`zlk_cluster/templates/`。

配套配置：`experiments/zlk_project.yaml`。它记录入口命令、结果文件、控制台解析和工厂模式 hook。

## 推荐接入方式

1. 在训练或测试结束后调用 `collect_outputs(output_dir, context, stdout_text, stderr_text)`。
2. 如果项目已有工厂模式或注册器，把 `DefaultDeepLearningAdapter` 改成你的项目 Adapter，并用 `@register_adapter("你的名称")` 注册。
3. 如果项目已有 `work_dirs/results.csv`、`experiments/results/*.csv` 或测试目录 CSV，模板会尝试自动扫描并归一化到 `metrics_summary.csv`。
4. 如果只有控制台输出，先把 stdout/stderr 文本传给模板里的捕获函数；默认优先支持 accuracy、AUC、AUPRC、F1、precision、recall、specificity、loss 等分类指标，Dice、IoU、HD95、ASD 等分割指标保留兼容。
5. 大模型权重、checkpoint、datasets 不建议默认同步到本机；需要归档时写入 manifest，由 Hub/Worker 按策略处理。

## CSV 获取方式

- 首选：让测试代码直接写 `metrics_summary.csv` 长表。
- 兼容：已有 `results.csv`、`work_dirs/results.csv`、`experiments/results/*.csv`、`test_results/detailed_metrics.csv` 会由模板扫描。
- 手动：调用 `collect_outputs(..., extra_csv_paths=["你的结果.csv"])` 指定额外 CSV。
- 工厂模式：继承 `DefaultDeepLearningAdapter`，注册自己的 adapter，把项目 summary dict、DataFrame 或 CSV 映射成标准列。

## 默认输出

- `metrics_summary.csv`：主指标长表。
- `metrics_case.csv`：可选 case 级结果。
- `env_snapshot.json`：环境和命令快照。
- `config_snapshot.yaml`：配置快照。
- `artifact_manifest.json`：产物清单。

当前项目名提示：__ZLK_PROJECT_NAME__
