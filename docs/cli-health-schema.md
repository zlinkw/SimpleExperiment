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

`experiment health` 的 `health` 额外带 `alert_level`：`healthy` 映射为 `ok`，`warning` 和 `error` 保持原值。`overview` 和 `inspect` 的 `health` 没有该字段。`experiment health` 只返回 `health` 和 `alerts`，不返回运行列表。
