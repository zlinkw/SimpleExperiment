# PLAN 及关联产物清除

SimpleExperiment 0.5.271 与 SimpleSFTP 0.2.64 增加统一预览和受限执行接口。开发验证只使用本机临时夹具与模拟 Worker，没有清理 MultiModal、启动实验或向生产服务器写入。VSIX 仅在本地生成，没有安装或发布。

## UI

在 PLAN 列表选中一个 PLAN，点击 **清除 PLAN 及关联产物**。审核页按节点列出精确路径、类型、字节数、SHA256 内容指纹、逐文件清单、所有权和依赖。预览不会创建 clean_dir、上传代码或取消任务。

默认选择“移入 clean_dir”，目标固定为 `<当前项目安全根>/clean_dir/<源相对路径>`。核对完整表格后确认，再点击执行。已有目标直接阻断，不能合并或覆盖。永久删除是独立选项，必须对同一个预览中的精确路径分别点击第一次、第二次确认，再执行。任何内容、节点配置、任务或引用变化都会阻断旧预览。

历史操作下拉框提供状态、暂停、幂等恢复未完成项、已移动项的恢复预览。恢复也需要审核与确认，不能覆盖新 PLAN 或新作业。暂停在目标之间生效，不会杀任务或中断正在进行的单次安全文件操作。

## API

先读取当前插件 discovery 文件，再 GET discovery 中实际地址的 `/api/v1/capabilities` 或 `/api/v1/openapi.json`。当前已运行的旧版扩展没有这些接口；不得按固定端口调用，也不得把下面示例当作已经获得清理授权。

方法通过既有 JSON-RPC 入口调用；认证沿用 discovery，不把认证 token 写入日志。以下为参数示例，PLAN 路径是示例夹具：

```json
{"jsonrpc":"2.0","id":1,"method":"plans.cleanup.preview","params":{"planFile":"experiments/plans/example.yaml","action":"move","verifiedOnly":false}}
```

响应提供 `token`、`digest`、`rows`、`blockers`。确认前向用户完整展示每个节点身份、安全根、绝对源/目标路径、类型和指纹。`exactTargets` 必须按预览顺序取所有 `disposition === action` 的行，组成 `node.id + ":" + absolutePath`。

```json
{"jsonrpc":"2.0","id":2,"method":"plans.cleanup.confirm","params":{"token":"<本次预览 token>","digest":"<本次 digest>","phase":1,"confirm":true,"exactTargets":["local:<审核后的完整绝对路径>"]}}
```

删除必须再以同一 token、digest、exactTargets 发出 `phase: 2`；两次确认不能复用其他批次授权。确认只持久化批准记录，不移动文件。返回操作的 `id` 用于执行和恢复：

```json
{"jsonrpc":"2.0","id":3,"method":"plans.cleanup.execute","params":{"operationId":"<确认返回的 id>"}}
```

| 方法 | 参数 / 行为 |
| --- | --- |
| plans.cleanup.preview | planFile、action=move/delete、verifiedOnly；只读 |
| plans.cleanup.list | 列出当前项目持久化清理操作 |
| plans.cleanup.confirm | token、digest、phase、confirm、exactTargets；精确批准 |
| plans.cleanup.execute | operationId；先全节点预检，再逐目标处理 |
| plans.cleanup.status | operationId；返回逐目标状态和 pendingNodes |
| plans.cleanup.resume | operationId；重新预检，核验已完成回执，只处理未完成项 |
| plans.cleanup.cancel | operationId；请求在目标边界暂停 |
| plans.cleanup.restore | operationId；仅生成恢复预览，再走 confirm/execute |

SimpleSFTP 下层接口为 `files.cleanup.inspect/verify/preview/confirm/execute/status/settle`。其令牌独立绑定节点身份、根目录身份、内容指纹、固定类型和处理方式。业务调用应优先使用 SimpleExperiment 协调接口，不自行拼接删除请求。

## 所有权和保护

任务目录通过规范项目 ID、精确 PLAN 路径/版本、workflow、case/seed/fold、attempt、commandId、Worker 和 outputDir 登记关联。遍历当前及历史 attempts、镜像节点和已确认同步记录；没有完整证据的旧目录只报告。manifest 中已有身份字段必须匹配，包含 outputDir；所有待处理内容重新计算 SHA256。

当前任务快照中精确引用该 PLAN、但缺少持久队列/版本关联的旧手工作业，也会列出节点和产物路径并保护。没有任何可靠登记的未索引文件不能自动发现或按目录名称补猜。

正式 PLAN、`experiments/drafts/` 和旧 `tmp/plan/` 均纳入配置引用图。可选顶层 `plan_id` 或 `stable_plan_id` 会在新提交队列中保存；有同一明确 ID 的改名 PLAN 能关联原登记。无稳定 ID 的旧改名记录不能靠同名、目录前缀、时间或相同方法猜测，仍保留并报告。

共享/基础配置、源码、原始资产、特征缓存、患者划分、论文及正式/历史结果保留。跨 PLAN 总表、插件共享索引不整表移动，不重写旧 CSV。配置引用包含动态表达式或缺失历史 PLAN 时，专用性不能证明，配置受保护。manifest 指向目录外的 checkpoint、配置或代码备份缺少全局独占引用证据时也受保护；当前不自动清除这类备份。

已确认的同步节点提供精确远端 PLAN/专用配置副本；仅哈希与当前本地来源一致、无共享依赖时可处理。哈希未知或版本不同的旧副本保留并报告。本地结果 sidecar 若属于已发布/历史证据同样保护，不因选中 PLAN 而破坏既有科研证据。

## 安全和恢复边界

