# 0.5.367 交付记录

## 原因与本轮证据

本轮经 discovery/capabilities 核对实际运行 SimpleExperiment 0.5.366，PID 47736，启动时间 2026-10-17T08:29:53.308Z；SimpleSFTP 0.2.94。state 主动读取 35 ms，当前项目 d:/GitRepo/MultiModal，concatenation 的 workflow 为 distributed-plan-1792051806669-mjcz21。其六个 job 均有 synced 确认，目标为 nwpu3、nwpu2、nwpu5、jqg_zlk，原确认时间从 2026-10-15T10:31:35.925Z 到 10:33:06.635Z；同一快照 PLAN 却为 checking、0/4 Worker、checkedAt 为空。

原因是 refreshPlanArtifactSyncStatus 没有读取 latestArtifactSync，而是将完整 PLAN 全部重置为 checking，再对所有目录和 Worker 进行另一轮清单/哈希查询。其他同步任务的全局等待也位于确认归并之前。job 和 PLAN 实际使用了两条不同的成功判断链路。

使用本轮读取的真实队列、当前四台 Worker 身份、勾选范围及本机路径操作记录回放新版判断，concatenation 得到 synced、4/4，source=job_confirmations，checkedAt 保留最早的 2026-10-15T10:31:35.925Z，没有远端文件读取。该回放验证原确认可以复用，不冒充本轮重新查过服务器文件，也不是安装后真实面板验收。

## 修改

PLAN 与 job 展示共用同步确认判断。复用绑定原项目、workflow、commandId、任务索引/完成事实、Worker、输出目录、CSV、完整勾选范围及目标 host/port/user/remotePath；补跑组合仍按每个 job 原 workflow 核对。只有全部 job 的确认覆盖当前完整范围及全部启用 Worker，PLAN 才直接显示全局同步完成。TTL、断线、客户端重建和普通/强制刷新不重置这些事实，不刷新原证据时间。

没有有效确认的 job 继续完整查询目录及外置 CSV；已确认的 job 不重复进入清单读取。慢查询、其他 PLAN 的镜像及手动传输不再拖住已确认 PLAN 的状态发布。较新的同步确认可立即发布，旧扫描不能覆盖它；发布使用新的状态对象，保证真实面板更新。队列、工作区、目标、勾选范围及路径操作变化保留迟到响应保护。查询失败保持未知，不生成同步确认。

未来成功同步在既有 job 确认中增加一个 64 位内容摘要；新观察到的产物哈希变化使旧内容确认失效，随后仍走既有逐 job 文件核实/同步流程，不改变科研任务 commandId 或重跑任务。原已有确认可以兼容复用，未要求用户重新传输已确认产物。用户后续路径操作使对应旧确认失效，未改变删除审核、双确认、安全根、直接父目录或 ./直接子项保护。

## 验证与现场边界

先单独运行目标文件复现：六个 job 已确认但 PLAN unknown/checking，且另一慢 PLAN 阻塞其显示。修复后同步状态 16 项、逐 job 同步 7 项、真实面板/控制投影 37 项通过，覆盖重载等价新实例、连续刷新、断线、其他同步进行中、混合补跑来源、配置/范围/身份变化、内容摘要变化、路径操作及晚到结果。实际渲染测试同时验证 PLAN 4/4 与 job 同步标签；替换目标服务器后二者不再误用旧确认。

补齐同步进行中的复用分支后，最终 npm run package 退出 0，包含完整 build、单文件串行回归、Windows flow、257 模块/2 入口闭包验证。lint、git diff --check、vm.Script 模块和真实渲染 script、UTF-8 中文复读通过；业务 src/dist 禁止端口零命中。没有发生 20 秒挂起后重试。

本轮现场只读，没有重新传输产物，没有启动、停止、重跑、重提或清理科研任务，没有修改科研源码、环境、原始指标、日志或权重，没有部署远端 Agent/Scheduler。原有全部启用 Worker 同步和完整文件核实保持有效。新版实际面板仍需用户重载后验收，当前不能宣称现场已解决。

## 源码、稳定发行、安装

源码提交 55338229fe0fcf01f9afbe49f8062199884ebb38 已普通 fast-forward 推送 origin/master，fetch 核对一致。未提交预先存在的 pyc、迁移脚本、历史校验清单或缓存。

稳定 [v0.5.367](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.367) 的真实 Latest 与 tag 均绑定该提交，draft=false、prerelease=false。simple-experiment-0.5.367.vsix 为 3101151 字节，SHA256 d82314970e4fe78efe68b47d41523a7442f63e07c9051e44acd4b495b7bef0cf；同名 .vsix.sha256 为 97 字节，绑定精确文件名。538 个 ZIP 条目、377 个 dist 文件，扩展身份、版本、universal 平台、锁文件、runtime 版本及 SHA256、运行字节与实际 discovery token/机器状态排除均通过。

实际安装旧版 0.5.366 的 ReleaseClient 已从真实 Latest 识别更新并下载包与清单，逐字节等于本机冻结包；远端资产大小及 digest 再核对通过。配套复用稳定 SimpleSFTP 0.2.94，真实下载为 170860 字节，SHA256 1452a52b9da84a89f760154b162d299cc79ff2496a945d67840450a75988aa92，未修改或重复安装。验证文件保留在 C:/Users/ZLK/AppData/Local/Temp/simpleex-0367-delivery-gtbf3q。

显式 npm run install:latest 只执行一次，0.5.367 安装成功，无 force、无降级。立即核对已安装版本、simpleex 入口及 --help，377 个已安装 dist 文件逐字节等于真实发行包；CLI 链接指向当前仓库 0.5.367。随后停止插件 API、面板及服务器操作，等待 Developer: Reload Window。本修复为 Host 状态归并，无需为复用这些确认而重新同步现场产物或升级远端 runtime。本回执不改变冻结包，也不再次构建、安装或发布该版本。
