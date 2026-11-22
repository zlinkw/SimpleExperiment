const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
require('../_helpers/registerTsRequire');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'g004-transport-'));
const TOKEN='fixture',PID=4321,STARTED_AT='2026-01-01T00:00:00.000Z';
function fixtureDir(name){const dir=path.join(base,name);fs.mkdirSync(dir,{recursive:true});return dir}

test("long host operations are not silently cut off while status queries remain bounded",()=>{const {rpcTimeoutMs}=require("../../src/api/LocalApiClient.ts");for(const method of ["plan.validate","workflow.plan","invoke","agents.lifecycle","project.prepare","server.testAll","results.list","tasks.dispatch"])assert.equal(rpcTimeoutMs("experiment",method),0);assert.equal(rpcTimeoutMs("experiment","state.get"),15000);});

test('result collection and dispatch wait for the original real receipt without an RPC cutoff or resend',async()=>{
 const {EventEmitter}=require('node:events'),transport=require('../../src/api/LocalApiClient.ts');
 const file=path.join(base,'long-host-api.json'),oldFile=process.env.SIMPLE_EXPERIMENT_API_FILE,oldRequest=http.request,oldTimeout=global.setTimeout;
 fs.writeFileSync(file,JSON.stringify({name:'SimpleExperiment',version:'1.0.0',baseUrl:'http://127.0.0.1:19111',token:'fixture',pid:11,startedAt:'2026-01-01T00:00:00Z'}),'utf8');
 process.env.SIMPLE_EXPERIMENT_API_FILE=file;
 const caps={schemaVersion:1,name:'SimpleExperiment',version:'1.0.0',instanceId:'11:2026-01-01T00:00:00Z',rpc:'json-rpc-2.0',methods:['results.list','tasks.dispatch']};
 let scheduled=[],calls=0,finish,entered;const timerHandles=[];
 http.request=(options,receive)=>{
  const req=new EventEmitter();req.destroy=()=>req.emit('close');
  req.end=body=>{const res=new EventEmitter();res.statusCode=200;res.destroy=()=>{};receive(res);
   const reply=value=>{res.emit('data',Buffer.from(JSON.stringify(value)));res.emit('end');req.emit('close');};
   if(options.path==='/api/v1/capabilities')process.nextTick(()=>reply(caps));
   else{calls++;const rpc=JSON.parse(body.toString('utf8'));finish=()=>reply({jsonrpc:'2.0',id:rpc.id,result:{status:'submitted',commandId:'exact-'+rpc.method}});entered();}
  };return req;
 };
 global.setTimeout=(fn,ms)=>{scheduled.push(ms);const handle=oldTimeout(()=>{},0);timerHandles.push(handle);return handle;};
 try{for(const method of ['results.list','tasks.dispatch']){
  scheduled=[];const ready=new Promise(resolve=>entered=resolve),prior=calls;
  const pending=transport.callPluginRpc('experiment',method,{workflowId:'p',indices:[0],confirm:true});await ready;
  assert.deepEqual(scheduled,[10000],'identity handshake stays bounded; host operation owns its completion');
  assert.equal(calls,prior+1);finish();const result=await pending;
  assert.equal(result.commandId,'exact-'+method);assert.equal(calls,prior+1);
 }}finally{http.request=oldRequest;global.setTimeout=oldTimeout;for(const timer of timerHandles)clearTimeout(timer);if(oldFile===undefined)delete process.env.SIMPLE_EXPERIMENT_API_FILE;else process.env.SIMPLE_EXPERIMENT_API_FILE=oldFile;}
});

test("callPluginRpc bounds control calls and keeps proven long file operations unbounded, never auto-retrying", async () => {
  const { EventEmitter } = require("node:events");
  const httpModule = require("node:http");
  const transport = require("../../src/api/LocalApiClient.ts");
  const dir = fixtureDir("timers");
  const file = path.join(dir, "api.json");
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, name: "SimpleSFTP", version: "0.2.107", baseUrl: "http://127.0.0.1:19766", host: "127.0.0.1", port: 19766, token: TOKEN, pid: PID, startedAt: STARTED_AT }), "utf8");
  process.env.SIMPLE_SFTP_API_FILE = file;
  const caps = { schemaVersion: 1, name: "SimpleSFTP", version: "0.2.107", instanceId: `${PID}:${STARTED_AT}`, rpc: "json-rpc-2.0", methods: ["status", "sync.projectInventory"] };
  const seen = [];
  const timers = [];
  const originalRequest = httpModule.request;
  const originalSetTimeout = global.setTimeout;
  let hangRpc = false;
  httpModule.request = (options, receive) => {
    seen.push(options.path);
    const req = new EventEmitter();
    req.destroy = () => { req.destroyed = true; };
    req.end = () => {
      if (options.path === "/api/v1/capabilities") {
        const res = new EventEmitter();
        res.statusCode = 200; res.destroy = () => {};
        receive(res);
        process.nextTick(() => { res.emit("data", Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, ...caps }))); res.emit("end"); });
        return;
      }
      const res = new EventEmitter();
      res.statusCode = 200; res.destroy = () => {};
      receive(res);
      if (!hangRpc) process.nextTick(() => { res.emit("data", Buffer.from('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}')); res.emit("end"); });
    };
    return req;
  };
  global.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return originalSetTimeout(() => {}, 0); };
  try {
    await transport.callPluginRpc("sftp", "status", {});
    assert.deepEqual(timers.map((t) => t.ms), [10000, 15000], "capabilities 10s + bounded control RPC 15s");

    timers.length = 0;
    await transport.callPluginRpc("sftp", "sync.projectInventory", {});
    assert.deepEqual(timers.map((t) => t.ms), [10000], "proven long file operation runs with no RPC timer");

    timers.length = 0; seen.length = 0; hangRpc = true;
    let message = "";
    // The hung RPC must not be awaited before firing its timer: start it, wait until the
    // 15s timer is scheduled, fire it manually, then settle.
    const pending = transport.callPluginRpc("sftp", "status", {}).catch((error) => { message = error.message; });
    for (let i = 0; i < 400 && !timers.some((t) => t.ms === 15000); i += 1) {
      await new Promise((resolve) => originalSetTimeout(resolve, 5));
    }
    const rpcTimer = timers.find((t) => t.ms === 15000);
    assert.ok(rpcTimer, "bounded control call must schedule a timer");
    rpcTimer.fn(); // fire the timeout exactly once
    await pending;
    await new Promise((resolve) => originalSetTimeout(resolve, 30)); // let any (forbidden) resend settle
    assert.match(message, /timed out/);
    assert.match(message, /outcome is unknown/);
    assert.equal(seen.filter((p) => p === "/api/v1/rpc").length, 1, "a timed-out write must never be auto-resent");
  } finally {
    httpModule.request = originalRequest;
    global.setTimeout = originalSetTimeout;
    delete process.env.SIMPLE_SFTP_API_FILE;
  }
});
