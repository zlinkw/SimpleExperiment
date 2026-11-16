# 原调度入口已退役

本入口保留供历史链接使用。当前采用 [G003 完整计划](../plan-generations/G003-plan.md) 的一个 Terra 完整实现、一个 Sol 最终独立验收结构；Luna 和额外调度/监控层已取消，不按 Rxx 或按钮创建执行者。唯一现任身份和租约见 [执行登记](../plan-generations/G003-execution.md)。

总控独占计划、索引及共同角色说明，交接后空闲，只处理必须改计划、用户决定/新增授权、整份计划完成。Terra 独占执行登记、现任指针、UI/文件/测试租约、返修计数、踩坑及已授权 Git；Sol 不抢写事实表。G001/G002 已交付，G003 仍是现存全入口补验，不新建 G004、不复活旧 R01–R08。

启动、完整交接、Standard 实核及安全轮换遵循全局 multi-session-implementation/SKILL.md 和 references/handoffs.md“正确启动代码模板”。现行轮换为同一 thread 先完成两次原生压缩、第二次之后再报告上下文 >=300000；二次前峰值不计，不主动压缩/填充。创建显式 model/thinking，只有明确组合校验错误才正确 model 只读待命后同 thread 显式校准；禁止删 model 回退默认或未核实接管。新角色须 context_status.py 的 role_settings_status=match、next_action=continue，且真实 thread_settings/turn_context 证实期望模型/强度/default，再交接资源；已有正确角色不重建。Terra 获得整份计划和所有有效交班；旧“只看本批/只交调度”不再适用。阶段小验收归 Terra；Sol 仅最终按计划 B01–B03 审实际实现/证据和独占项目级缺口，不重复有效小验收或同范围大验收。缺陷直接在 Terra/Sol 间交付，普通进度不唤醒总控。

整份计划的结案门槛为 Terra 全部实现与小验收→真实交唯一 Sol 最终大验收→失败直接详细返修并再交验至通过→完成既有授权交付→总控结案。仍有授权内可执行项时 Terra 不得以几个入口、记录/Git检查或“尚未完成”的 final 停机；CUA completion_summary 只结束当次 UI 子流程。局部 R12/提示/GUI 条件不足时继续独立工作，尊重实际用户输入和安全停止；只有全部剩余确受阻且已精确升级决定、用户明确暂停/取消或正确安全接替已完成才中途暂停。Sol 失败/通过必须用工具直接交 Terra，不能 final 后双方无接续 idle；无 Sol 最终通过不得计划完成/整体归档。总控及非最终阶段 Sol 继续空闲，不增加监控层。

共享 UI、manual/coverage、检查和生成仍互斥；检查期间所有相关写入者冻结受检 docs/src/test/scripts/dist。历史有效检查、291 项组合、R10 子集及 R13 十位置保留，不因流程修改重跑。原日志、失败/退出码、未测/未知和限定结论保持，不另造报告/监控/自动化。

原 MM/Generic 未保存文档、GPU7、旧任务/结果/日志、拒删文件及 MM @54 保护。R12-I 仅按计划专项授权的新 profile/远端根和受控链推进；隔离无法证明则停相关步骤，普通本机工作继续。不升级 MCP/插件/旧 Worker、不训练、不打包安装发行、不清理。本人 Trust/安全许可不代点。

当前已授权的文档/代码批次按原 master/origin 普通 fast-forward 规则 scoped 提交推送；不混入未验收业务改动或无关 VSIX 校验文件，远端前进/权限/保护阻断如实报告。总控接管后的正常业务由唯一 Terra 连续完成，最终由总控统一向用户报告。
