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
- [已完成] 1/5 project-086：缓存前端资源树搜索文本。
- [待处理] 2/5 project-087：缓存 Extension Host 远端写入目标归一化。
- [待处理] 3/5 project-088：缓存前端 GPU 历史颜色转换。
- [待处理] 4/5 project-089：缓存 Extension Host UI 操作归一化。
- [待处理] 5/5 project-090：执行第四十八轮完整非服务器静态测试。

## 当前批次：project-086（已完成）
### 修复点

- 为资源树节点搜索文本增加按对象身份复用的 `WeakMap` 缓存。
- 递归搜索文本在同一节点对象上复用；节点对象替换后自然失效，字符串 HTML 提取路径保持原语义。
- 增加定向回归，覆盖同一节点复用、替换节点重新计算和字符串提取。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 缓存不得跨节点对象复用，避免资源树节点替换后残留旧搜索文本。
- 缓存不得改变大小写归一化、子节点递归或 HTML `data-search-text` 提取语义。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 资源树定向 Node 测试，8/8。
- [已通过] `git diff --check`。
- [已修复并重验] 首次新增断言未考虑原搜索文本保留字段间空格；调整为独立检查父子文本后定向测试通过。

## 本批记录
- 本轮建立 project-086 至 project-090 五批静态优化周期；project-090 再执行完整测试。
- 本批修改前端资源树实现、对应定向测试和计划文档，不改变可见 UI。
- 下一批边界为 project-087，仅处理远端写入目标归一化缓存及其定向测试。
- 不调用无感截图；前端视觉验收留给后续人工确认。
- 真实服务器行为保持 `needs field verification`。
