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
- [已完成] 1/5 project-211：索引配置预览规范化文件路径。
- [待处理] 2/5 project-212：合并比较统计配对值遍历。
- [待处理] 3/5 project-213：索引输出能力缺失文件与列。
- [待处理] 4/5 project-214：合并主面板布局顺序成员检查。
- [待处理] 5/5 project-215：执行第七十三轮完整非服务器静态测试。

## 当前批次：project-211（已完成）
### 修复点

- 配置预览静态索引增加规范化文件路径 Map，避免每次渲染 Plan 基准时线性查找并重复规范化路径。
- 保持重复规范化路径首项优先、筛选排序、搜索和当前选中配置行为不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 规范化路径必须继续忽略大小写、统一反斜杠并去除开头 `./`。
- 同一路径重复配置必须继续选择第一项，不得因 Map 末项覆盖改变基准。
- config inspector 缓存失效、目录筛选和差异比较不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 配置路径索引、首项优先、缓存失效和基准查找定向 Node 测试，3/3。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-210 已由提交 `37de349` 同步至 `origin/master`。
- 本批仅处理前端配置预览文件路径索引、对应测试和计划文档；无视觉样式变化，不调用截图。
- 静态索引单次建立规范化文件路径 Map；Plan 基准改为直接查找并保持重复路径首项优先，3/3 定向测试通过。
