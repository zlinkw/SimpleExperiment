const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
const PluginLogRetention = require("../../dist/features/PluginLogRetention.js");
const { readSource } = require("../_helpers/sourceReader");

function job(index, attempt, status, extra = {}) {
  return { index, case: "c", seed: 1, attempt, status, outputDir: "out", ...extra };
}
function plan(id, enqueuedAt, planFile, jobs) {
  return { id, planFile, enqueuedAt, jobs };
}
function queueOf(plans) {
  return { schemaVersion: 1, plans };
}
const indexPath = index => index.rows.map(row => row.path);

test("exact manifest paths: only generations beyond current+previous become stale rows", () => {
  const queue = queueOf([
    plan("run-aaaaaaaa", "2026-10-01T10:00:00Z", "plans/a.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/command-old1.log" })]),
    plan("run-bbbbbbbb", "2026-10-02T10:00:00Z", "plans/a.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/command-old2.log" })]),
    plan("run-cccccccc", "2026-10-03T10:00:00Z", "plans/a.yaml", [job(0, 0, "cancelled", { logPath: "simple_cluster/tmp/tmux_logs/command-old3.log" })]),
    plan("run-dddddddd", "2026-10-04T10:00:00Z", "plans/a.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/command-new.log" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  // Newest two generations (10-04, 10-03) retained; the two older terminal generations are proposed.
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/command-old1.log"), true);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/command-old2.log"), true);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/command-old3.log"), false);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/command-new.log"), false);
});

test("active, paused and unknown generations are never proposed, even with trusted terminal facts", () => {
  const queue = queueOf([
    plan("run-00000001", "2026-10-05T10:00:00Z", "p.yaml", [job(0, 2, "running", { trustedTerminalStatus: "completed", logPath: "simple_cluster/tmp/console_logs/p/live.log" })]),
    plan("run-00000002", "2026-10-04T10:00:00Z", "p.yaml", [job(0, 1, "paused", { logPath: "simple_cluster/tmp/console_logs/p/paused.log" })]),
    plan("run-00000003", "2026-10-03T10:00:00Z", "p.yaml", [job(0, 0, "unknown", { logPath: "simple_cluster/tmp/console_logs/p/unknown.log" })]),
    plan("run-00000004", "2026-10-02T10:00:00Z", "p.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/console_logs/p/dead1.log" })]),
    plan("run-00000005", "2026-10-01T10:00:00Z", "p.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/console_logs/p/dead2.log" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  const paths = indexPath(index);
  assert.equal(paths.includes("simple_cluster/tmp/console_logs/p/live.log"), false);
  assert.equal(paths.includes("simple_cluster/tmp/console_logs/p/paused.log"), false);
  assert.equal(paths.includes("simple_cluster/tmp/console_logs/p/unknown.log"), false);
  // The two dead generations are outside the window: the trusted-terminal live row and paused row
  // occupy the retained slots, and every proposed path must be terminal AND beyond the window.
  assert.equal(paths.includes("simple_cluster/tmp/console_logs/p/dead1.log"), true);
});

test("worker and GPU reassignment inside one attempt shares a single generation", () => {
  const reassigned = job(0, 1, "failed", { logPath: "simple_cluster/tmp/tmux_logs/attempt1.log", workerId: "gpu-node-b", gpuId: "3",
    history: [{ attempt: 1, status: "failed", commandId: "cmd-x", outputDir: "out" }] });
  const queue = queueOf([
    plan("run-x", "2026-10-03T10:00:00Z", "p.yaml", [reassigned]),
    plan("run-y", "2026-10-02T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/gen1.log", tmuxSession: "sess-one" })]),
    plan("run-z", "2026-10-01T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/gen0.log", tmuxSession: "sess-zero" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  // Generations: 10-03/attempt1 (retained newest), 10-02 (retained previous), 10-01 (stale).
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/gen0.log"), true);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/gen1.log"), false);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/attempt1.log"), false);
  // tmux sessions join ownership: only stale sessions are proposed; protected ones never.
  assert.equal(index.staleSessions.has("sess-zero"), true);
  assert.equal(index.protectedSessions.has("sess-one"), true);
});

