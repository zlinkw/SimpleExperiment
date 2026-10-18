const assert = require("node:assert/strict");
const test = require("node:test");
require("../_helpers/registerTsRequire");
const { MultiEndpointRealtimeClient } = require("../../src/tunnel/MultiEndpointRealtimeClient.ts");
const { RealtimeTunnelClient, defaultRealtimeRefreshPolicy } = require("../../src/tunnel/RealtimeTunnelClient.ts");
const { RequestBudget, defaultRequestBudgetConfig } = require("../../src/tunnel/RequestBudget.ts");

const budget = () => new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {} });

test("a slow GPU server cannot delay dispatch to a ready server; its late fresh read is consumed on the next tick", async()=>{
  const client=new MultiEndpointRealtimeClient(['fast','slow'].map((id,index)=>({id,role:'worker',localHost:'localhost',localPort:23000+index})),budget,defaultRealtimeRefreshPolicy);
  let release,slowReads=0,fastReads=0,timer;
  const blocked=new Promise(resolve=>release=resolve);
  client.clients.get('slow').getGpu=async()=>{slowReads++;await blocked;return gpu(1,'late-live')};
  client.clients.get('fast').getGpu=async()=>gpu(1,'fast-'+(++fastReads));
  const pending=client.getGpu({dispatch:true});
  try{
    const first=await Promise.race([pending,new Promise(resolve=>timer=setTimeout(()=>resolve(undefined),1000))]);
    assert.equal(first?.fast?.length,1,'ready GPU must be usable while another endpoint is still pending');
    assert.equal(first.slow,undefined,'unfinished queries never borrow historical GPU rows');
    release();await new Promise(setImmediate);
    const second=await client.getGpu({dispatch:true});assert.equal(second.slow[0].name,'late-live');assert.equal(slowReads,1,'a late current read is not discarded and restarted before use');
    assert.equal(second.fast[0].name,'fast-2','consumed results are sampled anew');
    await client.getGpu({dispatch:true});assert.equal(slowReads,2);
  }finally{clearTimeout(timer);release();await pending;await client.disconnect()}
});

test("an expired or disconnected late GPU response cannot authorize dispatch",async()=>{
  for(const changed of ['age','connection']){
    const endpoint={id:'slow',role:'worker',localHost:'localhost',localPort:23002},client=new MultiEndpointRealtimeClient([endpoint],budget,defaultRealtimeRefreshPolicy);
    let release,calls=0;const gate=new Promise(resolve=>release=resolve),worker=client.clients.get('slow');
    worker.getGpu=async()=>{if(++calls===1){await gate;return gpu(1,'old')}return gpu(1,'fresh')};
    try{assert.deepEqual(await client.getGpu({dispatch:true}),{});release();await new Promise(setImmediate);
      if(changed==='age')client.dispatchGpuReads.get('slow').settledAt=Date.now()-1001;
      else await worker.disconnect('generation changed');
      assert.equal((await client.getGpu({dispatch:true})).slow[0].name,'fresh');assert.equal(calls,2);
    }finally{release();await client.disconnect()}
  }
});
const policy = { ...defaultRealtimeRefreshPolicy, preferWebSocket: false, fallbackToSse: false, snapshotFallbackIntervalSeconds: 60 };
const gpu = (count, name = "current") => ({ generatedAt: new Date().toISOString(), status: "ok", gpus: Array.from({ length: count }, (_, index) => ({ index, name })) });
const event = (seq, type, payload = {}, generatedAt = new Date().toISOString()) => ({ schemaVersion: 1, seq, type, source: "worker_telemetry", generatedAt, payload });

test('Worker GPU bootstrap never waits for task/result queries', async () => {
  const client=new RealtimeTunnelClient({id:'w',role:'worker',localHost:'localhost',localPort:1},budget(),policy);
  let taskReads=0;
  client.http.getGpu=async()=>gpu(3);
  client.http.getWorkerTasks=async()=>{taskReads++;throw Error('history read must not run');};
  try { await client.getSnapshot(); assert.equal(taskReads,0);assert.equal(client.currentState().gpu.w.length,3); }
  finally {await client.disconnect();}
});

