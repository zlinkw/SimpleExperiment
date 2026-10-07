# 通用 wrapper 结果链路与紧凑详情

本批目标：保留既有端点与四态原始 CSV，校验 SHA256、运行/attempt/case/seed/Worker/来源及同一 checkpoint；完整三种子才正式发布，缺失或失败保留旧完整结果，未完成运行只预览。使用既有 Simple API 补收 DPL 已有文件，不重训、不改 MultiModal 模型。

范围补充：默认读取 wrapper 的 `artifact_manifest.json` 和任务已记录的产物清单，收集所有声明的结果类型。CSV/TSV 按相对输出类型、数据集、方法合并，表头取并集，保留未知列、空值、不可计算原因。JSON/JSONL 原结构收录；YAML、文本和未知二进制原样保留并建索引。没有端点 CSV 的 wrapper 也可发布完整结构化产物包，不臆造科学统计。权重继续走既有完整产物同步，不进入指标解析器。四态只是一种可识别的增强校验 schema，不作为其它项目的接入要求；`distributedResults: true` 本身也不会强制要求四态文件。

合并视图增加 `simple_run_id`、`simple_attempt`、`simple_case`、`simple_seed`、`simple_worker`、来源路径与 SHA256。原始文件不改列、不改字节；每份原文件旁保存 `.provenance.json`。原有映射路径继续有效，各 attempt 单独留存。通用收集不把预测值、计数或任意数字列当成科学统计；端点统计继续使用既有结果接口。轻量结果接收维持 4 MiB 单文件/批次上限，超限或不安全路径明确拒绝正式发布；大文件和权重仍由产物同步处理。

- [x] 读取插件/复现项目约束及 Git 状态；原有两个 dirty `.pyc` 不进入提交。
- [x] 现场：SimpleExperiment 0.5.238、SimpleSFTP 0.2.59；DPL 已发布运行 klf0vx 为 6/6，新运行 ia4ase 为 5/6。通过 SimpleSFTP inventory/memoryOnly 读取旧完整运行样本，端点与四态文件存在。
- [x] 回归真实 memoryOnly → 校验 → 保真持久化 → 同世代端点/四态事务发布；涵盖 A→B、缺文件、哈希错误、种子缺失、幂等及回滚。
- [x] 已有映射路径保存原文及稳定 provenance；每个 attempt 独立，不删除历史，不补零、不另写科学统计。队列补充 hash/同步回执后仍幂等。
- [x] 集成两种同步按钮及本地结果重建；本地读取复用持久化映射、按字节处理二进制；未完成运行独立预览；持久化内容不进入大体积 Panel state。
- [x] 详情按钮并排、减少间距，窄屏自然换行。
- [x] 串行相关测试、build、vm.Script、VSIX 校验。
- [x] Simple API 实际补收并直接核对本地文件 SHA256、job_dir/runId、端点/四态 checkpoint；代码验证与现场验证分开记录。
- [x] 0.5.239 补丁版本、打包、安装一次；VS Code 安装版本与 `simpleex` 入口已核对。当前批次提交及 origin/master 同步以 Git 记录为准。

## 现场补收

通过 `scripts/recover-wrapper-results.js` 复用生产的发现、接收、校验、汇总及事务发布代码，传输调用现场 SimpleSFTP API；没有调用训练或修改模型。补收开始时最新运行已经由 5/6 变为 6/6。

- `distributed-plan-1791341503882-klf0vx`：6 个 job，attempt 4，84 个 wrapper 原始结果文件；nwpu3/nwpu2 各 42 个。全部本地 SHA256、job_dir/runId/来源及 checkpoint 已核对。
- `distributed-plan-1791348830907-ia4ase`：6 个 job，attempt 5，84 个原始文件；nwpu3 56 个、nwpu2 28 个。全部本地 SHA256、job_dir/runId/来源及 checkpoint 已核对。正式端点与四态以该运行发布，旧 attempt 的原始证据保留。
- 文件类型包含端点、四态、病例明细、预测、训练曲线、manifest、环境与配置快照；不只补收四态 CSV。
- 当前结果证据入口：复现项目 `simple_cluster/results/project_table_registry.json` 的 `plans["experiments/plans/comparison/dpl.yaml"].wrapperEvidence`；每份源文件有 SHA256 和本地映射路径。
- 重复补收最新 B 后缺失、待指标、跳过均为 0；本地再次核对 A/B 合计 168 份原始文件 SHA256，各运行 6 份四态 CSV。BUS 与 PAD 的三种子正式端点和通用四态合并视图均绑定 B；A 的原始文件仍在。
- 当前四态合并视图：`experiments/results/{bus_cot_lesion|pad_ufes_20}/methods/dpl/wrapper/dpl__2cbc63c3/test_results_four_state_metrics.csv__519807c4.csv`；保留全部原字段及 `simple_*` 来源列。

## 代码验证

串行执行 12 个相关单文件测试，共 150 项通过；build 的 Webview 脚本健康检查另外 1 项通过。新增通用链路 15 项涵盖原要求及非四态 wrapper、自定义端点名、无端点包、TSV 含逗号/引号/换行、JSONL 身份冲突、本地二进制读取、后台端点刷新保护。使用每文件 20 秒的 `node --test --test-force-exit --test-timeout 20000`，没有并行测试进程。

`npm run build`、编译后 `PanelHtml.js`/legacy 文件及渲染所得两个内层脚本的 `vm.Script` 均通过。端点均值、样本标准差、别名、数据集目录、结果事务、结果目录缓存、紧凑卡片和精确 tmux 跳转回归均通过。

`npm run package` 验证 191 个运行时模块闭包；VSIX 中新通用模块和四态校验模块均存在，package/runtime 同为 0.5.239。`npm run install:latest` 仅执行一次，已安装 `simple-local.simple-experiment@0.5.239`；`simpleex --help` 入口正常。安装后不再操作旧 Host 面板/API。

## 风险与边界

新 Host 代码安装后需要用户执行 **Developer: Reload Window**。重载后按钮实际显示、窄屏排版及长期自动刷新仍由用户观察；本轮现场补收通过复用生产 helper 的独立 API 验收入口执行，不伪装旧 Host 已运行新实现。磁盘结果发布复用现有租约、世代比较和事务入口。已发布文件身份不一致时拒绝覆盖。原始科学指标和不可计算原因原样保留，不自行生成统计结论。