test("retries inside one run share a single generation and never age out by themselves", () => {
  const attempts = [];
  for (let attempt = 0; attempt <= 12; attempt++)
    attempts.push(job(0, attempt, "failed", { logPath: `simple_cluster/tmp/tmux_logs/att-${attempt}.log` }));
  const queue = queueOf([
    plan("run-many", "2026-10-05T10:00:00Z", "p.yaml", attempts),
    plan("run-prev", "2026-10-04T10:00:00Z", "p.yaml", [job(0, 2, "completed", { logPath: "simple_cluster/tmp/tmux_logs/prev-live.log" })]),
    plan("run-old", "2026-10-03T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/old-run.log" })]),
    plan("run-older", "2026-10-02T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/older-run.log" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  // All 13 retry logs belong to the newest run: one generation, fully retained.
  for (let attempt = 0; attempt <= 12; attempt++)
    assert.equal(indexPath(index).includes(`simple_cluster/tmp/tmux_logs/att-${attempt}.log`), false, `attempt ${attempt} must share the run generation`);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/prev-live.log"), false);
  // Distinct RUNS still age out: the two older runs leave the window together.
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/old-run.log"), true);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/older-run.log"), true);
});

test("extra batches appended to the same run id share one generation slot", () => {
  const queue = queueOf([
    plan("run-b", "2026-10-05T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/b1.log" })]),
    plan("run-b", "2026-10-05T10:00:00Z", "p.yaml", [job(1, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/b2.log" })]),
    plan("run-a", "2026-10-04T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/a.log" })]),
    plan("run-z", "2026-10-03T10:00:00Z", "p.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/z.log" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  // The two batch entries share run id run-b: together they occupy ONE generation slot, so the
  // previous run (a.log) is still retained and only run-z leaves the window.
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/b1.log"), false);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/b2.log"), false);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/a.log"), false);
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/z.log"), true);
});

test("no silent truncation: more than sixty-four stale generations are all reported", () => {
  const plans = [];
  for (let i = 0; i < 100; i++)
    plans.push(plan(`run-${String(i).padStart(8, "0")}`, `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z${i}`, "p.yaml",
      [job(0, 0, "failed", { logPath: `simple_cluster/tmp/tmux_logs/c${i}.log` })]));
  // Distinct enqueuedAt per plan so ordering is deterministic.
  plans.forEach((row, i) => { row.enqueuedAt = new Date(Date.UTC(2026, 0, 1 + Math.floor(i / 4), i % 4)).toISOString(); });
  const index = PluginLogRetention.retentionIndex(queueOf(plans));
  assert.equal(index.rows.length, 98);
});

test("shared scheduler log is reference-counted across generations and plans", () => {
  const queue = queueOf([
    plan("plan-live", "2026-10-04T10:00:00Z", "plans/shared.yaml", [job(0, 0, "running")]),
    plan("plan-old-1", "2026-10-01T10:00:00Z", "plans/shared.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/oldA.log" })]),
    plan("plan-old-2", "2026-10-02T10:00:00Z", "plans/shared.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/oldB.log" })]),
    plan("plan-old-3", "2026-10-03T10:00:00Z", "plans/shared.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/oldC.log" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  const shared = "simple_cluster/tmp/cluster_scheduler/plans_shared.yaml.log";
  // The per-plan scheduler log is shared with the still-running plan: never proposed.
  assert.equal(indexPath(index).includes(shared), false);
  // The per-generation job logs beyond the window are still proposed.
  assert.equal(indexPath(index).includes("simple_cluster/tmp/tmux_logs/oldA.log"), true);
});

test("matching is exact-path, not substring, and directory-scoped", () => {
  const queue = queueOf([
    plan("r1", "2026-10-01T10:00:00Z", "p.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/command-abcdef12.log" })]),
    plan("r2", "2026-10-02T10:00:00Z", "p.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/command-99.log" })]),
    plan("r3", "2026-10-03T10:00:00Z", "p.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/command-98.log" })]),
    plan("r4", "2026-10-04T10:00:00Z", "p.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/command-97.log" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  assert.ok(PluginLogRetention.isStaleRetentionRow(index, "simple_cluster/tmp/tmux_logs/COMMAND-ABCDEF12.log"));
  // A longer or different basename is a DIFFERENT file: exact-path matching must not claim it.
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, "simple_cluster/tmp/tmux_logs/command-abcdef12-extra.log"), undefined);
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, "simple_cluster/tmp/tmux_logs/xcommand-abcdef12.log"), undefined);
  // Outside the managed prefixes (result dirs, output dirs) is never retention-managed.
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, "experiments/results/command-abcdef12.csv"), undefined);
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, "simple_cluster/tmp/other/command-abcdef12.log"), undefined);
  // Case-insensitive matching honours the Windows workspace by default.
  assert.equal(PluginLogRetention.retentionIndex(queue, { caseInsensitive: false }).byPath.has("simple_cluster/tmp/tmux_logs/COMMAND-ABCDEF12.log"), false);
});

