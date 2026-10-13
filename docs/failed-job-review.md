# 正式失败 job 的人工审核与重新排队

交付：SimpleExperiment 0.5.289 + SimpleSFTP 0.2.68。

0.5.288 的重排入口仅接受空输出。Scheduler 启动失败也可能已经写入正式 owner、配置快照和日志，因此 `FORMAL_JOB_CONFLICT` 是已有文件保护；问题在于界面仍声称自动移走旧 attempt，且没有后续审核入口。不得放宽正式目录占用、单写者、checkpoint、源哈希或身份门禁来消除报错。

现在点击“重新排队此 job”，先核验原 command、停止回执和精确输出。若有遗留文件，选择“审核遗留文件”后打开只读页面，范围冻结为 workflowId/index/commandId。只处理该 job 的当前正式输出目录和独立声明 CSV；PLAN、源配置、其他 job、共享引用及正式结果保留。历史路径、目录名前缀或同名 PLAN 都不能推定所有权。

页面默认移入 `clean_dir/job-<审核 token>/<源相对路径>`。批次布局在完整预览中确定、纳入不可变摘要与路径确认；执行时不改路径、不覆盖旧归档，也不创建科研 attempt。外部 CSV 先于其 owner 目录处理，避免移动 owner 后遗失剩余项的归属证明。永久删除仍要求同批精确路径两次确认，沿用原直接父目录验证和最短子项执行器。

SimpleSFTP 仅读取 schemaVersion=1 的 `formal_job_owner.json`，核对 workflow、command、globalJobId、index、case、seed、revision、代码指纹、正式输出、声明 CSV、配置哈希形态和终态。全部内容仍计算 SHA256；独立 CSV 的指纹同时绑定 owner 文件哈希。所有权不足、活动/不明 writer、共享引用、哈希变化、权限失败和离线节点继续阻断。它不会通过下载原始文件到本机来建立证据。

全部节点清理完成后，用户返回原卡片再次点击重排并确认。重排保留正式目录、PLAN revision、模式与 globalJobId，生成新的控制 command；原拒绝和清理 operation ID 留在历史。只清理选中 job 的失败/日志/产物缓存，不把整个 PLAN 标为归档，不改整份同步 ledger，不影响已有成功 job。部分完成时保留未处理节点并禁止重排；重连只读检查，续办仍需重新审核确认。恢复不能覆盖新作业。

API 与 UI 共用同一逻辑，每次调用前读取 discovery/live capabilities。示例仅展示请求形状，不授权生产清理：

```json
{"method":"plans.cleanup.preview","params":{"planFile":"experiments/plans/comparison/aoept.yaml","job":{"workflowId":"distributed-plan-1791833986160-p2fzbq","index":3,"commandId":"a1021796a28fcef81beeb2824f29196c"},"action":"move"}}
```

后续仍使用 `plans.cleanup.confirm/execute/status/continue/recheck/restore`；preview 不执行，confirm 不重排。完成后只有用户显式点击原 job 的重排入口才会入队。旧 SimpleSFTP 缺少正式 owner 或归档布局能力时，在确认前明确要求升级。

验证：真实源码 Host 重排调用复现旧错误后转入只读 job 预览；完整 Webview 桥接测试确认初始只有历史/preview、不能注入另一个 job；单 job 证据收集和索引更新保持成功同伴、PLAN、源配置与同步登记。覆盖共享 CSV、checkpoint 引用、身份/状态变化、部分失败、离线续办、归档布局和旧确认不能换 job。SimpleSFTP 新测试只在本机临时夹具执行 inspect/check/preview，验证 owner、SHA256、布局及零写入；没有调用 move/delete 或访问生产服务器。

2026-10-13 本轮只读 live state 核对：上述工作流 BUS index0/1/2 completed，PAD index3/4/5 failed，本机运行 0.5.288，三台 Worker 报告 Agent 0.5.288。开发过程没有清理、停止或重新提交 MultiModal 作业。新版 UI/API 的实际预览需安装后用户重载再验收，不能把模拟回归标为实机清理通过。0.5.289 的远端 Python 与 0.5.288 行为一致；交付时另核对生成文件除版本常量外的字节比较。
