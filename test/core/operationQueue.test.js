const test = require("node:test");
const assert = require("node:assert/strict");

const { OperationQueue } = require("../../dist/core/OperationQueue.js");

test("manual cancellation stays cancelled when the operation rejects on abort", async () => {
  const queue = new OperationQueue();
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const operation = queue.enqueue({
    id: "manual-cancel",
    type: "test",
    priority: "manual",
    cancellable: true,
    run: (signal) => new Promise((resolve, reject) => {
      markStarted();
      signal.addEventListener("abort", () => reject(new Error("aborted by user")), { once: true });
    }),
  });

  await started;
  assert.equal(queue.cancel("manual-cancel"), true);
  await assert.rejects(operation, /aborted by user/);
  const record = queue.snapshot().find((item) => item.id === "manual-cancel");
  assert.equal(record.status, "cancelled");
  assert.equal(record.error, undefined);
});

test("manual cancellation remains terminal when work ignores the abort signal", async () => {
  const queue = new OperationQueue();
  let finish;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const operation = queue.enqueue({
    id: "cancel-ignored",
    type: "test",
    priority: "manual",
    cancellable: true,
    run: () => new Promise((resolve) => {
      finish = resolve;
      markStarted();
    }),
  });

  await started;
  assert.equal(queue.cancel("cancel-ignored"), true);
  finish();
  await operation;
  assert.equal(queue.snapshot().find((item) => item.id === "cancel-ignored").status, "cancelled");
});

test("timeouts remain distinct from manual cancellation", async () => {
  const queue = new OperationQueue();
  const operation = queue.enqueue({
    id: "timed-out",
    type: "test",
    priority: "background",
    timeoutMs: 5,
    run: () => new Promise(() => undefined),
  });

  await assert.rejects(operation, /operation timeout/);
  assert.equal(queue.snapshot().find((item) => item.id === "timed-out").status, "timeout");
});

test("completed operation history is bounded while preserving newest records", async () => {
  const queue = new OperationQueue(3);
  for (let index = 0; index < 6; index += 1) {
    await queue.enqueue({
      id: `operation-${index}`,
      type: "test",
      priority: "background",
      run: async () => undefined,
    });
  }

  assert.deepEqual(queue.snapshot(50).map((item) => item.id), ["operation-3", "operation-4", "operation-5"]);
});
