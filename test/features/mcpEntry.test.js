const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {installMcpShim}=require('../../scripts/install-mcp-shim');

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
