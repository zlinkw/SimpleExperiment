const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), fsp = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const { ResultCollectionHost } = require('../../src/extension/ResultCollectionHost.ts');
const { resultDigest } = require('../../src/results/FreshResults.ts');
const { readLatestResultExport, latestResultCatalog, regenerateLatestResultTables } = require('../../src/results/LatestResultExport.ts');
const { fixture, planFile, planText } = require('../_helpers/freshResultHost');
function files(root) { return fs.readdirSync(root, { withFileTypes: true }).flatMap(row => row.isDirectory() ? files(path.join(root,row.name)).map(item => row.name+'/'+item) : [row.name]); }
test('production collection uses only live declarations and native files; saves one final JSON and CSV/Markdown; deletion replaces rows', async () => {
  const f = fixture(); let report = await f.service.update();
  assert.equal(report.current, true); assert.equal(report.completed, 1);
  const exported = await readLatestResultExport(f.root, 'experiments/results'); assert.equal(exported.tables.length, 2);
  assert.equal('records' in exported, false); assert.equal('plans' in exported, false);
  const outputs = files(f.root); assert.equal(outputs.filter(file => file.endsWith('.json')).length, 1);
  assert.ok(outputs.includes('experiments/results/latest-results.json')); assert.ok(!outputs.some(file => /registry|publication|provenance|backup|writing|raw\//.test(file)));
  f.gone(true); report = await f.service.update(); assert.equal(report.completed, 0); assert.equal(report.jobs[0].state, 'missing');
  assert.equal((await readLatestResultExport(f.root, 'experiments/results')).tables.length, 0);
  assert.equal((await latestResultCatalog(f.root, 'experiments/results')).datasets.length, 0, 'old CSV directories cannot reappear in the catalog');
});
test('offline preserves export bytes but never reuses its rows as current results; returning connection retries', async () => {
  const f = fixture(); await f.service.update(); const file = path.join(f.root,'experiments/results/latest-results.json'), before = fs.readFileSync(file,'utf8');
  f.offline(true); const stale = await f.service.update(); assert.equal(stale.current,false); assert.equal(stale.results.length,0); assert.equal(fs.readFileSync(file,'utf8'),before);
  f.offline(false); assert.equal((await f.service.update()).current,true);
});
test('legacy Worker rejects direct collection before downloading, not by falling back to old status files', async () => {
  const f = fixture(); f.protocol(0); const report = await f.service.update();
  assert.equal(report.current,false); assert.equal(report.results.length,0); assert.match(report.skipped.join(' '),/更新/);
  assert.equal(f.calls.filter(call => call[0] === 'sync.downloadMappedPaths').length,0);
});
test('reload rebuilds from real files with no discovery state on disk, and duplicate requests share work', async () => {
  const f = fixture(); let unblock; f.block(new Promise(resolve => { unblock = resolve; }));
  const first = f.service.update(), second = f.service.update(); unblock(); await Promise.all([first,second]);
  f.block(undefined); const prior = f.calls.length; await new ResultCollectionHost(f.host).update();
  assert.ok(f.calls.slice(prior).some(call => call[2]?.discovery));
  assert.equal(files(f.root).filter(file => file.endsWith('.json')).length,1);
});
test('JSON commits atomically before independent tables; a table write interruption needs regeneration, not transaction recovery', async () => {
  const f = fixture(); await f.service.update(); f.raw['work_dirs/alpha42/metrics.csv'] = '0.7';
  const rename = fsp.rename; let interrupted = false;
  fsp.rename = async (source,dest) => { if (!interrupted && dest.endsWith('.csv')) { interrupted = true; throw Object.assign(Error('interrupted'),{code:'EIO'}); } return rename(source,dest); };
  try { await assert.rejects(f.service.update(),/interrupted/); } finally { fsp.rename = rename; }
  const latest = await readLatestResultExport(f.root,'experiments/results');
  assert.equal(latest.tables[0].rows[0][latest.tables[0].header.indexOf('roc_auc_mean')],.7);
  await regenerateLatestResultTables(f.root,'experiments/results',latest);
  assert.match(fs.readFileSync(path.join(f.root,'experiments/results',latest.tables[0].relativePath),'utf8'),/0.7/);
  assert.ok(!files(f.root).some(file => /registry|publication|backup/.test(file)));
});
test('real local plan edits during a request block publication', async () => {
  const f = fixture(); const receive = f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall = async (...args) => { const result = await receive(...args); fs.writeFileSync(path.join(f.root,planFile),planText+'# changed\n','utf8'); return result; };
  await assert.rejects(f.service.update(),/PLAN 已变化/);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
});
test('cancellation during a memory read publishes nothing and a later fresh query succeeds', async () => {
  const f = fixture(), controller = new AbortController(), receive = f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall = async (...args) => { const value = await receive(...args); controller.abort(); return value; };
  await assert.rejects(f.service.update(controller.signal), /取消/);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
  f.host.simpleSftpApiCall = receive;
  assert.equal((await f.service.update()).current,true);
});
test('independent callers serialize final output without persistent operation leases', async () => {
  const f = fixture();
  const reports = await Promise.all([f.service.update(),new ResultCollectionHost(f.host).update()]);
  assert.ok(reports.every(report => report.current));
  const exported = await readLatestResultExport(f.root,'experiments/results');
  assert.equal(exported.tables.length,2);
  assert.ok(!files(f.root).some(file => /lease|registry|publication|backup|writing/.test(file)));
});
test('a real occupied kernel writer blocks publication without a lock file and releases cleanly', async () => {
  const net = require('node:net'), f = fixture();
  let canonical = path.join(fs.realpathSync(f.root),'experiments/results');
  if (process.platform === 'win32') canonical = canonical.toLowerCase();
  const digest = resultDigest(canonical), server = net.createServer(socket => socket.destroy());
  const address = process.platform === 'win32' ? {path:'\\\\.\\pipe\\simpleex-results-'+digest}
    : {host:'127.0.0.1',port:49152+parseInt(digest.slice(0,4),16)%16384,exclusive:true};
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(address,resolve);});
  try {
    await assert.rejects(f.service.update(),/其他窗口更新/);
    assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
  } finally { await new Promise(resolve => server.close(resolve)); }
  assert.equal((await f.service.update()).current,true);
});
