const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os");
require("../_helpers/registerTsRequire");
const { PlanCleanup } = require("../../src/features/PlanCleanup.ts");
const clone = value => JSON.parse(JSON.stringify(value));

/**
 * 真实故障取证回放（用户 2026-10-21 11:34 本机面板“重新运行”）：
 * <项目>/ui/action_errors.json 记录 command=runAllPlans，
 * message 尾部为「<三个候选项目根>/…/<某已完成 job 输出目录>：INVALID_ACTION；…\n没有任何 job 可准入；未移动文件，也未提交任务。」
 * operationOutcome={"code":"OPERATION_FAILED","category":"failed","retryable":false,"certainty":"unknown"}；
 * 同批 distributedPlanQueue 记「过期调度轮次，已拒绝写入队列」。
 * 首次真实失败位置：配套 B 0.2.102 cleanup-file-api.js:248
 *   const pathOnly = params.authorizationMode === "confirmed_paths";
 *   if (pathOnly && action !== "delete") fail("INVALID_ACTION");
 * 而 A 的隔离重跑链把本机 confirmed_paths 语义原样发给 B 的 files.cleanup.preview。
 * 本 fixture 的后端守卫按 B 0.2.102 同条件复刻（不是宽松替身），请求字段按真实调用形状回放。
 */

const BATCH = "job-" + "a".repeat(48);
const ISOLATED_RELATIVE = "clean_dir/" + BATCH + "/work/job0";

