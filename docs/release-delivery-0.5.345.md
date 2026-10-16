# 0.5.345 修复单 job 重跑消息丢失 commandId

## 现场与根因

本轮从 discovery 与实际 capabilities 确认当前运行和已安装版本均为 0.5.344，再通过只读 state 查询确认连续四条 `retryDistributedJob` 错误均为“任务 commandId 已变化；请刷新原 job 后重新确认，未重排”。没有调用重跑、停止、删除或远端部署接口。

0.5.344 的原生失败/missing 重跑按钮已经包含原 commandId，但公用 `payloadFromButton` 仅在“完成但有异常”重跑时才把该字段放入消息。普通重跑到达 Host 时缺少 commandId，与真实原任务比较后必然误报身份变化。旧的训练完成恢复按钮还缺少 `data-command-id` 属性。

本轮复现明确证明这条点击链路丢了参数，不以该误报证明队列重新生成过 commandId。上一轮仅验证了新按钮 HTML 与直接提供完整参数的 Host 测试，遗漏两者之间的消息组装，这是测试覆盖缺口。

## 修改与兼容

- `src/ui/PanelHtml.legacy.ts`：所有 `retryDistributedJob` 消息统一携带按钮中的原 commandId；异常重跑标志仍只用于对应异常入口。旧训练恢复按钮也携带原身份。
- 没有放宽 Host 的 commandId 核对，不替换成刷新后另一个任务的身份，不生成新 commandId 来绕过拒绝，不改任务队列、Scheduler、清理范围或双确认。
- 当前失败、missing、异常完成和旧训练恢复入口均兼容；真正被新任务替换的按钮继续拒绝。重跑后生成新请求仍只能由原任务核实和既有明确确认流程触发。
- 本次功能修复只在本机 UI 消息链路；运行版本按仓库规则递增，但没有新增远端协议要求，不需要为此修复重新部署 Agent/Scheduler。

## 验证与交付

新增回归从实际渲染的重跑按钮提取 dataset，经实际渲染脚本中的 `payloadFromButton` 组装，交给真实 Host 方法核对。修复前稳定失败于 `original-missing` 变为 undefined；修复后覆盖 missing、启动失败、异常完成和旧训练恢复。原生三类均能进入原 job 控制流程，随后模拟原 commandId 被替换，仍拒绝且不再次调用重跑控制。

目标 UI 34 项、运行日志 Host 9 项、旧正式任务恢复 5 项单文件测试通过。测试使用合成输入与隔离 Host，不启动科研任务或操作用户产物。

最终 `npm run package` 完成 116 次串行单文件执行，775 项通过、零失败，日志为临时目录 `simpleex-0.5.345-package.log`。TypeScript/build、额外 vm.Script 模块及 3 段实际渲染脚本、8 个 Python AST、运行闭包、ZIP、身份/版本/universal 平台、370 个 dist 文件逐字节比对和秘密排除均通过。包内本文为发行前快照，本次仅补记交付，不重建或替换包。

## 已完成交付

- 源码提交 `ff63f0488bea4465f78bede9d32386bf0abaf47d` 已普通快进推送 origin/master，并 fetch 确认一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.345>。重新查询真实 Latest、tag 和绑定提交，确认 draft=false、prerelease=false。
- `simple-experiment-0.5.345.vsix`：2,974,396 字节；SHA256 `d32cc4c30771a4b009d4e6a73e384bc8a7294386948b50bfae5e4e94787897c8`。逐包 `.vsix.sha256` 绑定精确文件名；公开资产大小、GitHub digest 和实际下载字节全部一致。
- 使用已安装的 0.5.344 更新客户端，真实解析公开 Latest 为 update_available，下载 VSIX 与校验和，与本机已验证包逐字节一致。SimpleSFTP 0.2.90 公开配套包及指纹也核对一致，未重复安装；验证目录为临时目录 `simpleex-0345-release-verify-nKcuKc`。
- 显式执行一次 `npm run install:latest` 安装 0.5.345，无 force、无降级。VS Code 已安装版本、370 个 dist 文件、包身份和 simpleex 入口核对通过。安装后停止访问当前插件面板与 API。

本次只需用户 Developer: Reload Window，再验收原单 job 重跑按钮；没有新增远端协议要求，无需为此修复重新部署 Agent/Scheduler。未重跑、停止或删除现有任务和产物，未修改科研代码或环境。实际点击验收仍待用户重载，不以合成链路通过冒充已经重跑用户任务。
