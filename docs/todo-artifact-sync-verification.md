# 服务器产物同步校验回归

本轮边界：仅修产物哈希查询的目录深度、同一请求内校验批次和失败原因；保留最新完整 run 权威、内容校验、压缩传输和发布门禁。基线 `ac3b9836` / 0.5.218，配套 0.2.48。原有两个 `.pyc` 不纳入提交。

## 现场证据

2026-10-05，运行中 Host 为 0.5.218。同步报 108 个 job 的来源/镜像不可用，三个 Worker 的健康探测均成功。通过当前 discovery/capabilities 和 SimpleSFTP 只读 API 查询同一个真实嵌套结果片段：`relativePath="." + scopePaths=[精确文件] + recursive=false` 返回零文件；改为 `recursive=true` 返回 18,700 字节文件及有效 SHA256。两次调用分别 730 ms / 594 ms。文件实际存在，此例排除“全部镜像确实丢失”。

`distributedOutputHashes()` 将精确嵌套 scope 与非递归根目录扫描组合；SFTP 的非递归语义仅扫描直接子文件。旧 mock 只按 scope 过滤，漏掉目录深度行为。每 job/每 Worker 重复调用还放大了失败等待时间。

## TODO

- [x] 用遵循目录深度语义的 fixture 复现真实失败，保留全部副本缺失的失败回归。修复前三条新增用例均失败；修复后通过。
- [x] 精确 scope 递归校验，限制单次最多 128 个路径 / 10 KiB UTF-8 JSON 参数；禁止扫描全部历史。
- [x] 单次同步内按 Worker 合并预校验，同时最多两个 Worker 查询；传输后的目标重新查询，不复用传输前哈希。不同请求不复用缓存。
- [x] 缺失、哈希不同、调用失败分别保留有界具体原因，系统性失败不再吞掉。
- [x] 串行目标回归、build、vm.Script、打包与身份校验。
- [x] 补只读现场校验结论、版本交付一次；仅提交本轮文件，Git 交付以本文件同批普通提交及 fetch 后 `HEAD==origin/master` 核对为准。

没有发起实际传输或删除；本轮不把只读校验通过称为完整同步验收。源码修改后的完整按钮流程须重载后核验。

## 只读现场复核

对截图中同一完整 run 的六个 job，批量查询三类必要结果片段共 18 个精确路径，并逐项比较 durable queue 中原有 SHA256：两个 Worker 分别 18/18 匹配，0 缺失、0 冲突；另一个此前被清空的 Worker 为 18/18 缺失。三个批次分别 748 / 614 / 591 ms。现有同一 run 的可信副本仍可作为修复缺失镜像的来源，不能把非递归查询得到的空清单当作全部副本丢失。

短时回归共 14 文件、166 用例通过：manualDistributedResultSync 13、distributedQueueStartup 19、pendingResultMetricSync 26、projectResultSyncCompleteness 16、planOutputRetention 15、distributedJobArtifacts 3、runCompletionResultRefresh 1、distributedQueueCacheStability 7、planRunFreshness 5、distributedRerunAndWorkerDelta 8、projectResultTables 18、panelStateFlowControl 10、panelStateProgress 13、panelRenderHealth 12。未启动新的实验或重放用户的完整同步请求；真实完整按钮耗时和正式表发布仍须重载后观察。

`npm run build`、实际内联脚本门禁（1/1）和独立 `vm.Script` 均通过，187 个 runtime 模块 buildId 为 `ba138959dd54`。代码/lock/runtime 同步推进 0.5.219，配套无需改动。文件修改后的中文内容已按 UTF-8 复读，未删除本地或远端文件。

交付补记：首次 package 在本地 VSCE 清单子进程的 8 秒门限停止（ETIMEDOUT）；核查固定本地工具版本 4.0.0、入口及无遗留 VSCE 进程后，同一 8 秒限额的闭包门禁通过，未提高门限。后续完整 package 成功，VSIX 为 2,328,800 字节；只读 ZIP 门禁验证 187 个源码 SHA256、package/VSIX 身份及配套 16 文件一致。显式安装 0.5.219 一次，VS Code 列表和全局 simpleex 包均核对为 0.5.219，配套保留 0.2.48。安装后停止 Panel/API 访问；须用户 Reload Window 后再点击完整同步按钮核验。
