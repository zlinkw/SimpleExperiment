"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReplacementKey = void 0;
exports.replaceRunOutputs = replaceRunOutputs;
const PlanCleanup_1 = require("./PlanCleanup");
const targets = (previews) => previews.flatMap(({ preview }) => preview.rows.filter(row => row.disposition === "isolate").map(row => ({ server: row.node.id,
    connection: row.node.kind === "remote" ? row.node.user + "@" + row.node.host + ":" + row.node.port : "本机",
    path: row.absolutePath, type: row.type })));
const emptyPreview = (index) => ({ token: "blocked-" + index, digest: "", action: "isolate",
    scope: undefined, rows: [], blockers: [], verifiedOnly: false, expiresAt: 0, confirmations: 0 });
/** One flow for normal runs and explicit retries: isolate old outputs first, admit each job independently. */
async function replaceRunOutputs(ports, state, planFile, jobs, completedIndices, key) {
    ports.assertCurrent();
    if (state.key && state.key !== key)
        (0, PlanCleanup_1.cleanupError)("RUN_DECLARATION_CHANGED", "本次任务或服务器配置已变化，请重新提交并确认路径。");
    state.key = key;
    // 旧“先删除再重跑”意图不迁移到隔离流程；未完成的旧状态按新流程重新预览（旧令牌未执行过任何移动）。
    if (state.previews && state.flow !== "isolate" && !state.done) {
        delete state.previews;
        delete state.choice;
        delete state.selectedIndices;
        delete state.completed;
        state.phase = 0;
    }
    if (!state.previews) {
        state.flow = "isolate";
        const previews = [];
        const blocked = [];
        let next = 0, fatal;
        const read = async () => {
            while (next < jobs.length && !fatal) {
                const position = next++, job = jobs[position];
                try {
                    ports.assertCurrent();
                    ports.progress("正在定位任务 " + job.index + " 的已有文件…");
                    const preview = await ports.preview(job);
                    if (preview.blockers.length || preview.rows.some(row => !["isolate", "absent"].includes(row.disposition))) {
                        const reason = [...preview.blockers.map(row => (row.nodeId || "") + "：" + row.code + " " + row.detail),
                            ...preview.rows.filter(row => !["isolate", "absent"].includes(row.disposition)).map(row => row.absolutePath + "：" + (row.error || row.protectedReason))].join("；");
                        blocked.push({ index: Number(job.index), reason });
                        previews[position] = { index: Number(job.index), preview: emptyPreview(Number(job.index)) };
                        ports.progress("任务 " + job.index + " 暂不能安全隔离；本轮仅暂停该 job，不等待其他任务：" + reason);
                        continue;
                    }
                    previews[position] = { index: Number(job.index), preview };
                }
                catch (error) {
                    try {
                        ports.assertCurrent();
                    }
                    catch (cancelled) {
                        fatal ||= cancelled;
                        continue;
                    }
                    const code = String(error?.apiData?.code || error?.code || "");
                    if (code.startsWith("SFTP_") || ["RUN_DECLARATION_CHANGED", "SERVER_IDENTITY_CHANGED", "OUTSIDE_PLAN_CLEANUP_SCOPE"].includes(code)) {
                        fatal ||= error;
                        continue;
                    }
                    blocked.push({ index: Number(job.index), reason: String(error?.apiData?.detail || error?.message || code || "preview_failed") });
                    previews[position] = { index: Number(job.index), preview: emptyPreview(Number(job.index)) };
                    ports.progress("任务 " + job.index + " 无法建立隔离预览；本轮仅暂停该 job：" + blocked[blocked.length - 1].reason);
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(2, jobs.length) }, read));
        if (fatal)
            throw fatal;
        const exact = targets(previews).map(row => row.server + ":" + row.path);
        if (new Set(exact).size !== exact.length)
            (0, PlanCleanup_1.cleanupError)("OUTPUT_REPLACEMENT_OVERLAP");
        if (jobs.length && blocked.length === jobs.length)
            (0, PlanCleanup_1.cleanupError)("OUTPUT_ISOLATION_FAILED", blocked.map(row => "job " + row.index + "：" + row.reason).join("\n") + "\n没有任何 job 可准入；未移动文件，也未提交任务。");
        state.blocked = blocked;
        state.previews = previews;
        await ports.save();
    }
    const blockedIndexes = new Set((state.blocked || []).map(row => row.index));
    const all = jobs.map(job => Number(job.index)).filter(index => !blockedIndexes.has(index)), missing = all.filter(index => !completedIndices.includes(index));
    if (state.choice === "rerun_missing" && state.selectedIndices && (state.selectedIndices.length !== missing.length
        || state.selectedIndices.some(index => !missing.includes(index))))
        (0, PlanCleanup_1.cleanupError)("RUN_SELECTION_CHANGED", "本轮未完成任务范围已变化；请取消后重新确认精确 job 路径，未继续隔离。");
    if (!targets(state.previews).length && !state.choice)
        state.choice = "rerun_all";
    if (!state.choice) {
        ports.progress("等待选择运行范围并核对将移入隔离区的完整路径…");
        const choice = await ports.ask({ phase: 1, planFile, title: "选择运行范围并核对将移入 clean 隔离区的完整路径", groups: [
                { value: "rerun_all", label: "覆盖并重跑全部", targets: targets(state.previews) },
                { value: "rerun_missing", label: "仅补跑未完成任务", disabled: !missing.length,
                    targets: targets(state.previews.filter(row => missing.includes(row.index))) }
            ] });
        if (!["rerun_all", "rerun_missing"].includes(choice))
            (0, PlanCleanup_1.cleanupError)("REPLACEMENT_CANCELLED", "已取消；未移动文件或提交任务。");
        state.choice = choice;
        state.selectedIndices = choice === "rerun_missing" ? missing : all;
        await ports.save();
    }
    state.selectedIndices ||= state.choice === "rerun_missing" ? missing : all;
    const selected = state.previews.filter(row => state.selectedIndices.includes(row.index) && targets([row]).length);
    const exact = targets(selected);
    if (exact.length && (state.phase || 0) < 1) {
        ports.progress("等待确认：旧输出移入 clean 隔离区后立即启动新运行；永久删除稍后单独双确认…");
        if (await ports.ask({ phase: 2, planFile, title: "将以下旧输出移入 clean 隔离区并重跑", groups: [
                { value: "isolate_and_run", label: "隔离并重跑（旧输出不直接删除；永久删除稍后单独两次确认）", targets: exact }
            ] }) !== "isolate_and_run")
            (0, PlanCleanup_1.cleanupError)("REPLACEMENT_CANCELLED", "已取消；未移动文件或提交任务。");
        for (const { preview } of selected)
            await ports.service.confirm({ token: preview.token, digest: preview.digest, phase: 1, confirm: true,
                exactTargets: targets([{ index: 0, preview }]).map(row => row.server + ":" + row.path) });
        state.phase = 1;
        await ports.save();
    }
    ports.assertCurrent();
    if (selected.length) {
        await ports.beforeDelete();
        for (const { preview } of selected)
            await ports.service.preflightConfirmed(preview.token);
        state.completed ||= [];
        state.blocked ||= [];
        for (const { index, preview } of selected) {
            ports.assertCurrent();
            if (blockedIndexes.has(index))
                continue;
            if (state.completed.includes(preview.token)) {
                try {
                    if ((await ports.service.status(preview.token)).state !== "completed")
                        throw new Error("已记录的隔离批次未确认完成");
                    await ports.verify(preview);
                }
                catch (error) {
                    blockedIndexes.add(index);
                    state.blocked.push({ index, reason: String(error.message || error) });
                    await ports.save();
                }
                continue;
            }
            ports.progress("正在把已确认旧输出移入 clean 隔离区；已完成 " + state.completed.length + "/" + selected.length + " 批…");
            let result;
            try {
                result = await ports.execute(preview.token);
            }
            catch (error) {
                try {
                    result = await ports.service.status(preview.token);
                }
                catch { }
                if (result?.state !== "completed") {
                    blockedIndexes.add(index);
                    state.blocked.push({ index, reason: String(error?.message || error) });
                    await ports.save();
                    continue;
                }
            }
            if (result.state !== "completed" || result.pendingNodes?.length) {
                blockedIndexes.add(index);
                state.blocked.push({ index, reason: String(result.error || "部分目标尚未确认隔离完成，可重试失败步骤") });
                await ports.save();
                continue;
            }
            state.completed.push(preview.token);
            await ports.save();
            try {
                await ports.verify(preview);
            }
            catch (error) {
                blockedIndexes.add(index);
                state.blocked.push({ index, reason: String(error.message || error) });
                await ports.save();
            }
        }
    }
    const accepted = (state.selectedIndices || []).filter(index => !blockedIndexes.has(index));
    if (jobs.length && !accepted.length)
        (0, PlanCleanup_1.cleanupError)("OUTPUT_ISOLATION_FAILED", (state.blocked || []).map(row => "job " + row.index + "：" + row.reason).join("\n")
            + "\n没有任何 job 通过隔离准入；旧输出仅移入 clean 区，未提交任务。");
    // 与旧删除流一致：仅当本轮确有旧输出被隔离时才对已准入 job 建立保留围栏；空产物提交不动队列。
    if (selected.length)
        await ports.hold(jobs.filter(job => accepted.includes(Number(job.index))));
    state.done = true;
    await ports.save();
    return { choice: state.choice, selectedIndices: accepted };
}
const runReplacementKey = (plan, revision, code, jobs, nodes) => (0, PlanCleanup_1.cleanupDigest)([plan, revision, code, jobs, nodes]);
exports.runReplacementKey = runReplacementKey;
