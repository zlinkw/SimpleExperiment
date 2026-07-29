# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 服务器拓扑必须支持“单 Worker”“仅多 Worker”“Hub 可用”三种模式；无 Hub 模式由各 Worker 自行调度且不尝试创建 Hub 或跨节点备份，详细契约与实施流水见 `docs/target-plans/worker-topology-modes.md`。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + 可选 Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。

## 后续优先级
- [已完成] 1/5 project-056：缓存前端 Plan 结果轨迹作用域派生。
- [待做] 2/5 project-057：缓存结果摘要筛选与 Webview 压缩结果。
- [待做] 3/5 project-058：缓存文件传输 Webview 压缩结果。
- [待做] 4/5 project-059：缓存合并后的 GPU Webview 快照。
- [待做] 5/5 project-060：执行第四十二轮完整非服务器静态测试。

## 当前批次：project-056（已完成）
### 修复点

- 前端按规范化轨迹数组、状态对象和作用域模式缓存当前 Plan 的结果轨迹筛选结果。
- 同一渲染周期内结果工作流、证据工作台和轨迹区不再重复遍历全部轨迹。
- 轨迹数组、状态对象或作用域模式替换后失效，Plan revision 与更新时间匹配语义保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- selected 与 all 两种轨迹作用域必须继续区分，未选择 Plan 时不得误隐藏轨迹。
- Plan 文件等价匹配、revision 和 updatedAt 边界不得变化。
- 缓存必须按输入对象替换失效，不得让新状态沿用旧筛选结果。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Plan 结果轨迹作用域缓存命中、失效和语义定向测试，12/12。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-056 至 project-060 五批静态优化周期；project-060 再执行完整测试。
- 本批只处理前端 Plan 结果轨迹作用域派生，共修改 5 个源码、测试、构建和计划文件。
- 缓存使用轨迹数组和状态对象双层弱引用，每组只保留 selected 与 all 作用域变体。
- 真实服务器行为保持 `needs field verification`。
