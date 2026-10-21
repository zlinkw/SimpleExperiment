const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs/promises"), fsSync = require("node:fs"), path = require("node:path"), os = require("node:os");
require("../_helpers/registerTsRequire");
const { busyEvidenceFromError, PlanCleanup } = require("../../src/features/PlanCleanup.ts");
const { replaceRunOutputs } = require("../../src/features/PlanRunReplacement.ts");
const { operationOutcomeFor } = require("../../src/core/OperationOutcome.ts");
const { cleanupApiErrorMessage } = require("../../src/core/SimpleSftpProgressWait.ts");
const clone = value => JSON.parse(JSON.stringify(value));

/**
 * 真实故障取证回放（用户 2026-10-21 15:16—15:18 本机面板“直接重跑原来的 PLAN”，运行版本 A 0.5.397）。
 * 证据（D:\\GitRepo\\MultiModal\\simple_cluster\\ui\\local_operations.json）：
 *   07:16:58—07:17:01 四条 validate-plan completed（nwpu5/jqg_zlk/nwpu2/nwpu3，各 6 job）；
 *   07:17:18 / 07:17:35 / 07:17:52 / 07:18:09 四条 plan-submit-selected-plan-* status=failed，首条即
 *     job 0：nwpu3：ACTIVE_TRANSFER SimpleSFTP files.cleanup.preview：[ACTIVE_TRANSFER]；nwpu2：…；nwpu5：…；jqg_zlk：…；
 *   action_errors.json 同批 operationOutcome={"code":"OPERATION_FAILED","category":"failed","retryable":false,"certainty":"unknown"}。
 * 首次真实失败位置：配套 B 0.2.102 extension.js:283-285 —— B 自身仍有未终止传输或排队上传时，
 * 在核对任何目标路径之前就按 cleanup-file-api.js:191 fail("ACTIVE_TRANSFER") 整体拒绝预览；
 * B api-server.js:233-235 以 {code:apiCode,data:apiData} 回传；A SimpleSftpProgressWait.ts:381-385
 * 组装成 message="SimpleSFTP files.cleanup.preview：[ACTIVE_TRANSFER]" 且 apiData.code=ACTIVE_TRANSFER。
 * 本 fixture 只按上述冻结封套回传错误，不复刻后端守卫；B 为何繁忙本地无日志可证，故不在此断言。
 */
const sftpError = (code, extra = {}) => {
  const payloadError = { code: 2010, message: code, data: Object.assign({ code }, extra) };
  const error = new Error(cleanupApiErrorMessage("files.cleanup.preview", payloadError));
  return Object.assign(error, { apiCode: payloadError.code, apiData: payloadError.data, code });
};

function engine(options = {}) {
  const calls = [], sources = new Map(), records = new Map();
  const refuse = options.refuse || (() => undefined);
  const plain = options.plain || (() => false);
  const sftp = async (method, params) => {
    calls.push({ method, params: clone(params) });
    // 真实引擎也会给出没有错误码的失败（老版本/包装丢失 apiData），这类证据必须保留阻断身份，不得被当作忙。
    if (method === "files.cleanup.preview" && plain(params.node)) throw new Error("配套插件未标注错误码");
    // 真实链路里预览可能整体抛错（还没走到逐目标结论）；抛错分支带回来的 busy 同样是外部数据。
    if (method === "files.cleanup.preview" && options.throwFor) throw options.throwFor(params.node);
    if (method === "files.cleanup.inspect")
      return { target: { type: params.target.type, absolutePath: params.node.root + "/" + params.target.relativePath, missing: !sources.has(params.target.relativePath) } };
    if (method !== "files.cleanup.preview") { calls.push({ method: "MUTATION:" + method }); return { ok: true }; }
    const { node, action = "move", targets = [] } = params;
    const code = targets.map(row => refuse(row, node)).find(Boolean);
    if (code) throw sftpError(code, Object.assign({}, code === "PROTECTED_PATH" ? { reason: "目标路径受保护" } : {}, options.errorData ? options.errorData(node) : {}));
    // 与 B 0.2.102 相同的隔离预览判定：A 修好后隔离请求不再带 confirmed_paths，因此走受控观察链并先过 activity()。
    const pathOnly = params.authorizationMode === "confirmed_paths";
    const observationMode = params.observationMode === "managed_tmux" || pathOnly ? (node.kind === "local" ? "filesystem" : "tmux") : undefined;
    // refs(node) 让真实链路产出“只有 protectedReason、没有 error”的受保护行（外部共享引用），
    // 这正是 rev16 会因为 .filter(Boolean) 丢掉身份、把混杂阻断误判成纯传输忙的形状。
    const references = options.refs && options.refs(node)
      ? [{ path: "shared/other_plan.ckpt", type: "file", field: "checkpoint_ref", manifest: "m1", manifestSha256: "ab" }] : undefined;
    const rows = targets.map(row => ({ ...row, absolutePath: node.root + "/" + row.relativePath, fingerprint: sources.get(row.relativePath),
      device: "1", inode: row.relativePath, size: 10, inventory: [], references }));
    const token = "t" + calls.length + "0".repeat(47 - String(calls.length).length), digest = "d" + calls.length;
    records.set(token, { token, digest, targets: rows, action, completed: new Set() });
    return clone({ token, digest, rootIdentity: { path: node.root }, targets: rows, action, observationMode,
      authorizationMode: pathOnly ? "confirmed_paths" : undefined, confirmations: 0, states: rows.map(() => "pending"),
      safety: { gitRepositoryAncestors: true, readOnlyReceiptCheck: true, formalJobOwner: true, immutableArchiveBatch: true,
        batchPreviewCapacity: 4096, managedObservation: 1, confirmedPathDeletion: 1, confirmedPathMetadata: 1, confirmedPathNestedRepositories: 1,
        isolateFast: action === "isolate" ? 1 : undefined, requiredInputGuard: action === "isolate" ? 1 : undefined,
        registeredIsolationDeletion: 1, subtreeSingleWriter: 1, serverWindowSelfClose: 1, chunkedFrozenManifest: 1, pinnedRuntimeProgram: 1,
        handleScan: pathOnly ? "confirmed_paths" : observationMode ? "managed_tmux" : "visible_same_user_processes" },
      expiresAt: Date.now() + 18e5 });
  };
  return { calls, sources, records, sftp };
}

