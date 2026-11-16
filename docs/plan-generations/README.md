# 需求计划代次

按独立需求的固定创建顺序登记，修订、返修和执行批次不新增代次。状态以各代执行登记为准。

下一代序号：3（仅计数，尚未登记新代；序号单调递增且不复用）。

| 顺序 | 代次 | 需求 | 状态 | 计划 | 执行登记 |
| --- | --- | --- | --- | --- | --- |
| 1 | G001 | Windows 功能精简与原全入口验收 | 原目标补验中；退役阶段已验收同步 | [原计划](../feature-retirement/README.md) | [原执行登记](../feature-retirement/execution-status.md) |
| 2 | G002 | 多会话文档生命周期 | 已独立验收并同步 | [计划](G002-plan.md) | [执行登记](G002-execution.md) |

调度在 D01 冻结后独占维护本索引；新独立需求依据总控批准的计划登记。最多保留最近三代必要身份；容量不足时先检查最老代状态和交接，不能安全腾位就暂停登记并报告总控。轮换本身不授权删除，保护与删除规则见全局技能 `C:/Users/ZLK/.codex/skills/multi-session-implementation/references/lifecycle.md` 和项目适用规则。长期踩坑独立保留于 [大踩坑](../major-pitfalls.md)。