test("console log files join by exact parsed session field", () => {
  const queue = queueOf([
    plan("c1", "2026-10-01T10:00:00Z", "p.yaml", [job(0, 0, "completed", { tmuxSession: "sess-old" })]),
    plan("c2", "2026-10-02T10:00:00Z", "p.yaml", [job(0, 0, "completed", { tmuxSession: "sess-b" })]),
    plan("c3", "2026-10-03T10:00:00Z", "p.yaml", [job(0, 0, "completed", { tmuxSession: "sess-c" })]),
    plan("c4", "2026-10-04T10:00:00Z", "p.yaml", [job(0, 0, "running", { tmuxSession: "sess-live" })]),
  ]);
  const index = PluginLogRetention.retentionIndex(queue);
  const name = session => `simple_cluster/console_logs/p/exp-0__case-c__seed-1__worker-w__gpu-0__status-done__session-${session}.log`;
  assert.ok(PluginLogRetention.isStaleRetentionRow(index, name("sess-old")));
  assert.ok(PluginLogRetention.isStaleRetentionRow(index, name("sess-b")));
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, name("sess-c")), undefined);
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, name("sess-live")), undefined);
  // Unknown session ownership is never proposed (conservative).
  assert.equal(PluginLogRetention.isStaleRetentionRow(index, name("sess-unknown")), undefined);
  // Protected session wins even if the same session string appears in a stale row elsewhere.
  const both = PluginLogRetention.retentionIndex(queueOf([
    plan("d1", "2026-10-01T10:00:00Z", "p.yaml", [job(0, 0, "completed", { tmuxSession: "sess-dup" })]),
    plan("d2", "2026-10-02T10:00:00Z", "p.yaml", [job(0, 0, "completed", { tmuxSession: "sess-x" })]),
    plan("d3", "2026-10-03T10:00:00Z", "p.yaml", [job(0, 0, "completed", { tmuxSession: "sess-y" })]),
    plan("d4", "2026-10-04T10:00:00Z", "p.yaml", [job(0, 0, "running", { tmuxSession: "sess-dup" })]),
  ]));
  assert.equal(PluginLogRetention.isStaleRetentionRow(both, name("sess-dup")), undefined);
});

test("admission preview virtual-joins the incoming generation and holds until deletion is verified", async () => {
  const queue = queueOf([
    plan("t1", "2026-10-01T10:00:00Z", "plans/a.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/genA.log" })]),
    plan("t2", "2026-10-02T10:00:00Z", "plans/a.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/genB.log" })]),
    plan("t3", "2026-10-03T10:00:00Z", "plans/a.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/genC.log" })]),
    plan("t4", "2026-10-04T10:00:00Z", "plans/a.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/genD.log" })]),
  ]);
  // Virtual join: retained window becomes {incoming, t4}; t1–t3 leave the window and must be gone.
  const blocked = await PluginLogRetention.admissionPreview(queue, "plans/a.yaml", { probe: async () => "present" });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.pending.length >= 1, true);
  assert.match(blocked.pending[0].taskKey, /plans\/a\.yaml/);
  assert.equal(blocked.pending.some(row => row.reason === "old-generation-still-present"), true);
  // The retained newest generation sits next to the incoming one: its own log is never a leaving path.
  assert.equal(blocked.pending.every(row => !row.paths.includes("simple_cluster/tmp/tmux_logs/genD.log")), true);
  // Landing is allowed only once every leaving path is ACTIVELY VERIFIED absent (confirmed cleanup).
  const cleared = await PluginLogRetention.admissionPreview(queue, "plans/a.yaml", { probe: async () => "absent" });
  assert.equal(cleared.allowed, true);
  assert.equal(Array.isArray(cleared.taskKeys) && cleared.taskKeys.length >= 1, true);
  // A failed existence check is never treated as "absent" (fail-closed).
  const errored = await PluginLogRetention.admissionPreview(queue, "plans/a.yaml", { probe: async () => "error" });
  assert.equal(errored.allowed, false);
  assert.equal(errored.pending.some(row => row.reason === "existence-check-failed"), true);
  // Active or unknown old generations hold admission even when every file is verified absent.
  const activeQueue = queueOf([
    plan("a1", "2026-10-01T10:00:00Z", "plans/a.yaml", [job(0, 0, "running", { logPath: "simple_cluster/tmp/tmux_logs/live.log" })]),
    plan("a2", "2026-10-04T10:00:00Z", "plans/a.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/new.log" })]),
  ]);
  const held = await PluginLogRetention.admissionPreview(activeQueue, "plans/a.yaml", { probe: async () => "absent" });
  assert.equal(held.allowed, false);
  assert.equal(held.pending.some(row => row.reason === "old-generation-active"), true);
  // Independent plan files never hold each other's admission.
  const other = await PluginLogRetention.admissionPreview(queue, "plans/other.yaml", { probe: async () => "present" });
  assert.equal(other.allowed, true);
});

