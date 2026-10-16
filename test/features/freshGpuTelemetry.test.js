const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

test('GPU reads sample the device, coalesce simultaneous reads in memory, and ignore task history', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simpleex-live-gpu-'));
  const script = path.join(directory, 'check.py');
  fs.writeFileSync(script, String.raw`
import ast, json, threading, time, os, copy
from pathlib import Path
tree = ast.parse(Path('dist/runtime/cluster_agent.py').read_text(encoding='utf-8'))
names = {'api_worker_gpu', 'worker_gpu_sample_delay', 'sampler_interval_seconds', 'sampler_sleep_seconds', 'wait_for_worker_gpu_sample'}
nodes = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.Assign)) and
    (isinstance(n, ast.FunctionDef) and n.name in names or isinstance(n, ast.Assign) and
     any(isinstance(t, ast.Name) and t.id.startswith('WORKER_GPU_SAMPLE_') for t in n.targets))]
clock = [10.0]
calls = []
ns = dict(threading=threading, time=type('Clock', (), {'monotonic': staticmethod(lambda: clock[0])}),
          os=os, copy=copy, SCHEMA_VERSION=1, now_iso=lambda: str(clock[0]))
def sample():
    calls.append(1)
    time.sleep(0.01)
    return ([{'index': 0, 'memoryUsedMb': len(calls) * 100}], '')
ns['collect_local_gpu'] = sample
ns['path_for'] = lambda root, leaf: leaf
ns['read_runtime_json_cached'] = lambda *args: (_ for _ in ()).throw(AssertionError('no disk GPU snapshot'))
ns['has_running_plan'] = lambda *args: (_ for _ in ()).throw(AssertionError('no task history gate'))
exec(compile(ast.Module(body=nodes, type_ignores=[]), 'gpu-only', 'exec'), ns)
samples=[]
threads=[threading.Thread(target=lambda: samples.append(ns['api_worker_gpu']('/project'))) for _ in range(6)]
for t in threads: t.start()
for t in threads: t.join()
assert len(samples)==6 and len(calls)==1
assert all(s['gpus'][0]['memoryUsedMb']==100 for s in samples)
samples[0]['gpus'][0]['memoryUsedMb']=999
assert ns['api_worker_gpu']('/project')['gpus'][0]['memoryUsedMb']==100
clock[0]+=1.1
assert ns['api_worker_gpu']('/project')['gpus'][0]['memoryUsedMb']==200
assert len(calls)==2
assert ns['worker_gpu_sample_delay'](60,30,False)<=1
assert ns['worker_gpu_sample_delay'](60,30,True)<=1
ns['collect_local_gpu']=lambda: ([], 'nvidia timeout')
clock[0]+=1.1
failed=ns['api_worker_gpu']('/project')
assert failed['status']=='degraded' and failed['error']=='nvidia timeout' and failed['gpus']==[]
clock[0]+=1.1
ns['collect_local_gpu']=sample
assert ns['api_worker_gpu']('/project')['status']=='ok'
sampler = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name=='start_worker_telemetry_sampler')
threads_by_name={}
class Thread:
    def __init__(self, target, name, daemon): threads_by_name[name]=target
    def start(self): pass
class StopLoop(BaseException): pass
events=[]
ns.update(threading=type('Threads',(),{'Thread':Thread}), time=type('Clock',(),{'time':staticmethod(lambda:100)}),
    write_worker_gpu_snapshot=lambda root:{'gpus':[{'index':0}], 'status':'ok', 'generatedAt':'sample-time'},
    availability_from_gpu=lambda *args:{}, write_availability_batch=lambda *args:None,
    payload_cache_changed=lambda *args:True, append_event=lambda root,event:events.append(event),
    wait_for_worker_gpu_sample=lambda *args:(_ for _ in ()).throw(StopLoop()),
    api_worker_tasks=lambda *args:(_ for _ in ()).throw(AssertionError('GPU must not wait for task query')),
    AGENT_VERSION='fixture')
exec(compile(ast.Module(body=[sampler], type_ignores=[]),'sampler-only','exec'), ns)
ns['start_worker_telemetry_sampler']('/project',60,30)
try: threads_by_name['simple-worker-telemetry-sampler']()
except StopLoop: pass
assert any(e['type']=='gpu_snapshot' and e['payload']['generatedAt']=='sample-time' for e in events)
assert 'simple-worker-task-telemetry-sampler' in threads_by_name
ns['task_execution_inventory']=lambda root: {'executionOnly':True,'tasks':[]}
ns['time']=type('Clock',(),{'sleep':staticmethod(lambda seconds:(_ for _ in ()).throw(StopLoop()))})
try: threads_by_name['simple-worker-task-telemetry-sampler']()
except StopLoop: pass
assert any(e['type']=='worker_task_snapshot' and e['payload'].get('executionOnly') for e in events), 'background telemetry must not analyze results/history'
print('fresh GPU passed')
`, 'utf8');
  const result = spawnSync('python', ['-X', 'utf8', script], { cwd: path.join(__dirname, '../..'), timeout: 10000, windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
