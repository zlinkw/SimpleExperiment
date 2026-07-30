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
- [已完成] 1/5 project-151：复用前端 Plan 运行阶段集合。
- [已完成] 2/5 project-152：复用前端实时信号集合。
- [已完成] 3/5 project-153：复用后端 WeakMap key 判定助手。
- [待处理] 4/5 project-154：复用后端 Xshell 回环地址集合。
- [待处理] 5/5 project-155：执行第六十一轮完整非服务器静态测试。

## 当前批次：project-153（已完成）
### 修复点

- 新增统一 WeakMap key 判定助手，接受非空对象和函数。
- 复用 Webview 压缩、Hub/Worker 状态摘要和引导式 Plan 配置缓存判定。
- 同步四组 VM 测试沙箱并增加助手语义与调用回归。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 稳定对象或函数输入仍命中 WeakMap，替换对象仍使缓存失效。
- `null`、布尔值、数字和字符串不得作为 WeakMap key。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和后端 JavaScript 语法检查。
- [已通过] WeakMap 助手与四组缓存定向 Node 测试，13/13。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-151 至 project-155 五批静态优化周期；project-155 再执行完整测试。
- project-150 至 project-152 已由提交 `98706f9`、`a76fe9d`、`029f779` 同步至 `origin/master`。
- 本批仅处理后端 WeakMap key 判定助手、对应缓存测试和计划文档；无视觉变化，不调用截图。
- project-153 构建、后端语法与 13/13 定向测试通过；下一批仅处理后端 Xshell 回环地址集合。