test("preflight wires the preview early and the fenced claim last", () => {
  const legacy = readSource("src/extension/legacy.ts");
  // Wiring smoke only — behaviour is proven by the claim-fence test below.
  assert.match(legacy, /await this\.assertRetentionWindow\?\.\(planKey, failPreflight\);\s*\n\s*let check = "校验\(validate-plan\)";/);
  assert.match(legacy, /await this\.claimRetentionWindow\?\.\(planKey, body, failPreflight, authority\);\s*\n\s*return previewed \? validated : false;/);
  const start = legacy.indexOf("async evaluateRetentionWindow(planKey)");
  const end = legacy.indexOf("async runActionCommandCore(", start);
  assert.ok(start > 0 && end > start, "retention methods must live outside the runActionCommandCore→runPlanPreflight fixture span");
});

test("fenced retention claim: stable id, same-flow reuse, foreign host nonce blocks, verified-absent gate", async () => {
  const legacy = readSource("src/extension/legacy.ts");
  const helpersStart = legacy.indexOf("const RETENTION_ADMISSION_LEAF");
  const helpersEnd = legacy.indexOf("function workspaceWriteStatusText", helpersStart);
  const methodsStart = legacy.indexOf("async evaluateRetentionWindow(planKey)");
  const methodsEnd = legacy.indexOf("async runActionCommandCore(", methodsStart);
  assert.ok(helpersStart > 0 && helpersEnd > helpersStart && methodsStart > 0 && methodsEnd > methodsStart);
  const transpile = code => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const moduleCode = transpile(legacy.slice(helpersStart, helpersEnd));
  const classCode = transpile("class RetentionHost {\n" + legacy.slice(methodsStart, methodsEnd) + "\n}");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "se-claim-fence-"));
  const processStub = { platform: "linux", pid: process.pid, kill: (pid, signal) => process.kill(pid, signal) };
  const makeContext = nonce => {
    let uuidCount = 0;
    const sandbox = { fs: fsp, path, PluginLogRetention, process: processStub, workspaceRoot: () => root,
      crypto: { createHash: crypto.createHash.bind(crypto), randomUUID: () => `${nonce}-${++uuidCount}` } };
    vm.createContext(sandbox);
    vm.runInContext(moduleCode + "\n" + classCode + "\nthis.nonce = EXTENSION_HOST_BOOT_NONCE;\nthis.Host = RetentionHost;\nthis.newSet = () => new Set();\nthis.readClaims = () => readRetentionClaims(workspaceRoot());", sandbox);
    return sandbox;
  };
  const hostA = makeContext("aaaaaaaa-1111");
  const hostB = makeContext("bbbbbbbb-2222");
  const failPreflight = (check, message, detail) => Object.assign(new Error(`${check}:${message}|${detail}`), { planPreflightReported: true });
  const makeHost = (ctx, queue) => {
    // activeRetentionClaims must be created INSIDE the vm realm: the fence checks instanceof Set.
    const host = new ctx.Host();
    host.loadPlanOutputRetentionQueue = async () => queue;
    host.activeRetentionClaims = ctx.newSet();
    return host;
  };
  const empty = queueOf([]);
  // Stable submission id: the first preflight stamps it, the second (validate→execute) reuses ONE claim.
  const host1 = makeHost(hostA, empty);
  const body1 = { planFile: "plans/a.yaml" };
  await host1.claimRetentionWindow("plans/a.yaml", body1, failPreflight);
  assert.match(String(body1.retentionSubmissionId), /^retention-/);
  let claims = await hostA.readClaims();
  assert.equal(claims.length, 1);
  assert.equal(claims[0].incomingRun, body1.retentionSubmissionId);
  assert.equal(claims[0].hostNonce, hostA.nonce);
  assert.equal(claims[0].pid, process.pid);
  await makeHost(hostA, empty).claimRetentionWindow("plans/a.yaml", body1, failPreflight);
  claims = await hostA.readClaims();
  assert.equal(claims.length, 1);
  // Same pid, different extension-host window (boot nonce) blocks — no pid-based bypass.
  await assert.rejects(makeHost(hostB, empty).claimRetentionWindow("plans/a.yaml", { planFile: "plans/a.yaml", commandId: "cmd-b" }, failPreflight),
    error => error.planPreflightReported === true && /另一扩展主机实例/.test(error.message));
  claims = await hostA.readClaims();
  assert.equal(claims.length, 1);
  assert.equal(claims[0].incomingRun, body1.retentionSubmissionId);
  // Same host while the owning submission is STILL in flight (id in the in-flight set) → held.
  const busyHost = makeHost(hostA, empty);
  busyHost.activeRetentionClaims.add(body1.retentionSubmissionId);
  await assert.rejects(busyHost.claimRetentionWindow("plans/a.yaml", { planFile: "plans/a.yaml", commandId: "cmd-busy" }, failPreflight),
    error => error.planPreflightReported === true && /正在进行中的提交/.test(error.message));
  // Once the owning flow has terminated (id no longer in the in-flight set), the same host supersedes.
  host1.activeRetentionClaims.delete(body1.retentionSubmissionId);
  const body2 = { planFile: "plans/a.yaml" };
  await makeHost(hostA, empty).claimRetentionWindow("plans/a.yaml", body2, failPreflight);
  claims = await hostA.readClaims();
  assert.equal(claims.length, 1);
  assert.equal(claims[0].incomingRun, body2.retentionSubmissionId);
  // Verified-absent gate on real disk: files present → held; deleted (absence verified) → allowed.
  const twoGens = queueOf([
    plan("g1", "2026-10-01T10:00:00Z", "plans/b.yaml", [job(0, 0, "failed", { logPath: "simple_cluster/tmp/tmux_logs/leaving.log" })]),
    plan("g2", "2026-10-02T10:00:00Z", "plans/b.yaml", [job(0, 0, "completed", { logPath: "simple_cluster/tmp/tmux_logs/kept.log" })]),
  ]);
  await fsp.mkdir(path.join(root, "simple_cluster/tmp/tmux_logs"), { recursive: true });
  await fsp.writeFile(path.join(root, "simple_cluster/tmp/tmux_logs/leaving.log"), "old");
  await assert.rejects(makeHost(hostA, twoGens).claimRetentionWindow("plans/b.yaml", { planFile: "plans/b.yaml", commandId: "cmd-c" }, failPreflight),
    error => error.planPreflightReported === true && /old-generation-still-present/.test(error.message));
  await fsp.rm(path.join(root, "simple_cluster/tmp/tmux_logs/leaving.log"));
  await makeHost(hostA, twoGens).claimRetentionWindow("plans/b.yaml", { planFile: "plans/b.yaml", commandId: "cmd-d" }, failPreflight);
  // Concurrent submissions for one plan: the lock+claim fence lets exactly one through.
  const raced = await Promise.allSettled([
    makeHost(hostA, empty).claimRetentionWindow("plans/c.yaml", { planFile: "plans/c.yaml", commandId: "cmd-e" }, failPreflight),
    makeHost(hostB, empty).claimRetentionWindow("plans/c.yaml", { planFile: "plans/c.yaml", commandId: "cmd-f" }, failPreflight),
  ]);
  assert.equal(raced.filter(row => row.status === "fulfilled").length, 1);
  assert.equal(raced.filter(row => row.status === "rejected").length, 1);
  // A host without the persisted queue store evaluates no retention gate and never blocks.
  const bare = new hostA.Host();
  await bare.claimRetentionWindow("plans/a.yaml", {}, failPreflight);
  await bare.assertRetentionWindow("plans/a.yaml", failPreflight);
});

