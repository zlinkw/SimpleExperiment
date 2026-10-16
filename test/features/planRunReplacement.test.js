const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
require('../_helpers/registerTsRequire');
const {replaceRunOutputs}=require('../../src/features/PlanRunReplacement.ts');
function fixture(){
 const events=[],files=new Set(['job0/old-only.bin','job0/model.pth','job1/failed.log']),operations=new Map(),state={};let choice='rerun_all',cancel=0,fail=false,lost=false;
 const jobs=[0,1,2].map(index=>({index,output_dir:'work/job'+index,result_csv:'tmp/result/job'+index+'.csv'}));
 const ports={assertCurrent(){},progress(){},save:async()=>events.push('save'),
 preview:async job=>({token:'op'+job.index,digest:'digest'+job.index,scope:{},blockers:[],rows:[{node:{id:'worker',kind:'remote',user:'u',host:'host',port:2222},nodeId:'worker',absolutePath:'/safe/'+job.output_dir,type:'directory',disposition:job.index<2?'delete':'absent'}]}),
 ask:async p=>{events.push('ask'+p.phase);assert.ok(p.groups[0].targets.every(t=>t.path.startsWith('/safe/')));if(cancel===p.phase)return 'cancel';return p.phase===1?choice:'delete_and_run';},
 beforeDelete:async()=>{events.push('workers');if(fail)throw Error('nwpu3 unavailable');},hold:async()=>events.push('hold'),
 service:{confirm:async p=>events.push('confirm'+p.phase+p.token),preflightConfirmed:async id=>events.push('check'+id),status:async id=>operations.get(id)||{state:'partial'}},
 execute:async id=>{events.push('delete'+id);for(const file of [...files])if(file.startsWith('job'+id.slice(2)+'/'))files.delete(file);const result={state:'completed',pendingNodes:[]};operations.set(id,result);if(lost)throw Error('response lost');return result;}};
 return {ports,state,jobs,events,files,set:(v)=>{({choice=choice,cancel=cancel,fail=fail,lost=lost}=v);},run:()=>replaceRunOutputs(ports,state,'plans/p.yaml',jobs,[0],'frozen')};
}
test('two clicks clear every selected job directory including stale extra files, then continue without a third review',async()=>{
 const f=fixture(),r=await f.run();assert.deepEqual(r.selectedIndices,[0,1,2]);assert.equal(f.files.size,0);
 assert.deepEqual(f.events.filter(e=>e.startsWith('ask')),['ask1','ask2']);assert.ok(f.events.indexOf('workers')<f.events.indexOf('deleteop0'));assert.equal(f.state.done,true);
});
test('missing-only keeps complete job, replaces incomplete job, and starts absent job',async()=>{
 const f=fixture();f.set({choice:'rerun_missing'});const r=await f.run();assert.deepEqual(r.selectedIndices,[1,2]);assert.ok(f.files.has('job0/model.pth'));assert.ok(!f.files.has('job1/failed.log'));
});

test('missing-only resumption cannot silently retain an older broader deletion selection',async()=>{
 const f=fixture();f.state.choice='rerun_missing';f.state.selectedIndices=[0,1,2];f.state.phase=2;
 await assert.rejects(f.run(),/范围已变化/);assert.ok(!f.events.some(e=>e.startsWith('delete')));assert.equal(f.files.size,3);
});
test('cancel either prompt and failed all-Worker recheck never delete; retry retains the same confirmed batch',async()=>{
 for(const phase of [1,2]){const f=fixture();f.set({cancel:phase});await assert.rejects(f.run(),/已取消/);assert.ok(!f.events.some(e=>e.startsWith('delete')));}
 const f=fixture();f.set({fail:true});await assert.rejects(f.run(),/nwpu3/);assert.ok(!f.events.some(e=>e.startsWith('delete')));
 f.set({fail:false});await f.run();assert.deepEqual(f.events.filter(e=>e.startsWith('ask')),['ask1','ask2']);
});
test('lost execute responses reconcile by active status, resume never repeats a completed delete, changed declarations reject',async()=>{
 const f=fixture();f.set({lost:true});await f.run();await f.run();assert.equal(f.events.filter(e=>e==='deleteop0').length,1);
 await assert.rejects(replaceRunOutputs(f.ports,f.state,'plans/p.yaml',f.jobs,[0],'changed'),/已变化/);
});
test('actual injected modal script renders full paths and sends only one correlated answer per click',()=>{
 const html=require('../../src/ui/RunConfirmation.ts').withRunConfirmation('<body><script nonce="allowed"></script></body>');const scripts=[...html.matchAll(/<script nonce="allowed">([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);const script=scripts[1][1];new vm.Script(script);
 const handlers={},sent=[],nodes={};function node(){return {textContent:'',hidden:true,children:[],appendChild(child){this.children.push(child);},focus(){},addEventListener(type,fn){handlers[type]=fn;},querySelector(key){return nodes[key]||=node();},querySelectorAll(){return nodes['.buttons'].children;}};}
 const dialog=node();vm.runInNewContext(script,{window:{addEventListener:(name,fn)=>handlers[name]=fn},document:{getElementById:()=>dialog,createElement:()=>node()},vscode:{postMessage:m=>sent.push(m)}});
 const full='/safe/'+('中文 very long path/'.repeat(60))+'model';handlers.message({data:{type:'planRunConfirmation',requestId:'request1',payload:{title:'confirm',planFile:'p.yaml',phase:2,groups:[{value:'delete_and_run',label:'永久删除并重跑',targets:[{path:full,server:'w',connection:'u@h:22',type:'directory'}]}]}}});
 assert.ok(nodes['.paths'].children.some(n=>n.textContent.includes(full)));const button=nodes['.buttons'].children[0];button.onclick();button.onclick();assert.equal(sent.length,1);assert.equal(sent[0].requestId,'request1');
});
