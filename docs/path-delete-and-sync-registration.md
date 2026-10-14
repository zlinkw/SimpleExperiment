# 按路径删除与同步登记 0.5.308

本轮只修改插件和测试夹具，不执行真实删除、上传、重派或科研训练，不自动部署 Worker。

## 实际失败证据

2026-10-14，通过已运行 0.5.307 的 Simple Local API 只读调用，复现 concatenation 失败任务 index5 的审核返回六条 UNSAFE_DECLARED_PATH。实际是 clearedJobs 仅保存 outputDir，未保存 collectionResultCsv；代码同时解析这两条路径并将空 CSV 的错误误报为输出目录不安全。该目录内的小型清单通过 SimpleSFTP 仅读取到内存：formal_job_owner.json 有正确 outputDir、index5、case、seed44 和内部 test_results/job_metrics.csv，config 提供对应 PLAN 引用。

另一项实际错误是 H20 代码同步的 Agent 请求 30 秒无响应。当前配置解析到 Worker jqg_zlk、显示名 jqg_h20_zlk。通过 SimpleSFTP 只读核验其 experiments/simple_project.yaml 元数据成功，约 612 毫秒返回；Agent 健康与实时通道正常。因此没有将该错误归因为 SSH/SFTP 不可用。同步流程在文件比对/传输后还会同步调用 register-code-sync-proof；此调用要遍历远端文件元数据，直到全部完成才返回 HTTP 响应，受固定 30 秒无字节响应限制。

## 修改边界

- 正常清单关联发现兼容旧记录缺少 CSV；缺失字段不再误报为不安全输出路径。安全路径错误显示具体字段，独立结果只从明确声明或匹配的清单取得。
- 按用户最新决定，两个审核页及覆盖重跑的永久删除使用 confirmed_paths。旧任务、清单归属、版本、共享引用、PID/句柄和旧活动登记不参与删除许可。完整路径两次确认仍由用户操作；安全根、固定类型、直接父目录和 ./直接子项删除、链接及越界拒绝仍执行。真实目标变化须重新确认。
- 未选中的共享索引及机器状态不扩大到删除批次。原移走/恢复、普通独立文件接口保持原规则。页面在确认按钮旁直接说明下一步；选择变化立即清空旧清单，避免旧表格看似仍已审核。
- Agent 支持后台同步登记，POST 仅启动一次，本机按原 operationId 主动查询进度和最终结果。真实核对的文件数/字节增长才续期，重复心跳不续期；响应丢失不重复登记或上传。保留 Worker、输入摘要、作用范围、文件来源和最终 proof 核验。状态仅在当前 Agent 内存中保存，已有正式 proof 文件沿用。
- 新 Worker 发布 codeSyncProofAsync 能力。旧 Worker 继续兼容原接口；H20 需更新 Agent 才能使用后台登记。文件传输与同步登记失败分开显示，不再笼统误导成 SFTP 文件交互失败。

## 验证记录

回归覆盖真实旧记录形状、两个审核入口、缺失/冲突清单、路径越界、双确认、PLAN 改变不阻断固定路径删除，以及隔离真实执行器的父目录/类型/链接/内容变化保护。同步登记覆盖超过旧总时限的持续进度、真实停滞、丢弃 POST 响应、身份不符、原 Host 调用链及提取后的真实 Agent 后台入口。

2026-10-14 实际执行：

