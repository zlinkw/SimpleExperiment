# 0.5.330 任务结束与 Worker 协议误报修复

## 实现与现场证据

H20 的六个 Concatenation job 均已结束，项目执行报告 returncode=0，当前 commandId 的真实完成清单及声明权重、测试结果经主动查询核实。tmux 3.2a 的保留窗口返回 pane_dead=1，但退出码字段为空。客户端把 null/undefined 视作非零，Worker 把 None != 0 视作失败，因此把有效完成结果误报失败。

客户端与 Worker 现统一处理：窗口已结束但退出码未知，不能据此认定失败；当前运行清单完整且核实通过时显示完成，缺失、不完整、其他运行的清单继续待核实。明确非零退出始终显示失败，即使存在成功清单也不能覆盖执行错误。没有新增退出码文件、历史恢复或推送依赖。

新增截图中的协议错误也已核对。H20 实际运行 0.5.329，实时能力响应包含 taskLifecycle=2、declaredJobPaths=true、formalJobIdentityEnv=1、taskShellEnvironment=1 与 projectManagedValidation=1，安装的 Scheduler 也声明相应协议。提交逻辑原先直接读取共享的最近探测对象；后台连接探测失败丢失能力字段后，会在提交边界误报协议不兼容。

提交检查、入队和实际派发现在仅对异常或缺失能力的目标重新发起有界主动查询，使用当前配置的动态端点，保留真实项目根核对。连接失败显示节点、阶段与原始原因并允许重试；确实缺少协议仍阻止提交。同一边界使用取得的完整响应，不被稍后后台探测覆盖。工作区、连接、停止或队列变化后不继续发送。保留首个 Worker 就绪即允许本机入队的规则及其余 Worker 的准备检查。

## 验证

- 新增客户端和真实隔离 tmux 回归在旧判定下失败，修复后通过。覆盖空退出码、当前完成清单、其他运行清单、未产生产物和明确非零退出；队列刷新能够修正旧 Worker 返回的错误失败标签。
- 新增真实提交方法回归覆盖 H20 能力丢失后复查、原始连接错误、真正缺少协议、工作区变化，以及复查期间停止/替换队列后不发送任务。
- 最终 `npm run package` 串行执行的发布检查 658/658 通过，包含构建、面板脚本和真实隔离 tmux。Python AST、额外 vm.Script、VSIX 身份/平台、运行闭包及秘密排除检查通过；361 个 dist 文件与验证包逐文件一致。
- 对六条 H20 当前真实观测仅在本机内存使用新判定复核，六条均为 completed，没有提交、重跑或修改服务器状态。

额外执行的两个历史套件仍有既存失败：`formalIdentityContract.test.js` 两项失败；`distributedPlanExecutionMode.test.js` 六项失败、三项通过。以修改前提交 3648b31c 的 Host 源码和编译产物进行同样的隔离替换后，得到相同失败。原因包含固定七份消费项目旧 PLAN 的断言、缺失 WorkflowBinding/vscode 的旧测试替身、旧完成快照断言及方法文本截取失效。这些额外历史套件没有通过，不计入上述 658 项发布检查，也未在本次扩展修复范围。

## 真实交付状态

- 运行源码提交：`b2e0fbad24e20cc4713de3218dcb2eba87556c93`，已普通推送并 fetch 核实 origin/master 一致。
- 稳定发行：https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.330 ，绑定上述提交，非 draft/prerelease。
- 包：`simple-experiment-0.5.330.vsix`，2873347 字节；同时发布同名 `.vsix.sha256`。
- SHA256：`2ff99fd633a82282a92f2e66fcc90c400f08e249707f4d87251660fb391d81b3`。
- 已安装 0.5.329 的真实更新客户端能够发现 Latest 0.5.330，并下载真实资产核验版本、平台、绑定提交、大小、SHA256 和与本地发布包字节一致。SimpleSFTP 0.2.90 的原发行包再次核实，可继续复用，无需修改或重装。
- 最终仅运行一次 `npm run install:latest`，安装并核实 SimpleExperiment 0.5.330、SimpleSFTP 0.2.90、关键安装文件字节及 simpleex 入口。安装后停止操作当前插件面板及 API，等待用户 Developer: Reload Window。

本次没有停止、重跑、改派、清理任务，也没有更新或重启生产 Agent/Scheduler。客户端重载后可依据旧 Worker 返回的真实观测修正卡片。包内 Agent/Scheduler 已同步为 0.5.330，远端仍保留原服务，后续可通过既有“准备 Agent”流程更新。重载后的实际面板验收及远端新版运行验证待用户执行。
