# 0.5.360 状态证据独立刷新

## 本轮现场证据

2026 年 10 月 17 日北京时间，本机安装与 Extension Host 实际运行均为 0.5.359，runningBuildId 与 diskBuildId 一致。SimpleSFTP 为 0.2.91，API 工作区为 D:/GitRepo/MultiModal。通过 discovery、实时 capabilities/openapi 和本机插件 API 只读查询，没有直接 SSH、任务控制、科研文件修改或清理。

agents.lifecycle inspect 确认 nwpu3、nwpu2、nwpu5 的实际 Agent 与 Scheduler 均为 0.5.359。H20 jqg_zlk 两次 inspect 返回 unhealthy，runningVersion、identity、schedulerRuntime 均为空，仅实际文件哈希与精确 Agent 窗口 @198 可得。不能用磁盘文件版本补成 H20 当前运行版本。其任务接口仍可返回当前执行与产物观察；专用窗口只读 capture 没有诊断文本。

H20 的 generatedAt 相对本机 fetchedAt 约慢 33 秒；另外三台约快 4 秒。协议 2 的此次“状态查询已过期”判断实际使用本机 fetchedAt，因而不能把远端钟差当作本轮主因。

通过 scripts/inspect-progress-freshness.js 对 cpsc seed43 的同一个 commandId 12a6bad01552b615bb3401b85abea391 记录本轮真实接口投影。以下时间为 UTC，换算北京时间加八小时。

| 边界 | 本轮证据 |
| --- | --- |
| 本机诊断请求开始 | 2026-10-16T16:41:39.617Z |
| 返回快照的本机执行接收时间 fetchedAt | 2026-10-16T16:41:31.823Z，诊断请求加入了已有共享轮次 |
| 远端 generatedAt | 2026-10-16T16:40:59Z，仅作远端时间标记 |
| tasks.list 返回 | 2026-10-16T16:41:46.778Z，diagnosticsPending=true，日志等待触发 15 秒轮次超时 |
| UI 投影显示 completed、exited、complete | 2026-10-16T16:41:47.311Z，此快照年龄 15488ms |
| 同一轮快照被判过期 | 2026-10-16T16:41:52.667Z，年龄 20844ms，阈值 20000ms；投影变成 unknown、unknown、unverified |
| 后续轮次再次恢复 completed | 2026-10-16T16:42:02.328Z，之后仍重复波动 |

0.5.359 没有记录进入网络、逐项产物接收、日志接收和实际 store 的时间，不能从这份旧运行时补造这些时间。这里的 API 返回时间也不冒充 store 时间。新增的内存 timing 数据及 panel.diagnostics.progressEvidence 支持下一次重载后取得这些真实边界。诊断脚本的 lastApiSnapshotAgeMs 始终指最后一次 tasks.list 返回的那份快照，不把后续轮次误标成同一份缓存。

CORIM PAD seed44 commandId 77f6cf6556334e6ab3f2a5d9bf5f57d1 的本轮任务观察仍为无窗口、result=null、unknown/missing/incomplete，未取得有效完成清单，未补成完成。

## 可复现链路与修复

原链路为 refreshServerPlanProgress 两秒触发、readWorkerTaskSnapshot 共享请求、refreshWorkerTaskSnapshot 执行库存查询、queryWorkerProgress 元数据查询与日志查询、storeWorkerTaskSnapshot、serverPlanProgress、mergeDurableWorkerSnapshots、taskLifecycle，最后进入 distributedPlans 和 summarizePlanStatuses。15 秒轮次中的 fetchedAt 固定在执行库存返回时；缓存保护在旧完整缓存存在时丢弃 executionOnly 或 diagnosticsPending 的新中间观察。日志占据普通请求槽并延迟共享请求结束，使旧观察在下一轮新执行与元数据已经收到时仍留在 UI。全局过期 queryError 又将产物一并清成 unverified。

新增回归先在真实 host 方法与真实 queryWorkerProgress 的组合处失败：旧缓存为 19 秒，执行与元数据依次收到后为 21 秒，日志仍等待，当前新证据没有发布。另一失败回归证明执行过期与新产物无法分别判断。修复后保留 20000ms 阈值，没有延长 TTL 或刷新旧证据时间。

执行、产物和日志各保存本机 requestedAt、networkStartedAt、receivedAt。networkStartedAt 在 RequestBudget 真正放行、即将 fetch 时记录，年龄从此计算，排队时间与网络观察时间分开。远端时间仅供诊断。日志等待不改变执行或产物时间。快照 publishedAt 仅记录发布，不参与远端证据新鲜度。

执行观察立即发布，并保留上一轮独立带时间的产物和日志；元数据每批立即发布。日志后台核实不占用 15 秒前台轮次，同一选择共享请求，并使用每 Worker 一个、全局两个的独立日志槽位。普通并发设为一时也不阻塞元数据与执行/停止请求。失败分别归入对应证据，日志异常仍待复核，非零 native 退出仍失败。

迟到日志按每条证据的 networkStartedAt 归并，不能回滚新的执行与产物，也不能覆盖更新轮次的查询失败。请求按项目、commandId、输出选择隔离；连接换代拒绝旧成功响应，本机共享请求也包含换代，替换 client 不等待旧请求。工作区和 client 身份保护继续保留。投影缓存计入证据时间变化，并按每类证据的到期点失效。查询失败保留未知，不把执行过期解释成产物缺失、指标无效或任务失败。

诊断仅在内存保存当前有界快照时间，不持久化原始任务状态、token、日志或指标。诊断脚本只调用实时发现的本机只读方法。