function engine02102(options = {}) {
  const calls = [], sources = options.sources || new Map([["work/job0", "sha-old0"], ["work/job1", "sha-old1"]]);
  const records = new Map();
  const fail = code => { throw Object.assign(new Error(code), { code, apiData: { code, detail: code } }); };
  const sftp = async (method, params) => {
    calls.push({ method, params: clone(params) });
    if (method === "files.cleanup.inspect")
      return { target: { type: params.target.type, absolutePath: params.node.root + "/" + params.target.relativePath, missing: !sources.has(params.target.relativePath) } };
    if (method !== "files.cleanup.preview") return { ok: true };
    const { node, action = "move", targets = [] } = params;
    if (params.authorizationMode !== undefined && params.authorizationMode !== "confirmed_paths") fail("INVALID_AUTHORIZATION_MODE");
    const pathOnly = params.authorizationMode === "confirmed_paths";
    // B 0.2.102 cleanup-file-api.js:248 —— 确认路径只授权永久删除。
    if (pathOnly && action !== "delete") fail("INVALID_ACTION");
    const observationMode = params.observationMode === "managed_tmux" || pathOnly ? (node?.kind === "local" ? "filesystem" : "tmux") : undefined;
    // B:253 —— 确认快速链每请求 5000，move/restore/isolate 仍是每请求 500。
    if (!node?.root || !["move", "delete", "restore", "isolate"].includes(action) || !targets.length || targets.length > (pathOnly ? 5000 : 500)) fail("INVALID_REQUEST");
    if (!pathOnly && targets.some(row => row.authorizationMode !== undefined)) fail("INVALID_AUTHORIZATION_MODE");
    if (action === "isolate" && targets.some(row => !/^job-[a-f0-9]{48}$/.test(String(row.archiveBatch || "")))) fail("UNSAFE_ARCHIVE_BATCH");
    if (pathOnly && targets.some(row => String(row.relativePath || "").startsWith("clean_dir/")
      && !/^clean_dir\/job-[a-f0-9]{48}\//.test(String(row.relativePath || "")))) fail("UNSAFE_DESTINATION");
    const rows = targets.map(row => {
      const fingerprint = sources.get(row.relativePath);
      if (!fingerprint) fail("MISSING_TARGET");
      return { ...row, absolutePath: node.root + "/" + row.relativePath, fingerprint, device: "1",
        // options.aliasInodes 模拟两个声明指向同一物理目标（bind mount / 硬链接）：
        // A 会按 [rootIdentity, device, inode] 去重，令其中一项转 protected 并触发二次精确 preview。
        inode: options.aliasInodes?.get(row.relativePath) || row.relativePath, size: 10, inventory: [] };
    });
    const token = "t" + calls.length + "0".repeat(47 - String(calls.length).length);
    const digest = "d" + calls.length;
    records.set(token, { token, digest, targets: rows, action, completed: new Set() });
    return clone({ token, digest, rootIdentity: { path: node.root }, targets: rows, action, observationMode,
      authorizationMode: pathOnly ? "confirmed_paths" : undefined, confirmations: 0, states: rows.map(() => "pending"),
      safety: { gitRepositoryAncestors: true, readOnlyReceiptCheck: true, formalJobOwner: true, immutableArchiveBatch: true,
        batchPreviewCapacity: 4096, managedObservation: 1, confirmedPathDeletion: 1, confirmedPathMetadata: 1, confirmedPathNestedRepositories: 1,
        isolateFast: action === "isolate" ? 1 : undefined, requiredInputGuard: action === "isolate" ? 1 : undefined,
        registeredIsolationDeletion: 1, subtreeSingleWriter: 1, serverWindowSelfClose: 1, chunkedFrozenManifest: 1, pinnedRuntimeProgram: 1,
        handleScan: pathOnly ? "confirmed_paths" : observationMode ? "managed_tmux" : "visible_same_user_processes",
        ...(pathOnly && action === "delete" ? { entryIdentityBind: 1, batchedFastDelete: 1, directoryTreeIsolateDelete: 1, isolationRenameNoReplace: 1, fastDeleteBatchLimit: 5000 } : {}) },
      expiresAt: Date.now() + 18e5 });
  };
  return { calls, sources, records, sftp };
}

async function fixture(declarationCount = 1, extra = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rerun-isolate-contract-"));
  const engine = engine02102({ aliasInodes: extra.aliasInodes });
  const outputDirs = extra.paths || Array.from({ length: declarationCount }, (_, index) => declarationCount === 1 ? "work/job0" : "work/part" + index);
  const declarations = outputDirs.map(output_dir => ({ index: 0, output_dir }));
  // 采集结果除本 job 声明外还含已登记隔离自标，供“永久删除仍走确认链”与隔离别名对照使用。
  const spare = (extra.spares || [ISOLATED_RELATIVE]).map(output_dir => ({ index: 0, output_dir }));
  for (const declaration of declarations) engine.sources.set(declaration.output_dir, "sha-" + declaration.output_dir);
  for (const row of spare) engine.sources.set(row.output_dir, "sha-" + row.output_dir);
  const node = { id: "worker-fixture", kind: "remote", user: "u", host: "h", port: 22, root: "/srv/project-fixture" };
  const scope = { projectId: "project-fixture", planKey: "owner-fixture", planFile: "experiments/plans/fixture.yaml", planHash: "p-hash",
    runIds: ["run-A"], revision: "frozen", nodes: [node], observationMode: "managed_tmux", authorizationMode: "confirmed_paths", blockers: [] };
  const service = new PlanCleanup({ storageRoot: path.join(root, "state"),
    collect: async (file, options) => clone({ ...scope, job: options?.job,
      authorizationMode: options?.authorizationMode || scope.authorizationMode,
      candidates: (options?.job?.manifest?.declarations || declarations.concat(spare)).map(row => ({ nodeId: node.id, relativePath: row.output_dir, type: "directory",
        category: "输出目录", owners: ["owner"], evidence: ["精确注册"], dependencies: [] })) }),
    sftp: engine.sftp, updateIndexes: async () => {}, restoreGate: async () => {}, currentNode: async () => clone(node) });
  const job = { workflowId: "run-A", commandId: "c0", index: 0, purpose: "replace_outputs", manifest: { declarations } };
  return { root, service, engine, scope, job, node };
}
const previews = engine => engine.calls.filter(row => row.method === "files.cleanup.preview");

test("rerun isolation preview no longer sends confirmed_paths to the delete-only engine chain", async () => {
  const f = await fixture();
  const preview = await f.service.preview({ planFile: f.scope.planFile, action: "isolate", authorizationMode: "confirmed_paths", job: f.job });
  // 用户可见现象：修复前目标全部变 unverified，原因是引擎以 INVALID_ACTION 拒绝（面板最终报“没有任何 job 可准入”）。
  assert.ok(preview.rows.length >= 1 && preview.rows.every(row => row.disposition === "isolate"),
    "isolation rows must be admissible, not unverified with INVALID_ACTION: " + preview.rows.map(row => row.error).join(","));
  assert.deepEqual(preview.blockers.filter(row => row.code === "INVALID_ACTION"), []);
  const sent = previews(f.engine);
  assert.ok(sent.length >= 1, "the isolation preview must reach the paired engine");
  for (const request of sent) {
    assert.equal(request.params.action, "isolate");
    assert.equal(request.params.authorizationMode, undefined, "confirmed paths only ever authorize permanent deletion; isolation must not leak them");
    assert.equal(request.params.observationMode, "managed_tmux", "isolation keeps managed observation");
    assert.ok(request.params.targets.every(row => /^job-[a-f0-9]{48}$/.test(String(row.archiveBatch || ""))), "isolation still lands in the frozen job batch");
    assert.ok(request.params.targets.every(row => row.authorizationMode === undefined));
  }
  assert.equal(preview.rows[0].disposition, "isolate");
  assert.match(preview.rows[0].destination, new RegExp("^clean_dir/job-[a-f0-9]{48}/work/job0$"));
  assert.ok(f.engine.sources.has("work/job0"), "preview is read-only: nothing moved");
});

test("over 500 isolation targets stay inside the engine per-request limit instead of INVALID_REQUEST", async () => {
  const f = await fixture(600);
  const preview = await f.service.preview({ planFile: f.scope.planFile, action: "isolate", authorizationMode: "confirmed_paths", job: f.job });
  const sent = previews(f.engine);
  assert.ok(sent.length >= 2, "600 isolation targets must be split into bounded batches");
  assert.ok(sent.every(request => request.params.targets.length <= 500), "every isolation request stays within the engine 500-target limit");
  assert.equal(sent.reduce((total, request) => total + request.params.targets.length, 0), 600);
  assert.equal(preview.rows.filter(row => row.disposition === "isolate").length, 600);
  assert.deepEqual(preview.blockers, []);
});

test("confirmed permanent deletion still travels the confirmed-path fast chain unchanged", async () => {
  const f = await fixture();
  const isolatedRelative = ISOLATED_RELATIVE;
  const preview = await f.service.preview({ planFile: f.scope.planFile, action: "delete", authorizationMode: "confirmed_paths",
    exactPaths: [{ nodeId: f.node.id, relativePath: isolatedRelative, type: "directory" }] });
  const sent = previews(f.engine);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].params.action, "delete");
  assert.equal(sent[0].params.authorizationMode, "confirmed_paths", "permanent deletion must keep the confirmed-path authorization");
  assert.equal(sent[0].params.targets[0].relativePath, isolatedRelative);
  assert.equal(preview.rows[0].disposition, "delete");
});

