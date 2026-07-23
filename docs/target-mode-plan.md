# 目标模式当前计划：恢复源码完整性
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不修改安装目录，不覆盖 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。

## 后续优先级
- [待现场验证] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] SimpleExperiment 恢复基线、target mode 压缩契约和 UI 契约修复；全量测试基线 624/624。
- [已完成] Docker Codex 的 SimpleExperiment 与 SimpleSFTP 宿主路径接入、远程编辑器 URI 保留和传输位置确认，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [待现场验证] Docker Codex 的双插件多窗口租约、真实 SFTP 上传和 Xshell `127.0.0.1` 联调验收；两插件租约心跳截断竞态已修复，自动化验证通过。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：recovery-source-003
### 修复点
- 恢复 `PlanBuilder.ts` 为 TypeScript 模块源码。
- 仅移除 CommonJS 编译包装器并恢复 `crypto` 导入和公开导出，保留类型、重载和函数正文。
- 扩展源码形态回归断言，防止构建产物再次覆盖 TypeScript 源文件。

### 回归风险
- 相邻回归风险：Plan builder 的计划生成、校验、版本恢复和结果覆盖 API 必须保持完整。
- 行为风险：Plan YAML、模板变量、hash 和计划注册表行为不得变化。
- 外部边界：不运行真实实验，不写项目归档，不修改安装目录或已安装插件。

### 验证清单
- [已完成] SimpleExperiment `npm test` 通过 659/659；SimpleSFTP `npm test` 通过 18/18；两插件租约压力测试均通过 10/10，中文 UTF-8 租约标签回归通过。
- [已完成] 临时对照包未覆盖现有安装；SimpleExperiment VSIX 不含恢复异常文件或 Python bytecode。
- [已完成] SimpleSFTP VSIX 包含共享租约与工作区映射模块；两个独立插件模块互操作通过。
- [已完成] SimpleExperiment `0.2.1` 与 SimpleSFTP `0.1.3` 对照包的 manifest、package 版本和扩展 ID 一致。
- [已完成] 公开离线包改为直接写入全新版本目录；目标目录已存在时立即阻断，不删除、不覆盖旧 VSIX 或说明文件。实际打包与重复路径拒绝检查通过。
- [已完成] 两个源码 manifest 已清除安装态 `__metadata`；临时对照包分别为 138、8 个归档项，包内扩展 ID、版本和显示名不变，均不含该字段。
- [失败] 当前计划 A 输入缺少 `vscode-remote` 与 `127.0.0.1` 明示声明，且 `containerUser=root`；校验结果为 `failed`，不得生成兼容通过结果。
- [已完成] `PlanBuilder.ts` 源码形态恢复、编译产物对照和全量回归；全量测试 663/663、lint、构建和 diff 检查通过。

## 本批记录
- 上一完成批次：`docker-plugin-003`，本批验证记录与提交以 git 为准。
- 当前目标状态：共享租约、UI Host 激活和对照打包修复完成；跨平台 Git 工作区已稳定；Docker 兼容等待现场联调与正式交付。
- `docker-plugin-008`：源码 manifest 安装态残留已清理；全量测试、lint、临时打包和包内 manifest 检查通过，未安装或覆盖插件。
- `history-006`：独立视觉夹具与自动化检查已完成；本地页面自动截图不可用，桌面、高 DPI 和窄侧栏视觉检查保持 `needs field verification`。
- `recovery-source-003`：`PlanBuilder.ts` 已恢复为 TypeScript 模块并保留公开 API、重载和行为；定向测试 54/54、全量测试 663/663、lint、构建和编译产物语法检查通过。