const WORKERS = [["nwpu3", "/mnt/nwpu3/zlk/MultiModal"], ["nwpu2", "/mnt/nwpu2/zlk/MultiModal"],
  ["nwpu5", "/mnt/nwpu5/zlk/MultiModal"], ["jqg_zlk", "/opt/jqg/zlk/MultiModal"]];

async function fixture(options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rerun-transfer-busy-"));
  const workers = options.workers === undefined ? WORKERS : WORKERS.slice(0, options.workers);
  const nodes = workers.map(([id, nodeRoot]) => ({ id, kind: "remote", user: "u", host: "h." + id, port: 22, root: nodeRoot }));
  const engineState = engine({ refuse: options.refuse, plain: options.plain, refs: options.refs, errorData: options.errorData, throwFor: options.throwFor });
  const paths = options.paths || ["work/job0", "work/job1", "work/job2"];
  for (const item of paths) engineState.sources.set(item, "sha-" + item);
  const scope = { projectId: "multimodal", planKey: "owner", planFile: "experiments/plans/comparison/ebmc.yaml", planHash: "p",
    runIds: ["run-A"], revision: "frozen", nodes, observationMode: "managed_tmux", authorizationMode: "confirmed_paths", blockers: [] };
  const collect = async (file, opts) => {
    const declarations = (opts && opts.job && opts.job.manifest && opts.job.manifest.declarations) || [];
    const candidates = [];
    // 与生产一致：全新运行没有旧产物时，Worker 快照里没有该 job 的登记声明，采集阶段就不产生候选。
    if (options.noCandidates) return clone(Object.assign({}, scope, { job: opts && opts.job, candidates }));
    for (const node of nodes) for (const row of declarations) candidates.push({ nodeId: node.id, relativePath: row.output_dir,
      type: "directory", category: "输出目录", owners: ["owner"], evidence: ["精确注册"],
      dependencies: [] });
    return clone(Object.assign({}, scope, { job: opts && opts.job, authorizationMode: (opts && opts.authorizationMode) || scope.authorizationMode, candidates }));
  };
  const service = new PlanCleanup({ storageRoot: path.join(root, "state"),
    collect,
    sftp: engineState.sftp, updateIndexes: async () => {}, restoreGate: async () => {},
    currentNode: async id => clone(nodes.find(node => node.id === id)) });
  const jobs = (options.jobs || [0, 1, 2]).map(index => ({ index, output_dir: "work/job" + index }));
  const events = [];
  const ports = { assertCurrent: () => {}, progress: () => {}, save: async () => events.push("save"),
    preview: options.previewThrows ? job => { throw options.previewThrows(job); }
      : job => service.preview({ planFile: scope.planFile, action: "isolate", verifiedOnly: false, authorizationMode: "confirmed_paths",
      job: { workflowId: "manifest-" + job.index, commandId: "manifest-" + job.index, index: job.index, purpose: "replace_outputs",
        manifest: { declarations: [jobs.find(row => row.index === Number(job.index))], replacement: true } } }),
    ask: async payload => { events.push("ask" + payload.phase); return options.choice || (payload.phase === 1 ? "rerun_all" : "isolate_and_run"); },
    beforeDelete: async () => events.push("workers"), hold: async selected => events.push("hold:" + selected.map(job => job.index).join(",")),
    verify: async preview => events.push("verify" + preview.token),
    service: { confirm: async p => { events.push("confirm" + p.phase + p.token); }, preflightConfirmed: async id => events.push("check" + id),
      status: async id => ({ state: engineState.records.get(id)?.completed.size ? "completed" : "partial" }) },
    execute: async id => { if (options.executeFailsWith) { events.push("isolate-attempt" + id); throw sftpError(options.executeFailsWith); }
      const record = engineState.records.get(id); if (record) record.completed.add(id); events.push("isolate" + id);
      return { state: "completed", pendingNodes: [] }; } };
  const state = {};
  const run = () => replaceRunOutputs(ports, state, scope.planFile, jobs, [], "frozen-key");
  return { root, service, engine: engineState, events, nodes, jobs, run, scope, state };
}

const busyEverywhere = () => "ACTIVE_TRANSFER";
// 配套 SimpleSFTP 拒绝瞬间经真实 API 封套（apiData.busy）带回的忙快照样本，形状由跨仓真模块探针核对：
// 只有 id/status/operation/phase/stage 与队列键的一向哈希，没有任何原始路径、主机或令牌。
const busySnapshotAtRefusal = {
  schemaVersion: 1, observedAt: "2026-10-21T07:17:18.123Z", instanceId: "50924:2026-10-21T07:13:41.741Z", busy: true,
  activeTransferCount: 0, blockingTransferCount: 0, observerTransferCount: 0, activeTransfers: [],
  uploadOperationCount: 1, uploadOperations: [{ id: "op-1792350", stage: "acquiring-lease" }],
  uploadQueueCount: 1, uploadQueues: { count: 1, keyHashes: ["9f2c41ab7d03"] },
};
const codeOf = error => String(error?.apiData?.code || error?.code || "");

