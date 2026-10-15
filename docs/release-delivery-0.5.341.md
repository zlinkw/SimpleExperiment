# 0.5.341 实时进度与空卡派发修复

## 现场与根因

开发前通过正在运行的 0.5.339 插件主动查询 tasks.list、gpu.list 和 state，没有派发、停止或清理任务。查询确认 NWPU2 存在空闲卡，队列包含未绑定的 CPSC 重跑 job；NWPU2 当前代码版本与该 job 一致。新的 QA MOE 与部分旧任务代码版本不同，这类版本差异继续受保护，不能只凭空卡覆盖代码。

- 一次 Worker 准备部分失败后，`workerPreparation` 会保留。旧分配分支始终只采用该次 ready 集合，即使代码上传已经结束，也永久排除了 NWPU2 之类的其他 Worker。
- 进度刷新等待整组查询结束，慢 Worker 阻塞其他 Worker 的下一轮刷新。查询仅给 4 秒，同时展示仅认可 5 秒内快照；批量查询的短暂 pending 又被归并为连接失败或窗口不可用。
- 新鲜度及内存观察复用混用服务器时间与本机时间，远端时钟偏差会使刚取得的真实状态被判陈旧。
- 手动派发的旧勾选 Map 没有随新 commandId 剔除；画面已不再显示勾选，批量按钮仍可能发送旧身份。健康刷新重建客户端对象也会误触连接变化门禁。准备过程另直接写入没有本机回执时间的 Worker 快照。

## 实现

- `src/extension/legacy.ts`：Worker 独立刷新、每个 Worker 仅一条背景请求，共用现有查询合并；仍有取消与 15 秒有界等待。pending 不再伪造失败，实际超时保存明确错误。代码上传结束后，不再沿用旧准备名单限制分配。
- `src/features/DistributedSchedulingPolicy.ts`：上传期间才用当前 ready 集合约束目标；展示新鲜窗口为 20 秒，与 15 秒查询边界及 2 秒刷新间隔协调。已完整核实的当前产物在到期前继续主动核实。
- `src/features/DistributedPlanQueue.ts`：协议 2 新鲜度和本轮内存观察采用本机真实回执时间；服务器原始 observation 时间保留。pending 不证明窗口消失，也不能授权启动。真实查询失败、超时、过期及身份不符继续显示未知，原请求不能换身份重发。
- `src/extension/ManualDispatchHost.ts`：按稳定服务器、项目与端点配置校验连接；健康客户端对象重建不再误判。各 Worker 并行经过共用主动查询入口，保留 commandId、停止与产物双确认流程。
- `src/ui/PanelHtml.legacy.ts`：勾选及发送手动派发前移除旧 commandId；同 commandId 的正常状态变化保留选择。身份确实变化时只要求选择当前 job，不要求重跑 PLAN。
- package、lock 和 runtime 版本统一为 0.5.341。远端 Python 本轮仅同步版本，没有修改科研命令、模型、数据、指标或环境。

## 验证

先建立失败回归，重现部分准备名单排除空卡、pending 覆盖运行态、慢节点阻塞快节点、时钟偏差导致新鲜状态过期。新增集成回归验证实际分配器将未绑定重跑 job 分给空闲 NWPU2，并保留上传期保护；实际渲染脚本点击回归覆盖旧身份剔除，同身份状态变化、连接对象重建与真实端点变化分别验证。

最终 `npm run package` 的 115 次串行单文件执行共 760 项通过，零失败。TypeScript、实际渲染脚本、额外 vm.Script、VSIX ZIP/身份/版本/universal 平台、368 个 dist 字节、8 个 Python AST、运行闭包和秘密排除通过。打包日志为本机临时目录 `simpleex-0.5.341-package-final.log`。此前两次打包在提取式 UI 测试夹具遗漏新辅助函数时失败；修复夹具依赖及缩小渲染耦合后，单文件回归与最终完整打包通过，没有绕过门禁。

既有未纳入打包门禁的旧 `serverAuthoritativeProgress.test.js` 夹具问题参见 0.5.339 交付记录，本轮未将其宣称通过；新增当前协议回归直接覆盖本次行为。

## 交付

- 修复提交 `33b48126478b9f610f9a434c7541eeb385fd378a` 已普通快进推送 origin/master 并 fetch 核对一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.341>，真实 Latest 核对绑定该提交、draft=false、prerelease=false。
- `simple-experiment-0.5.341.vsix`：2,940,692 字节；SHA256 `b00357ef39889bbcb53ed245212d5c072d6a2278f98901532bbf2e1c8173a859`。精确同名 `.vsix.sha256` 资产已核对。
- 实际已安装 0.5.339 更新客户端确认 update_available，下载公开 VSIX 和校验和，与已验证本机包逐字节一致。配套 SimpleSFTP 0.2.90 指纹一致，未修改或重复安装。
- 显式执行一次 `npm run install:latest` 安装 0.5.341，无 force、无降级；已安装 368 个 dist 文件与发布包一致，安装版本和 `simpleex --help` 入口通过。
- 0.5.340 多选功能包含在此次安装中，中间版本没有安装。安装后停止访问当前 SimpleExperiment 面板及 API，等待用户 Developer: Reload Window。

未部署、重启或停止远端服务，没有实际重跑、自动接续或删除真实任务产物。重载后检查 NWPU2 实际接收、刷新节奏、手动派发和多选运行的界面验收仍待用户执行；合成分配通过不等同于已经启动科研 job。
