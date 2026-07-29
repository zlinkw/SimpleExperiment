const test = require("node:test");
const assert = require("node:assert/strict");

const { CLUSTER_SCHEDULER_RUNTIME } = require("../dist/clusterSchedulerRuntime.js");

test("scheduler runtime records dispatch probes and wait reasons", () => {
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /def probe_idle_gpus/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /"dispatch_probe"/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /"scheduler_wait_reason"/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /no_idle_gpu_from_hub_probe/);
});

test("scheduler runtime does not silently finish with all experiments pending", () => {
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /no_dispatch_error_cycles = 0/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /if no_dispatch_error_cycles >= 3:/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /while queue:[\s\S]*failed\.append\(\{"experiment_index": queue\.popleft\(\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /write_current_state\(reason\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /Hub 调度器仍有排队实验但没有任何派发/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /write_current_state\(final_error\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /terminal_status = "failed" if final_error or failed_count else "completed"/);
  assert.doesNotMatch(CLUSTER_SCHEDULER_RUNTIME, /Hub scheduler exited with pending experiments and no dispatch/);
});

test("scheduler runtime uses deque without leaking it into JSON payloads", () => {
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /from collections import deque/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /queue = deque\(job\.index for job in jobs\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /queue = deque\(job\.index for job in \(jobs\[:1\] if args\.debug_mode else jobs\)\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /"queuedExperimentIndexes": list\(queue\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /"pending_experiments": list\(queue\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /queue\.clear\(\)[\s\S]{0,80}queue\.extend\(kept_queue\)/);
  assert.match(CLUSTER_SCHEDULER_RUNTIME, /experiment_index = queue\.popleft\(\)/);
  assert.doesNotMatch(CLUSTER_SCHEDULER_RUNTIME, /queue\.pop\(0\)/);
  assert.doesNotMatch(CLUSTER_SCHEDULER_RUNTIME, /queue\[:\]\s*=/);
});