async function fixture(fn) {
  const requested = [];
  let payload = gpu(4);
  let taskFailure = false;
  let gpuFailurePort = "";
  let useSse = false;
  let sseController;
  const previousFetch = global.fetch;
  global.fetch = async (url, options) => {
    const parsed = new URL(url), route = parsed.pathname;
    requested.push(route);
    if (route === "/api/events/sse" && useSse) {
      const stream = new ReadableStream({ start(controller) {
        sseController = controller;
        controller.enqueue(new TextEncoder().encode("data: " + JSON.stringify(event(1, "agent_heartbeat")) + "\n\n"));
        options.signal.addEventListener("abort", () => controller.close(), { once: true });
      } });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
    }
    if (route === "/api/gpu" && parsed.port === gpuFailurePort) return new Response("GPU read failed", { status: 500 });
    const body = route === "/api/gpu" ? payload : route === "/api/worker/tasks" && !taskFailure
      ? { tasks: [{ commandId: "running-1", status: "running" }] } : undefined;
    return new Response(JSON.stringify(body || { error: "worker telemetry does not expose hub control api" }),
      { status: body ? 200 : 404, headers: { "Content-Type": "application/json" } });
  };
  const endpoint = { id: "nwpu3", role: "worker", localHost: "localhost", localPort: 12345 };
  try { await fn({ endpoint, requested, setGpu: value => { payload = value; }, failTasks: () => { taskFailure = true; },
    enableSse: () => { useSse = true; }, failGpu: port => { gpuFailurePort = String(port); },
    pushEvent: value => sseController.enqueue(new TextEncoder().encode("data: " + JSON.stringify(value) + "\n\n")) }); }
  finally { global.fetch = previousFetch; }
}

test("SSE bootstrap obtains the current GPU snapshot even when replay contains only a heartbeat", async () => {
  await fixture(async ({ endpoint, requested, enableSse }) => {
    enableSse();
    const client = new RealtimeTunnelClient(endpoint, budget(), { ...policy, fallbackToSse: true });
    try {
      await client.connect();
      assert.equal(client.currentState().gpu.nwpu3?.length, 4);
      assert.equal(client.diagnostics().streamStatus, "sse");
      assert.ok(!requested.includes("/api/snapshot"));
    } finally { await client.disconnect(); }
  });
});

test("one failed Worker refresh preserves other servers and its own last successful sample", async () => {
  await fixture(async ({ endpoint, failGpu, setGpu }) => {
    const client = new MultiEndpointRealtimeClient([endpoint, { ...endpoint, id: "nwpu2", localPort: endpoint.localPort + 1 }], budget, policy);
    try {
      await client.getGpu();
      failGpu(endpoint.localPort);
      setGpu(gpu(3, "other-new"));
      await client.getGpu();
      client.clients.get("nwpu2").acceptEvent(event(1, "agent_heartbeat"));
      assert.equal(client.currentState().gpu.nwpu3.length, 4);
      assert.equal(client.currentState().gpu.nwpu2.length, 3);
      assert.equal(client.currentState().gpu.nwpu2[0].name, "other-new");
    } finally { await client.disconnect(); }
  });
});

test("an empty degraded snapshot reports the sampler reason and a later successful refresh recovers", async () => {
  await fixture(async ({ endpoint, setGpu }) => {
    const client = new RealtimeTunnelClient(endpoint, budget(), policy);
    try {
      setGpu({ ...gpu(0), status: "degraded", error: "GPU query timed out" });
      await client.getGpu();
      assert.deepEqual(client.currentState().gpu.nwpu3, []);
      assert.equal(client.currentState().workerHealth.nwpu3.lastError, "GPU query timed out");
      setGpu(gpu(4));
      await client.getGpu();
      assert.equal(client.currentState().gpu.nwpu3.length, 4);
      assert.equal(client.currentState().workerHealth.nwpu3.lastError, "");
    } finally { await client.disconnect(); }
  });
});

test("Worker polling bootstraps all GPU rows without requesting the Hub snapshot API", async () => {
  await fixture(async ({ endpoint, requested }) => {
    const client = new RealtimeTunnelClient(endpoint, budget(), policy);
    try {
      await client.connect();
      assert.equal(client.currentState().gpu.nwpu3?.length, 4);
      assert.equal(client.currentState().workerTasks.nwpu3, undefined, 'Host owns the shared current task query');
      assert.ok(!requested.includes('/api/worker/tasks'), 'GPU bootstrap cannot start a hidden full result scan');
      assert.ok(requested.includes("/api/gpu"));
      assert.ok(!requested.includes("/api/snapshot"));
      assert.equal(client.diagnostics().lastError, undefined);
    } finally { await client.disconnect(); }
  });
});

test("manual GPU refresh survives the next heartbeat and another Worker update", async () => {
  await fixture(async ({ endpoint }) => {
    const other = { ...endpoint, id: "nwpu2" };
    const client = new MultiEndpointRealtimeClient([endpoint, other], budget, policy);
    try {
      await client.getGpu();
      assert.equal(client.currentState().gpu.nwpu3?.length, 4);
      const direct = client.clients.get("nwpu3");
      direct.acceptEvent(event(1, "agent_heartbeat"));
      client.clients.get("nwpu2").acceptEvent(event(2, "gpu_snapshot", { gpus: [{ index: 0, name: "other" }] }));
      assert.equal(client.currentState().gpu.nwpu3?.length, 4, "refresh must update the endpoint source used by subsequent merges");
      assert.equal(client.currentState().gpu.nwpu2?.[0].name, "other");
    } finally { await client.disconnect(); }
  });
});