test("四台 Worker 全部传输忙：审核页不出现、零移动零提交，并如实归因为可重试的传输忙", async () => {
  const f = await fixture({ refuse: busyEverywhere });
  await assert.rejects(f.run(), error => codeOf(error) === "RUN_OUTPUTS_TRANSFER_BUSY"
    && /ACTIVE_TRANSFER SimpleSFTP files\.cleanup\.preview：\[ACTIVE_TRANSFER\]/.test(String(error.apiData?.detail || error.message))
    && /未生成隔离清单，未移动文件，也未提交任务/.test(String(error.apiData?.detail || error.message)));
  assert.deepEqual(f.events.filter(row => row.startsWith("ask")), [], "传输忙时不得弹出运行范围/隔离确认页");
  assert.deepEqual(f.events.filter(row => /^(isolate|confirm|check|hold|workers)/.test(row)), [], "传输忙不得触达确认、隔离、保留围栏或队列");
  assert.deepEqual(f.engine.calls.filter(row => row.method.startsWith("MUTATION:")), [], "配套引擎不得收到任何写请求");
  const previews = f.engine.calls.filter(row => row.method === "files.cleanup.preview");
  assert.equal(previews.length, f.jobs.length * f.nodes.length, "每个 job 的每个 Worker 都必须真的被预览一次");
  assert.deepEqual([...new Set(previews.map(row => row.params.node.id))].sort(), f.nodes.map(node => node.id).sort(),
    "四台 Worker 都要出现（与用户四条同因阻塞一致）");
  // 真实跨模块产物：A 的隔离预览把配套引擎的无副作用拒绝原样留在 blocker 里，供后续归因使用。
  const single = await fixture({ refuse: busyEverywhere, workers: 1 });
  const direct = await single.service.preview({ planFile: single.scope.planFile, action: "isolate", verifiedOnly: false,
    authorizationMode: "confirmed_paths", job: { workflowId: "manifest-0", commandId: "manifest-0", index: 0, purpose: "replace_outputs",
      manifest: { declarations: [single.jobs[0]], replacement: true } } });
  assert.deepEqual(direct.blockers, [{ code: "ACTIVE_TRANSFER", nodeId: "nwpu3", detail: "SimpleSFTP files.cleanup.preview：[ACTIVE_TRANSFER]" }],
    "blocker 必须与用户日志里的 “nwpu3：ACTIVE_TRANSFER SimpleSFTP files.cleanup.preview：[ACTIVE_TRANSFER]” 逐字同形");
  assert.ok(direct.rows.length && direct.rows.every(row => row.disposition === "unverified" && row.error === "ACTIVE_TRANSFER"));
});

test("真实链路的错误封套与用户记录同形，且结论是可重试冲突/未开始，不再冒充 PLAN 失败", async () => {
  const f = await fixture({ refuse: busyEverywhere, workers: 1 });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.match(detail, /nwpu3：ACTIVE_TRANSFER SimpleSFTP files\.cleanup\.preview：\[ACTIVE_TRANSFER\]/, "必须包含用户日志里的原文");
    const outcome = operationOutcomeFor(error);
    // 裸 ACTIVE_TRANSFER 可能在上传/隔离/部分提交之后嵌套出现，不保证零副作用：不得升级为 not_started 或可自动重放。
    assert.deepEqual(operationOutcomeFor(sftpError("ACTIVE_TRANSFER")),
      { code: "ACTIVE_TRANSFER", category: "failed", retryable: false, certainty: "unknown" },
      "裸忙码只能保持保守结论，不能被升级成未开始/可重放");
    // 只有 apiData.code 的裸忙码沿用既有保守兜底（OPERATION_FAILED/unknown），同样不得升级。
    assert.deepEqual(operationOutcomeFor(Object.assign(new Error("nested"), { apiData: { code: "ACTIVE_TRANSFER" } })),
      { code: "OPERATION_FAILED", category: "failed", retryable: false, certainty: "unknown" },
      "仅挂在 apiData 上的裸忙码必须保持未定性兜底，不得升级成未开始/可重放");
    // 批次级错误的 code 只挂在 apiData 上（cleanupError 的形状），也必须得到同一结论，用户记录才不会又是 OPERATION_FAILED。
    const busyOutcome = operationOutcomeFor(Object.assign(new Error("job 0：ACTIVE_TRANSFER"), { code: "RUN_OUTPUTS_TRANSFER_BUSY" }));
    assert.deepEqual(busyOutcome, { code: "RUN_OUTPUTS_TRANSFER_BUSY", category: "conflict", retryable: true, certainty: "not_started" });
    assert.deepEqual(operationOutcomeFor(Object.assign(new Error("mixed"), { apiData: { code: "RUN_OUTPUTS_TRANSFER_BUSY", detail: "x" } })),
      { code: "RUN_OUTPUTS_TRANSFER_BUSY", category: "conflict", retryable: true, certainty: "not_started" },
      "action_errors 的 operationOutcome 必须与批次错误的 apiData.code 一致");
    return true;
  });
});

