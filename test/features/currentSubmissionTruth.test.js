const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const source = fs.readFileSync('src/extension/legacy.ts', 'utf8');
const tree = ts.createSourceFile('host.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
function host(names, globals = {}) {
  const code = 'class Host {' + cls.members.filter(node => names.includes(node.name?.getText(tree))).map(node => node.getText(tree)).join('\n') + '}; Host;';
  return new (vm.runInNewContext(ts.transpileModule(code, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, globals))();
}
const Q = require('../../src/features/DistributedPlanQueue.ts');
const globals = { stringField:(row,key)=>row[key] || '', stringArrayField:(row,key)=>Array.isArray(row[key])?row[key]:[],
  numberField:(row,key)=>row[key], booleanField:(row,key)=>row[key], usableSelectionKey:value=>value || '', uniqueStrings:rows=>[...new Set(rows)], taskActionTargetsField:()=>[] };
test('the real UI request carries the same selected PLAN at both host and wire boundaries', () => {
  const h = host(['actionBody','actionPlanTarget'],globals);
  Object.assign(h,{planFileInput:'plans/current.yaml',selectedPlanId:'plans/other.yaml',selectedRunKeys:new Set(),selectedExperimentIds:new Set(),selectedArchiveKeys:new Set(),selectedTaskUiKeys:new Set(),
    resolveWorkerEndpointId:value=>value,schedulerSettings:()=>({}),workerActionTargets:()=>[]});
  const body=h.actionBody({command:'runPlan',planFile:'plans/current.yaml'});
  assert.equal(body.planFile,'plans/current.yaml');
  assert.equal(body.options.planFile,body.planFile);
});
test('obsolete missing windows do not consume capacity of actual idle cards', () => {
  const old={lifecycleProtocol:2,status:'unknown',executionState:'missing',workerId:'full',gpuId:'0',commandId:'old'};
  const live={...old,commandId:'live',executionState:'running'};
  assert.equal(Q.jobHasLiveExecution(old),false);assert.equal(Q.jobHasLiveExecution(live),true);
  assert.equal(Q.jobHasLiveExecution({...old,executionState:'unknown',statusQueryError:'offline'}),true);
  // This is the production tick's capacity/reservation seam, shared by both dispatch modes.
  const r=Q.activeGpuReservations({plans:[{jobs:[old,live,{...live,manualDispatch:{workerId:'full',gpuId:'0'}}]}]});
  assert.equal(r.activeByWorker.get('full'),1);assert.deepEqual([...r.occupiedGpuIds],['full:0']);
});
test('legacy stop queries use current project identity without editing or replaying the historical job',async()=>{
  let observed;const h=host(['stopDistributedJobForClear'],{workspaceRoot:()=>'/fixture',DistributedPlanQueue:Q,
    makeOpId:()=> 'stop-one',PulledTaskControl:{stopPulledTask:async(client,plan,job)=>{observed={plan,job};return {status:'completed'};}}});
  h.client={};h.projectContextGeneration=1;
  const plan={id:'old',jobs:[]},job={lifecycleProtocol:2,workerId:'w',commandId:'c'};
  await h.stopDistributedJobForClear(plan,job);
  assert.equal(observed.plan.projectId,Q.canonicalProjectId('/fixture'));assert.equal(plan.projectId,undefined);
});
test('the UI-shaped nested PLAN reaches real replacement discovery before an empty-output submission',async()=>{
  const {PlanRunHost}=require('../../src/extension/PlanRunHost.ts');
  const {cleanupRelative}=require('../../src/features/PlanCleanup.ts');
  const root=fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(),'se-ui-replace-'));
  const paths=[],job={index:0,case:'x',seed:42,output_dir:'work_dirs/x',result_csv:'work_dirs/x/test.csv'};
  const h={context:{globalStorageUri:{fsPath:root}},workerActionTargets:()=>[],lastCodeSyncState:{fingerprint:'code'},
    planCleanupHost:()=>({service:{preview:async request=>{paths.push(cleanupRelative(request.planFile));return {rows:[],blockers:[]};}}})};
  const body={submissionOperationIdLocal:'original',options:{planFile:'plans/current.yaml'},planRevision:'rev'};
  const store=new PlanRunHost(h,root);await store.save(body);
  assert.equal((await store.load('original')).input.planFile,'plans/current.yaml');
  await store.replace({},body,{jobs:[job]});assert.deepEqual(paths,['plans/current.yaml']);
  assert.equal(body.existingOutputChoice,'rerun_all');assert.deepEqual(body.assignedExperimentIndices,[0]);
  await assert.rejects(store.replace({}, {...body,options:{planFile:'plans/other.yaml'}},{jobs:[job]}),/不一致/);
});