test("Worker GPU snapshot remains available when the task endpoint fails", async () => {
  await fixture(async ({ endpoint, failTasks }) => {
    failTasks();
    const client = new RealtimeTunnelClient(endpoint, budget(), policy);
    try {
      await client.getSnapshot();
      assert.equal(client.currentState().gpu.nwpu3?.length, 4);
    } finally { await client.disconnect(); }
  });
});

test("old replayed GPU events cannot replace a newer HTTP sample, while newer events can", async () => {
  await fixture(async ({ endpoint, setGpu }) => {
    setGpu({ ...gpu(4), generatedAt: "2026-10-10T04:30:00Z" });
    const client = new RealtimeTunnelClient(endpoint, budget(), policy);
    try {
      await client.getGpu();
      client.acceptEvent(event(1, "gpu_snapshot", { gpus: [] }, "2026-10-10T04:29:00Z"));
      assert.equal(client.currentState().gpu.nwpu3?.length, 4);
      assert.equal(client.currentState().lastSeq, 1, "old replay still advances the journal cursor");
      client.acceptEvent(event(2, "gpu_snapshot", { gpus: [{ index: 0, name: "newer" }] }, "2026-10-10T04:31:00Z"));
      assert.equal(client.currentState().gpu.nwpu3?.[0].name, "newer");
    } finally { await client.disconnect(); }
  });
});

test("a late GPU response from a disconnected generation does not mutate current state", async () => {
  const client = new RealtimeTunnelClient({ id: "nwpu3", role: "worker", localHost: "localhost", localPort: 1 }, budget(), policy);
  let finish;
  client.http.getGpu = () => new Promise(resolve => { finish = resolve; });
  const pending = client.getGpu();
  await new Promise(resolve => setImmediate(resolve));
  await client.disconnect();
  finish(gpu(4));
  await pending;
  assert.deepEqual(client.currentState().gpu, {});
});

test("late publication cannot make an older device sample newer than a direct tunnel read", async () => {
  await fixture(async ({ endpoint, setGpu }) => {
    setGpu({ ...gpu(1, "actual"), generatedAt: "2026-10-15T04:30:00Z" });
    const client = new RealtimeTunnelClient(endpoint, budget(), policy);
    try {
      await client.getGpu();
      client.acceptEvent(event(1, "gpu_snapshot", { gpus: [{ index: 0, name: "old" }], generatedAt: "2026-10-15T04:29:00Z" }, "2026-10-15T04:31:00Z"));
      assert.equal(client.currentState().gpu.nwpu3[0].name, "actual");
      client.acceptEvent(event(2, "gpu_snapshot", { gpus: [{ index: 0, name: "new" }], generatedAt: "2026-10-15T04:32:00Z" }, "2026-10-15T04:33:00Z"));
      assert.equal(client.currentState().gpu.nwpu3[0].name, "new");
      assert.equal(client.currentState().workerHealth.nwpu3.updatedAt, "2026-10-15T04:32:00Z");
    } finally { await client.disconnect(); }
  });
});

test("a connected tunnel stream updates GPU memory, utilization and process ownership without a full snapshot refresh", async () => {
  await fixture(async ({ endpoint, enableSse, pushEvent, requested }) => {
    enableSse();
    const states=[];
    const client=new RealtimeTunnelClient(endpoint,budget(),{...policy,fallbackToSse:true},state=>states.push(state));
    try {
      await client.connect();
      const reads=requested.filter(route=>route==='/api/gpu').length;
      pushEvent(event(2,'gpu_snapshot',{gpus:[{index:0,memoryUsedMb:24000,utilizationPercent:97,
        processes:[{pid:'123',user:'u',pluginManaged:true}]}],generatedAt:'2099-01-01T00:00:00Z'}));
      await new Promise(resolve=>setImmediate(resolve));
      const actual=client.currentState().gpu.nwpu3[0];
      assert.equal(actual.memoryUsedMb,24000);assert.equal(actual.utilizationPercent,97);
      assert.equal(actual.processes[0].pluginManaged,true);
      assert.equal(states.at(-1).gpu.nwpu3[0],actual);
      assert.equal(requested.filter(route=>route==='/api/gpu').length,reads);
    } finally { await client.disconnect(); }
  });
});