test("真实面板建议：传输忙不再让用户去终止 Plan，真实隔离冲突仍保留原建议", async () => {
  const dist = fsSync.readFileSync(path.resolve(__dirname, "..", "..", "dist/extension/legacy.js"), "utf8");
  const startMarker = "function actionErrorSuggestion(message)";
  const start = dist.indexOf(startMarker);
  assert.ok(start >= 0, "actionErrorSuggestion must exist in the shipped bundle");
  const end = dist.indexOf("function normalizeUiActionError", start);
  assert.ok(end > start, "actionErrorSuggestion slice end");
  const suggest = new Function(dist.slice(start, end).replace(/^ {4}/gm, "") + "; return actionErrorSuggestion;")();
  // 建议输入用真实链路产生的消息原文：cleanupError 只把 code 放在 apiData 里，
  // 因此批次码必须同时出现在消息文本中，否则面板无法区分“整批在核对路径前被拒”与“嵌套忙拒绝”。
  const f = await fixture({ refuse: busyEverywhere });
  let busyText = "";
  await assert.rejects(f.run(), error => { busyText = String(error.message); return codeOf(error) === "RUN_OUTPUTS_TRANSFER_BUSY"; });
  assert.match(busyText, /RUN_OUTPUTS_TRANSFER_BUSY/, "批次码必须随消息一起回传给面板建议");
  const busy = suggest(busyText);
  assert.match(busy, /不需要终止任何 Plan/);
  assert.doesNotMatch(busy, /终止并清除该 Plan/, "传输忙不得再引导用户停掉前序 Plan");
  assert.match(busy, /等该传输结束后/);
  // 裸/嵌套忙码（可能已发生上传、隔离或部分提交）只能得到中性建议，不得声称整批零副作用。
  const nested = suggest("job 0：SimpleSFTP files.cleanup.execute：[ACTIVE_TRANSFER]\n没有任何 job 通过隔离准入；旧输出仅移入 clean 区，未提交任务。");
  assert.match(nested, /不代表本方操作零副作用/, "嵌套忙不得声称未移动或未提交");
  assert.doesNotMatch(nested, /未生成隔离清单，未移动文件/);
  assert.doesNotMatch(nested, /终止并清除该 Plan/, "嵌套忙也不得引导用户终止清理真实 Plan");
  const realConflict = "job 0：work/job0：OUTPUT_ISOLATION_FAILED\n没有任何 job 可准入；未移动文件，也未提交任务。";
  assert.match(suggest(realConflict), /终止并清除该 Plan/, "真实未提交冲突的建议不得被改掉");
});

test("只有部分 job 传输忙：其余 job 照常进入确认与隔离，不被批量误标", async () => {
  const f = await fixture({ refuse: (row) => (row.relativePath === "work/job0" ? "ACTIVE_TRANSFER" : undefined) });
  const result = await f.run();
  assert.deepEqual(result.selectedIndices, [1, 2], "仅传输忙的 job0 让位，其余 job 仍被准入");
  assert.ok(f.events.includes("ask1") && f.events.includes("ask2"), "仍有旧产物时必须进入既有审核/确认流程");
  assert.ok(f.events.some(row => /^hold:/.test(row)) && f.events.some(row => /^isolate/.test(row)), "准入 job 必须照常隔离并建立围栏");
});

test("取消即不提交也不动产物；无旧产物则正常继续，不虚构隔离", async () => {
  const cancelled = await fixture({ choice: "dismiss" });
  await assert.rejects(cancelled.run(), error => codeOf(error) === "REPLACEMENT_CANCELLED");
  assert.deepEqual(cancelled.events.filter(row => /^(isolate|confirm|check|hold|workers)/.test(row)), []);
  assert.deepEqual(cancelled.engine.calls.filter(row => row.method.startsWith("MUTATION:")), []);
  // 全新 PLAN：目标目录都还不存在（inspect 报 missing），既无旧产物也无需隔离确认。
  const fresh = await fixture({ noCandidates: true, refuse: busyEverywhere });
  const outcome = await fresh.run();
  assert.equal(outcome.choice, "rerun_all", "无旧产物时不得报传输忙，也不得弹隔离确认");
  assert.deepEqual(outcome.selectedIndices, [0, 1, 2], "无旧产物的 job 必须照常准入，不因隔离流程被卡住");
  assert.deepEqual(fresh.events.filter(row => /^ask/.test(row)), [], "无旧产物既不该选范围也不该弹隔离确认");
  assert.deepEqual(fresh.events.filter(row => /^(isolate|confirm|check|hold|workers)/.test(row)), []);
  assert.deepEqual(fresh.engine.calls.filter(row => row.method !== "files.cleanup.inspect"), [],
    "无旧产物不得向配套引擎发出任何隔离预览或写请求");
});



test("真实忙快照随封套抵达：审核链保留结构化证据，批次文案报出是哪一类忙，不靠字符串再猜", async () => {
  const f = await fixture({ refuse: busyEverywhere, errorData: () => ({ busy: busySnapshotAtRefusal }) });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.equal(codeOf(error), "RUN_OUTPUTS_TRANSFER_BUSY");
    assert.match(detail, /拒绝瞬间配套插件自报的忙明细/, "批次文案必须带配套插件自报的明细");
    assert.match(detail, /非终态传输 0/, "必须如实报“非终态传输 0”，不得把未知说成活跃");
    assert.match(detail, /上传操作 1\[stage=acquiring-lease\]/, "必须报出是哪一类忙及其 stage");
    assert.match(detail, /保存时上传排队 1\[键指纹 9f2c41ab7d03\]/, "排队队列必须只有哈希");
    assert.match(detail, /观测 2026-10-21T07:17:18\.123Z，实例 50924:/, "必须带拒绝瞬间的观测时间与实例，便于事后核对");
    const onlyDetail = detail.slice(detail.indexOf("拒绝瞬间配套插件自报的忙明细："));
    assert.equal(/(GitRepo|\/mnt\/|[A-Za-z]:\\)/.test(onlyDetail), false, "明细本身不得带原始路径");
    return true;
  });
  // 结构化证据必须原样保留在审核链上（不是只有文案），供后续复核与 UI 使用。
  const retained = f.state.blocked.flatMap(row => row.busy || []);
  assert.ok(retained.length >= 4, "每个 Worker 的拒绝都要留下快照");
  assert.deepEqual(retained[0], Object.assign({ nodeId: retained[0].nodeId }, busySnapshotAtRefusal), "A 必须原样保留配套插件的快照字段");
  assert.deepEqual(f.events.filter(row => /^ask|^isolate|^confirm|^check|^hold|^workers/.test(row)), [], "忙快照不改变“零确认零移动”结论");
  assert.deepEqual(f.engine.calls.filter(row => row.method.startsWith("MUTATION:")), []);
});

