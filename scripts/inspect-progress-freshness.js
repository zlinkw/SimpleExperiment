'use strict';
// Read-only local plugin API observation. No server credentials or payloads are
// printed, no state files are written, and no task actions are invoked.
const fs = require('node:fs'), path = require('node:path');
const commandId = process.argv[2];
if (!/^[A-Za-z0-9._:-]{1,128}$/.test(commandId || '')) throw Error('Usage: node scripts/inspect-progress-freshness.js <commandId>');
async function rpc(method) {
 const d = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'SimpleExperiment/api.json'), 'utf8'));
 const base = new URL(d.baseUrl);
 if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Loopback discovery required');
 const headers = { Authorization: 'Bearer ' + d.token, 'Content-Type': 'application/json' };
 const capability = await fetch(new URL('/api/v1/capabilities', base), { headers, signal: AbortSignal.timeout(5000) });
 if (!capability.ok || !(await capability.json()).methods.includes(method)) throw Error('Live method unavailable: ' + method);
 const response = await fetch(new URL('/api/v1/rpc', base), { method: 'POST', headers,
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: {} }), signal: AbortSignal.timeout(45000) });
 const envelope = await response.json();
 if (envelope.error) throw Error('Local RPC failed: ' + method);
 return envelope.result;
}
async function main() {
 console.log(JSON.stringify({ event: 'request-start', commandId, at: new Date().toISOString() }));
 let observation;
 const pull = rpc('tasks.list').then(r => {
  const snapshot = r.workerTasks.find(s => s.tasks?.some(t => t.commandId === commandId));
  observation = snapshot;
  console.log(JSON.stringify({ event: 'api-receipt', commandId, at: new Date().toISOString(),
   fetchedAt: snapshot?.fetchedAt, generatedAt: snapshot?.generatedAt, publishedAt: snapshot?.publishedAt,
   diagnosticsPending: snapshot?.diagnosticsPending, runtimeQueryError: snapshot?.runtimeQueryError,
   taskEvidence: snapshot?.tasks.find(t => t.commandId === commandId)?.observation?.evidence }));
 });
 let previous;
 for (let i = 0; i < 32; i++) {
  const state = await rpc('state');
  const task = state.distributedPlans?.flatMap(p => p.jobs).find(t => t.commandId === commandId);
  const signature = JSON.stringify([task?.status, task?.resultState, task?.statusQueryError]);
  if (signature !== previous || task?.statusQueryError) {
   const now = Date.now();
   console.log(JSON.stringify({ event: 'ui-projection', commandId, at: new Date(now).toISOString(),
    status: task?.status, executionState: task?.executionState, resultState: task?.resultState,
    error: task?.statusQueryError, lastApiSnapshotAgeMs: observation ? now - Date.parse(observation.fetchedAt) : null,
    thresholdMs: 20000 }));
  }
  previous = signature;
  await new Promise(resolve => setTimeout(resolve, 1000));
 }
 await pull;
 const diagnostics = await rpc('panel.diagnostics');
 console.log(JSON.stringify({ event: 'timing-evidence', commandId, runningVersion: diagnostics.runningVersion,
  installedVersion: diagnostics.installedVersion, evidence: diagnostics.progressEvidence?.filter(t => t.commandId === commandId) || [],
  legacyTimingUnavailable: !diagnostics.progressEvidence }));
}
main().catch(() => { console.error('Progress inspection failed; no task action was attempted.'); process.exitCode = 1; });
