const test = require('node:test');
const assert = require('node:assert/strict');
const { RealtimeTunnelClient, defaultRealtimeRefreshPolicy } = require('../../dist/tunnel/RealtimeTunnelClient');
const { RequestBudget } = require('../../dist/tunnel/RequestBudget');
function client() {
  return new RealtimeTunnelClient({localHost:'127.0.0.1',localPort:1}, new RequestBudget(),
    {...defaultRealtimeRefreshPolicy,preferWebSocket:false,fallbackToSse:false});
}

test('failed connection stays disconnected until manual recovery; recovery reads current state', async () => {
  const c = client(); let calls = 0;
  c.http.getSnapshot = async () => { calls++; throw Error('offline'); };
  await c.connect();
  assert.equal(c.diagnostics().requiresManualReconnect,true);
  await c.connect();
  await assert.rejects(c.getWorkerTasks(),/重新连接/);
  await assert.rejects(c.getGpu(),/重新连接/);
  assert.equal(calls,1);
  c.http.getSnapshot = async () => { calls++; return {gpu:{recovered:[]}}; };
  await c.reconnect();
  assert.equal(c.diagnostics().requiresManualReconnect,false);
  assert.ok(c.currentState().lastKnownGood.gpu.recovered);
  c.setHidden(true);
  assert.equal(c.diagnostics().streamStatus,'polling');
  assert.equal(c.pollTimer,undefined);
  c.setHidden(false);
  assert.ok(c.pollTimer);
  await c.disconnect();
});

test('manual and fallback snapshot reads coalesce; old response cannot update disconnected state', async () => {
  const c = client(); let release, calls=0;
  c.http.getSnapshot = () => { calls++; return new Promise(r=>{release=r;}); };
  const first=c.getSnapshot(), second=c.refreshSnapshot();
  assert.equal(calls,1);
  await c.disconnect();
  release({gpu:{late:[]}});
  await Promise.all([first,second]);
  assert.equal(c.currentState().lastKnownGood,undefined);
});

test('an unaffected worker continues after another loses connection', async () => {
  const a=client(), b=client();
  a.http.getSnapshot=async()=>{throw Error('offline');};
  b.http.getSnapshot=async()=>({gpu:{healthy:[]}});
  await a.connect(); await b.connect();
  assert.equal(a.diagnostics().streamStatus,'disconnected');
  assert.equal(b.diagnostics().streamStatus,'polling');
  await Promise.all([a.disconnect(),b.disconnect()]);
});
