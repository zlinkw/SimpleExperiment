const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
test('legacy service migration uses a frozen proof and exact owned PID, preserving commands, history and platform',()=>{
 const fixture=path.join(__dirname,'agentLegacyMigration.fixture.py');
 const mounted=fixture.replace(/\\/g,'/').replace(/^([A-Za-z]):/,(_,d)=>'/mnt/'+d.toLowerCase());
 const proc=spawnSync(process.platform==='win32'?'wsl.exe':'python3',process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','/usr/bin/python3','-B',mounted]:['-B',fixture],{encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(proc.status,0,proc.stderr||proc.stdout||String(proc.error));
 assert.ok(Object.values(JSON.parse(proc.stdout.trim())).every(value=>value===true));
});
