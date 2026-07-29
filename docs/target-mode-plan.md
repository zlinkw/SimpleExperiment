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
- [已完成] 1/5 project-051：缓存项目检测 Webview 压缩结果。
- [已完成] 2/5 project-052：缓存 Extension Host 稳定状态快照压缩结果。
- [待做] 3/5 project-053：缓存前端固定操作归一化结果。
- [待做] 4/5 project-054：缓存 Xshell 会话库 Webview 压缩结果。
- [待做] 5/5 project-055：执行第四十一轮完整非服务器静态测试。

## 当前批次：project-052（已完成）
### 修复点

- Extension Host 按对象身份缓存 Xshell 设置、Hub/Worker 探测、健康状态和代码同步 Webview 摘要。
- 高频心跳不再重复复制 Worker 设置、能力、警告和同步失败摘要。
- 任一源对象替换后独立失效，未安装、未知健康和空探测语义保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 设置、Hub 探测、Worker 探测、健康和代码同步对象替换后必须刷新对应摘要。
- 能力、文件能力、依赖、警告、敏感文本裁剪和同步失败计数不得变化。
- 空探测继续返回 `undefined`；空健康和空代码同步继续返回原默认结构。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 稳定状态摘要缓存命中、各源替换失效和原字段语义定向测试，8/8。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-051 至 project-055 五批静态优化周期；project-055 再执行完整测试。
- 本批只处理 Extension Host 稳定状态 Webview 压缩路径，最多修改 4 个源码、测试、构建和计划文件。
- 设置、探测、健康和代码同步状态均按源对象弱引用缓存，替换源对象即可独立刷新。
- 真实服务器行为保持 `needs field verification`。
