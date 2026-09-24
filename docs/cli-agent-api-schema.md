# Agent JSON API

`simpleex experiment <active|health|overview|inspect> --json` 的稳定输出，`schema_version` 固定为 `"1"`。字段变化必须提升版本号。四个接口职责不重叠，文本模式不带 `schema_version` 和 `snapshot`。

四个接口的 `snapshot` 相同，描述这一次查询，不描述实验：

| 字段 | 含义 |
| --- | --- |
| snapshot_id | 本次查询编号，只在这一次调用内有效 |
| snapshot_time | 本次查询时刻，ISO 字符串 |
| runtime_version | 实验状态版本，等于相关实验最新的 `updated_at` |
| runtime_source | 状态数据的主要来源：`experiment_index`、`history` 或 `runtime_observation` |

来源优先级为 `runtime_observation > history > experiment_index`。`history` 包括 Worker task 历史、Scheduler operation 生命周期记录和现有历史产物。`runtime_source` 描述对象数据来自哪层记录；`status_source` 描述最终公开状态由 `scheduler`、`worker`、`aggregate` 等哪种逻辑决定，两者不是同一概念。

## experiment active

当前运行中的任务。

```json
{
  "schema_version": "1",
  "snapshot": {},
  "active_count": 0,
  "workflows": [],
  "runs": []
}
```

`runs` 每项为 `{ id, experiment_case, stage, seed, worker, gpu, progress, updated_at }`。`worker` 和 `gpu` 为 `{ id }` 或 `null`，`progress` 为 `{ epoch, max_epoch, percent, loss, updated_at }` 或 `null`。空的 `experiment_case`、`stage`、`seed` 省略。

`progress.percent` 只表示当前可识别训练循环的进度，不是 `worker_run` 总体完成率。多阶段任务切换训练循环时可以回退；没有可识别的 `epoch/max_epoch` 时为 `null`。

`experiment active` 返回归一化后的当前运行对象，不是所有仍能从 tmux pane 解析出的历史文本。若唯一匹配的 Worker Agent 历史已确认 `success`、`failed` 或 `cancelled`，该终态高于 pane 中残留的 runtime observation。

## experiment health

整体健康判断。

```json
{
  "schema_version": "1",
  "snapshot": {},
  "health": { "status": "healthy", "reason": "", "alert_level": "ok" },
  "alerts": { "missing_progress": false, "stalled": false, "recent_failure": false, "alert_details": [] }
}
```

`health.status` 为 `healthy`、`warning` 或 `error`，`reason` 为 `failed_recent`、`stalled`、`missing_progress`，没有则为空字符串。`alert_level` 只在本命令出现：`healthy` 映射为 `ok`，其余与 `status` 相同。`overview` 和 `inspect` 的 `health` 没有 `alert_level`。

`failed_recent` 与 `error` 组合表示最近失败尚无更新的运行中或成功重试；与 `warning` 组合表示同一 plan、experiment_case、seed 已有更新的运行中重试。最新重试成功后，该失败不再影响当前健康状态。`overview.alerts.failed_recent` 仍记录过去 24 小时发生过的失败，包括已恢复的失败，不等同于当前未恢复失败。

全局 `experiment health` 和 `experiment overview` 不重复统计已有子 `worker_run`、且 `status_source=aggregate` 的失败 `workflow`；其失败由实际子任务表达。没有子 `worker_run` 可代表的独立 Scheduler/workflow 失败仍进入 `failed_recent`。单独 `inspect` 失败 `workflow` 时，仍报告该对象自身的失败健康状态。

`alerts` 只有布尔值和 `alert_details`，不含实验列表。`alert_details` 每项为 `{ type, message }`，最多 10 条，`message` 最长 300 字符，不含日志。

## experiment overview

全局汇总，一次查询产出。

```json
{
  "schema_version": "1",
  "snapshot": {},
  "summary": {},
  "active": {},
  "alerts": {},
  "health": {}
}
```

| 字段 | 含义 |
| --- | --- |
| summary | `running_count`、`failed_count`、`success_count` 统计 `worker_run`；`workflows` 统计已知 `workflow` 总数。`active_workers`、`gpu_usage` 来自运行中的 `worker_run`；`stalled_experiments` 保持健康与告警口径；`recent_failures` 包含最近失败的实际 `worker_run` 和没有子 `worker_run` 可代表的独立 `workflow` 失败，不重复列出聚合父 `workflow` |
| active | 与 `experiment active` 的 `active_count`、`workflows`、`runs` 相同，不含 `schema_version` 和 `snapshot` |
| alerts | 实验列表：`failed_recent`、`stalled`、`missing_progress`，默认各最多 3 条，`--full` 为 10 条 |
| health | `{ status, reason }`，与 `inspect` 的 `health` 同构，没有 `alert_level` |

`summary.running_count` 与 `active.active_count` 口径不同：前者是正在运行的 `worker_run` 数，后者是 `active` 返回的 `workflow` 与 `worker_run` 对象总数。一个 `workflow` 调度三个训练任务时，前者可以为 3，后者可以为 4。

## experiment inspect

单个实验。

```json
{
  "schema_version": "1",
  "snapshot": {},
  "summary": {},
  "status": {},
  "progress": {},
  "health": {},
  "diagnosis": {},
  "alerts": {}
}
```

`summary` 是实验身份，`status` 是当前状态，`progress` 是训练进度且只出现这一处，`health` 是健康判断，`alerts` 与 `experiment health` 的 `alerts` 同构。字段明细见 `cli-inspect-schema.md`。

`diagnosis` 为 `{ reason, suggestions, latest_message, stale_seconds }`。仅当实验 `status` 为 `failed` 时额外包含 `failure_context`：

| 字段 | 含义 |
| --- | --- |
| last_error | 最后一条错误日志，最长 300 字符，没有则为空字符串 |
| stage | 失败时所处阶段 |
| worker | `{ id }` 或 `null` |

`failure_context` 不含完整日志。`--full` 额外给出 `diagnosis.evidence`，最多 20 条，每条最长 200 字符。