test("配套插件没有忙快照（旧版封套）时仍按原样归因，绝不编造明细", async () => {
  const f = await fixture({ refuse: busyEverywhere });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.equal(codeOf(error), "RUN_OUTPUTS_TRANSFER_BUSY", "缺快照也不能改变“整批被忙拒绝”的事实归因");
    assert.equal(detail.includes("忙明细"), false, "没有证据就不能凭空写出明细");
    return true;
  });
  assert.ok(Array.isArray(f.state.blocked) && f.state.blocked.length === 3, "整批被拒时也要把阻断证据落进本轮状态");
  assert.deepEqual(f.state.blocked.flatMap(row => row.busy || []), [], "旧版封套没有快照就不许凭空造一份");
});

test("混合路径阻断时仍按通用隔离冲突归因，但忙快照照样保留可核对", async () => {
  const f = await fixture({ refuse: (row, node) => (node.id === "nwpu3" ? undefined : "ACTIVE_TRANSFER"),
    refs: node => node.id === "nwpu3", errorData: () => ({ busy: busySnapshotAtRefusal }) });
  await assert.rejects(f.run(), error => {
    assert.equal(codeOf(error), "OUTPUT_ISOLATION_FAILED", "受保护路径证据仍在时仍是通用归因");
    assert.equal(String(error.apiData?.detail || error.message).includes("忙明细"), false, "通用归因不夹带忙明细文案");
    return true;
  });
  const retained = (f.state.blocked || []).flatMap(row => row.busy || []);
  assert.ok(retained.length >= 3 && retained[0].uploadOperationCount === 1, "通用归因也不得丢掉具体阻断证据");
});

test("缺码或 protectedReason 证据不得被并入传输忙：混杂受保护行仍按真实隔离冲突归因", async () => {
  // 真实缺陷回放：rev16 只把有码证据计入 codes（.filter(Boolean) 会丢掉缺 error 的受保护行），
  // 于是“3 个忙 blocker + 1 条受保护行”被误判为纯传输忙。每条证据都必须保留身份。
  const f = await fixture({ refuse: (row, node) => (node.id === "nwpu3" ? undefined : "ACTIVE_TRANSFER"), refs: node => node.id === "nwpu3" });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.equal(codeOf(error), "OUTPUT_ISOLATION_FAILED", "存在受保护路径证据时禁止升级为 RUN_OUTPUTS_TRANSFER_BUSY");
    assert.match(detail, /shared\/other_plan\.ckpt：缺少该引用的独占所有权证明/, "只有 protectedReason、没有错误码的受保护行必须留在阻断证据里");
    assert.match(detail, /ACTIVE_TRANSFER/, "忙证据同样不得丢失");
    assert.doesNotMatch(detail, /RUN_OUTPUTS_TRANSFER_BUSY/);
    return true;
  });
  assert.deepEqual(f.events.filter(row => row.startsWith("ask")), [], "混杂阻断同样不得弹出确认页");
});

test("未知错误码的阻断证据保留身份：不得因为另有忙码就被归成纯传输忙", async () => {
  const f = await fixture({ refuse: (row, node) => (node.id === "nwpu3" ? "ACTIVE_TRANSFER" : node.id === "nwpu2" ? "TRANSFER_STATE_UNKNOWN" : undefined) });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.equal(codeOf(error), "OUTPUT_ISOLATION_FAILED", "未知码同样是不能定性的真实阻断");
    assert.match(detail, /TRANSFER_STATE_UNKNOWN/);
    assert.match(detail, /ACTIVE_TRANSFER/);
    return true;
  });
});

test("预览整体抛错且没有错误码：仍是未分类阻断，不得冒充传输忙或未开始", async () => {
  const f = await fixture({ plain: () => true });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.equal(codeOf(error), "OUTPUT_ISOLATION_FAILED", "缺码错误不得升级为纯忙");
    assert.match(detail, /未标注错误码/);
    assert.equal(operationOutcomeFor(error).certainty !== "not_started", true, "缺码阻断不得被判为未开始");
    return true;
  });
});

test("已发生隔离副作用后嵌套收到忙码：批次不升级、结论不升级、建议不声称零副作用", async () => {
  const f = await fixture({ workers: 1, jobs: [0], executeFailsWith: "ACTIVE_TRANSFER" });
  await assert.rejects(f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.equal(codeOf(error), "OUTPUT_ISOLATION_FAILED", "忙码出现在执行阶段时禁止使用批次忙码");
    assert.match(detail, /ACTIVE_TRANSFER/);
    const outcome = operationOutcomeFor(error);
    assert.equal(outcome.certainty === "not_started", false, "执行阶段之后不保证零副作用，不得写未开始");
    assert.equal(outcome.retryable, false, "不得升级为可自动重放");
    return true;
  });
  assert.deepEqual(f.events.filter(row => /^ask/.test(row)).length, 2, "本用例必须先经过既有审核/确认流程");
  assert.ok(f.events.some(row => /^isolate-attempt/.test(row)), "忙拒绝发生在确认与执行之后");
});

test("真实路径冲突与传输忙混在一起时仍按隔离冲突归因，不降级成可静默重试", async () => {
  // 每个 job 都被挡住，但原因混杂：传输忙 + 真实受保护路径，必须仍按隔离冲突归因。
  const f = await fixture({ refuse: (row, node) => (node.id === "nwpu3" && row.relativePath === "work/job0" ? "ACTIVE_TRANSFER"
    : node.id === "nwpu2" ? "PROTECTED_PATH" : undefined) });
  await assert.rejects(f.run(), error => codeOf(error) === "OUTPUT_ISOLATION_FAILED"
    && /PROTECTED_PATH/.test(String(error.apiData?.detail || error.message)) && /ACTIVE_TRANSFER/.test(String(error.apiData?.detail || error.message)));
  assert.deepEqual(operationOutcomeFor(Object.assign(new Error("mixed"), { code: "OUTPUT_ISOLATION_FAILED" })).category, "failed");
});