- `node --test --test-force-exit --test-timeout 20000 test/features/manifestCleanup.test.js`：9 项通过，包括缺 CSV 的真实历史记录、两个审核入口、清单结果路径冲突不隐藏已确认输出目录，以及无需 PLAN/队列的固定路径复核。新增冲突用例先复现失败，再修复通过。
- 同样单文件串行运行：`planCleanupPanelBridge.test.js` 18 项、`codeSyncProofWaiter.test.js` 5 项、`planOutputReplacement.test.js` 5 项、`planCleanup.test.js` 30 项通过。
- SimpleSFTP `test/confirmedPathDelete.test.js`：2 项通过，含隔离 WSL 中真实 Python 执行器与临时夹具删除；未作用于用户产物。
- 两仓库最终 `npm run package` 均通过，执行各自完整构建、串行门禁和打包流程；没有运行全量 `npm test`。
- `vm.Script` 校验 PanelHtml 与审核页脚本通过；VSIX 内所有 Python 源码 AST 解析通过。
- `python -B -X utf8 scripts/verify-delivery-artifacts.py . D:/GitRepo/MCP/simple-sftp`：SimpleExperiment 231 个、SimpleSFTP 22 个运行文件与源文件一致；包身份、版本、运行闭包、缓存/依赖/凭据排除检查通过。

## 主要修改文件

| 仓库 | 文件 | 用途 |
| --- | --- | --- |
| SimpleExperiment | `src/features/ManifestCleanup.ts` | 分离缺失结果路径与不安全路径；按路径删除不受清单冲突阻断 |
| SimpleExperiment | `src/features/PlanCleanup.ts`、`src/features/PlanOutputReplacement.ts` | 固定路径删除许可、双确认、实际文件状态复核及覆盖入口 |
| SimpleExperiment | `src/extension/PlanCleanupHost.ts`、`src/extension/PlanCleanupPanel.ts` | 两个审核页、明确按钮提示、重新审核与配套协议 |
| SimpleExperiment | `src/features/CodeSyncProofWaiter.ts`、`src/extension/legacy.ts` | 单次登记、主动查询、真实进度停滞检测及明确分阶段错误 |
| SimpleExperiment | `src/clusterAgentRuntime.legacy.ts` | 后台同步登记、内存查询记录及能力声明 |
| SimpleSFTP | `cleanup-file-api.js`、`cleanup-files.py`、`extension.js` | 路径确认删除协议与真实执行器；保留目录安全检查 |

对应测试、版本、AGENTS 约束与生成的 runtime/dist 随源码提交；未纳入原有 pyc、缓存或历史暂存包。

## 发行、安装与待验收

- SimpleExperiment 源提交 `98407a55f91ba77979b17d4bde3f908133f322ec`、SimpleSFTP 源提交 `851b39955e87dd940f0cfe8a23edcc56838a9fbc` 均普通推送到各自 origin/master，fetch 核对一致。
- 稳定发行：[SimpleExperiment v0.5.308](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.308)、[SimpleSFTP v0.2.82](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.82)。实际 Latest 均不是草稿或预发行，tag 指向上述源提交。
- `simple-experiment-0.5.308.vsix`：2774234 字节；SHA256 `173240861d0a7a366b8873f5004b76e31dff11201085a1791399ed9427128102`。
- `simple-sftp-0.2.82.vsix`：163058 字节；SHA256 `83e8043a6a94ec1ad1b48d3631a8391609ee9be59e4f83a348fa46cb93a7e209`。
- 两包及精确文件名的 SHA256 sidecar 已发布。通过生产 `ReleaseClient`，0.5.307 / 0.2.81 可见两项更新；实际下载到内存的字节与本机包、GitHub 资产摘要和 sidecar 全部一致。
- 显式各运行一次 `npm run install:latest`，无 force。`code --list-extensions --show-versions` 已核对 0.5.308 / 0.2.82；`simpleex --help` 正常。已安装的 231 / 22 个运行文件与发布包一致；package.json 仅忽略 VS Code 自增安装元数据。
- 安装后停止操作当前面板。用户需在 MultiModal 执行 Developer: Reload Window，再验收审核页。按路径删除不要求 Worker 版本相同；H20 新异步登记需用户通过插件更新 Agent/Scheduler 至 0.5.308，其生命周期协议仍为 2，新增 `codeSyncProofAsync` 能力。
- **待验证**：重载后真实 UI、远端新 Agent 的后台同步登记。未执行真实删除、覆盖、同步、训练或远端部署，不将这些列为通过。磁盘安装版本不代表当前 Extension Host 或远端运行版本已更新。
