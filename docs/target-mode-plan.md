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
- [已完成] 1/5 project-216：为设置页建立专用有界渲染模型，避免对完整 Webview state 哈希。
- [已完成] 2/5 project-217：合并主面板布局顺序成员检查。
- [待处理] 3/5 project-218：复用单次读取的结果 CSV 目录配置，减少状态与动作路径重复配置解析。
- [待处理] 4/5 project-219：审计下一组前后端高频派生热点并实施一个有证据的有界优化。
- [待处理] 5/5 project-220：执行第七十四轮完整非服务器静态测试。

## 当前批次：project-217（已完成）
### 修复点

- 在主面板布局应用路径复用一次顺序成员索引，避免每张卡重复线性扫描布局顺序。
- 保持布局顺序、未知卡片追加、折叠状态、资源树子项顺序和三列布局行为不变。
- 增加定向静态回归，锁定成员索引复用和原有抽屉布局能力。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 成员索引只能替代查找，不得改变未知分区追加顺序或重复 DOM 节点处理。
- 测试生成物不得混入提交；仅提交面板源码、对应生成文件、定向测试和计划记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 布局成员索引、抽屉布局、主列滚动、项目布局状态及面板脚本测试，7/7。
- [已通过] `npm run build`、`npm run lint` 与生成 JavaScript 语法检查。
- [已通过] `git diff --check` 与提交范围检查；仅有既有 Windows 行尾提示。

## 本批记录
- 基线为 `ec494b0`，本地 `HEAD` 与 `origin/master` 一致。
- 本批限制为 `src/ui/PanelHtml.ts`、对应生成文件、一个既有定向测试及本计划文档。
- 主面板未知分区仍按原 DOM 顺序追加；布局顺序成员判断改为单次 `Set` 索引。