test("workspace backups keep exactly one history generation in a single fixed slot", async () => {
  const extension = readSource("src/extension/legacy.ts");
  const start = extension.indexOf("async function writeWorkspaceTextWithBackup");
  const slotStart = extension.indexOf("async function nextWorkspaceBackupSlot", start);
  const end = extension.indexOf("const RETENTION_ADMISSION_LEAF", slotStart);
  assert.ok(start > 0 && slotStart > start && end > slotStart);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "se-backup-rotation-"));
  const target = path.join(root, "experiments", "plans", "a.yaml");
  const sandbox = {
    workspaceRoot: () => root,
    fs: fsp,
    path,
    crypto,
    atomicWriteText: async (file, text) => { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, text, "utf8"); },
  };
  vm.createContext(sandbox);
  const region = extension.slice(start, slotStart) + "\n" + extension.slice(slotStart, end);
  const code = ts.transpileModule(region, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInContext(code + "\nthis.api = { writeWorkspaceTextWithBackup };", sandbox);
  const writer = sandbox.api.writeWorkspaceTextWithBackup;
  await writer(target, "v1");
  await writer(target, "v2");
  await writer(target, "v3");
  const backups = path.join(root, "simple_cluster", "tmp", "backups");
  const keys = fs.readdirSync(backups);
  assert.equal(keys.length, 1);
  const files = fs.readdirSync(path.join(backups, keys[0]));
  // "current + one previous" ONLY: exactly one .bak history slot, no .prev chain, no third copy.
  assert.deepEqual(files, ["a.yaml.bak"]);
  assert.equal(fs.readFileSync(path.join(backups, keys[0], "a.yaml.bak"), "utf8"), "v2");
  // No .bak chain may remain next to the source file.
  assert.deepEqual(fs.readdirSync(path.dirname(target)), ["a.yaml"]);
  await writer(target, "v4");
  assert.deepEqual(fs.readdirSync(path.join(backups, keys[0])), ["a.yaml.bak"]);
  assert.equal(fs.readFileSync(path.join(backups, keys[0], "a.yaml.bak"), "utf8"), "v3");
});

