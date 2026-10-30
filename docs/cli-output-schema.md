# CLI JSON output schema

Default JSON fields. `--full` returns the existing detailed payload.

## result list / show / export

0.5.445 试行版默认只读取 `results.list` 的本轮 `active_query`；整批未核实或 API 连接失败时返回错误，不混用本机 registry 或旧 Worker 汇总。按完整运行身份、维度和来源路径生成现代结果稳定 ID，并读取 `summary.results` 完整集合，而非仅顶层预览。

`result list --json` 保留数组格式；每行新增 `source: "active_query" | "history"`、`current: boolean` 和 `observedAt: string | null`。`show --json`、`export --json` 的回执及 JSON 导出内容包含相同字段。`current=true` 表示该行本轮已核实，不表示整个 PLAN 已完成。seed 为 0 时保留数值 0。

显式 `--history` 只读取本机旧记录，标记 `source=history`、`current=false`、`observedAt=null`，同时向 stderr 输出未核实提醒。`metric list/show`、`compare`、`experiment results` 同样支持明确的历史选项；其他命令不通过此选项获得离线执行权。`experiment results --history` 仅精确匹配历史结果 ID/experimentId/runKey，不连接服务器补归属。

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

公开状态为 `pending`、`queued`、`running`、`success`、`failed`、`cancelled`、`unknown`。原始状态 `interrupted` 和 `manual_interrupted_completed` 归一为 `cancelled`，`normal_completed` 归一为 `success`，`completed_with_errors` 归一为 `failed`；这些原始状态不增加公开枚举值。

完整模式中的 `status_source` 表示最终公开状态的直接来源：`scheduler` 来自 Scheduler operation，`worker` 来自 Worker task 或当前 worker runtime，`aggregate` 表示 workflow 状态由子 `worker_run` 聚合，`log` 来自日志推断，`unknown` 表示当前无法确定。`history` 属于对象数据的 `source/runtime_source`，不属于 `status_source`。

新生成的 `worker_run` 优先使用 Scheduler 显式传递的 `workflowId` 设置 `parent_id`。旧历史记录仅在 plan 完整路径、Worker 和启动时间得到唯一 workflow 候选时回填；候选不唯一时 `parent_id` 保持空。`experiment tree` 只根据 `parent_id` 建树，不做模糊关联。

所有 `workflow` 都作为顶层节点；没有有效 `workflow` 父级的 `worker_run` 也作为顶层叶节点返回。`tree` 不会因 `parent_id` 缺失或父 `workflow` 不可用而隐藏 `worker_run`。同一快照中，`tree` 展平后的实验 ID 集合应与 `experiment list` 一致。

## experiment active

```json
{
  "active_count": "number",
  "workflows": [{ "id": "string", "status": "string", "plan": "string", "worker": { "id": "string" }, "tmux": "string" }],
  "runs": [{ "id": "string", "experiment_case": "string", "worker": { "id": "string" }, "gpu": { "id": "string" }, "stage": "string", "seed": "string", "progress": { "epoch": "number", "max_epoch": "number", "percent": "number", "loss": "number" } }]
}
```

`--json --full` keeps `created_at`, `health_status`, `children`, `model`, and `dataset`.

所有 Agent JSON 中的 `progress.percent` 均表示当前终端可识别训练循环的完成度，不是整个 `worker_run` 的总体进度，也不能单独用于估算总体剩余时间。连续训练循环切换时，该值可以重新从较小值开始；没有可识别的 `epoch/max_epoch` 时为 `null`。

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
