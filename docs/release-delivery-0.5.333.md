# 0.5.333 实时结果汇总交付

## 实现

普通结果汇总使用当前非归档 PLAN 的实际声明、启用 Worker 的真实 tmux 窗口、最终 artifact manifest 和声明指标。UI、API、CLI 与原解析入口共用内存收集服务，不用旧任务历史、同步账本、结果注册表或恢复日志回填结果。

结果专用 Agent 查询隔离于旧队列查询，只读取清单和指标的实时内容及哈希，权重仅核对存在、类型和声明大小。重复副本去重，内容或执行身份冲突显示原因。明确非零退出仍报告执行失败，产物完整状态单独显示。

每个 job 完成后自动更新，支持部分汇总；原有分组、别名、派生指标、均值和样本标准差公式保留。删除、离线和损坏分别处理，不借用旧 seed。全部查询失败时不覆盖原导出，并说明它不是本轮结果。

仅保存最新汇总 JSON 与 CSV/Markdown。单文件原子写入，中断后重建表格，没有结果发布日志或逐文件历史备份。结果目录只展示 JSON 声明的当前表格。多窗口用退出即释放的内核 IPC 协调，不依赖旧租约 JSON。既有旧文件没有自动删除。完整行为见 [最新结果汇总](latest-result-collection.md)。

## 验证

- 最终 `npm run package` 的串行单文件发布检查共 695 项通过，包含真实隔离 tmux、既有执行/停止/同步/覆盖回归与新增结果收集测试。
- 新增回归验证无旧登记收集、逐项非法查询隔离、复制后 inode 变化、权重内容零读取、同一副本去重、部分统计、冲突、删除、断线、取消、重载、自动完成、API/旧入口、并发请求及真实内核占用释放。
- 单文件写入中断后 JSON 保持完整，CSV/Markdown 可重新生成。临时夹具仅生成一份最终 JSON 和表格，没有原始指标、registry、publication、provenance、lease 或备份文件。
- 完整输入下统计输出与原计算函数一致；单 seed 标准差留空。
- 附加 vm.Script 验证编译面板模块及三个真实渲染脚本；VSIX 中七个 Python 文件 AST 校验通过。
- 实际 VSIX 共 487 项，其中 364 个 dist 文件逐文件匹配构建输出，482 个文本条目通过凭据模式检查；身份、版本、平台、运行闭包和敏感路径排除通过。
- 额外旧 `stopRoutingAndResultParseDedup.test.js` 的 VM 夹具存在缺少 require/DistributedPlanQueue 的失败，不计入上述通过计数。完整历史测试集没有宣称全部通过；本轮没有修改停止逻辑。

## 发布与安装

- 源码提交：`cc22e40627ed894efcc3de74d007c2e4a460b550`，普通 push 后 fetch 确认与 origin/master 一致。
- 稳定 Release：https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.333 ，实际 tag 和 Release 均绑定上述提交，非 draft/prerelease，Latest 为 v0.5.333。
- 资产：`simple-experiment-0.5.333.vsix`，2893125 字节；同名 `.vsix.sha256` 98 字节。
- SHA256：`9fa0c908daf37b3758096fd15a33eb4621edc51075dd1ddfdaac2373c9b9cb5a`。
- 使用真实已安装 0.5.332 更新客户端确认 update_available；下载真实 Latest 资产，核对文件名、字节、SHA256、身份和平台，与本机已验证包完全一致。
- SimpleSFTP 继续复用公开稳定 0.2.90；真实更新源资产 168173 字节、SHA256 `d7fcbc0df6eb606d52146e28c30cb1f75851da01e29042a403127f3ffeb4eb65`，与已有本机包一致，没有修改或重复安装配套插件。
- 最终仅执行一次 `npm run install:latest`，VS Code 列出 SimpleExperiment 0.5.333、SimpleSFTP 0.2.90。364 个已安装 dist 文件与发布包逐文件一致；package.json 仅增加 VS Code 自身安装元数据。simpleex 入口及 --help 正常。

安装后未操作当前面板或调用插件 API。等待用户 Developer: Reload Window 后，通过插件更新 Worker Agent/Scheduler 至支持 `resultCollection=1`，再验收实际入口。本轮未部署、重启或修改远端服务，未停止、重跑、改派任务，未同步生产项目或删除真实产物；实机结果拉取与自动完成更新仍为待验证。
