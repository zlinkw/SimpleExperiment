const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
const {SYNC_SCOPE_INDEX_PYTHON}=require('../../src/runtime/SyncScopeIndex.ts');
const {SyncScopeAgentIndexReader}=require('../../src/features/SyncScopeAgentIndex.ts');
test('summary subscribes to progress even when a directory listing started the shared index request',async()=>{
 let release,query;const stages=[];let refreshes=0;
 const reader=new SyncScopeAgentIndexReader(async q=>{query=q;refreshes++;return new Promise(resolve=>release=resolve);});
 const listing=reader.list('.','round');
 const summary=reader.inventory('round',undefined,stage=>stages.push(stage));
 release({ok:true,status:'ready',instanceId:'fixture',requestId:query.requestId,generation:1,reset:true,entries:[{p:'.',d:true,m:1},{p:'dir',d:true,m:1},{p:'dir/file',d:false,s:2,m:1}],nextCursor:null});
 assert.equal((await listing).entries[0].path,'dir');assert.equal((await summary).files['dir/file'].size,2);assert.equal(refreshes,1);assert.ok(stages.some(stage=>stage.includes('已接收')));
 const child=await reader.list('dir','round');assert.equal(child.entries[0].path,'dir/file');assert.equal(refreshes,1);
});
test('real tunnel adapters retain dynamic Worker routing and reject responses crossing a connection generation',async()=>{
 const ts=require('typescript'),vm=require('node:vm');
 function method(relative,name){const source=fs.readFileSync(path.resolve(__dirname,'../../src/tunnel',relative),'utf8'),ast=ts.createSourceFile('client.ts',source,ts.ScriptTarget.Latest,true);let member;function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(ast)===name)member=node;ts.forEachChild(node,visit);}visit(ast);return vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{});}
 const http=method('TunnelClient.legacy.ts','getSyncScopeIndex'),seen=[];
 await http.call({requestJson:async(...args)=>seen.push(args)},{feature:'project-sync-scope'});assert.equal(seen[0][0],'/api/sync-scope/index');assert.equal(seen[0][1],'manual_refresh');assert.equal(seen[0][3].timeoutMs,5000);
 const realtime=method('RealtimeTunnelClient.legacy.ts','getSyncScopeIndex');let release;
 const host={connectionGeneration:1,disposed:false,http:{getSyncScopeIndex:()=>new Promise(resolve=>release=resolve)}};
 const pending=realtime.call(host,{});host.connectionGeneration=2;release({ok:true});await assert.rejects(pending,/CONNECTION_GENERATION_CHANGED/);
 const multi=method('MultiEndpointRealtimeClient.legacy.ts','getWorkerSyncScopeIndex'),client={getSyncScopeIndex:async()=>({worker:'w1'})},pool={clients:new Map([['w1',client],['hub',client]]),endpointById:new Map([['w1',{role:'worker'}],['hub',{role:'hub'}]])};
 assert.equal((await multi.call(pool,'w1',{})).worker,'w1');await assert.rejects(multi.call(pool,'hub',{}),/not configured/);
});
test('page reader shares one requested generation, applies only deltas and keeps failed checks unknown',async()=>{
 const calls=[];let generation=0,failed=false;
 const reader=new SyncScopeAgentIndexReader(async query=>{
  calls.push(query);if(query.op==='release')return {ok:true};if(failed)return {ok:false,status:'unknown',error:'filesystem unavailable'};
  if(query.op==='refresh')generation++;
  return {ok:true,status:'ready',instanceId:'agent-instance',requestId:query.requestId,generation,reset:generation===1,observedAt:'actual-scan',nextCursor:null,
   entries:generation===1?[{p:'.',d:true,m:1,n:1,b:1},{p:'dir',d:true,m:1,n:1,b:1},{p:'dir/old',d:false,s:1,m:1}]:[{p:'dir/old',x:true},{p:'dir/new',d:false,s:2,m:2}]};
 });
 const [inventory,list]=await Promise.all([reader.inventory('round-1'),reader.list('dir','round-1')]);assert.equal(calls.length,1);assert.equal(list.entries[0].path,'dir/old');assert.equal(inventory.files['dir/old'].size,1);
 const updated=await reader.inventory('round-2');assert.equal(updated.files['dir/old'],undefined);assert.equal(updated.files['dir/new'].size,2);assert.equal(calls[1].afterGeneration,1);
 failed=true;await assert.rejects(reader.inventory('round-3'),/filesystem unavailable/);reader.dispose();await new Promise(setImmediate);assert.equal(calls.at(-1).op,'release');
});
test('index pages must have the same instance and requested generation; cold reconnect resets the old index',async()=>{
 let second=false;
 const reader=new SyncScopeAgentIndexReader(async query=>({ok:true,status:'ready',instanceId:second?'new-agent':'old-agent',requestId:query.requestId,generation:1,reset:true,nextCursor:null,
  entries:second?[{p:'.',d:true,m:2,n:0,b:0}]:[{p:'.',d:true,m:1,n:1,b:1},{p:'old',d:false,s:1,m:1}]}));
 await reader.inventory('r1');second=true;assert.deepEqual((await reader.inventory('r2')).files,{});
 let page=0;const invalid=new SyncScopeAgentIndexReader(async query=>({ok:true,status:'ready',instanceId:++page===1?'instance':'changed',requestId:query.requestId,generation:1,reset:true,nextCursor:page===1?1:null,entries:[{p:'.',d:true,m:1,n:0,b:0}]}));
 await assert.rejects(invalid.inventory('r1'),/PAGE_IDENTITY_INVALID/);
});
test('bounded first-load pages contain one coherent generation and subsequent reads transfer an empty delta',async()=>{
 const entries=[{p:'.',d:true,m:1,n:600,b:600},...Array.from({length:600},(_,i)=>({p:'file-'+i,d:false,s:1,m:1}))];let generation=0,wireEntries=0;
 const reader=new SyncScopeAgentIndexReader(async query=>{
  if(query.op==='refresh')generation++;
  const reset=generation===1,cursor=query.cursor||0,rows=reset?entries.slice(cursor,cursor+512):[];wireEntries+=rows.length;
  return {ok:true,status:'ready',instanceId:'instance',requestId:query.requestId,generation,reset,nextCursor:reset&&cursor+rows.length<entries.length?cursor+rows.length:null,entries:rows};
 });
 assert.equal(Object.keys((await reader.inventory('first')).files).length,600);assert.equal(wireEntries,601);
 assert.equal(Object.keys((await reader.inventory('fresh')).files).length,600);assert.equal(wireEntries,601,'unchanged warm refresh never retransmits full file status');
});
test('late responses and path traversal never publish or overwrite another round',async()=>{
 let release;const reader=new SyncScopeAgentIndexReader(async query=>{
  const value={ok:true,status:'ready',instanceId:'instance',requestId:query.requestId,generation:1,reset:true,nextCursor:null,entries:[{p:'.',d:true,m:1,n:0,b:0}]};
  if(!release)return new Promise(resolve=>release=()=>resolve(value));return value;
 });
 const old=reader.inventory('old'),rejected=assert.rejects(old,/SUPERSEDED/);await reader.inventory('new');release();await rejected;
 const unsafe=new SyncScopeAgentIndexReader(async query=>({ok:true,status:'ready',instanceId:'i',requestId:query.requestId,generation:1,reset:true,nextCursor:null,entries:[{p:'../other',d:false,s:1,m:1}]}));
 await assert.rejects(unsafe.inventory('r'),/PATH_INVALID/);
});
test('real isolated Agent index detects add/delete/change, returns deltas, fences failures and expires view-only state',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scope-agent-index-')),file=path.join(root,'probe.py');
 const checks=String.raw`
root=sys.argv[1]
os.makedirs(os.path.join(root,'data','nested'))
with open(os.path.join(root,'data','nested','sample.bin'),'wb') as stream: stream.write(b'abc')
original_open=open
def denied(*a,**k): raise AssertionError('index cannot open contents or write cache')
builtins.open=denied
actual=scan_sync_scope_metadata(root,lambda n:None,lambda:False)
builtins.open=original_open
assert actual['data']['n']==1 and actual['data']['b']==3 and actual['data/nested/sample.bin']['s']==3
assert actual['.']['n']==2 # probe.py is also a real file in this isolated root
snapshots=[{'.':{'p':'.','d':True,'m':1,'n':1,'b':1},'a':{'p':'a','d':False,'s':1,'m':1}},
           {'.':{'p':'.','d':True,'m':2,'n':1,'b':2},'b':{'p':'b','d':False,'s':2,'m':2}}]
calls=[]; clock=[0]
def scanner(project,progress,cancelled):
 calls.append(1); progress(2)
 if len(calls)>3: raise OSError('permission denied')
 return snapshots[min(len(calls)-1,1)]
index=SyncScopeIndex(root,scanner,lambda:clock[0])
def query(op,request,**fields): return index.query(dict(feature='project-sync-scope',projectRoot=root,viewId='view',requestId=request,op=op,**fields))
def ready(request):
 deadline=time.monotonic()+2
 while time.monotonic()<deadline:
  result=query('read',request)
  if result['status'] in ('ready','unknown'): return result
  time.sleep(.001)
 raise AssertionError('bounded index did not finish')
first=query('refresh','first'); first=ready('first')
assert first['reset'] and len(first['entries'])==2
query('refresh','second',afterGeneration=first['generation'],instanceId=first['instanceId']); second=ready('second')
assert not second['reset'] and {'p':'a','x':True} in second['entries'] and any(row['p']=='b' for row in second['entries'])
assert query('release','first')['released'] is False and ready('second')['status']=='ready'
assert len(calls)==2
query('refresh','second'); assert len(calls)==2 # one request identity is not replayed
query('refresh','unchanged',afterGeneration=second['generation'],instanceId=second['instanceId']); unchanged=ready('unchanged')
assert not unchanged['reset'] and unchanged['entries']==[] and unchanged['generation']>second['generation']
query('refresh','third',afterGeneration=unchanged['generation'],instanceId=unchanged['instanceId']); failed=ready('third')
assert failed['status']=='unknown' and 'permission denied' in failed['error'] and 'entries' not in failed
try: query('read','first'); raise AssertionError('old request accepted')
except ValueError: pass
query('release','third'); assert not index.sessions and not index.snapshots
assert len(calls)==4
try: index.query(dict(feature='other-feature',viewId='v',requestId='r',op='refresh')); raise AssertionError('unscoped access accepted')
except ValueError: pass
try: index.query(dict(feature='project-sync-scope',projectRoot='/different-project',viewId='v',requestId='r',op='refresh')); raise AssertionError('foreign project accepted')
except ValueError: pass
print(json.dumps({'metadataOnly':True,'freshDelta':True,'failureUnknown':True,'viewOnly':True}))
`;
 fs.writeFileSync(file,'import os,sys,json,time,threading,uuid,re,stat,builtins\n'+SYNC_SCOPE_INDEX_PYTHON+'\n'+checks,'utf8');
 const output=spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',file,root],{encoding:'utf8',timeout:10000,windowsHide:true});assert.equal(output.status,0,output.stderr||output.stdout);assert.deepEqual(JSON.parse(output.stdout),{metadataOnly:true,freshDelta:true,failureUnknown:true,viewOnly:true});
});

