# Hub 退役复核

## 本轮范围

以 0.5.311 的通知残留为入口，同时核对连接、准备、同步、清理、结果来源、命令、设置、前端及 Python runtime。GitHub 发布和检查更新不属于退役对象。未连接、停止或清理旧 Hub 服务，未修改用户的服务器配置。

| 区域 | 复核与处理 | 回归 |
| --- | --- | --- |
| 通知、准备与同步摘要 | 移除 Hub 健康/依赖门禁、同步状态与提示；全部启用 Worker 继续检查，零 Worker 不报告就绪 | hubRuntimeRemoval、tunnelTestCompletionClarity、automaticSyncReadiness、projectCodeSyncState |
| 实时端点与启动 | ProviderRealtime 仅构建 Worker，忽略历史 Hub 标志；工厂拒绝新 Hub 端点，读取旧端点存档时排除 Hub | hubRuntimeRemoval、workerOnlyTopology、workerRouting |
| 设置与面板 | 移除 Hub 模式选项、Hub 启动命令定义、诊断块、虚构 Agent 卡和连接图节点；每个 Worker 继续使用自己的动态端点 | hubRuntimeRemoval、panelWebviewScriptHealth |
| 清理 | 旧清理收集分支不再将顶层旧会话/目录拼成 Hub 目标；受管流程仍查询当前 Worker 及实际文件 | cleanupMissingTargets、planCleanup、manifestCleanup |
| 结果与归档 | 删除 Hub 下载回退和旧远端归档中转；结果来源不明明确报错；调试包改为按原 Worker 或用户选择来源 | windowsWorkflowContract、remoteResultInspectionWorkflow、resultOwnershipScope |
| CLI | 移除通过顶层 Hub/tunnel 配置直接连接文件 API 的旧中转；本地产物操作保留，远端下载使用已有 Worker 结果页或 SimpleSFTP | simpleCli、windowsWorkflowContract |
| Python Agent | 删除旧跨节点采集器；其旧 run 入口明确拒绝。普通事件与超长事件降级均生成 Worker 标识，不再生成 Hub 身份 | hubRetirement 的隔离 AST 夹具 |
| 兼容边界 | 旧 Hub 配置/事件/路径字段可保留读取，退役 API 保留明确拒绝；均不能创建当前连接或运行目标 | hubRuntimeRemoval、hubRetirement、workerRouting |

## 剩余名称的解释

仓库仍存在 Hub 拼写，不能把“搜索零命中”作为迁移成功标准：历史 schema 字段、旧事件解码、退役入口的 HUB_REMOVED 错误和 GitHub 名称必须区分。它们不得恢复为 Hub 能力，也不得成为普通 Worker 操作的前置条件。

本轮不清除真实状态目录、用户旧配置或历史产物。新链路尚须重载和远端升级后的实际入口验收；之后依据具体路径、使用者与主动查询证据确定弃用缓存，不通过删除记录来掩盖仍未确认的启动/停止请求。
