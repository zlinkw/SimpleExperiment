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
- [已完成] 1/5 project-071：缓存 Agent 会话 Webview 状态。
- [已完成] 2/5 project-072：缓存服务器配置来源状态。
- [已完成] 3/5 project-073：缓存工作区与项目接入状态。
- [已完成] 4/5 project-074：缓存前端项目环境与位置摘要。
- [待做] 5/5 project-075：执行第四十五轮完整非服务器静态测试。

## 当前批次：project-074（已完成）
### 修复点

- Webview 复用项目上传位置、执行环境和本地工作区摘要。
- 缓存仅绑定对应 Agent、服务器配置、Worker、项目依赖清单和工作区输入。
- 任一摘要有效输入变化后立即失效，现有展示文本和运行门禁保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Hub/Worker 上传目录、Worker 启用状态和项目名变化必须立即刷新。
- Hub/Worker Conda 环境和依赖清单变化不得显示旧摘要。
- 工作区打开状态、多根工作区、映射错误和容器路径变化必须立即刷新。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 三类摘要缓存命中、输入替换失效和原有文本语义定向测试，17/17。
- [已通过] TypeScript 构建、Lint、相关 Node 文件语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-071 至 project-075 五批静态优化周期；project-075 再执行完整测试。
- 本批只处理前端项目环境与位置摘要，最多修改 4 个源码、测试、构建和计划文件。
- 定向回归覆盖上传位置、执行环境、依赖清单、工作区切换和路径映射摘要。
- 真实服务器行为保持 `needs field verification`。
