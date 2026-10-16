# 0.5.351 自动空卡派发与进度查询

## 现场证据

2026-10-16 本地 API 与全部已启用 Worker Agent 均为 0.5.350。NWPU2 GPU 1 为 7 MB、0% 利用率、无进程，SIMMLM job 2 却在该服务器 GPU 2 排队；另有 CORIM、RAML、SIMMLM 的本机待派任务。H20 GPU 2 空闲，而 GPU 0、1 各有约 108 GB 的其他用户 VLLM 进程，不能将这两张卡当成本人空卡。读取期间 CORIM 本机待派项发生变化，不能据单张快照断言所有任务永久卡死。

同时存在来源任务查询超时、召回期间任务变化、队列旧快照写入被拒绝；这些错误不能单独证明任务失败、网络 SSE 断开或科研产物损坏。SSE 心跳仍持续，Worker 健康为 ok。没有执行手动派发、召回、重跑、部署或停止操作。

## 修复

普通运行进度查询此前调用 task_inventory 的完整模式，为全部窗口反复读取分块启动载荷（包括代码清单），然后才观察窗口、实际产物和日志。0.5.350 的 selectedOnly 仅优化单 job 核实，未优化普通进度发现。现在普通进度从原生身份头和实时窗口读取全部任务，仍逐项主动核实真实清单、退出码、原始日志异常；不把执行头当成干净完成证据。不读取与观察无关的全部启动代码。selectedOnly 仍对所选任务核对完整载荷；真正接收/启动时的来源哈希及完整载荷核验保留。

自动任务的 GPU 是优先位置，不能把一次本机选择变成永久固定卡。Scheduler 优先尝试原卡，容量不足则尝试同服务器其他实际可用卡；保留空卡、显存比例、外部进程、占卡数量和单卡并行上限。手动指定 GPU 仍保持精确绑定。该改变不召回已运行任务，不重发 commandId，不扫描或停止其他用户进程。

## 回归与边界

先增加失败回归，确认普通进度仍读取 180 个完整载荷、自动队列仍拒绝空闲替代卡，再修复并通过对应测试。回归使用真实提取的 task_query、task_public_observation 和 task_admission_gpu：普通发现保留 180 个窗口但不读取启动分块，明确非零退出仍失败、异常仍待复核；自动原卡忙时选择其他空卡，原卡空闲时保留优先级，手动绑定、全忙和占卡上限保持原规则。既有本机补跑、召回、旧请求隔离和显存比例用例继续验证。

未调整固定超时冒充性能优化，未引入结果状态文件、推送状态权威或历史队列重放。远端优化需要用户更新 Agent/Scheduler；开发期间未自动部署，尚不能报告现场已恢复。

## 打包验证

npm run package 的串行门禁共 116 个测试文件执行、788 项通过、0 失败；包括实际隔离 tmux、显存并行上限、召回与本机派发、日志分块及异常判定。构建语法门禁及 vm.Script 编译模块和三个真实渲染脚本通过，业务代码无禁止的硬编码隧道端口。

simple-experiment-0.5.351.vsix 为 2,997,231 字节；SHA256 为 baa1f57ed3d21d4002823025a6636d3f365a6a6787e02be2df537b1b246cde6d。515 个 ZIP 条目、370 个 dist 文件与本机构建字节、8 个 Python 语法、扩展身份/平台/runtime/运行闭包及秘密排除均通过；同名 SHA 清单绑定精确包名。

## 实际交付

- 源码提交 10f679eedc1ad400a2181dd68a58939f3dcf2b24 已普通 fast-forward 推送 origin/master，并 fetch 确认一致。
- 稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.351 ，tag 绑定上述提交；draft=false、prerelease=false。真实远端包与同名 SHA 清单的名称、大小和 digest 均核实。
- 使用已安装 0.5.350 的实际 ReleaseClient 识别 update_available，下载真实公开包到系统临时目录 simpleex-0351-release-verify-sFrNVm；扩展身份、平台、SHA 和全部包字节与本机一致。配套 SimpleSFTP 0.2.90（168,173 字节，SHA256 d7fcbc0df6eb606d52146e28c30cb1f75851da01e29042a403127f3ffeb4eb65）同样通过真实下载核验。
- npm run install:latest 显式执行一次，安装 0.5.351，无 force、无降级。code 确认已安装版本，370 个安装 dist 文件与精确 VSIX 字节一致，simpleex --help 正常。
- 安装后未再操作 SimpleExperiment 面板或调用 API。等待用户 Developer: Reload Window，再经插件更新 Worker Agent/Scheduler 后验收真实派发和进度；未自动更新服务器，未影响现有科研任务。
