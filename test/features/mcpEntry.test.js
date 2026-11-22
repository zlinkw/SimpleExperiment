const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {installMcpShim}=require('../../scripts/install-mcp-shim');

test('published and installed entry is the independent MCP launcher',()=>{
 const root=path.join(__dirname,'../..'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
 assert.deepEqual(pkg.bin,{'simpleex-mcp':'./bin/mcp-launch.cjs'});
 assert.deepEqual(lock.packages[''].bin,{'simpleex-mcp':'bin/mcp-launch.cjs'});
 const installer=fs.readFileSync(path.join(root,'scripts/install-latest.js'),'utf8');
 assert.match(installer,/installMcpShim/);assert.doesNotMatch(installer,/installCliShim/);
 const ignores=fs.readFileSync(path.join(root,'.vscodeignore'),'utf8');
 for(const name of ['dist/cli.js','dist/cli.legacy.js','dist/runCli.js','dist/cli/**','dist/features/ExperimentRunner.js','bin/simpleex.cjs','bin/simpleex-mcp.cjs'])assert.ok(ignores.split(/\r?\n/).includes(name),name);
 for(const file of ['scripts/verify-vsix-runtime.js','scripts/write-panel-build-manifest.js']){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const entry of ['dist/mcp/server.cjs','dist/api/LocalApiClient.js'])assert.ok(source.includes(entry),file+' '+entry);
 }
});

test('MCP installation writes only its own entries and preserves unrelated CLI files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-shim-')),old=path.join(dir,'simpleex.cmd');fs.writeFileSync(old,'user content','utf8');
 const first=installMcpShim(dir);assert.deepEqual([...first.files].sort(),['simpleex-mcp','simpleex-mcp.cmd','simpleex-mcp.ps1','simpleex-mcp-launcher.cjs','simpleex-mcp-resolver.cjs'].sort());
 assert.equal(fs.readFileSync(old,'utf8'),'user content');assert.deepEqual(installMcpShim(dir).files,first.files);
 const blocked=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-conflict-'));fs.writeFileSync(path.join(blocked,'simpleex-mcp.cmd'),'foreign','utf8');
 assert.throws(()=>installMcpShim(blocked),/unrelated/);assert.equal(fs.existsSync(path.join(blocked,'simpleex-mcp-launcher.cjs')),false);
});

test('MCP launcher passes workspace through and propagates child exit',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../bin/mcp-launch.cjs'),'utf8'),events={},listeners={},argv=['--workspace','C:/synthetic'];let spawned;
 const fakeProcess={argv:['node','launcher',...argv],execPath:'node',env:{},stderr:{write:()=>{}},once:(event,fn)=>{listeners[event]=fn},removeListener:(event)=>{delete listeners[event]}};
 const fakeRequire=name=>name==='node:child_process'?{spawn:(command,args,options)=>{spawned={command,args,options};return {on:(event,fn)=>{events[event]=fn}}}}:
   {resolveMcp:async options=>{assert.deepEqual(Array.from(options.argv),argv);return 'selected/mcp/server.cjs'}};
 const module={exports:{}};vm.runInNewContext(source,{module,exports:module.exports,require:fakeRequire,process:fakeProcess,AbortController});
 await module.exports.main();assert.deepEqual(Array.from(spawned.args),['selected/mcp/server.cjs',...argv]);assert.equal(spawned.options.windowsHide,true);assert.equal(spawned.options.env,undefined);
 events.close(7);assert.equal(fakeProcess.exitCode,7);assert.deepEqual(Object.keys(listeners),[]);
});
