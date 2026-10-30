const {assert,fs,http,os,path,test,runCli}=require("./simpleCli.support.cjs");
test("long host operations are not silently cut off while status queries remain bounded",()=>{const {rpcTimeoutMs}=require("../../dist/cli/LocalApiClient");for(const method of ["plan.validate","workflow.plan","invoke","agents.lifecycle","project.prepare","server.testAll","results.list","tasks.dispatch"])assert.equal(rpcTimeoutMs("experiment",method),0);assert.equal(rpcTimeoutMs("experiment","state.get"),15000);});
const base=fs.mkdtempSync(path.join(os.tmpdir(),"simple-cli-control-"));
console.log("retained fixtures: "+base);
test('result collection and dispatch wait for the original real receipt without an RPC cutoff or resend',async()=>{
 const {EventEmitter}=require('node:events'),transport=require('../../dist/cli/LocalApiClient');
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
async function fixture(){
 const state={calls:[],caps:0};const methods=["config.list","config.get","config.set","config.reset","state","state.list","state.get","state.set","state.reset","flow.get","flow.update","tmux.list","tmux.capture","gpu.history","panel.diagnostics","server.testAll","plans.filter","plan.validate"];
 const server=http.createServer((req,res)=>{
  if(req.url==="/api/v1/capabilities"){state.caps++;res.end(JSON.stringify({schemaVersion:1,name:"SimpleExperiment",version:"1.0.0",workspace:base,instanceId:"11:2026-01-01T00:00:00Z",rpc:"json-rpc-2.0",methods}));return;}
  let body="";req.on("data",b=>body+=b);req.on("end",()=>{const r=JSON.parse(body);state.calls.push(r);
   const mut=/^(config|state)\.(set|reset)$/.test(r.method);
   res.end(JSON.stringify({jsonrpc:"2.0",id:r.id,...(mut&&!r.params.confirm?{error:{code:2001,message:"CONFIRM_REQUIRED",data:{key:r.params.key,requires:["confirm"]}}}:{result:{ok:r.method!=="plan.validate",method:r.method,params:r.params,missing:r.method==="plan.validate"?[{reason:"Worker unavailable"}]:[]}})}));
  });
 });await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const file=path.join(base,"api-"+server.address().port+".json"),record={schemaVersion:1,name:"SimpleExperiment",version:"1.0.0",workspace:base,pid:11,startedAt:"2026-01-01T00:00:00Z",token:"fixture-token",baseUrl:"http://127.0.0.1:"+server.address().port};
 fs.writeFileSync(file,JSON.stringify(record),"utf8");fs.mkdirSync(path.join(base,'instances'),{recursive:true});fs.writeFileSync(path.join(base,'instances',path.basename(file)),JSON.stringify(record),'utf8');
 return {state,env:{cwd:base,env:{SIMPLE_EXPERIMENT_API_FILE:file,SIMPLE_EXPERIMENT_PROJECT_ROOT:undefined}},close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
test("named control methods preserve parameters, confirmation and in-band failure",async()=>{
 const f=await fixture();try{
  const cases=[
   [["config","get","simpleExperiment.test"],"config.get",{key:"simpleExperiment.test"},0],
   [["config","set","simpleExperiment.test","--value",'{"a":[1]}',"--scope","workspace","--confirm"],"config.set",{key:"simpleExperiment.test",value:{a:[1]},scope:"workspace",confirm:true},0],
   [["state","reset","selection","--confirm"],"state.reset",{key:"selection",confirm:true},0],
   [["state","snapshot"],"state",{},0],
   [["tmux","capture","window:3","--worker","worker-a"],"tmux.capture",{workerId:"worker-a",window:"window:3"},0],
   [["gpu","history"],"gpu.history",{},0],
   [["panel","diagnostics"],"panel.diagnostics",{},0],
   [["plan","validate","experiments/plans/a.yaml","--workspace",base],"plan.validate",{planFile:"experiments/plans/a.yaml",workspace:base},3],
  ];
  for(const [args,method,params,code] of cases){const r=await runCli([...args,"--json"],f.env);assert.equal(r.code,code,r.stdout+r.stderr);const p=JSON.parse(r.stdout);assert.equal(p.method,method);assert.deepEqual(p.params,params);}
  const refused=await runCli(["config","reset","simpleExperiment.test","--json"],f.env);assert.equal(refused.code,2);assert.deepEqual(JSON.parse(refused.stdout).error.detail.requires,["confirm"]);
 }finally{await f.close();}
});
test("invalid controls and unsupported pause are zero-API in an unrelated directory",async()=>{
 const f=await fixture();try{
  const flow=path.join(base,"flow.json");fs.writeFileSync(flow,JSON.stringify({step:"connect",completed:true,blocked:true}),"utf8");
  for(const args of [["experiment","pause","absent"],["tmux","capture","x"],["config","set","key"],["flow","update","--file",flow],["plan","validate"]]){
   const r=await runCli([...args,"--json"],f.env);assert.ok([1,3].includes(r.code),r.stdout+r.stderr);JSON.parse(r.stdout);
  }assert.equal(f.state.caps,0);assert.equal(f.state.calls.length,0);
 }finally{await f.close();}
});