// rev19 边界修正：预览整体抛错时带回来的 busy 同样是外部数据，必须走同一份白名单再投影后才能加 nodeId。
const hostileBusyEvidence = {
  schemaVersion: 1, busy: true, observedAt: "2026-10-21T07:17:18.000Z", instanceId: "50924:test-instance",
  activeTransferCount: 0, activeTransfers: [], uploadOperationCount: 0, uploadOperations: [],
  uploadQueueCount: 5, uploadQueues: { count: 5, keyHashes: ["aaaaaaaaaaaa", "bbbbbbbbbbbb", "cccccccccccc", "dddddddddddd", "eeeeeeeeeeee"] },
  token: "Bearer super-secret-token", path: "D:\\GitRepo\\SecretWorkspace\\private", absolutePath: "/mnt/otherhost/zlk/OtherProject/work/secret",
  secrets: { host: "secret-host.internal", command: "rm -rf /secret" }, leakedRows: [{ absolutePath: "/mnt/otherhost/zlk/OtherProject/work/secret2" }],
};
// 只检查“不属于 PLAN 声明、只可能来自外部 busy 对象”的值；批次文案本来就如实列出 PLAN 声明的产物路径，那是 A 自己知道的目标。
const LEAKED = ["super-secret-token", "Bearer", "GitRepo", "SecretWorkspace", "secret-host.internal", "rm -rf", "/secret",
  "OtherProject", "secret2", "leakedRows", "absolutePath", "secrets", "hostile"];

