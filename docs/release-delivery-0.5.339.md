# 0.5.339 交付记录

## 实机只读确认

本机活动 API 为 0.5.338，四个启用 Worker 的实时任务查询均 queryComplete=true、queryErrors=[]。开始检查时为 40 个正常完成、6 个异常完成、14 个运行中；安装前最后一次查询为 41 个正常完成、6 个异常完成、13 个运行中。任务自然继续运行，本轮没有提交、停止、重跑或清理请求。

抽查 NWPU3 原 commandId `96176604fa86d53e2050ae30bfc86af6`：退出 0、产物完整、完整日志零异常、verified。抽查 NWPU5 原 commandId `78ec58d8aa993cc0a23021bd02f8300b`：退出 0、产物完整、AttributeError 四次，train/test 各两次、review_required。两次分析均返回 readOnly=true、historyRewritten=false。说明远端自动判断已正常区分，界面刷新链路仍存在遗漏。

## 根因与修改

- `src/extension/legacy.ts`：分析按钮原来打开未命名 JSON 编辑器；现返回简短分析结果。任务快照结构签名补上执行、产物、退出码、完成状态及原始异常证据，使只改变日志判断的查询也能刷新卡片、PLAN 与计数。
- `src/extension/RuntimeLogAnalysisHost.ts`：共用反馈摘要，返回真实退出码、异常次数、类型、阶段或未核实原因；分析后请求立即更新面板。API/CLI 原结构化接口保留，不生成文件。
- `src/features/DistributedSchedulingPolicy.ts`：当前、未退役、未被替代的已完成正式 job，日志尚未核实完整时继续主动查询；核实完整后停止该项轮询，不扩展到旧历史任务。
- `src/ui/PanelHtml.legacy.ts`：分析结果显示面板提示；异常完成的正式 job 增加“覆盖产物并重跑此 job”，精确传递原 commandId、PLAN 与 job 索引。
- 重跑后端复用既有原生流程，先主动查询确认为异常完成，阻止仍运行/排队、正常完成或身份变化的目标。只将所选 job 声明交给原精确路径双确认覆盖流程；取消或跳过不关闭窗口、不修改队列、不派发。其他 job 保持原状。没有增加删除执行器或绕过安全根、直接父目录和最短子项保护。
- package/lock/runtime 统一递增 0.5.339，runtime 本次仅同步版本；日志解析和科研命令未修改。

## 回归与限制

先建立失败回归，重现仅日志证据改变时卡片签名不变、没有反馈摘要、完成任务不能进入异常重跑入口以及终态日志不继续查询，再修改实现通过。

最终 `npm run package` 的 113 次串行单文件执行共 743 项通过、零失败。新增回归涵盖实际分析命令处理与结果消息、正常/异常卡片及按钮载荷、只变日志时刷新、分块日志继续查询与旧记录隔离、异常终态重跑、身份变化、运行中拒绝、确认取消/跳过无队列或停止副作用。既有两次覆盖确认及安全删除回归也通过。UI 实际渲染脚本及额外 vm.Script 模块校验通过；VSIX ZIP/身份/版本/universal 平台、367 个 dist 字节、8 个 Python AST、运行闭包和秘密排除通过。

额外检查发现未纳入当前打包门禁的旧 `test/features/serverAuthoritativeProgress.test.js` 有 7 项失败：旧协议快照夹具与当前正式身份不符，以及方法提取夹具缺少 cleanupDigest。用未修改的 0.5.338 HEAD 源码重放得到相同 7 项失败，本轮没有新增失败，也没有更改生产代码以迎合旧协议测试。这些旧测试问题仍未修复，不能将其报告为通过。基线记录位于本机临时目录 `simpleex-0339-baseline/baseline.log`。本轮新轮询行为由新的当前协议回归覆盖。

最终打包日志位于本机临时目录 `simpleex-0.5.339-package-final.log`。实机查询报告仅留本机临时目录，不作为产品缓存或进入发行包。

## 发布、安装与待验收

- 修复提交 `fed08389f6861c4551c64ce52d06bc7c99e55f5a` 已普通快进推送 origin/master，fetch 核对一致。
- 稳定 Release：<https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.339>；重新读取 Latest，确认绑定提交、draft=false、prerelease=false、VSIX 和同名 SHA256 资产。
- `simple-experiment-0.5.339.vsix`：2,931,401 字节；SHA256 `629d5fa74ae4b27e88609f57591734ccf536173cb669cbabcaec792e0c57f621`。
- 实际已安装 0.5.338 更新客户端确认 update_available，重新下载公开包/校验和，与已验证本机包字节一致。配套 SimpleSFTP 0.2.90 指纹一致，未修改或重复安装。
- 显式执行一次 `npm run install:latest`，安装 0.5.339，无 force、无降级。367 个已安装 dist 文件与发布包一致，版本和 simpleex 入口核对通过。
- 安装后不再操作当前面板/API，等待用户 **Developer: Reload Window**。新面板按钮、卡片和取消流程的实机点击验收待重载；不为验收执行真实任务重跑或删除。状态显示修复复用远端现有 runtimeDiagnostics=1 接口，本轮没有部署、重启或停止远端服务及科研任务。
