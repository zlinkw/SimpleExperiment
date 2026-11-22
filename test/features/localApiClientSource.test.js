const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
require('../_helpers/registerTsRequire');
const client=require('../../src/api/LocalApiClient.ts');
const {CliError,asCliError}=require('../../src/api/LocalApiErrors.ts');

test('neutral discovery uses the SFTP override or canonical plugin path',()=>{
  const path=require('node:path'),os=require('node:os');
  const original=process.env.SIMPLE_SFTP_API_FILE;
  try{
    process.env.SIMPLE_SFTP_API_FILE=path.join(os.tmpdir(),'fixture-sftp-api.json');
    assert.equal(client.pluginDiscoveryPath('sftp'),process.env.SIMPLE_SFTP_API_FILE);
    delete process.env.SIMPLE_SFTP_API_FILE;
    assert.equal(client.pluginDiscoveryPath('sftp'),path.join(process.env.APPDATA||path.join(os.homedir(),'AppData','Roaming'),'SimpleSFTP','api.json'));
  }finally{
    if(original===undefined)delete process.env.SIMPLE_SFTP_API_FILE;
    else process.env.SIMPLE_SFTP_API_FILE=original;
  }
});

test('neutral client preserves live capability checks and error identity',async t=>{
  const calls=[],server=http.createServer((req,res)=>{calls.push(req.url);req.resume();
    if(req.url==='/api/v1/capabilities')res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',methods:['status']}));
    else res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:{ok:true}}));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve))});
  const discovery={baseUrl:'http://127.0.0.1:'+server.address().port,token:'synthetic'};
  await client.callLocalRpc(()=>discovery,'status',{});assert.deepEqual(calls,['/api/v1/capabilities','/api/v1/rpc']);
  await assert.rejects(client.callLocalRpc(()=>discovery,'missing',{}),/unavailable/);
  assert.equal(calls.filter(x=>x==='/api/v1/rpc').length,1);
  let reads=0;await assert.rejects(client.callLocalRpc(()=>({...discovery,token:++reads===1?'synthetic':'changed'}),'status',{}),/changed/);
  assert.equal(calls.filter(x=>x==='/api/v1/rpc').length,1);
  const failure=new CliError(2,'ENV','synthetic');assert.equal(asCliError(failure),failure);
  assert.throws(()=>client.validateDiscovery({baseUrl:'http://example.invalid:1',token:'synthetic'}),/loopback/);
});

test('neutral plugin transport binds slot, instance and workspace before each RPC',async t=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-client-'));
  const file=path.join(root,'api.json'),workspace=path.join(root,'workspace'),startedAt='2026-01-01T00:00:00.000Z';
  const token='fixture-secret',pid=4321,calls=[];
  let caps={schemaVersion:1,name:'SimpleExperiment',version:'1.0.0',rpc:'json-rpc-2.0',instanceId:`${pid}:${startedAt}`,workspace,methods:['status']};
  let changeOnCapabilities=false;
  const server=http.createServer((req,res)=>{
    calls.push(req.url);assert.equal(req.headers.authorization,`Bearer ${token}`);
    if(req.url==='/api/v1/capabilities'){
      if(changeOnCapabilities){const record=JSON.parse(fs.readFileSync(file,'utf8'));record.token='rotated';fs.writeFileSync(file,JSON.stringify(record),'utf8')}
      res.end(JSON.stringify(caps));return;
    }
    req.resume();res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:{ok:true}}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve))});
  const discovery={name:'SimpleExperiment',version:'1.0.0',pid,startedAt,workspace,token,baseUrl:`http://127.0.0.1:${server.address().port}`};
  const write=row=>fs.writeFileSync(file,JSON.stringify(row),'utf8');write(discovery);
  const target={discoveryPath:file,workspace};
  assert.deepEqual(await client.callPluginRpc('experiment','status',{},undefined,target),{ok:true});
  assert.equal(calls.filter(url=>url==='/api/v1/rpc').length,1);
  const bads=[
    [{...caps,instanceId:'9999:'+startedAt},/identity mismatch/i],
    [{...caps,instanceId:undefined},/instanceId/],
    [{...caps,name:'SimpleSFTP'},/slot mismatch/i],
    [{...caps,version:'2.0.0'},/version mismatch/i],
    [{...caps,workspace:path.join(root,'other')},/工作区/],
  ];
  for(const [candidate,reason] of bads){caps=candidate;await assert.rejects(client.callPluginRpc('experiment','status',{},undefined,target),error=>{
    assert.match(error.message,reason);assert.ok(!String(error.stack).includes(token));return true;
  })}
  caps={schemaVersion:1,name:'SimpleExperiment',version:'1.0.0',rpc:'json-rpc-2.0',instanceId:`${pid}:${startedAt}`,workspace,methods:['status']};
  await assert.rejects(client.callPluginRpc('sftp','status',{},undefined,target),/slot mismatch/i);
  assert.equal(calls.filter(url=>url==='/api/v1/rpc').length,1);
  write({...discovery,name:'SimpleSFTP'});
  await assert.rejects(client.callPluginRpc('sftp','status',{},undefined,target),/slot mismatch/i);
  assert.equal(calls.filter(url=>url==='/api/v1/rpc').length,1);
  write(discovery);
  await assert.rejects(client.callPluginRpc('experiment','status',{},'different',target),/pin mismatch/i);
  await assert.rejects(client.callPluginRpc('experiment','missing',{},undefined,target),/unavailable/i);
  write({...discovery,pid:0});await assert.rejects(client.callPluginRpc('experiment','status',{},undefined,target),/pid/);
  write({...discovery,name:undefined});await assert.rejects(client.callPluginRpc('experiment','status',{},undefined,target),/plugin name/);
  write({...discovery,status:'stopped'});await assert.rejects(client.callPluginRpc('experiment','status',{},undefined,target),/running loopback/);
  write(discovery);changeOnCapabilities=true;
  await assert.rejects(client.callPluginRpc('experiment','status',{},undefined,target),/discovery changed during preflight/i);
  assert.equal(calls.filter(url=>url==='/api/v1/rpc').length,1);
});
