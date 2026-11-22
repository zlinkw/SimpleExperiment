const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
require('../_helpers/registerTsRequire');
const {callLocalRpc,validateDiscovery,readLocalDiscovery,requestLocalJson}=require('../../src/api/LocalApiClient.ts');
async function fixture(t) {
  const calls = [], state = { contract: { schemaVersion: 1, rpc: 'json-rpc-2.0', methods: ['status'] }, result: { jsonrpc: '2.0', id: 1, result: { ok: true } } };
  const server = http.createServer((req, res) => { calls.push(req.url); assert.equal(req.headers.authorization, 'Bearer fixture');
    if (req.url === '/api/v1/capabilities') res.end(JSON.stringify(state.contract));
    else { req.resume(); res.end(JSON.stringify(state.result)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const discovery = { baseUrl: 'http://127.0.0.1:' + server.address().port, token: 'fixture' };
  return { calls, state, discovery };
}

test('reads live capabilities before each RPC, rejecting unavailable methods and malformed receipts', async t => {
  const f = await fixture(t); const read = () => f.discovery;
  await callLocalRpc(read, 'status', {}); await callLocalRpc(read, 'status', {});
  assert.deepEqual(f.calls, ['/api/v1/capabilities', '/api/v1/rpc', '/api/v1/capabilities', '/api/v1/rpc']);
  await assert.rejects(callLocalRpc(read, 'runPlan', {}), /unavailable/); assert.equal(f.calls.at(-1), '/api/v1/capabilities');
  f.state.result = { jsonrpc: '2.0', id: 2, result: {} }; await assert.rejects(callLocalRpc(read, 'status', {}), /JSON-RPC/);
});

test('changed discovery or mismatched capability version cannot POST', async t => {
  const f = await fixture(t); let reads = 0;
  await assert.rejects(callLocalRpc(() => ({ ...f.discovery, token: ++reads === 1 ? 'fixture' : 'changed' }), 'status', {}), /changed/);
  assert.ok(!f.calls.includes('/api/v1/rpc'));
  await assert.rejects(callLocalRpc(() => ({ ...f.discovery, version: '1.0.0' }), 'status', {}), /mismatched/);
});

test('legacy Windows workflow routes remain usable without a Mac-specific option field', async t => {
  const f = await fixture(t); f.state.contract.methods.push('workflow.run');
  await callLocalRpc(() => f.discovery, 'workflow.run', {}); assert.equal(f.calls.at(-1), '/api/v1/rpc');
  f.state.contract.methodOptions = { 'workflow.run': { workspaceIdentityRechecked: true } };
  await callLocalRpc(() => f.discovery, 'workflow.run', {}); assert.equal(f.calls.at(-1), '/api/v1/rpc');
});

test('loopback/UTF-8/size gates reject external or stopped listeners without leaking secrets', async t => {
  for (const baseUrl of ['https://127.0.0.1:12', 'http://example.com:12', 'http://user:pass@127.0.0.1:12', 'http://127.0.0.1']) assert.throws(() => validateDiscovery({ baseUrl, token: 'fixture' }), /loopback/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpc-discovery-evidence-')), file = path.join(dir, 'api.json');
  fs.writeFileSync(file, Buffer.from([0xff])); assert.throws(() => readLocalDiscovery(file));
  fs.writeFileSync(file, 'fixture-secret-MUSTNOTAPPEAR {', 'utf8');
  assert.throws(() => readLocalDiscovery(file), e => !e.message.includes('MUSTNOTAPPEAR') && /withheld/.test(e.message));
  fs.writeFileSync(file, 'x'.repeat(65537), 'utf8'); assert.throws(() => readLocalDiscovery(file), /discovery/);
  const f = await fixture(t); await assert.rejects(requestLocalJson(f.discovery, '/api/v1/capabilities', undefined, 10), /size/);
  await assert.rejects(callLocalRpc(() => f.discovery, 'status', { value: 'a'.repeat(4 * 1024 * 1024) }), /size/);
});


test('workspace routing cancellation and total deadline refuse partial uniqueness and retain instance records',async()=>{
  const client=require('../../src/api/LocalApiClient.ts'),saved=process.env.SIMPLE_EXPERIMENT_API_FILE;
  for(const mode of ['deadline','cancel']){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'simple-instance-budget-')),workspace=path.join(dir,'workspace'),instances=path.join(dir,'instances'),abort=new AbortController(),requests=[],progress=[];
    fs.mkdirSync(instances);process.env.SIMPLE_EXPERIMENT_API_FILE=path.join(dir,'api.json');
    const server=http.createServer((req,res)=>{
      requests.push(req.url);
      if(req.url.startsWith('/api/v1/capabilities')){
        // Token selects two distinct identities on this fixture listener. The second read intentionally never replies.
        if(req.headers.authorization==='Bearer stalled'){if(mode==='cancel')abort.abort();return;}
        res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',methods:[],name:'SimpleExperiment',version:'1.0.0',instanceId:'1:2026-01-01T00:00:00Z',workspace}));
      }else{assert.fail('routing must not execute any RPC');}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const records=[];
    for(const [index,token]of ['live','stalled'].entries()){
      const file=path.join(instances,index+'.json'),value=JSON.stringify({name:'SimpleExperiment',version:'1.0.0',pid:index+1,startedAt:'2026-01-01T00:00:00Z',instanceId:(index+1)+':2026-01-01T00:00:00Z',baseUrl:'http://127.0.0.1:'+server.address().port,token,workspace,status:'running'});
      fs.writeFileSync(file,value,'utf8');records.push([file,value]);
    }
    try{
      await assert.rejects(client.resolveInstanceByWorkspace('experiment',workspace,undefined,{signal:abort.signal,timeoutMs:mode==='deadline'?1000:30000,processMayExist:()=>true,onProgress:message=>progress.push(message)}),mode==='deadline'?/总等待上限.*无法确认唯一/:/已取消.*未执行命令/);
      assert.equal(requests.length,2);assert.ok(progress.some(message=>message.includes('当前可达 1')));
      for(const [file,value]of records)assert.equal(fs.readFileSync(file,'utf8'),value);
    }finally{
      server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
      if(saved===undefined)delete process.env.SIMPLE_EXPERIMENT_API_FILE;else process.env.SIMPLE_EXPERIMENT_API_FILE=saved;
      console.log('[fixtures retained, no cleanup] '+dir);
    }
  }
});

test('instance handshake budget refuses incomplete uniqueness before probing and permits an exact record',async t=>{
 const client=require('../../src/api/LocalApiClient.ts'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g004-instance-budget-'));
 const workspace=path.join(dir,'workspace'),instances=path.join(dir,'instances'),discovery=path.join(dir,'api.json'),prior=process.env.SIMPLE_EXPERIMENT_API_FILE;fs.mkdirSync(instances);
 process.env.SIMPLE_EXPERIMENT_API_FILE=discovery;t.after(()=>{if(prior===undefined)delete process.env.SIMPLE_EXPERIMENT_API_FILE;else process.env.SIMPLE_EXPERIMENT_API_FILE=prior});
 let calls=0;const startedAt='2026-01-01T00:00:00.000Z',server=http.createServer((req,res)=>{calls++;assert.equal(req.url,'/api/v1/capabilities');res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',methods:[],name:'SimpleExperiment',version:'1.0.0',instanceId:`1:${startedAt}`,workspace}))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve))});
 const record={name:'SimpleExperiment',version:'1.0.0',pid:1,startedAt,workspace,token:'fixture',baseUrl:`http://127.0.0.1:${server.address().port}`};
 for(let i=0;i<17;i++)fs.writeFileSync(path.join(instances,`${i}.json`),JSON.stringify(record),'utf8');
 assert.equal(client.listPluginInstances('experiment').truncated,false);
 await assert.rejects(client.resolveInstanceByWorkspace('experiment',workspace,undefined,{processMayExist:()=>true}),/未完整核验|握手预算/);assert.equal(calls,0);
 const file=path.join(instances,'0.json'),result=await client.preflightPluginAt('experiment',file,workspace);assert.equal(result.instanceId,`1:${startedAt}`);assert.equal(calls,1);
 assert.equal(fs.readdirSync(instances).length,17);
});