## 本轮追加规则：完成确认固定

按用户本轮追加要求，AGENTS.md 和实现均增加固定完成确认。只有同一精确任务取得产物完整、退出码 0 和日志核实无异常，才在既有本机队列保存简短确认事实。完成确认跨刷新与重载保持完成，不因 TTL、离线、排队、日志慢或复查失败降低 PLAN 完成数；原远端证据时间保持不变，复查未知单独记录。

更新的真实产物缺失、大小或哈希不符、清单身份冲突、非零退出或运行异常证据解除清洁确认，继续要求用户处理，不自动重新运行或清理。确认绑定项目、工作流、任务索引、Worker、commandId 和声明输出路径，不跨任务复用，不能授权运行、停止或删除。日志尚未核实的任务不补成“完成无误”。

Agent 的清单探测改用显式 stat 区分 FileNotFoundError 与权限/NFS I/O 异常。仅成功查询后明确缺失或无效的清单发出 artifactIssue；I/O 异常保持复查未知。旧 Agent 返回的模糊 result=null 不足以撤销完成确认。新字段属于本批 runtime 变更，未自动部署到远端，现场完整验收仍需用户更新运行时。

## 验证与交付

最终 npm run package 完成 123 个串行测试文件，859 项通过、0 失败。新增 18 项独立证据回归和 8 项固定完成回归，覆盖慢日志、共享请求、普通并发一、实际网络排队边界、部分成功、真实非零退出、断线重连、client 替换、远端钟差、迟到响应、独立证据过期、已知异常和连续 24 轮刷新后的 PLAN 计数。另单独通过 RequestBudget 11 项及相关目标回归。

补充固定完成、重载恢复、复查失败、模糊空结果、查实缺失/损坏、身份隔离、迟到旧缺陷、非零退出及异常复核测试。首次广泛构建发现 startIntent 对独立执行查询错误漏设保护，已补正并单独通过 distributedSchedulingModes。显式 stat 的旧 mock 缺少清单元数据已补齐，并增加 I/O 异常与真实缺失的区分验证。

额外执行未列入发布门禁的 serverAuthoritativeProgress.test.js，共 12 项中 7 项失败。用 git HEAD 的原始 src 在内存覆盖读取后重跑同一文件，得到完全相同的 7 项失败；验证时工作树与 HEAD 均为 5 通过、7 失败。六项使用旧 durablePlanQueue 夹具与当前声明路径契约不符，一项抽取 host 时缺少 cleanupDigest 等全局依赖。本批未修改该旧测试或放宽生产契约；这些历史失败不冒充通过。现行协议 2 的完整链路由新增回归和正式发布门禁覆盖。

实际渲染脚本的构建门禁和额外 vm.Script 检查通过；255 模块运行闭包、7 个本地 Python 源文件 AST、UTF-8 中文、业务源码端口禁令、VSIX 身份、版本、universal 平台、engine 与秘密排除检查通过。src/extension/README.md 中的端口红线说明属于文档，不是业务硬编码。

确定包 simple-experiment-0.5.360.vsix 为 3,048,982 字节、529 条 ZIP 记录；375 个 dist 文件与本机构建逐字节一致。SHA256 为 1e9ac719ae4e45c4ccc676b64951e9f4c9eb70f15011f47322c48a49011275a8，同名 .vsix.sha256 绑定精确文件名。包内本文为最终发行补记前版本，后续纯文档补记不更换此包字节。

未更新远端 Agent/Scheduler。新版尚未在 Extension Host 重载并通过真实 UI/API 验收，不能宣称现场问题已解决。

## 实际交付

源码提交 5cd837762115dd2f179a2d773a9bfa3b5c5d1624 已普通推送 origin/master，fetch 核对一致。真实稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.360，tag 与 target_commitish 均绑定该已验证源码提交，draft=false、prerelease=false。资产为 simple-experiment-0.5.360.vsix 和同名 .vsix.sha256；VSIX 大小、GitHub digest、实际下载 SHA256 与上述确定包一致，97 字节清单精确绑定文件名。

使用实际安装的 0.5.359 ReleaseClient 从真实公开 Latest 识别 Windows 更新，并实际下载 Experiment 0.5.360、现有配套 SimpleSFTP 0.2.91 与各自校验清单。身份、版本、平台选择、文件名、字节大小、SHA256、GitHub digest 及 Experiment 与本机确定包的逐字节一致性均通过。隔离验证目录 C:/Users/ZLK/AppData/Local/Temp/simpleex-0360-release-verify-5bNlkj，验证文件保留。SimpleSFTP 包仍为 169109 字节、SHA256 e483156ad117fd8c3aaeb81d01fc0285ad6ce7c698827b589ad16596a9ea453e；未修改或重复安装配套插件。

仅执行一次 npm run install:latest，实际安装 SimpleExperiment 0.5.360，未 force 或降级。375 个已安装 dist 文件与确定包/本机构建逐字节一致，SimpleSFTP 安装版本保持 0.2.91，simpleex --help 正常。安装后停止当前 SimpleExperiment 面板及 API 操作，未再发起远端检查。

用户需执行 Developer: Reload Window，再按原入口更新远端运行时并验收。最后一次已核对的运行中 Extension Host 为旧版 0.5.359；安装新包不等于它已重载。H20 本轮 unhealthy 的实际运行版本仍未证实，不能拿文件哈希推定版本一致。未启动、停止、重跑、重新派发科研任务，未修改科研项目、环境、指标、日志或权重，也没有清理旧文件。此节为发行与安装完成后的纯文档补记，源码包绑定的运行提交和已验证 VSIX 字节不变。
