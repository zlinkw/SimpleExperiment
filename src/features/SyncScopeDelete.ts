type Rpc = (method: string, params: Record<string, any>) => Promise<any>;

/** Called only after the tree's two exact-path confirmations. No transfer-ledger recovery. */
export async function deleteConfirmedScopeCopy(
  rpc: Rpc, node: Record<string, any>, relativePath: string, directory: boolean,
  report: (stage: string) => void = () => {},
  timing: { wait?: () => Promise<void>; timeoutMs?: number } = {},
): Promise<void> {
  const target = { relativePath, type: directory ? 'directory' : 'file' };
  const presence = await rpc('files.cleanup.inspect', { node, target, presenceOnly: true, allowMissing: true, observeExecutors: true });
  if (presence?.ok !== true || presence.executorsChecked !== true || !Array.isArray(presence.executors))
    throw new Error('删除查询失败：未取得实际文件和清理窗口状态。');
  if (presence.executors.length) throw new Error('对应清理窗口仍在处理；请刷新文件列表，不重复删除。');
  const preview = await rpc('files.cleanup.preview', { node, action: 'delete', authorizationMode: 'confirmed_paths',
    observationMode: 'managed_tmux', targets: [{ ...target, destination: 'clean_dir/' + relativePath }] });
  if (preview.targets?.length !== 1) throw new Error('删除未核实：返回的目标数量不正确。');
  if (preview.targets[0].missing === true) return;
  const absolutePath = node.root.replace(/\/$/, '') + '/' + relativePath;
  if (preview.targets[0].absolutePath !== absolutePath || preview.targets[0].type !== target.type)
    throw new Error('删除未核实：目标路径或类型已变化，请重新确认。');
  const request = { token: preview.token, digest: preview.digest };
  for (const phase of [1, 2]) await rpc('files.cleanup.confirm', { ...request, phase, confirm: true, exactTargets: [absolutePath] });
  let sendError = '';
  try { await rpc('files.cleanup.execute', { ...request, index: 0 }); }
  catch (error) { sendError = error instanceof Error ? error.message : String(error); }
  // Even a successful execution response is only transport evidence. Query the actual executor and filesystem.
  const deadline = Date.now() + (timing.timeoutMs ?? 15_000);
  do {
    const proof = await rpc('files.cleanup.check', { token: preview.token, index: 0 });
    if (proof?.ok !== true) throw new Error('删除查询失败：无法核实目标状态。');
    if (proof.state === 'completed') return;
    if (proof.state !== 'executing') throw new Error(`删除未核实：${proof.queryError || proof.code || proof.state || '状态未知'}${sendError ? '；' + sendError : ''}`);
    report('清理窗口仍在执行，正在查询目标是否已删除');
    if (Date.now() >= deadline) break;
    await (timing.wait || (() => new Promise(resolve => setTimeout(resolve, 500))))();
  } while (Date.now() < deadline);
  throw new Error('清理窗口仍在处理；本轮等待已结束，请刷新文件列表，不重复删除。');
}
