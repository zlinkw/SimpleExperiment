const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
require('../_helpers/registerTsRequire');
const client=require('../../src/api/LocalApiClient.ts');
const {CliError,asCliError}=require('../../src/api/LocalApiErrors.ts');

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
