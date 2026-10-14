# 文件状态主动查询修复

版本：SimpleExperiment 0.5.311，配套 SimpleSFTP 0.2.85。

服务器文件是否存在，以当前文件系统查询为准。tmux 窗口负责执行状态。本机只保存尚未结束的请求目标与确认输入；旧请求、回执、索引和任务登记不再证明文件存在或要求再次审核删除。

永久删除完成后不保存文件清单、指纹或恢复/审计载荷，也不出现在审核列表和启动提醒。最小完成请求身份仅用于拒绝重复执行。已存在的其他历史资产不自动清扫。

本轮修复：

- 启动重连时直接查询精确目标。全部不存在便结束对应请求；部分服务器不存在时，只提示仍有文件或未查询成功的服务器。
- 两个审核页移除已不存在的文件行，显示“所选文件已不存在，无需清理”，不再要求确认无文件的删除。
- SimpleSFTP presenceOnly 查询只读取路径和类型，避免哈希整棵产物树。已经发送的清理请求还直接查询相关 tmux 窗口；不读取旧 token 来判断实际执行状态。清理窗口仍在运行或查询失败时，不自动重复执行，也不启动覆盖重跑。
- “校验并提交运行”的真实 UI 路径将两个本机字段创建为只读，后续统一提交流程再次赋值，导致 TypeError。修正其可写属性，继续保持不可枚举及原 operationId。

验证：先复现原 TypeError、删除后反复审核及旧删除误标记相同路径的新任务，再通过生产调用链回归。cleanupMissingTargets 10 项、planRunQueryRegression 6 项、planCleanupPanelBridge 19 项；配套 SimpleSFTP 真实隔离 tmux 检查存在/不存在及活动执行器。正式 package、发行与安装结果在交付时补充。未访问、同步或删除生产文件，未启动科研训练；真实窗口重载后的验收另行完成。

交付结果：两插件完整 package 通过，包括串行回归、Windows 流程、运行依赖闭包。3 段实际渲染的面板脚本、Python 语法、UTF-8、VSIX 身份、平台和运行文件逐字节校验通过。旧的“删除完成后仍须确认元数据回执”测试按本轮明确规则替换为主动查询用例；普通移走/恢复及双确认保护继续通过。

- [SimpleExperiment v0.5.311](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.311)：e33b2e127dcc449af364001e03dc253d5605b144；2779868 字节；SHA256 db520e2c5c641593e928f2deb91d37611ab419a2b9a7f6f00e827e08211fd93b。
- [SimpleSFTP v0.2.85](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.85)：cebf5c94c16f9e22abb9b0c1fc52828a38e1d270；164047 字节；SHA256 edd45245e59fc4f95d8322133d0a50029355e41008ba700c5a68c6b050ecae3b。

源码均普通推送并 fetch 核实。实际 Latest、tag 提交、稳定标志及两个精确包的 SHA256 已核对；使用原安装版 0.5.310 的更新客户端真实下载到内存，旧版能看到更新，远端资产与本机安装包完全同字节。

两插件各执行一次 install:latest，已核对安装版本 0.5.311 / 0.2.85 和 simpleex 入口。安装后未操作现有面板。用户需 Developer: Reload Window，并通过插件更新启用 Worker 的 Agent/Scheduler 至 0.5.311；没有自动重派原失败 PLAN。真实服务器与重载后实际入口仍待验收。
