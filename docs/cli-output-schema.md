# CLI JSON output schema

Default JSON fields. `--full` returns the existing detailed payload.

## experiment list

Default `--json` is compact.

```json
{
  "id": "string",
  "type": "workflow | worker_run",
  "status": "string",
  "parent_id": "string",
  "plan": "string",
  "tmux": "string",
  "stage": "string",
  "experiment_case": "string",
  "seed": "string",
  "worker": { "id": "string" },
  "gpu": { "id": "string" },
  "progress": { "epoch": "number", "max_epoch": "number", "percent": "number", "loss": "number" }
}
```

Empty fields are omitted. `--json --full` returns the full experiment object.

新生成的 `worker_run` 优先使用 Scheduler 显式传递的 `workflowId` 设置 `parent_id`。旧历史记录仅在 plan 完整路径、Worker 和启动时间得到唯一 workflow 候选时回填；候选不唯一时 `parent_id` 保持空。`experiment tree` 只根据 `parent_id` 建树，不做模糊关联。

## experiment active

```json
{
  "active_count": "number",
  "workflows": [{ "id": "string", "status": "string", "plan": "string", "worker": { "id": "string" }, "tmux": "string" }],
  "runs": [{ "id": "string", "experiment_case": "string", "worker": { "id": "string" }, "gpu": { "id": "string" }, "stage": "string", "seed": "string", "progress": { "epoch": "number", "max_epoch": "number", "percent": "number", "loss": "number" } }]
}
```

`--json --full` keeps `created_at`, `health_status`, `children`, `model`, and `dataset`.

## experiment status

```json
{
  "id": "string",
  "type": "workflow | worker_run",
  "status": "string",
  "health_status": "string",
  "plan": "string",
  "worker": { "id": "string" },
  "gpu": { "id": "string" },
  "stage": "string",
  "progress": { "epoch": "number", "max_epoch": "number", "percent": "number", "loss": "number" },
  "last_update": "string"
}
```

`--json --full` adds `recentLogs`, `children`, `error`, and `outputDir`.

## experiment diagnose

```json
{
  "id": "string",
  "status": "string",
  "health_status": "string",
  "reason": ["string"],
  "stage": "string",
  "worker": "string",
  "gpu": "string",
  "last_update": "string",
  "last_stage": "string",
  "suggestions": ["string"]
}
```

`--json --full` adds `evidence`: at most 20 strings, each at most 200 characters.

## experiment monitor

```json
{
  "id": "string",
  "status": "string",
  "health_status": "string",
  "stage": "string",
  "progress": { "epoch": "number", "max_epoch": "number", "percent": "number", "loss": "number" },
  "last_update": "string",
  "latest_message": "string"
}
```

`latest_message` is at most 300 characters. `--json --full` adds `recentLogs`: at most 20 strings, each at most 200 characters.
