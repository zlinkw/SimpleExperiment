# 0.5.344 精确补跑、空卡预约与旧 tmux 启动兼容

## 现场与根因

本轮通过已运行的 0.5.343 本机 API 只读读取 state、tasks.list、gpu.list；每次调用重新读取 discovery 与 capabilities。没有派发、停止、删除或更新远端任务。

- 现场 late_fusion 的 NWPU2 手动派发请求保留了原 commandId，真实退出码为 1，窗口记录 `TASK_WINDOW_BINDING_FAILED: TMUX_QUERY_FAILED: -: No such file or directory`。0.5.343 使用 `tmux source-file -` 传递大清单，较旧 tmux 把 `-` 当成文件名。这是插件兼容缺陷。
- 补跑的完成集合此前来自可启动 Worker 子集；子集没有包含有效产物源时，会把其他 Worker 上已完成的 job 纳入未完成删除范围。新的回归复现了该条件，不将它说成已证明的每个现场路径的唯一原因。
- 已主动查询确认 missing 的原请求仍带本机 startIntent，被当成占卡依据，影响后续任务使用空卡。保留原请求身份是必要的，但不能把它当作实际窗口存在的证据。
- missing 请求缺少明确的单 job 重跑入口；重跑期间客户端因健康刷新重建，也可能错误触发上下文失效。

## 修改

- 大启动输入拆入有内容哈希的原生 tmux 窗口属性，每条命令受限；全部写完再发布小体积头。读取核对长度、SHA256 和任务身份，无新状态文件、stdin source-file 或文件传输。旧单属性格式仍可读。绑定失败保留原身份并拒绝执行。
- 确定补跑范围前，主动查询全部启用 Worker 的当前声明产物与真实窗口。未核实不形成删除清单。仅补跑的第二次确认及执行只包含未完成 job；持久化的旧范围发生变化时必须重新确认，不能沿用较宽范围。
- 本轮成功查询为 missing 的原请求释放 GPU 预约，原 commandId/startIntent 保留用于取消围栏；断线未知仍保守保留预约，不自动重复派发失联请求。
- 已确认 missing 或失败的原生任务提供“重跑此 job”，精确绑定 commandId。先撤出原请求，避免晚到请求与新运行同时写产物；只审核这个 job，继续双确认。健康刷新不使相同服务器配置失效；实际目标变化仍阻断。

未修改 MultiModal、科研环境或实验逻辑。未自动重跑、删除产物或补造缺失任务。

## 验证与交付

发行前检查中，合成任务在真实隔离 tmux 上执行，额外拒绝 stdin source-file 和超过旧命令包限制的调用；这模拟部署端限制，不冒充已在旧版本二进制上实测。覆盖 180 项源码清单、中文和分块完整性、写入中断、Runner 真正执行及精确停止。没有加载完整 Agent/Scheduler，也没有启动科研任务。

Host 回归覆盖其他 Worker 上已完成产物保留、只确认未完成 job、离线不删除、旧宽范围拒绝、missing 预约释放、单 job 重跑及客户端重建。旧的精简夹具补齐新增读取函数和目标配置依赖，未放宽生产保护或等待上限。

原预约测试把成功查询返回空列表也当作永久占卡，这与本轮服务器真实状态规则冲突。测试现区分查询失败与已确认 missing：前者仍保留名额，后者允许同 Worker 的后续 job 使用空卡，原 missing commandId 不会自动重发。最终 GPU 准入仍由远端 Scheduler 核实，未知回执不能代替真实空闲判断。

最终 `npm run package` 完成 116 次串行单文件执行，774 项通过、零失败。日志保留在临时目录 `simpleex-0.5.344-package-verified.log`。此前打包由夹具缺少新函数依赖及旧预约语义断言拦截，完成对应修正和单文件回归后重新执行全部门禁，没有跳过失败文件。

TypeScript/build、实际渲染脚本及额外 vm.Script、8 个 Python AST、运行闭包、ZIP、身份/版本/universal 平台、370 个 dist 文件逐字节比对和秘密排除均通过。包内本文为发行前快照，本次仅补记真实交付，未重建或替换包。

## 已完成交付

- 源码提交 `2019ef28e129f76bd6e9c11763872ea93cb39145` 已普通快进推送 origin/master，并 fetch 确认一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.344>。重新查询真实 Latest 和 tag，确认绑定上述提交，draft=false、prerelease=false。
- `simple-experiment-0.5.344.vsix`：2,971,528 字节；SHA256 `b242d7a21087611ad7785ef41ab18101080e8c3346ec6a28ba39366d351ee735`。逐包 `.vsix.sha256` 绑定精确文件名；公开资产大小、GitHub digest 及实际下载 SHA256 一致。
- 使用已安装的 0.5.343 更新客户端，真实解析 Latest 为 update_available，并下载公开 VSIX/校验和，与本机已验证包逐字节一致。SimpleSFTP 0.2.90 的公开包和校验和也与已验证本机包一致，未重复安装。验证文件保留于临时目录 `simpleex-0344-release-verify-8ozC09`。
- 显式执行一次 `npm run install:latest` 安装 0.5.344，无 force、无降级。VS Code 已安装版本、370 个 dist 文件字节、包身份和 simpleex 入口核对通过。安装后停止访问当前插件面板与 API。

实际科研启动与界面点击等待用户 Developer: Reload Window，并通过插件更新对应 Agent/Scheduler 后验收。没有自动更新远端、重跑、关闭任务窗口或删除产物；没有从旧记录补造 QA MOE 缺失的执行输入。旧失败或 missing 请求需用户主动点击单 job 重跑；其他本机待派任务在重载并查询后使用真实可用名额。
