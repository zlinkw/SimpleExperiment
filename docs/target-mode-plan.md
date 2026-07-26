# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 当前不连接服务器，只执行本地静态检查且不重载、关闭 VS Code；每批最多 8 个源码/文档/测试文件并推送 `origin/master`，每 5 批执行一次全量静态测试。

## 后续优先级
- [已完成] 2/5 前端：优化服务器配置分区的校验反馈。
- [待做] 3/5 后端：审计 GPU 历史采样与保留。
- [待做] 4/5 前端：优化资源树与检查器的定位一致性。
- [待做] 5/5 前后端：执行第二十三轮非服务器静态测试。

## 当前批次：autonomous-ui-112（已完成）
### 修复点

- 有界配置字段在标签旁直接标出允许范围，取值约束不再只存在于 HTML 属性中。
- 越界或非数字取值渲染具体原因，字段加 `is-invalid` 边框与 `aria-invalid`。
- 空值与无界字段不产生任何提示，避免噪声。
- 增加范围文案、越界判定、调度器边界与渲染接线测试。

### 相邻回归风险

- 允许取零的字段（如抖动秒数）不得被误判为越界。
- 空字段必须保持静默，不得在首次渲染时报错。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] 全量静态测试 815/815。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 保存路径直接读取 `input.value`，`min`/`max` 属性拦不住越界值，已保存的越界配置此前完全不可见。
- 本批只做渲染期反馈，不改动保存链路，避免与配置草稿机制耦合。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
