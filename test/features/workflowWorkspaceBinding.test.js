const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { bindWorkflowWorkspace, assertWorkflowWorkspace, assertPlanSeedContract } = require('../../dist/features/WorkflowWorkspaceBinding');
test('binds the actual current directory, accepting Windows case aliases but rejecting another workspace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'Win workflow 中文 ')), other = path.join(root, 'other'); fs.mkdirSync(other);
  const binding = bindWorkflowWorkspace(process.platform === 'win32' ? root.toUpperCase() : root, root);
  assertWorkflowWorkspace(binding, process.platform === 'win32' ? root.toLowerCase() : root);
  assert.throws(() => bindWorkflowWorkspace(other, root), /当前/);
  assert.throws(() => bindWorkflowWorkspace(undefined, ''), /工作区/);
});
test('directory replacement, changed current workspace and seed overrides refuse continuation', () => {
  const project = path.resolve('Project'), other = path.resolve('Other');
  const probe = value => ({ canonical: value, device: '1', inode: value === project ? '2' : '3' });
  const b = bindWorkflowWorkspace(project, project, probe);
  assert.throws(() => assertWorkflowWorkspace(b, other, probe), /变化/);
  assert.throws(() => assertWorkflowWorkspace(b, project, () => ({ ...b.identity, inode: '4' })), /变化/);
  assert.throws(() => assertPlanSeedContract({ seed: 42 }), /seed/); assertPlanSeedContract({});
});