test("配套插件在预览内就抛忙（PlanCleanup 聚合路径）：未审字段与原路径不得进 state.blocked 或批次文案", async () => {
  const f = await fixture({ throwFor: node => sftpError("ACTIVE_TRANSFER", { busy: hostileBusyEvidence, detail: "SimpleSFTP files.cleanup.preview：[ACTIVE_TRANSFER]" }) });
  await assert.rejects(() => f.run(), error => {
    assert.equal(codeOf(error), "RUN_OUTPUTS_TRANSFER_BUSY", "整批抛错仍是传输忙批次码");
    const detail = String(error.apiData?.detail || error.message);
    for (const leak of LEAKED) assert.equal(detail.includes(leak), false, "批次文案不得出现外部字段：" + leak + "；实际=" + detail.slice(0, 500));
    assert.match(detail, /保存时上传排队 5\[键指纹 aaaaaaaaaaaa/, "自家投影的正常字段仍要如实报出");
    return true;
  });
  const retained = (f.state.blocked || []).flatMap(row => row.busy || []);
  assert.ok(retained.length >= 2, "抛错分支也要把可核对证据落进本轮状态");
  const serialized = JSON.stringify(retained);
  for (const leak of LEAKED) assert.equal(serialized.includes(leak), false, "state.blocked 不得保留未审字段：" + leak);
  const first = retained[0];
  assert.equal(typeof first.nodeId, "string"); assert.ok(first.nodeId.length > 0, "nodeId 仍需标注是哪台 Worker");
  // 该夹具复刻旧版配套封套（无 blocking/observer 计数）：白名单口径是「保守按全部在途传输计阻断 + 标记旧口径」，
  // 缺字段整体不带，因此 observerTransferCount 不应出现，legacyBusyShape 必须出现。
  assert.deepEqual(Object.keys(first).sort(), ["activeTransferCount", "activeTransfers", "blockingTransferCount", "busy", "instanceId", "legacyBusyShape", "nodeId", "observedAt",
    "schemaVersion", "uploadOperationCount", "uploadOperations", "uploadQueueCount", "uploadQueues"]);
  assert.ok(!("observerTransferCount" in first), "旧封套缺字段不得凭空补 0");
  assert.equal(first.legacyBusyShape, true, "旧口径必须留下事实标记");
  // 该夹具的忙来自 5 条上传队列键而非在途传输行，因此保守口径下的阻断数等于传输行数（这里为 0），不是凭空补的 0。
  assert.equal(first.blockingTransferCount, first.activeTransfers.length, "旧封套阻断数必须等于逐行非终态传输数");
  assert.equal(first.uploadQueueCount, 5);
  assert.deepEqual(first.uploadQueues.keyHashes, ["aaaaaaaaaaaa", "bbbbbbbbbbbb", "cccccccccccc", "dddddddddddd", "eeeeeeeeeeee"]);
  assert.deepEqual(f.events.filter(row => /^ask|^isolate|^hold|^workers/.test(row)), [], "忙时仍零确认零写");
});

test("抛错分支的正常忙快照照原样保留（白名单不误删自家字段）", async () => {
  const f = await fixture({ throwFor: node => sftpError("ACTIVE_TRANSFER", { busy: busySnapshotAtRefusal }) });
  await assert.rejects(() => f.run());
  const retained = (f.state.blocked || []).flatMap(row => row.busy || []);
  assert.ok(retained.length >= 2, "自家快照必须保留");
  assert.deepEqual(retained[0], Object.assign({ nodeId: retained[0].nodeId }, busySnapshotAtRefusal), "自家投影字段不得被白名单误删");
});

test("预览整体抛错落到替换链的 catch 分支：外部 busy 也只能留白名单字段加 nodeId，未审字段不落状态不进文案", async () => {
  const f = await fixture({ previewThrows: job => sftpError("ACTIVE_TRANSFER", { busy: hostileBusyEvidence }) });
  await assert.rejects(() => f.run(), error => {
    assert.equal(codeOf(error), "RUN_OUTPUTS_TRANSFER_BUSY", "每个 job 都只是忙拒绝，仍归为传输忙批次");
    const detail = String(error.apiData?.detail || error.message);
    for (const leak of LEAKED) assert.equal(detail.includes(leak), false, "批次文案不得出现外部字段：" + leak + "；实际=" + detail.slice(0, 400));
    assert.match(detail, /保存时上传排队 5\[键指纹 aaaaaaaaaaaa/, "自家投影字段要如实报出");
    return true;
  });
  const retained = (f.state.blocked || []).flatMap(row => row.busy || []);
  assert.equal(retained.length, (f.state.blocked || []).length, "catch 分支的每个被拒 job 都要留下可核对证据");
  assert.ok(retained.length >= 2, "整批被拒时证据必须落进本轮状态");
  const serialized = JSON.stringify(retained);
  for (const leak of LEAKED) assert.equal(serialized.includes(leak), false, "state.blocked 不得保留未审字段：" + leak);
  const first = retained[0];
  // 该夹具复刻旧版配套封套（无 blocking/observer 计数）：白名单口径是「保守按全部在途传输计阻断 + 标记旧口径」，
  // 缺字段整体不带，因此 observerTransferCount 不应出现，legacyBusyShape 必须出现。
  assert.deepEqual(Object.keys(first).sort(), ["activeTransferCount", "activeTransfers", "blockingTransferCount", "busy", "instanceId", "legacyBusyShape", "nodeId", "observedAt",
    "schemaVersion", "uploadOperationCount", "uploadOperations", "uploadQueueCount", "uploadQueues"]);
  assert.ok(!("observerTransferCount" in first), "旧封套缺字段不得凭空补 0");
  assert.equal(first.legacyBusyShape, true, "旧口径必须留下事实标记");
  // 该夹具的忙来自 5 条上传队列键而非在途传输行，因此保守口径下的阻断数等于传输行数（这里为 0），不是凭空补的 0。
  assert.equal(first.blockingTransferCount, first.activeTransfers.length, "旧封套阻断数必须等于逐行非终态传输数");
  assert.equal(first.uploadQueueCount, 5);
  assert.deepEqual(f.events.filter(row => /^ask|^isolate|^hold|^workers/.test(row)), [], "忙时仍零确认零写");
});

test("catch 分支的正常忙快照照原样保留（白名单不误删自家字段）", async () => {
  const f = await fixture({ previewThrows: job => sftpError("ACTIVE_TRANSFER", { busy: busySnapshotAtRefusal }) });
  await assert.rejects(() => f.run());
  const retained = (f.state.blocked || []).flatMap(row => row.busy || []);
  assert.equal(retained.length, (f.state.blocked || []).length, "自家快照必须每个被拒 job 都保留");
  assert.deepEqual(retained[0], Object.assign({ nodeId: retained[0].nodeId }, busySnapshotAtRefusal), "自家投影字段不得被白名单误删");
});

// rev21：2026-10-21 09:04 的真实拒绝里，挡门的是只读清单与只读清理预览；
// 配套侧现在把“真正阻断的写入”和“只读观测”分开自报，A 必须原样分开报出，不能再让用户以为有上传占着文件。
test("只读观测与真实写入分开报出：批次文案不再把只读巡检说成占着文件的上传", async () => {
  const observers = {
    schemaVersion: 1, observedAt: "2026-10-21T09:04:47.576Z", instanceId: "34684:2026-10-21T08:54:05.385Z", busy: true,
    activeTransferCount: 3, blockingTransferCount: 1, observerTransferCount: 2,
    activeTransfers: [
      { id: "t1", operation: "upload.workspace", status: "running", phase: "transfer", readOnlyObserver: false },
      { id: "t2", operation: "sync.projectInventory", status: "running", phase: "hashing", readOnlyObserver: true },
      { id: "t3", operation: "files.cleanup.preview", status: "running", phase: "preparing", readOnlyObserver: true },
    ],
    uploadOperationCount: 0, uploadOperations: [], uploadQueueCount: 0, uploadQueues: { count: 0, keyHashes: [] },
  };
  const f = await fixture({ throwFor: () => sftpError("ACTIVE_TRANSFER", { busy: observers }) });
  await assert.rejects(() => f.run(), error => {
    const detail = String(error.apiData?.detail || error.message);
    assert.match(detail, /其中真正阻断的传输 1/, "阻断数量必须如实报出");
    assert.match(detail, /只读观测 2 条/, "只读观测必须与写入分开报出");
    assert.match(detail, /sync[.]projectInventory：running\/hashing（只读，不阻断）/);
    assert.match(detail, /files[.]cleanup[.]preview：running\/preparing（只读，不阻断）/);
    assert.equal(/upload[.]workspace：running\/transfer（只读/.test(detail), false, "真实上传不得被标成只读");
    return true;
  });
  const retained = (f.state.blocked || []).flatMap(row => row.busy || []);
  assert.ok(retained.length >= 2);
  assert.equal(retained[0].blockingTransferCount, 1, "白名单必须保留阻断计数");
  assert.equal(retained[0].observerTransferCount, 2, "白名单必须保留只读观测计数");
  assert.equal(retained[0].activeTransfers[1].readOnlyObserver, true, "逐行只读标记不得丢失");
  assert.equal(retained[0].activeTransfers[0].readOnlyObserver, false);
});
// 旧版配套（B 0.2.103 及更早）的真实封套：有 busy/activeTransferCount/逐行传输，但没有 blocking/observer/self 计数。
// 那时 B 的守卫把每条非终态传输都真的算成阻断，因此 A 只能保守回退，绝不能凭空报“真正阻断 0”。
const legacyBusyEnvelope = () => ({
  schemaVersion: 1, observedAt: "2026-10-21T08:59:01.000Z", instanceId: "41001:legacy-instance", busy: true,
  activeTransferCount: 2,
  activeTransfers: [
    { id: "transfer-1-1-files.cleanup.execute", status: "running", operation: "files.cleanup.execute" },
    { id: "transfer-1-2-upload.workspace", status: "running", operation: "upload.workspace" },
  ],
  uploadOperationCount: 0, uploadOperations: [], uploadQueueCount: 0, uploadQueues: { count: 0, keyHashes: [] },
});

test("旧版配套封套缺新计数：按全部在途传输保守计阻断，绝不虚报真正阻断 0", async () => {
  const f = await fixture({ refuse: busyEverywhere, errorData: () => ({ busy: legacyBusyEnvelope() }) });
  const error = await f.run().then(() => null, row => row);
  const detail = String(error?.apiData?.detail || error?.message || "");
  assert.equal(codeOf(error), "RUN_OUTPUTS_TRANSFER_BUSY");
  assert.match(detail, /其中真正阻断的传输 2/, "缺字段时保守按全部在途传输计阻断");
  assert.doesNotMatch(detail, /真正阻断的传输 0/, "绝不虚报“真正阻断 0”");
  assert.doesNotMatch(detail, /只读观测 \d+ 条/, "旧版没有只读观测计数就不要显示条数");
  assert.match(detail, /旧版配套未区分只读\/写入/, "必须说明这是旧版封套的保守口径");
  const evidence = busyEvidenceFromError(sftpError("ACTIVE_TRANSFER", { busy: legacyBusyEnvelope() }));
  assert.equal(evidence.blockingTransferCount, 2);
  assert.ok(!("observerTransferCount" in evidence), "缺字段不得凭空补 0");
  assert.ok(!("selfAttemptCount" in evidence), "缺字段不得凭空补 0");
  assert.equal(evidence.legacyBusyShape, true, "必须留下旧口径事实，供文案说明");
  assert.deepEqual(evidence.activeTransfers.map(row => row.readOnlyObserver), [false, false], "旧版逐行一律按非只读处理");
});

test("新版配套封套的实测计数原样保留：真正阻断 0 与只读观测分开呈现", async () => {
  const snapshot = {
    schemaVersion: 1, observedAt: "2026-10-21T09:04:48.000Z", instanceId: "50924:new-instance", busy: true,
    activeTransferCount: 2, blockingTransferCount: 0, observerTransferCount: 2, selfAttemptCount: 0,
    activeTransfers: [
      { id: "transfer-2-1-files.cleanup.preview", status: "running", operation: "files.cleanup.preview", readOnlyObserver: true, selfAttempt: false },
      { id: "transfer-2-2-files.cleanup.check", status: "running", operation: "files.cleanup.check", readOnlyObserver: true, selfAttempt: false },
    ],
    uploadOperationCount: 1, uploadOperations: [{ id: "op-1", stage: "acquiring-lease" }],
    uploadQueueCount: 0, uploadQueues: { count: 0, keyHashes: [] },
  };
  const f = await fixture({ refuse: busyEverywhere, errorData: () => ({ busy: clone(snapshot) }) });
  const error = await f.run().then(() => null, row => row);
  const detail = String(error?.apiData?.detail || error?.message || "");
  assert.match(detail, /其中真正阻断的传输 0/, "新版实测阻断 0 要如实呈现（忙来自上传操作，不是文件写入）");
  assert.match(detail, /只读观测 2 条/, "只读观测单独计数");
  assert.match(detail, /只读，不阻断/, "逐行也要标出只读不阻断");
  assert.doesNotMatch(detail, /旧版配套未区分只读\/写入/, "新版封套不得套用旧口径说明");
  const evidence = busyEvidenceFromError(sftpError("ACTIVE_TRANSFER", { busy: clone(snapshot) }));
  assert.equal(evidence.blockingTransferCount, 0, "实测 0 不能被保守回退改写");
  assert.equal(evidence.observerTransferCount, 2);
  assert.equal(evidence.selfAttemptCount, 0);
  assert.ok(!("legacyBusyShape" in evidence), "新版封套不是旧口径");
});

test("配套自报自身那一条时，A 单独呈现且不计入阻断", async () => {
  const snapshot = {
    schemaVersion: 1, observedAt: "2026-10-21T09:20:00.000Z", instanceId: "50924:self-instance", busy: true,
    activeTransferCount: 2, blockingTransferCount: 1, observerTransferCount: 0, selfAttemptCount: 1,
    activeTransfers: [
      { id: "transfer-3-1-files.cleanup.execute", status: "running", operation: "files.cleanup.execute", readOnlyObserver: false, selfAttempt: true },
      { id: "transfer-3-2-upload.workspace", status: "running", operation: "upload.workspace", readOnlyObserver: false, selfAttempt: false },
    ],
    uploadOperationCount: 0, uploadOperations: [], uploadQueueCount: 0, uploadQueues: { count: 0, keyHashes: [] },
  };
  const f = await fixture({ refuse: busyEverywhere, errorData: () => ({ busy: clone(snapshot) }) });
  const error = await f.run().then(() => null, row => row);
  const detail = String(error?.apiData?.detail || error?.message || "");
  assert.match(detail, /其中真正阻断的传输 1/, "真正阻断的仍是那一条上传，不是自身");
  assert.match(detail, /其中本请求自身 1 条（不计入阻断）/, "自身那一条要单独说明");
  assert.match(detail, /（本请求自身）/, "逐行也要标出自身那一条");
  const evidence = busyEvidenceFromError(sftpError("ACTIVE_TRANSFER", { busy: clone(snapshot) }));
  assert.equal(evidence.selfAttemptCount, 1);
  assert.deepEqual(evidence.activeTransfers.map(row => row.selfAttempt), [true, false], "selfAttempt 只认真布尔");
});
