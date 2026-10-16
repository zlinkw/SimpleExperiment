# 0.5.350 产物同步核实查询

## 现场与根因

2026-10-16 的 0.5.349 本地 API 中，CORIM job 0、1 和 RAML job 0 的最新产物同步报错均为来源 Worker nwpu3 的任务状态查询超时。相同错误反复写入操作错误列表。此证据不能证明文件传输失败或产物不存在。

CompletedJobSyncHost 通过 queryTask 核实一个 commandId，但 Agent 原 task_query 将全部实际 tmux 作业加入完整观察：读取每个任务的分块代码载荷、产物清单和运行日志。大量无关已结束窗口会耗尽单任务核实的八秒预算。原有批量任务发现需要这些窗口，不能全局裁掉。

## 修改与兼容

- 单任务完整查询显式传 selectedOnly，经三层客户端传播；请求合并键区分普通发现、单任务完整观察和仅执行观察。
- Agent 的单任务观察先读取原生窗口身份，仅对所选任务读取并校验完整载荷、实际产物和运行时异常；普通任务发现保持原有全部窗口行为。
- 保留路径安全、Worker/项目/commandId 归属、载荷身份与哈希、结果及异常判定。退出码非零仍失败，退出零但异常仍待复核。未使用 executionOnly 冒充结果核实。
- 来源核实失败明确显示“来源任务核实未完成”；同一同步身份的相同错误不逐轮追加操作错误，仍保留重查及当前任务提示。实际传输错误保留原有提示与重试。
- 旧 Agent 忽略新增可选字段时仍走原有完整观察，不改变既有生命周期协议或重派任务；远端查询性能修复需要用户更新 Agent。未自动部署、启动、停止、清理或重跑科研任务。

## 验证

先运行目标回归复现缺少定向观察和错误区分，再修改实现。合成 180 个窗口证明单任务仅读取一个完整载荷及其清单/异常，而普通发现仍返回 180 个窗口。覆盖不存在任务、跨 Worker 身份、真实公共观察中的非零退出及异常、HTTP 分支、客户端传播和请求隔离、勾选范围、丢失传输响应后的增量补齐、重复错误合并。

targeted tests 与 typecheck 通过；npm run package 全部串行门禁为 116 个测试文件执行、787 项通过、0 失败。构建语法门禁及 vm.Script 编译模块和三个实际渲染脚本通过。源码/生成 runtime 无禁止的硬编码隧道端口。

包为 simple-experiment-0.5.350.vsix，2,993,989 字节；SHA256 为 dff1035a3bf38ede12a6a883eeb0b07cb5dd484d3aabcceaee7034834d8e99a3。已验证 514 个 ZIP 条目、370 个 dist 文件与本机字节一致、8 个 Python 语法、扩展身份/平台/runtime/秘密排除和运行闭包。对应 SHA 清单绑定精确包名。

## 实际交付

- 源码提交 4f4e30327e83a91108ac67b613bc4931e2d5f76b 已普通 fast-forward 推送 origin/master，fetch 确认一致。
- 稳定 Latest 为 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.350 ，tag 绑定上述提交，draft=false、prerelease=false。VSIX 资产和同名 SHA 清单的文件名、大小、GitHub digest 与本机包一致。
- 0.5.349 的实际 ReleaseClient 首轮网络下载失败；只读重试成功，实际 Latest 解析为 update_available。真实下载至系统临时目录 simpleex-0350-release-verify-BAyZZk，扩展身份/平台/SHA/字节与已验证本机包一致。配套 SimpleSFTP 0.2.90 为 168,173 字节，SHA256 d7fcbc0df6eb606d52146e28c30cb1f75851da01e29042a403127f3ffeb4eb65，同样通过真实下载核验。
- npm run install:latest 仅显式执行一次，成功安装 0.5.350，无 force、无降级；code 列表确认版本，370 个安装 dist 文件与精确 VSIX 一致，simpleex --help 入口正常。
- 安装后未再操作 SimpleExperiment 面板或调用其 API。等待用户 Developer: Reload Window；需再经插件更新 Worker Agent 以启用远端定向完整查询，未自动部署 Agent/Scheduler。

未启动、停止、重跑科研任务，未删除或覆盖科研产物。远端原现场未自动更新和执行同步，不能将本机合成验证表述为现场同步已恢复。
