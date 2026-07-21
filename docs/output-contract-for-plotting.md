# ZLK 输出到 PPT 绘图插件的稳定契约

目标消费端：`D:\GitRepo\my_ppt_app`

本契约只描述机器可读轻量输出。原始数据集、大 checkpoint、权重文件和日志全文不通过绘图契约传输，只通过 manifest 或摘要字段引用。

## 必备语义字段

- `method`
- `dataset`
- `split`
- `fold`
- `seed`
- `metric`
- `value`
- `mean`
- `std`
- `ci`
- `pValue`
- `adjustedPValue`
- `significant`
- `case_id`
- `patient_id`
- `subgroup`
- `error_type`

## 文件契约

### Result Registry

路径：`zlk_cluster/results/result_registry.json`

用途：实验结果注册表，用于发现所有可绘图实验。

稳定字段：`resultId`、`experimentId`、`suite`、`method`、`dataset`、`split`、`fold`、`seed`、`metrics`、`dimensions`、`sourceFiles`。

### Statistics

路径：`zlk_cluster/results/statistics.json`

用途：聚合统计，用于绘制均值、标准差、置信区间和显著性标注。

稳定字段：`suite`、`group`、`metric`、`mean`、`std`、`ci`、`pValue`、`adjustedPValue`、`significant`。

### Paper Table

路径：`paper/tables/zlk_results_table.csv`

用途：论文表格 CSV，可直接生成表格图或柱状图。

稳定字段：`method`、`dataset`、`split`、`metric`、`mean`、`std`。

### Case Level

路径：`zlk_cluster/results/case_level_index.json`

用途：病例或样本级结果，用于错误案例、子组图和泄漏检查图。

稳定字段：`case_id`、`patient_id`、`method`、`dataset`、`split`、`metric`、`value`、`subgroup`、`error_type`。

### Dataset Profile

路径：`zlk_cluster/datasets/profile.json`

用途：轻量数据集画像，用于类别分布、split 分布和泄漏摘要图。

稳定字段：`dataset`、`split`、`class`、`case_id`、`patient_id`、`classDistribution`、`splitDistribution`。

## 兼容说明

- 插件会同时兼容 camelCase 和 snake_case，但新增输出应优先使用本文档字段。
- `pValue`、`adjustedPValue` 和 `ci` 可为空；`significant` 应为布尔值或可解析布尔文本。
- PPT 插件不要扫描原始数据集或 checkpoint 目录；只读取上述 JSON/CSV/Markdown 摘要。