test('actual Agent POST dispatch keeps view indexing lazy, scoped and separate from control slots',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scope-agent-route-')),file=path.join(root,'probe.py'),runtime=path.join(root,'agent-source.txt');
 fs.writeFileSync(runtime,require('../../src/clusterAgentRuntime.legacy.ts').CLUSTER_AGENT_RUNTIME,'utf8');
 const fixture=String.raw`
source=ast.parse(open(sys.argv[2],encoding='utf-8').read())
serve=next(node for node in source.body if isinstance(node,ast.FunctionDef) and node.name=='serve_http')
handler=next(node for node in serve.body if isinstance(node,ast.ClassDef) and node.name=='Handler')
method=next(node for node in handler.body if isinstance(node,ast.FunctionDef) and node.name=='do_POST')
server=next(node for node in serve.body if isinstance(node,ast.ClassDef) and node.name=='BoundedThreadingHTTPServer')
classify=next(node for node in server.body if isinstance(node,ast.FunctionDef) and node.name=='classify_request')
exec(compile(ast.Module(body=[classify],type_ignores=[]),'route-class','exec'))
assert classify_request(None,'POST','/api/sync-scope/index')=='read'
text="def build(root):\n class Handler:\n"
text+='\n'.join('  '+line for line in ast.unparse(method).splitlines())+'\n return Handler\n'
exec(compile(text,'extracted-post','exec'))
Handler=build(sys.argv[1]); instance=Handler(); instance.path='/api/sync-scope/index'
instance.server=type('State',(),{'sync_scope_index':None,'sync_scope_index_guard':threading.Lock()})()
instance.reject_if_needed=lambda:False
instance.send_json=lambda data,status=200:(data,status)
payload=dict(feature='other',projectRoot=sys.argv[1],viewId='view',requestId='r',op='refresh')
instance.read_request_body=lambda route:json.dumps(payload).encode('utf-8')
value,status=instance.do_POST(); assert status==400 and value['status']=='unknown'
payload['feature']='project-sync-scope'; value,status=instance.do_POST(); assert status==200
payload['op']='read'; deadline=time.monotonic()+3
while value['status'] in ('queued','scanning') and time.monotonic()<deadline:
 time.sleep(.001); value,status=instance.do_POST()
assert value['status']=='ready' and value['reset'] and value['instanceId']
payload['op']='release'; value,status=instance.do_POST(); assert value['released']
print(json.dumps({'realDispatch':True,'scoped':True,'readLane':True}))
`;
 fs.writeFileSync(file,'import os,sys,json,time,threading,uuid,re,stat,ast\nfrom urllib.parse import urlparse\n'+SYNC_SCOPE_INDEX_PYTHON+'\n'+fixture,'utf8');
 const output=spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',file,root,runtime],{encoding:'utf8',timeout:10000,windowsHide:true});assert.equal(output.status,0,output.stderr||output.stdout);assert.deepEqual(JSON.parse(output.stdout),{realDispatch:true,scoped:true,readLane:true});
});