test("the local guard still refuses confirmed paths on a move and never reaches the engine", async () => {
  const f = await fixture();
  await assert.rejects(() => f.service.preview({ planFile: f.scope.planFile, action: "move", authorizationMode: "confirmed_paths", job: f.job }),
    error => (error?.apiData?.code || error?.code) === "INVALID_ACTION");
  assert.deepEqual(previews(f.engine), [], "a refused move-with-confirmed-paths must not touch the engine");
});

/**
 * 保护别名分支（src/features/PlanCleanup.ts 二次精确 preview）：两个声明指向同一物理目标时，
 * 其中一项转 protected，A 必须为本轮真正可准入的子集重新冻结一次 capability。
 * 这次出站同样不得带 confirmed_paths（隔离），且仍要遵守引擎每请求 500 目标上限。
 */
test("a protected physical alias re-freezes an isolation preview that still omits the confirmed-path authorization", async () => {
  const shared = "inode-shared-by-both-declarations";
  const f = await fixture(2, { paths: ["work/job0", "work/job1"], aliasInodes: new Map([["work/job0", shared], ["work/job1", shared]]) });
  const preview = await f.service.preview({ planFile: f.scope.planFile, action: "isolate", authorizationMode: "confirmed_paths", job: f.job });
  const aliases = preview.rows.filter(row => row.disposition === "protected" && String(row.protectedReason || "").includes("同一物理目标"));
  const admitted = preview.rows.filter(row => row.disposition === "isolate");
  assert.equal(aliases.length, 1, "one of the two physical aliases must stay protected with逐项证据");
  assert.equal(admitted.length, 1, "the other physical alias stays admissible");
  const sent = previews(f.engine);
  assert.ok(sent.length >= 2, "the alias branch must freeze a second exact preview for the approved subset");
  const exact = sent[sent.length - 1];
  assert.equal(exact.params.action, "isolate");
  assert.equal(exact.params.authorizationMode, undefined, "the alias re-preview must not leak confirmed paths either");
  assert.ok(exact.params.targets.length <= 500 && exact.params.targets.length < sent[0].params.targets.length,
    "the exact re-preview carries only the approved subset");
  assert.deepEqual(exact.params.targets.map(row => row.relativePath), admitted.map(row => row.relativePath));
  assert.ok(exact.params.targets.every(row => /^job-[a-f0-9]{48}$/.test(String(row.archiveBatch || ""))), "the frozen batch survives the re-preview");
  assert.ok(f.engine.sources.has("work/job0") && f.engine.sources.has("work/job1"), "alias handling is read-only: nothing moved");
});

/**
 * 同一别名分支用于永久删除时，确认链语义不得变化：
 * 主 preview 与二次精确 preview 都必须继续携带 confirmed_paths。
 */
test("the alias re-preview keeps the confirmed-path authorization for permanent deletion", async () => {
  const isolated = [ISOLATED_RELATIVE, "clean_dir/" + BATCH + "/work/job1"];
  const shared = "inode-shared-by-isolated-paths";
  const f = await fixture(1, { spares: isolated, aliasInodes: new Map([[isolated[0], shared], [isolated[1], shared]]) });
  const preview = await f.service.preview({ planFile: f.scope.planFile, action: "delete", authorizationMode: "confirmed_paths",
    exactPaths: isolated.map(relativePath => ({ nodeId: f.node.id, relativePath, type: "directory" })) });
  const sent = previews(f.engine);
  assert.ok(sent.length >= 2, "the delete alias branch must also freeze a second exact preview");
  for (const request of sent) {
    assert.equal(request.params.action, "delete");
    assert.equal(request.params.authorizationMode, "confirmed_paths", "permanent deletion keeps the confirmed chain on every request");
    assert.ok(request.params.targets.length <= 5000);
  }
  assert.deepEqual(sent[sent.length - 1].params.targets.map(row => row.relativePath),
    preview.rows.filter(row => row.disposition === "delete").map(row => row.relativePath));
  assert.equal(preview.rows.filter(row => row.disposition === "delete").length, 1, "the second physical alias stays protected");
});
