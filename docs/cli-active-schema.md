# experiment active JSON

`simpleex experiment active --json` 的默认输出，`schema_version` 为 `"1"`。字段变化必须提升版本号。

```json
{
  "schema_version": "1",
  "snapshot": { "snapshot_id": "string", "snapshot_time": "string", "runtime_version": "string" },
  "active_count": 0,
  "workflows": [],
  "runs": []
}
```

## snapshot

| 字段 | 含义 |
| --- | --- |
| snapshot_id | 本次查询编号，只在这一次调用内有效 |
| snapshot_time | 本次查询时刻，ISO 字符串 |
| runtime_version | 当前运行实验中最新的状态更新时间 |

## runs

每个正在运行的 worker run 一项。

| 字段 | 含义 |
| --- | --- |
| id | 实验 id |
| experiment_case | 实验用例名，空则省略 |
| stage | 当前阶段，空则省略 |
| seed | 随机种子，空则省略 |
| worker | `{ id }` 或 `null` |
| gpu | `{ id }` 或 `null` |
| progress | `{ epoch, max_epoch, percent, loss, updated_at }`，没有进度时为 `null`，缺的数字为 `null` |
| updated_at | 状态更新时间，ISO 字符串 |

`progress.percent` 表示当前终端可识别训练循环的完成度，不保证表示整个 `worker_run`。一个 `worker_run` 顺序运行多个训练循环时，`epoch` 和 `percent` 可以在循环切换后重新从较小值开始。Agent 不应仅凭此字段估计整个任务的剩余时间。

`workflows` 每项为 `{ id, status, plan, worker, tmux }`，空字段省略。`--json --full` 额外保留 `created_at`、`health_status`、`children`、`model`、`dataset`。
