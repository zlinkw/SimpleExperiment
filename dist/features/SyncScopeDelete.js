"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConfirmedScopeCopy = deleteConfirmedScopeCopy;
/** Called only after the tree's two exact-path confirmations. No transfer-ledger recovery. */
async function deleteConfirmedScopeCopy(rpc, node, relativePath, directory, report = () => { }, timing = {}) {
    const call = async (method, params) => {
        report(`正在执行 ${method}：${relativePath}`);
        try {
            return await rpc(method, params);
        }
        catch (error) {
            throw Object.assign(new Error(`${method}：${error?.message || String(error)}`), { apiCode: error?.apiCode, apiData: error?.apiData });
        }
    };
    const target = { relativePath, type: directory ? 'directory' : 'file' };
    const presence = await call('files.cleanup.inspect', { node, target, presenceOnly: true, allowMissing: true, observeExecutors: true });
    if (presence?.ok !== true || presence.executorsChecked !== true || !Array.isArray(presence.executors))
        throw new Error('删除查询失败：未取得实际文件和清理窗口状态。');
    if (presence.executors.length)
        throw new Error('对应清理窗口仍在处理；请刷新文件列表，不重复删除。');
    if (presence.target?.missing === true)
        return;
    const preview = await call('files.cleanup.preview', { node, action: 'delete', authorizationMode: 'confirmed_paths',
        observationMode: 'managed_tmux', targets: [{ ...target, destination: 'clean_dir/' + relativePath }] });
    if (preview.targets?.length !== 1)
        throw new Error('删除未核实：返回的目标数量不正确。');
    if (preview.targets[0].missing === true)
        return;
    const absolutePath = node.root.replace(/\/$/, '') + '/' + relativePath;
    if (preview.targets[0].absolutePath !== absolutePath || preview.targets[0].type !== target.type)
        throw new Error('删除未核实：目标路径或类型已变化，请重新确认。');
    const request = { token: preview.token, digest: preview.digest };
    for (const phase of [1, 2])
        await call('files.cleanup.confirm', { ...request, phase, confirm: true, exactTargets: [absolutePath] });
    let sendError = '';
    let admissionWaiting = false;
    try {
        admissionWaiting = (await call('files.cleanup.execute', { ...request, index: 0 }))?.state === 'waiting';
    }
    catch (error) {
        sendError = error instanceof Error ? error.message : String(error);
    }
    // Even a successful execution response is only transport evidence. Query the actual executor and filesystem.
    const now = timing.now || Date.now, inactivityMs = timing.timeoutMs ?? 15_000;
    let deadline = now() + inactivityMs, removedEntries = 0, removedBytes = 0;
    do {
        const proof = await call('files.cleanup.check', { token: preview.token, index: 0 });
        if (proof?.ok !== true)
            throw new Error('删除查询失败：无法核实目标状态。');
        if (proof.state === 'completed')
            return;
        if (proof.state === 'pending' && admissionWaiting) {
            // Only an explicit not-started admission response permits another start
            // request. Lost responses never enter this branch.
            admissionWaiting = (await call('files.cleanup.execute', { ...request, index: 0 }))?.state === 'waiting';
            report('服务器正在处理另一项清理，等待本次目标进入执行');
        }
        else {
            if (proof.state !== 'executing')
                throw new Error(`删除未核实：${proof.queryError || proof.code || proof.state || '状态未知'}${sendError ? '；' + sendError : ''}`);
            admissionWaiting = false;
            const entries = Number(proof.progress?.removedEntries), bytes = Number(proof.progress?.removedBytes);
            if (Number.isFinite(entries) && entries > removedEntries || Number.isFinite(bytes) && bytes > removedBytes) {
                removedEntries = Math.max(removedEntries, Number.isFinite(entries) ? entries : 0);
                removedBytes = Math.max(removedBytes, Number.isFinite(bytes) ? bytes : 0);
                deadline = now() + inactivityMs;
            }
            report(`正在删除：已清除 ${removedEntries} 项、${removedBytes} 字节`);
        }
        if (now() >= deadline)
            break;
        await (timing.wait || (() => new Promise(resolve => setTimeout(resolve, 500))))();
    } while (now() < deadline);
    throw new Error('清理窗口仍在处理；本轮等待已结束，请刷新文件列表，不重复删除。');
}
