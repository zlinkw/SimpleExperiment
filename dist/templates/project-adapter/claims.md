# 论文 Claim 证据清单

本文件用于让 SimpleExperiment 检查论文陈述是否有实验结果支撑。
每条 claim 建议显式写出证据路径，例如 `experiments/results/*.csv` 或 `experiments/runs/<run_id>`。

## 模板

- __ZLK_PROJECT_NAME__ 的主指标达到预期，证据 experiments/results/metrics.csv
- __ZLK_PROJECT_NAME__ 的消融实验结论，证据 experiments/runs/ablation_example
- 外部数据集泛化结论，needs experiment

## 状态规则

- 能匹配到实验记录或结果文件：supported
- 没有证据但已有结果文件：unsupported
- 明确需要补跑或缺少实验：needs experiment