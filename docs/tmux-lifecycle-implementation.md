# tmux 作业生命周期实施

开发基线 0.5.305；交付目标 SimpleExperiment 0.5.306、SimpleSFTP 0.2.81。用户批准 Scheduler/tmux/最终产物的主动查询方案。

固定边界：不访问生产服务器，不训练，不删除真实产物；保留用户工作区改动。
自动同步、静态入口探针、全部 Worker 就绪检查、输出目录创建、指标内存读取和独立更新必须保留。
新任务无 attempt，无科研规则或环境依赖校验；项目负责输出目录，插件不使用正式目录文件锁。

## 批次

1. 统一证据归并：已验证。纯 reducer 和实际队列归并使用主动证据；尚未接入远端新协议。
2. 独立 tmux Scheduler、等待窗口、前台任务、最小结果清单：已接入协议 2，客户端切换待批次 3。
3. 主动查询、停止/召回/重排、本机持久化：核心已接入；遗留按钮和清理入口的整体兼容在批次 4 完成。
4. 清理清单关联、SimpleSFTP 主动核实和恢复：已接入，临时夹具与隔离 tmux 已验证。
5. 集成回归、发行、单次安装：进行中；远端部署及重载后验收待用户执行。

每批验证后独立提交并普通推送 origin/master；此文记录实际检查，不将未执行项记为通过。

## 验证

- 批次 1：单文件 taskLifecycle.test.js、npm run build 通过；不访问生产服务器。提交记录以 git 为准。
- 批次 2：真实隔离 tmux 的任务窗口、并行、排队取消、失败退出、关闭后结果查询通过；npm run build 通过。测试仅 stdlib CPU 夹具，未访问生产服务器。
- 批次 3：pulledTaskControl.test.js、taskLifecycle.test.js、真实 tmux 测试和完整 npm run build 通过。旧协议夹具显式标明历史协议；新协议验证无推送、停止响应丢失及有界查询失败。没有访问生产服务器。
- 批次 4：manifestCleanup.test.js 覆盖没有旧 job 登记的多 job 覆盖、执行响应丢失、源重建、移动及恢复；SimpleSFTP cleanupManaged.test.js 覆盖真实隔离 tmux 删除/移动、重建与活动写入阻断；本机仅使用临时夹具。
- 集成：完整 npm run build 曾通过；新增 formalJobExecution 的真实 Scheduler writer 回归补获 FrozenInstanceError，已修正私有运行期数据处理，该单文件 6 项通过。发行版本仍须重新完整构建及打包。
- 原有完成 PLAN 的 Worker 间自动同步和仅内存收集回归，新增无 owner JSON 的最终清单模式分别通过；未下载科研原始指标到本机。
- 新最终清单沿用已计算的 checkpoint SHA256，附带轻量文件身份/大小/时间信息，刷新不重新读取大型权重。原始指标的实际收集和显式 checkpoint 仍验证内容哈希。
- tasks.preflight 对协议 2 使用当前窗口或本机冻结输入，并核验原代码证明；完成核验不读取旧队列/终态回执。历史协议入口继续只读兼容。
- 全量 npm test 未运行。历史 distributedPlanQueue.test.js 含已退役的 attempt 执行假设；修复其模块加载后，仅运行并通过当前窗口/查询证据版本保护用例，其余旧执行场景不列为通过。

## 状态与接口

- tasks.list 返回 lifecycleProtocol=2 和 jobLifecycle，执行/结果分别列出；底层 /api/worker/tasks/query 为有界批量只读查询，保留 GET 查询兼容。控制结果不由推送决定。
- Scheduler 使用动态回环 HTTP、窗口内的实例标识/最小属性和取消围栏。Agent 重启不结束 Scheduler 或任务；控制窗格重启从现存窗口恢复，接受过且已被手动关窗的命令不自动重放。
- 单 Worker、Worker 池、Hub/Worker 的新正式 PLAN 共用本机派发输入及原命令身份；Hub 历史文件 inbox 不自动重放。旧历史文件保持原样。
- 清理预览只读取 PLAN/配置引用与目录内的小型清单来发现归属；真正预检仍冻结内容指纹。清理状态读取实际执行器窗口与文件系统。旧操作历史不进入确认 revision。
- 默认移入 clean_dir；永久删除仍须同一批精确路径两次确认。中止/召回只关闭精确任务窗口，不清除科研产物或下载权重。

## 部署与验收边界

安装后用户执行 Developer: Reload Window，再通过插件更新全部启用 Worker 的 Agent/Scheduler，核对实际运行能力 taskLifecycle=2。本轮不自动部署生产服务器，不运行/重派 PLAN。
旧 Worker 缺少协议时，新提交明确阻断；精确停止和独立 Agent 重启不以历史 PLAN revision 或版本相等作为门禁。
重载后实际 UI、生产容器的 Agent 重启和原项目启动前预检仍待验收；本地回归不能替代这些结果。
