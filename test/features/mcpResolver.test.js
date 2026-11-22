const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {resolveMcp}=require('../../bin/simpleex-mcp-resolver.cjs');

test('MCP resolver selects the live Host version without requiring a CLI entry',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-resolver-')),workspace=path.join(root,'project');
  function add(version,suffix=''){
    const dir=path.join(root,'simple-local.simple-experiment-'+version+suffix);fs.mkdirSync(path.join(dir,'dist','mcp'),{recursive:true});
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version}),'utf8');
    const file=path.join(dir,'dist','mcp','server.cjs');fs.writeFileSync(file,'fixture','utf8');return file;
  }
  const old=add('1.0.0'),latest=add('2.0.0');let version='1.0.0',pinSeen,requested;
  let changed=false;const helper={resolveInstanceByWorkspace:async(_plugin,rootArg,pin)=>{requested=[rootArg,pin];return {discoveryPath:'fixture'}},
    preflightPluginAt:async(_plugin,file,rootArg)=>{assert.equal(file,'fixture');assert.equal(rootArg,workspace);return {discovery:{version},capabilities:{version}}},
    readLocalDiscovery:()=>({version:changed?'changed':version}),
    assertInstancePin:(pin)=>{pinSeen=pin}};
  const opts={extensionsRoot:root,argv:['--workspace',workspace],helper};
  assert.equal(await resolveMcp(opts),old);assert.deepEqual(requested,[workspace,undefined]);assert.equal(pinSeen,undefined);
  changed=true;await assert.rejects(resolveMcp(opts),/Discovery changed/);changed=false;
  version='2.0.0';assert.equal(await resolveMcp({...opts,argv:['--workspace',workspace,'--instance','pid:time']}),latest);assert.equal(pinSeen,'pid:time');
  version='3.0.0';await assert.rejects(resolveMcp(opts),/matching the running plugin/);
  await assert.rejects(resolveMcp({...opts,argv:[]}),/MCP_WORKSPACE_REQUIRED/);
  const controller=new AbortController();controller.abort(Error('cancelled'));await assert.rejects(resolveMcp({...opts,signal:controller.signal}),/cancelled/);
  const missing=path.join(root,'simple-local.simple-experiment-3.0.0');fs.mkdirSync(missing);fs.writeFileSync(path.join(missing,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version:'3.0.0'}),'utf8');
  await assert.rejects(resolveMcp(opts),/ENOENT/);version='2.0.0';
  add('3.0.0','-duplicate');await assert.rejects(resolveMcp(opts),/exactly one newest/);
});
