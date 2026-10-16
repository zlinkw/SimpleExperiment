# 0.5.347 修复同 PLAN 缺失 job 补跑被整组拦截

## 本轮现场

通过当前 discovery/capabilities 与只读 state 确认运行版本 0.5.346。qa_moe 当前队列只有索引 0–4 的五个 job，均由当前查询显示执行结束、产物完整、日志核实完成。当前 PLAN 声明六个 job，缺少索引 5，即 qa_moe_pad_p100、seed 44。

最近一次 qa_moe 提交已校验通过六项声明，最终失败于“该 Plan 已由其他提交入队，已阻止重复提交”。因此本次尚未到达缺失 job 的派发，不是已经启动后没有训练进度。现场还记录 NWPU2 代码准备被其他版本占用，但该条提交已继续通过预检；不能把旧警告当作这次最终失败的原因。

没有通过 API 启动、停止、清理或更新远端任务，没有改写用户实际队列，也没有修改 MultiModal 的 PLAN、模型、数据、环境或训练逻辑。

## 根因与修改

保存追加提交时，旧逻辑只要发现相同 PLAN 文件下有任意非终态 job 就拒绝整个新提交。原生任务从磁盘读取时会正确恢复为 unknown，随后再查询服务器；这不应让旧的五项输入占住第六项从未派发的声明路径。窗口主动查询还可能在预检期间重新发现旧已结束窗口，使旧输入重新进入本机队列。

`src/extension/legacy.ts` 的原子队列追加门禁改为核对本次 selected job 的声明路径。只有旧未终结输入与本次输出目录、指标路径存在相同或父子路径交集才拦截；同一 PLAN 中互不重叠的 job 可独立补入。旧原生输入的 unknown 标签不再占住整个 PLAN。

仍在当前串行/租约事务内读取最新队列、保留其他提交并原子写入。相同输出、相同指标、父子路径、缺少声明的旧输入仍保守拒绝；真实 Worker 查询、旧请求取消、目录单写者、路径双确认与远端准入保持原规则。错误提示仅指向冲突 job，不再要求清理整个 PLAN。

## 验证

先用真实队列恢复、enqueuePlan、Host 原子写入与内存文件系统复现“旧五项恢复为 unknown，第六项补入被整 Plan 拒绝”。修复后保存完整保留旧五个 commandId，只增加索引 5；真实分配器在合成空卡上仅派发该一项。额外覆盖不同索引但相同输出、指标及父子路径，继续拒绝且磁盘内容不变。

最终 `npm run package` 完成 116 次串行单文件执行，778 项通过、零失败，日志为临时目录 `simpleex-0.5.347-package.log`。最终编译后再核对队列存储 16 项、真实跨窗口租约/写入 2 项，全部通过。没有启动正式科研任务。

TypeScript/build、额外 vm.Script 模块及 3 段实际渲染脚本、8 个 Python AST、运行闭包、ZIP、身份/版本/universal 平台、370 个 dist 文件逐字节比对和秘密排除均通过。包内本文为发行前快照，本次仅补记交付，未重建或替换包。

## 已完成交付

- 源码提交 `cccab395cba34166c7ae9cd18f8c722f9f846c99` 已普通快进推送 origin/master，并 fetch 核对一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.347>。重新查询真实 Latest、tag 与绑定提交，确认 draft=false、prerelease=false。
- `simple-experiment-0.5.347.vsix`：2,981,432 字节；SHA256 `0e178bbdf32a67b84a019c59394c87678f81677811b0963803bc3b09adce4496`。逐包 `.vsix.sha256` 绑定精确文件名；公开大小、GitHub digest、下载内容均与本机已验证包一致。
- 使用已安装 0.5.346 的更新客户端，真实解析 Latest 为 update_available，下载 VSIX/校验和并逐字节核对。SimpleSFTP 0.2.90 的公开配套包及指纹也一致，未重复安装；验证文件保留于临时目录 `simpleex-0347-release-verify-Y1PGwa`。
- 显式执行一次 `npm run install:latest` 安装 0.5.347，无 force、无降级。VS Code 已安装版本、370 个 dist 文件字节、包身份和 simpleex 入口核对通过。安装后停止访问当前插件面板与 API。

用户 Developer: Reload Window 后，再对 qa_moe 执行校验并提交运行并选择仅补跑未完成任务，实际点击仍待验收。没有新增远端协议要求，无需为此修复重新部署 Agent/Scheduler。没有自动补造或派发用户任务、改写实际队列或清理已有五项产物。
