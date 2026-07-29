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
- [已完成] 1/5 project-041：缓存后端 Plan 作用域结果候选编译。
- [已完成] 2/5 project-042：审计并优化前端操作禁用原因重复派生。
- [已完成] 3/5 project-043：审计并优化下一组后端项目检测热点。
- [已完成] 4/5 project-044：收敛新周期静态回归与相邻契约。
- [待做] 5/5 project-045：执行第三十九轮完整非服务器静态测试。

## 当前批次：project-044（已完成）
### 修复点

- 前端 Plan 作用域预览与后端统一为“候选合并后一次编译、逐行匹配”的契约，消除两套匹配实现继续分叉的风险。
- 前端按不可变 Plan 与接入规则对象缓存候选和编译匹配器；Plan 或规则对象替换时立即失效。
- 预览行不进入缓存，同一 Plan 与规则下仍对每次最新结果预览重新过滤。
- 跨层测试固定 basename、精确路径、通配符、占位符、缓存命中和失效语义。
- 本批不扩展产品功能；源码、构建产物与静态契约必须同步。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 前后端必须继续对相同候选和预览返回相同作用域；大小写、Windows 路径和 `**` 语义不得变化。
- Plan 或规则替换不得命中旧编译值；预览数组替换不得复用旧过滤结果。
- 结果元数据排除和接入规则候选范围不得借契约统一被放宽。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 前后端 Plan 作用域匹配、缓存命中与替换失效、预览刷新定向测试，54/54。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理前后端 Plan 作用域匹配契约，最多修改 5 个源码、测试、构建和计划文件。
- project-041 至 project-044 使用定向静态测试，project-045 再执行完整测试。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：执行第三十九轮完整非服务器静态测试；本批使用独立 `perf` 提交并推送 `origin/master`，提交哈希以 git 历史为准。
