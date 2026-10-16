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

完整打包与发行安装记录在交付后补记。实际点击验收等待用户重载窗口；不以合成链路通过冒充已经重跑用户任务。
