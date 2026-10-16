# 0.5.355 慢启动执行查询与显卡归属

现场只读核实运行中的 0.5.354：H20 遥测在线，GPU 2 有托管 Python 训练进程，但本机没有识别为本次提交的进程；H20 的整批任务查询超过 15 秒，45 个登记均显示 unknown。NWPU2、NWPU3 同样有整批查询超时，不能仅据此认定是 H20 初始化本身失败。

原实现将当前 tmux 执行、终态产物核实和原始日志分析放在同一批响应中。整批超时既抹掉当前执行观察，也使显卡归属失去所需回执。原生 executionOnly 入口虽然存在，却缺少归属匹配所需的公开身份及运行阶段状态。另外，控制窗口取消标记查询失败没有记入本轮内存，每个历史任务会再次发起同一失败查询；合成 45 个任务复现了这个放大路径。

现在优先读取一次轻量原生窗口清单，不读取产物、日志及分块启动载荷；没有可靠完整观察时立即显示本轮执行证据。后续产物/日志查询超时不抹掉这个执行观察，结果仍为未核实，绝不将旧结果改为本轮证据，也不重发原任务。正常完整观察更新期间不先闪回未核实。只有实际运行阶段和精确窗口、commandId、项目、Worker 匹配才能建立显卡归属；旧子进程无新环境身份时，还须严格匹配实际配置、输出、case、seed，外部负载继续显示为其他进程。启动中、死窗口、重复或错误身份不能占用“我的进程”标记。

取消标记每轮每 Worker 最多查询一次，包括失败；失败不证明取消。轻量执行证据不能代替正式提交前的完整任务/清理窗口检查，避免绕过输出占用检查。保留既有完成判定、非零退出报错、日志异常分析和清单真实性规则，不新增状态文件或固定端口。

回归覆盖慢结果查询先发布启动状态、超时后保留本轮窗口、真正离线、正常完成不闪烁、禁止用执行清单授权覆盖、启动/运行/非零退出/未知终态、45 个历史任务仅一次失败取消查询、旧进程精确归属及其他用户隔离。

额外检查的旧 test/features/serverAuthoritativeProgress.test.js 有 7 项既存失败；用 HEAD 原始 Host 源码重新执行得到相同 7 项，其中包括旧身份/终态夹具与缺失 cleanupDigest 的隔离依赖。该文件不在现行打包门禁，不以修改生产行为迎合旧夹具；本次使用现行协议 2 的 taskProgressStability、progressDispatchFreshness 等实际门禁验证。

不启动、停止、召回、重跑科研任务，不更改服务器环境、日志或产物。远端实机验收须在用户重载插件并通过原入口更新 Agent/Scheduler 后进行；本次不自动部署远端。

## 构建验证

npm run package 完成 118 个串行门禁文件，810 项通过、0 失败；包含真实原生 tmux 生命周期与运行时异常链路合成测试。三个实际渲染脚本及编译模块通过 vm.Script 校验，无固定禁止端口。VSIX 的 252 个本地模块运行闭包、身份/版本/平台、秘密排除及 8 个 Python AST 通过，372 个 dist 文件与本机构建逐字节一致。

确定安装包 simple-experiment-0.5.355.vsix 共 521 条 ZIP 记录，3,018,088 字节，SHA256 为 4790d865abd5d9a40b5ea8ce7cbce017096ebc6be6d582a6eb3a353f8284c060；同名 .vsix.sha256 绑定精确文件名。包内本文为验证补记前版本，补记不更换已经验证的包。

## 实际交付

源码提交 2d7df52d55957987128dc63984e9df06dc1d8653 已普通推送 origin/master，fetch 确认一致。稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.355，tag 和 target_commitish 均绑定该提交，draft=false、prerelease=false。VSIX 资产大小及 GitHub digest 与上述确定包一致，98 字节校验清单绑定精确文件名。

已安装旧版 0.5.354 的实际 ReleaseClient 从真实公开 Latest 识别更新，并实际下载 Experiment 0.5.355 与既有 SimpleSFTP 0.2.91 两个 VSIX 及校验清单；扩展身份、平台、版本、大小、SHA256、GitHub digest 和本机包逐字节比对通过。隔离核验目录 C:/Users/ZLK/AppData/Local/Temp/simpleex-0355-release-verify-eevw78。复用的 SFTP 包为 169,109 字节，SHA256 e483156ad117fd8c3aaeb81d01fc0285ad6ce7c698827b589ad16596a9ea453e，未修改、降级或重复安装配套插件。

本机仅显式执行一次 npm run install:latest，实际安装 SimpleExperiment 0.5.355；372 个安装 dist 文件与确定 VSIX 字节一致，simpleex --help 正常。安装后不再调用当前面板/API，等待用户 Developer: Reload Window。远端未自动升级或重启；本次现场只读诊断来自旧运行版，修复后的真实 H20 初始化及进程归属仍待用户更新 Agent/Scheduler 后验收。全程未对现有科研任务、环境和产物执行变更。
