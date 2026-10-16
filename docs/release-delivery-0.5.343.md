# 0.5.343 修复 tmux 元数据超长与任务缺项显示

## 已核实现场

只读读取运行中的 0.5.342 插件 API：state、tasks.list、gpu.list、panel.diagnostics。每次调用从 discovery 和实际 capabilities 获取入口，没有训练服务器写入。

- 本机和四台 Worker 的 Agent 均为 0.5.342。state 的精简 capabilities 不展示 planCodeScope，不能以该展示字段缺失判定远端没有新协议；实际队列已有约 17 KB executionSource。
- 新 TMDC 六个 job 均有原 commandId，但主动查询为 execution=missing；unimix_ad 的两个已派发 job、late_fusion 的手动派发 job 也显示 missing。现场错误包含 `TMUX_QUERY_FAILED: command too long` 和后续接收超时。
- QA MOE 的原 PLAN 声明 6 个 job，本机队列实际只剩索引 0 到 4，无第 5 项输入，缺项不是简单折叠造成。不能凭旧缓存自动补成新可执行任务。已取得现场不足以确认最初是哪次操作移除了输入，不能将猜测作为根因。

## 根因及修改

0.5.342 将冻结源码清单随任务保存到原生 tmux 窗口属性，但仍通过单条 tmux 客户端命令参数传递 base64 JSON，约 17 KB 的原始清单在编码后超过 tmux 命令包限制。窗口创建后身份绑定失败，导致新任务不能启动，随后查询看不到其原 commandId。之前的源码范围回归没有覆盖真实 tmux 的大启动元数据，这是插件缺陷，涉及自动及手动派发，不是消费项目训练问题。

- `src/runtime/TmuxTaskLifecycle.ts`：大体积且严格为 base64 的 job 属性改用 `tmux source-file -` 标准输入传递一条安全引用命令，保留同一个原生窗口属性和原子赋值；没有新状态文件、分片文件或落盘日志。普通选项保持原路径。
- 新窗口先标记 binding 并绑定小体积原任务身份；完整输入成功后才进入 queued。Runner 必须等绑定完成再读取完整输入和等待调度准入。完整元数据通道失败时保留可查询的原身份，进入 rejected，Runner 不执行科研命令，不会产生无归属窗口或自动换 commandId 重发。
- `src/ui/PanelHtml.legacy.ts`：详情成功分母采用声明数量，与卡片概览一致。输入缺项显示声明数、当前数、缺失数以及仅补跑未完成任务的现有入口说明，不再误显示 5/5；不伪造缺失任务为运行、成功或自动排队。

未修改 MultiModal 模型、数据、指标、训练逻辑、科研环境或既有服务器任务。未自动清理旧错误窗口、补回历史输入或重新派发失败请求。

## 验证

先在真实隔离 tmux 中为合成任务加入 180 项文件清单，复现与现场一致的 command too long。修复后同一队列、Runner、CPU 合成命令和查询链路通过，完整清单在真实 Runner 内核对；额外覆盖含中文、引号、美元符号、反斜杠和换行的 JSON 经 base64 传递不变。注入完整元数据通道中断，验证原身份仍可查询、窗口 rejected、非零退出，科研命令未执行。没有 import/exec 完整 Agent/Scheduler。

渲染回归先复现 5/6 概览配 5/5 详情的问题，再验证统一分母、明确缺项和精确 PLAN 选择。手动派发 Host 六项及源码范围六项单文件回归通过。

过程中任意长普通选项的美元符号实验不属于 job base64 协议，最终将流式入口限定为实际使用的 base64 job，并按真实 JSON 往返验证。共享 bootstrap 的新断言曾错误影响独立前缀夹具，已将断言限定于含大清单的合成任务，未提高等待上限或改变生产调度来迁就测试。

完整打包、发行与安装结果在交付后记录。
