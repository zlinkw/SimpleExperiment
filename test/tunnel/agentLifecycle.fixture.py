import hashlib
import importlib.util
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

source = pathlib.Path(__file__).resolve().parents[3] / 'simple-sftp' / 'agent-lifecycle.py'
spec = importlib.util.spec_from_file_location('lifecycle', source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
root = pathlib.Path(tempfile.mkdtemp(prefix='agent-service-'))
project = root / 'project'
project.mkdir()
install = root / 'runtime'
runtime = install / 'simple_cluster' / 'runtime'
runtime.mkdir(parents=True)
probe = '''import argparse, importlib.util, json, os
from http.server import BaseHTTPRequestHandler, HTTPServer
spec=importlib.util.spec_from_file_location("lifecycle",%r)
l=importlib.util.module_from_spec(spec);spec.loader.exec_module(l)
p=argparse.ArgumentParser();p.add_argument("serve");p.add_argument("--project-dir");p.add_argument("--host");p.add_argument("--port",type=int);p.add_argument("--mode");p.add_argument("--worker-id");a=p.parse_args()
lock,identity=l.lifecycle_service_guard(a,"fixture-v1")
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.headers.get("X-Simple-Agent-Token","")!=os.environ.get("SIMPLE_EXPERIMENT_AGENT_TOKEN",""):self.send_response(403);self.end_headers();return
  body=json.dumps({"schemaVersion":1,"runtimeVersion":"fixture-v1","agentLifecycleProtocol":1,"agentIdentity":identity}).encode();self.send_response(200);self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
HTTPServer((a.host,a.port),H).serve_forever()
''' % str(source)
(runtime / 'cluster_agent.py').write_text(probe, encoding='utf-8')
(runtime / 'cluster_scheduler.py').write_text('# CPU fixture scheduler\n', encoding='utf-8')
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0))
    port = sock.getsockname()[1]
params = dict(action='inspect', projectDir=str(project),installDir=str(install),mode='worker_telemetry',workerId='container-gpu',
              host='127.0.0.1',port=port,condaEnv='',agentToken='fixture-credential',expectedVersion='fixture-v1',files={
                  name:hashlib.sha256((runtime/name).read_bytes()).hexdigest() for name in ('cluster_agent.py','cluster_scheduler.py')})
tree = sorted(str(p) for p in root.rglob('*'))
assert module.lifecycle_control(params)['status']=='absent'
assert tree==sorted(str(p) for p in root.rglob('*')), 'inspect wrote files'
platform = subprocess.Popen(['sleep','60'])
agent = None
try:
    def concurrent_prepare(_):
        try:
            return module.lifecycle_control(dict(params,action='ensure'))
        except module.AgentLifecycleError as error:
            assert error.code=='AGENT_LIFECYCLE_BUSY'
            return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        receipts=list(pool.map(concurrent_prepare, range(2)))
    first = next(row for row in receipts if row)
    assert len({row['identity']['pid'] for row in receipts if row})==1
    agent = first['identity']['pid']
    assert first['reused'] is False
    again = module.lifecycle_control(dict(params,action='ensure'))
    assert again['reused'] is True and again['identity']['pid']==agent
    before = (pathlib.Path(first['contract']['stateDir'])/'agent.owner.json').read_bytes()
    assert b'fixture-credential' not in before
    machine = module.lifecycle_machine
    module.lifecycle_machine = lambda:'cpu-backup-different-container'
    try:
        module.lifecycle_control(params)
        raise AssertionError('CPU container adopted GPU state')
    except module.AgentLifecycleError as e:
        assert e.code=='AGENT_STATE_OWNER_CONFLICT'
    finally:
        module.lifecycle_machine=machine
    assert (pathlib.Path(first['contract']['stateDir'])/'agent.owner.json').read_bytes()==before
    try:
        module.lifecycle_control(dict(params,action='ensure',expectedVersion='fixture-v2'))
        raise AssertionError('version mismatch reused')
    except module.AgentLifecycleError as e:
        assert e.code=='AGENT_RUNNING_VERSION_MISMATCH'
    assert module.lifecycle_process(agent)
    try:
        module.lifecycle_control(dict(params,action='restart',files=dict(params['files'],**{'cluster_agent.py':'0'*64})))
        raise AssertionError('bad runtime stopped healthy service')
    except module.AgentLifecycleError as e:
        assert e.code=='AGENT_RUNTIME_HASH_MISMATCH'
    assert module.lifecycle_process(agent)
    state = pathlib.Path(first['contract']['stateDir'])
    (state/'worker_task_snapshot.json').write_text(json.dumps({'tasks':[{'commandId':'retained-command','status':'running'}]}),encoding='utf-8')
    try:
        module.lifecycle_control(dict(params,action='restart'))
        raise AssertionError('restarted active jobs')
    except module.AgentLifecycleError as e:
        assert e.code=='AGENT_ACTIVE_TASK'
    (state/'worker_task_snapshot.json').write_text('{"tasks":[]}',encoding='utf-8')
    (runtime/'cluster_agent.py').write_text(probe.replace('fixture-v1','fixture-v2'),encoding='utf-8')
    upgraded=dict(params,expectedVersion='fixture-v2',files={name:hashlib.sha256((runtime/name).read_bytes()).hexdigest() for name in params['files']})
    restarted=module.lifecycle_control(dict(upgraded,action='restart'))
    assert restarted['runningVersion']=='fixture-v2'
    assert restarted['identity']['pid']!=agent
    agent=restarted['identity']['pid']
    assert platform.poll() is None
    record=state/'agent.process.json'
    value=json.loads(record.read_text(encoding='utf-8'))
    record.write_text(json.dumps(dict(value,nonce='wrong')),encoding='utf-8')
    try:
        module.lifecycle_control(dict(params,action='stop'))
        raise AssertionError('unverified process stopped')
    except module.AgentLifecycleError as e:
        assert e.code=='AGENT_PROCESS_UNVERIFIED'
    assert module.lifecycle_process(agent)
    record.write_text(json.dumps(value),encoding='utf-8')
    assert module.lifecycle_control(dict(params,action='stop'))['status']=='stopped'
    assert not module.lifecycle_process(agent)
    assert platform.poll() is None
    (state/'worker_task_snapshot.json').write_text(json.dumps({'tasks':[{'commandId':'queued-original','status':'queued'}]}),encoding='utf-8')
    try:
        module.lifecycle_control(dict(upgraded,action='ensure'))
        raise AssertionError('Agent preparation silently resumed queued research')
    except module.AgentLifecycleError as e:
        assert e.code=='AGENT_ACTIVE_TASK'
    assert not module.lifecycle_process(agent)
    print(json.dumps({'firstStart':True,'reused':True,'ownedRestart':True,'cpuConflictRejected':True,'platformAlive':True,'unverifiedPidProtected':True,'zeroWriteInspect':True,'queuedResearchBlocked':True}))
finally:
    # Only fixture processes created in this script; no user/platform target touched.
    if agent and module.lifecycle_process(agent):
        module.lifecycle_control(dict(params,action='stop'))
    platform.terminate()
    platform.wait(timeout=2)
