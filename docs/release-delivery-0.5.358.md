# 0.5.358 后台查询与连接复检隔离

现场运行、Agent 和独立 Scheduler 均已为 0.5.357；通过只读 lifecycle.inspect 核对 H20 指定 Agent 窗口 @196 和 Scheduler @97 的运行版本及源码哈希一致，不能归因为用户未更新。H20 端口可连接；一次健康探测超时，后续探测恢复约 1564ms；同轮 tmux.capture 在约 1.7 秒返回。三个其他 Worker 探测为 100–148ms。只读 tasks.list 先观察到 H20 4 个 completed、1 个 running、38 个 unknown，后续为 31 completed、1 running、11 unknown 且结果查询仍超时。其他三台分别返回 28、17、7 个 completed。现场不能报告 H20 完成计数已稳定恢复。

0.5.357 只优化 Host 结果查询，遗漏两个后台完整查询入口：RealtimeTunnelClient 的 GPU 启动/轮询通过 Promise.allSettled 等待完整任务查询；Agent task_loop 每五秒主动执行 api_worker_tasks，重复分析历史日志和启动载荷。另有 testTunnel 每次复检无条件 resetClient，废弃全部 Worker 正在进行的请求，真实 API 已出现 Workspace changed during Worker task snapshot。单 Worker 暂时不可用会使整个连接重建后无法重新接入。每 job 一次结果请求还将 H20 网络往返乘以任务数。

修复后 GPU 启动只查询实际 GPU，不隐式读取任务结果；任务进度由 Host 共用主动查询负责，相关 API 原入口仍保留。Agent 后台事件只采集当前 tmux 执行清单，不读产物、原始日志和启动源码，不将事件当成完成证据。只读隧道复检不重建 client，不中断同节点或其他节点当前观察；配置/工作区变化继续经过原有换代隔离。任一可用 Worker 均可恢复自身连接，不等待其他节点。

结果查询每请求最多四个当前 job、最多四个并发请求，43 个 job 为 11 次请求；保留逐 job 缺项/失败隔离、本轮已核实结果、轮转、取消及晚到响应防护。不提高超时，不借用旧结果。合并请求身份加入 observationOnly 和 declarationOnly，避免不同强度的只读检查互相冒充。

手动成功检测隧道仍可解除认证失败的手动恢复围栏；自动复检不擅自解除该围栏。健康连接不会被手动检测重建。实际方法回归覆盖此分支。

回归分别先复现 GPU 启动隐式查任务、隧道复检替换 client、逐 job 请求过多和 Agent 后台完整扫描，再验证修复。没有启动、重发、停止、重跑科研任务，没有修改 MultiModal、科研环境、日志、指标或权重，没有执行文件清理，也没有自动部署远端。正式入口验收仍需用户重载及原入口更新 Agent/Scheduler 后进行。

额外运行未纳入 package 的旧 projectWorkspaceChangeIsolation.test.js 时，三个源码正则断言失败。用 HEAD 的原始 extension/legacy.ts 替换只读测试输入后重现完全相同的三个失败，分别涉及既有工作区 reset、既有批量入口和已委托给 testTunnel 的旧 integration 方法；不是本次引入。没有为通过旧断言修改生产行为或放宽断言。本次连接连续性另以真实提取方法覆盖，既有工作区/配置换代保护保留。该旧测试问题未在本批修复。

## 构建验证

最终 npm run package 完成 121 个串行测试文件，830 项通过、0 失败。包含本次真实方法连接连续性/手动恢复/查询合并身份回归、Agent 后台采样、GPU 不等待任务以及批量结果查询。额外旧测试三条既有失败按上述单独记录，不属于本次新增失败。

编译 PanelHtml 和三个实际渲染脚本的 vm.Script、253 模块运行闭包、8 个 Python AST、禁止固定端口及秘密排除检查通过。确定包 simple-experiment-0.5.358.vsix 为 3,031,431 字节、525 条 ZIP 记录；373 个 dist 文件与本机构建逐字节一致。SHA256 为 245f9c332195300ebb2f59f0b67546ca12ad25c5dec34af82e5470db6e5af551，同名 .vsix.sha256 绑定精确文件名。包内本文为构建补记前版本，补记不更换已验证字节。
