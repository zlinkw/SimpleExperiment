// Adapt the existing per-test answer queues to the two-stage review decision.
// The real Webview stages and long-path rendering are covered by syncScopeConfirmation.test.js.
module.exports = window => async (title, note, paths, finalLabel) => {
  const detail = paths.map(row => row.label + ': ' + row.path).join('\n');
  if (await window.showWarningMessage(title + '（第 1/2 次确认）\n' + note + '\n' + detail,
    { modal: true }, '确认删除（1/2）', '取消') !== '确认删除（1/2）') return false;
  return await window.showWarningMessage(finalLabel + '（第 2/2 次确认）\n' + detail,
    { modal: true }, '永久删除（2/2）', '取消') === '永久删除（2/2）';
};
