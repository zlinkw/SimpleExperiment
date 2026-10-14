const test=require('node:test'),assert=require('node:assert/strict');
const {mergeRealtimeStates}=require('../../dist/tunnel/MultiEndpointRealtimeClient');
const {createRealtimeState}=require('../../dist/tunnel/RealtimeEventReducer');
test('single/multiple Worker states retain Scheduler and operation evidence without Hub authority',()=>{
 const entries=['a','b'].map(id=>{const state=createRealtimeState();state.schedulerStates=[{operationId:'run-'+id,status:'running'}];state.operations={op:{status:'running'}};
  state.lastHeartbeatAt=new Date().toISOString();state.gpu={hub:[{index:0,name:id}]};return {endpoint:{id,role:'worker'},state};});
 const old=createRealtimeState();old.schedulerStates=[{operationId:'old-hub'}];old.operations={old:{status:'running'}};
 for(const selected of [entries.slice(0,1),entries]){
  const merged=mergeRealtimeStates([...selected,{endpoint:{id:'hub',role:'hub'},state:old}]);
  assert.equal(merged.schedulerStates.length,selected.length);assert.ok(!merged.schedulerStates.some(r=>r.operationId==='old-hub'));
  assert.equal(Object.keys(merged.operations).length,selected.length);assert.ok(!merged.warnings.some(w=>w.includes('Hub')));
 }
});
