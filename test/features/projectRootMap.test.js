const test = require("node:test");
const assert = require("node:assert/strict");
const {
  projectIdentityKey, resolveProjectRootMap, isMachineStateAbsolute, isMachineStateRelativePath,
} = require("../../dist/features/ProjectRootMap");
const { scopeInventoryPathAllowed } = require("../../dist/features/SyncScopeStatus");
const { classifyCleanupCandidates } = require("../../dist/features/PlanCleanup");

const candidate = relative => ({ nodeId: "local", relativePath: relative, type: "file", category: "产物",
  owners: ["plan-key-1"], evidence: ["任务产物: runner.outputs"], dependencies: [] });

test("project identity is stable across separator and drive-case drift and prefers an explicit id", () => {
  const a = projectIdentityKey({ projectDir: "D:/Server/ZLK/Project/" });
  const b = projectIdentityKey({ projectDir: "d:\\Server\\ZLK\\Project" });
  assert.equal(a, b);
  assert.equal(projectIdentityKey({ projectId: "proj-7", projectDir: "/srv/anything" }), "proj-7");
  assert.notEqual(a, projectIdentityKey({ projectDir: "/server/zlk/project" }));
});

test("the four-root map reads existing contract fields compatibly and matches the collector layout", () => {
  const map = resolveProjectRootMap({ projectId: "p1", projectDir: "/srv/proj", installDir: "/srv/proj_runtime" });
  assert.equal(map.codeRoot, "/srv/proj");
  assert.equal(map.programRoot, "/srv/proj_runtime");
  // Default state root mirrors default_agent_state_dir: <install>/state/... .
  assert.equal(map.stateRoot, "/srv/proj_runtime/state");
  // An explicit stateDir (contract.stateDir) wins over the derived default.
  const mapped = resolveProjectRootMap({ projectDir: "/srv/proj", installDir: "/srv/proj_runtime",
    stateDir: "/data/zlk_state", artifactDirs: ["work_dirs", "work_dirs/", "results"] });
  assert.equal(mapped.stateRoot, "/data/zlk_state");
  assert.deepEqual(mapped.artifactRoots, ["work_dirs", "results"]);
  // Stage-1 shared frames live under the mapped state root, never under code/artifact roots.
  const frame = "/data/zlk_state/workers/87eba76e7f316453/gpu_frame.json";
  assert.equal(isMachineStateAbsolute(mapped, frame), true);
  assert.equal(isMachineStateAbsolute(mapped, "/srv/proj/work_dirs/a.csv"), false);
  assert.equal(isMachineStateAbsolute(mapped, "/data/zlk_state"), true);
  assert.equal(isMachineStateAbsolute(mapped, "/data/zlk_state_other/workers/x/gpu_frame.json"), false);
});

test("relative machine-state detection matches the agent state layout only, never artifact semantics", () => {
  assert.equal(isMachineStateRelativePath("nested/state/projects/ns1/events.jsonl"), true);
  assert.equal(isMachineStateRelativePath("state/workers/87eba76e7f316453/gpu_frame.json"), true);
  // The namespace segment is required; loose "state" directories stay untouched.
  assert.equal(isMachineStateRelativePath("state"), false);
  assert.equal(isMachineStateRelativePath("state/projects"), false);
  assert.equal(isMachineStateRelativePath("docs/state/readme.md"), false);
  // Preserved semantics: tmp/result, work_dirs/work_dir and simple_cluster keep theirs.
  for (const kept of ["work_dirs/run/a.csv", "work_dir/b.ckpt", "tmp/result/x.csv",
    "experiments/results/m.csv", "simple_cluster/results/x.json"]) {
    assert.equal(isMachineStateRelativePath(kept), false, kept);
  }
});

test("the shared sync gate excludes machine state while artifact allowances stay intact", () => {
  assert.equal(scopeInventoryPathAllowed("state/workers/87eba76e7f316453/gpu_frame.json"), false);
  assert.equal(scopeInventoryPathAllowed("nested/state/projects/ns1/events.jsonl"), false);
  assert.equal(scopeInventoryPathAllowed("work_dirs/run/a.csv"), true);
  assert.equal(scopeInventoryPathAllowed("tmp/result/x.csv"), true);
  assert.equal(scopeInventoryPathAllowed("experiments/results/m.csv"), true);
  assert.equal(scopeInventoryPathAllowed("simple_cluster/tmp/tmux_logs/a.log"), true);
  assert.equal(scopeInventoryPathAllowed("simple_cluster/results/x.json"), true);
  // Pre-existing exclusions remain excluded.
  assert.equal(scopeInventoryPathAllowed("tmp/scratch/x"), false);
  assert.equal(scopeInventoryPathAllowed(".git/config"), false);
});

test("cleanup classifies machine state as scope-protected even under confirmed exact paths", () => {
  const rows = classifyCleanupCandidates({ projectId: "p1", planKey: "plan-key-1",
    authorizationMode: "confirmed_paths",
    candidates: [candidate("state/workers/87eba76e7f316453/gpu_frame.json"), candidate("work_dirs/run/a.csv")] });
  const frame = rows.find(row => row.relativePath.includes("gpu_frame.json"));
  assert.match(frame.protectedReason, /机器状态/);
  // Confirmed artifact rows keep their previous semantics untouched.
  const artifact = rows.find(row => row.relativePath === "work_dirs/run/a.csv");
  assert.equal(artifact.protectedReason, undefined);
  const auto = classifyCleanupCandidates({ projectId: "p1", planKey: "plan-key-1",
    authorizationMode: "plan_scope",
    candidates: [candidate("state/projects/ns1/gpu_snapshot.json"),
      { ...candidate("work_dirs/other/b.csv"), owners: ["someone-else"] }] });
  assert.match(auto.find(row => row.relativePath.startsWith("state/")).protectedReason, /机器状态/);
  assert.match(auto.find(row => row.relativePath === "work_dirs/other/b.csv").protectedReason, /所有权/);
});