所有节点身份、端口和项目根从当前配置获取，包括禁用但历史关联的 Worker。活动作业、重试、收集、传输、未提交的受跟踪目标和未保存编辑阻断；没有隐式停止或取消。离线节点默认阻断。显式勾选“仅处理已验证节点”会保留 pendingNodes，结果为 partial。以后处理此前未授权的离线节点需要重新完整预览和确认。

引擎拒绝根/home/.git/clean_dir 审计目录、链接/reparse point、挂载/同设备 bind mount、硬链接、路径穿越、通配符、类型/指纹变化和已有目标。源的直接父目录必须是安全根的严格子目录；根目录直接子项不能作为清除目标。文件与目录删除器分开，必须切换到规范直接父目录并核实物理 cwd，只传 `./直接子名称`。远端规范路径使用 Python 的 realpath 与物理 cwd 校验，等价于 `realpath -e` 和 `pwd -P` 的存在与身份检查。

移动保留文件身份和内容清单，验收源不存在、目标相同后追加 UTF-8 `clean_dir/MANIFEST.md`。持久化操作日志保存在插件存储目录，不记录凭据或确认 token 到审计清单。日志/权限失败停止。跨节点没有原子事务或自动回滚：失败后状态为 blocked，已完成目标保留回执。移动响应丢失时先通过仅结算回执的 settle 接口核验源/目标，再重建已移动的 PLAN/config 元数据并重新预检，不能在结算阶段启动新移动；部分恢复会跳过已经还原的元数据。不重复移动；删除响应丢失时返回 `DELETE_RECEIPT_UNCERTAIN`，需要人工审核，不自动重删。

所有已批准且可执行目标验收完成后，PLAN 和同步登记追加 lifecycle 标记并保留原所有权证据。标记的 PLAN 不再自动同步或重新收集；SimpleSFTP 的各上传/打包路径始终排除 clean_dir。恢复后仅撤销对应原操作的标记。

首次预览有效期 30 分钟；超过期限需重新预览。已确认操作支持重启后读取和恢复。永久删除后的 PLAN/config 已不存在时，若重新预检无法恢复唯一关联证据，保持阻断，不猜测续删。

当前文件执行器依赖本机 Python 和远端 Python 3。验证平台为 Windows，本次没有 Linux 生产节点实测。macOS 缺少可靠文件句柄核验时返回 `HANDLE_CHECK_UNAVAILABLE`，不会执行清理。

## 开发验证

新功能测试使用临时目录和 mock 多 Worker。清理功能的永久删除全部模拟，只验证固定类型、直接子路径、父 cwd、双确认和拒绝门禁；没有执行研究项目或服务器产物的永久删除。覆盖所有 attempts/同名前缀隔离、稳定 ID 改名、共享配置/结果保护、离线/活动节点、物理根去重、预览零写入、哈希/类型变化、链接/挂载/路径保护、冲突不覆盖、移动/恢复身份核验、部分失败恢复、丢失响应结算、权限/审计失败、清理后的同步与结果收集排除、审核页脚本和独立删除确认。

生产服务器、MultiModal 清理/恢复、真实永久删除、Linux/macOS 文件句柄与多节点故障注入未执行。这些是部署前验收边界，不能用单元测试声称生产目录已清除。

已通过新增测试 `test/features/planCleanup.test.js` 19 项、SimpleSFTP `test/cleanupFiles.test.js` 14 项。既有回归分别单文件执行，覆盖 SFTP 进度/错误桥、面板脚本、PLAN 模式和提交路由、产物同步/保留、结果运行身份、本地 API 以及精确传输范围；未执行全量测试集。两插件 build、语法/VM 校验与 VSIX runtime 闭包检查均通过。

## 修改文件

| 仓库 | 文件及职责 |
| --- | --- |
| SimpleExperiment | `src/features/PlanCleanup.ts` 协调器；`src/features/PlanCleanupEvidence.ts` 所有权/引用预检 |
| SimpleExperiment | `src/extension/PlanCleanupHost.ts` 配置、状态和索引适配；`src/extension/PlanCleanupPanel.ts` 审核页；`src/extension/legacy.ts` UI/API 入口和稳定 ID 保存 |
| SimpleExperiment | `src/api/LocalApiServer.legacy.ts` capabilities/OpenAPI 与结构化错误；`src/core/SimpleSftpProgressWait.ts` 下层安全错误透传 |
| SimpleExperiment | `src/features/DistributedPlanQueue.ts` 生命周期/稳定 ID 类型；`src/features/PlanArtifactSync.ts`、`src/features/PlanOutputRetention.ts`、`src/results/PlanRunFreshness.ts` 清理后同步/收集排除 |
| SimpleExperiment | `src/ui/PanelHtml.legacy.ts`、`src/ui/sections/PlansSection.ts` 按钮和路由；`src/runtime/RuntimeManifest.ts` 版本 |
| SimpleExperiment | `test/features/planCleanup.test.js`；`test/features/distributedPlanExecutionMode.test.js` 新依赖及稳定 ID 回归；`test/features/planOutputRetention.test.js`、`test/fixtures/plan-output-retention-inspection.py` 现有提取夹具适配 |
| SimpleExperiment | 本说明、`docs/cli-agent-api-schema.md`、`CHANGELOG.md`、`package.json`、`package-lock.json`；对应受版本控制的 dist JS/runtime 与新增四个模块的 dist JS |
| SimpleSFTP | `cleanup-file-api.js` 审批/回执状态；`cleanup-files.py` 受限文件执行器；`extension.js` 接口与归档排除；`api-server.js` 只读标记/OpenAPI |
| SimpleSFTP | `test/cleanupFiles.test.js`；`scripts/verify-runtime.js` 仅延长 VSCE 元数据枚举上限，Python/测试期限不变；`readme.md`、`CHANGELOG.md`、`package.json`、`package-lock.json` |
