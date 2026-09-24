# experiment health JSON

`simpleex experiment health --json` 和 `simpleex experiment overview --json` 的健康字段，与 `experiment inspect` 的 `health` 同构。字段名是 `health`，不是 `overall`。

```json
{
  "health": { "status": "healthy", "reason": "" }
}
```

| 字段 | 含义 |
| --- | --- |
| status | `healthy`、`warning` 或 `error` |
| reason | `failed_recent`、`stalled`、`missing_progress`，没有则为空字符串 |

`failed_recent` 加 `error` 表示最近失败尚未恢复；加 `warning` 表示同一 plan、experiment_case、seed 已有更新的运行中重试。最新重试成功后，失败不再影响当前健康状态，也不再进入 `overview.alerts.failed_recent`。过去 24 小时的失败历史仍可从 `overview.summary.recent_failures` 或 `experiment summary` 查询。

全局 `health` 和 `overview` 对已有子 `worker_run`、且 `status_source=aggregate` 的失败 `workflow` 去重；实际失败由子 `worker_run` 计入。没有子 `worker_run` 的独立 Scheduler/workflow 失败仍计入 `failed_recent`。单独 `inspect` 失败 `workflow` 仍显示该对象的 `error / failed_recent`。

`experiment health` 的 `health` 额外带 `alert_level`：`healthy` 映射为 `ok`，`warning` 和 `error` 保持原值。`overview` 和 `inspect` 的 `health` 没有该字段。`experiment health` 只返回 `health` 和 `alerts`，不返回运行列表。