test("download slots admit before publishing and keep both retained generations on failure", async () => {
  const extension = readSource("src/extension/legacy.ts");
  const start = extension.indexOf("function pluginCopySlotPaths");
  const end = extension.indexOf("function remoteResultInspectionLocalRelativePath", start);
  assert.ok(start > 0 && end > start);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "se-copy-slot-"));
  const slot = path.join(root, "latest.zip");
  const sandbox = { fs: fsp, path, process, EXTENSION_HOST_BOOT_NONCE: "fixturenonce",
    retentionPidAlive: pid => fs.existsSync(path.join("/proc", String(pid))) };
  vm.createContext(sandbox);
  const code = ts.transpileModule(extension.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInContext(code + "\nthis.api = { pluginCopySlotPaths, pluginCopyIncomingRelative, admitPluginCopySlot, publishPluginCopySlot, withPluginCopySlotLock };", sandbox);
  const api = sandbox.api;
  const incoming = path.join(root, "latest.incoming-9.fixturenonce.zip");
  // Empty slot admits; publishing lands the first generation and consumes the incoming file.
  await api.admitPluginCopySlot(slot);
  await fsp.writeFile(incoming, "gen1");
  await api.publishPluginCopySlot(incoming, slot);
  assert.equal(fs.readFileSync(slot, "utf8"), "gen1");
  assert.equal(fs.existsSync(incoming), false);
  // Second generation: current is promoted to previous; exactly two copies remain.
  await api.admitPluginCopySlot(slot);
  await fsp.writeFile(incoming, "gen2");
  await api.publishPluginCopySlot(incoming, slot);
  assert.deepEqual(fs.readdirSync(root).sort(), ["latest.prev.zip", "latest.zip"]);
  assert.equal(fs.readFileSync(slot, "utf8"), "gen2");
  assert.equal(fs.readFileSync(path.join(root, "latest.prev.zip"), "utf8"), "gen1");
  // Third generation: a fully downloaded incoming file is STILL held — admission fails closed and
  // publication refuses, so both retained copies stay byte-identical; the history slot is only
  // vacated through the confirmed cleanup executor, never by renaming over it.
  const nextIncoming = path.join(root, "latest.incoming-999999.fixturenonce.zip");
  await fsp.writeFile(nextIncoming, "gen3");
  await assert.rejects(api.admitPluginCopySlot(slot), /两代保留已满/);
  await assert.rejects(api.publishPluginCopySlot(nextIncoming, slot), /两代保留已满/);
  assert.deepEqual(fs.readdirSync(root).sort(), ["latest.incoming-999999.fixturenonce.zip", "latest.prev.zip", "latest.zip"]);
  assert.equal(fs.readFileSync(slot, "utf8"), "gen2");
  assert.equal(fs.readFileSync(path.join(root, "latest.prev.zip"), "utf8"), "gen1");
  assert.equal(fs.readFileSync(nextIncoming, "utf8"), "gen3");
  // A failed transfer publishes nothing: even after a granted admission, a missing incoming file
  // leaves the current generation exactly where it was (admission also reaps the dead-flow file).
  await fsp.rm(path.join(root, "latest.prev.zip"));
  await api.admitPluginCopySlot(slot);
  assert.equal(fs.existsSync(nextIncoming), false);
  await assert.rejects(api.publishPluginCopySlot(path.join(root, "latest.incoming-999998.fixturenonce.zip"), slot), /未发布/);
  assert.deepEqual(fs.readdirSync(root).sort(), ["latest.zip"]);
  assert.equal(fs.readFileSync(slot, "utf8"), "gen2");
  // Stale incoming files of dead flows are cleaned at admission; live flows' files are untouched.
  const dead = path.join(root, "latest.incoming-999999.fixturenonce.zip");
  const mine = path.join(root, `latest.incoming-${process.pid}.fixturenonce.zip`);
  await fsp.writeFile(dead, "stale");
  await fsp.writeFile(mine, "in-flight");
  await api.admitPluginCopySlot(slot);
  assert.equal(fs.existsSync(dead), false);
  assert.equal(fs.existsSync(mine), true);
  // Same-slot requests serialise: a second flow cannot overlap a running one.
  const order = [];
  await Promise.all([
    api.withPluginCopySlotLock(slot, async () => { order.push("a:start"); await new Promise(resolve => setTimeout(resolve, 10)); order.push("a:end"); }),
    api.withPluginCopySlotLock(slot, async () => { order.push("b:start"); }),
  ]);
  assert.deepEqual(order, ["a:start", "a:end", "b:start"]);
});

test("inspection download slots are deterministic per stable remote source", () => {
  const extension = readSource("src/extension/legacy.ts");
  const start = extension.indexOf("function remoteResultInspectionLocalRelativePath");
  const end = extension.indexOf("function methodResultArtifactLocalRelativePath", start);
  assert.ok(start > 0 && end > start);
  const code = ts.transpileModule(extension.slice(extension.indexOf("function normalizeRemoteResultInspectionPath"), end),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { path, crypto, FileTransferTypes_1: { isSafeRemotePath: value => !value.includes("..") },
    WrapperResultBundle: { isWrapperResultFile: () => true }, safePlanToken: value => String(value).replace(/[^a-z0-9]/gi, "_") };
  vm.createContext(sandbox);
  vm.runInContext(code + "\nthis.api = { remoteResultInspectionLocalRelativePath };", sandbox);
  const first = sandbox.api.remoteResultInspectionLocalRelativePath("results/run1/metrics.csv", "plans/a.yaml");
  const second = sandbox.api.remoteResultInspectionLocalRelativePath("results/run1/metrics.csv", "plans/a.yaml");
  assert.equal(first, second);
  assert.match(first, /^simple_cluster\/tmp\/downloads\/result_inspection\//);
});
