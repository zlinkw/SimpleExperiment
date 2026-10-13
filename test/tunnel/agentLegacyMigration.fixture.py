import hashlib
import importlib.util
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import time

root = pathlib.Path(tempfile.mkdtemp(prefix='agent-legacy-'))
source = root / 'lifecycle.py'
source.write_bytes((pathlib.Path(__file__).resolve().parents[3] / 'simple-sftp' / 'agent-lifecycle.py').read_bytes())
spec = importlib.util.spec_from_file_location('lifecycle', source)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
project = root / 'project'
project.mkdir()
install = root / 'runtime'
runtime = install / 'simple_cluster' / 'runtime'
runtime.mkdir(parents=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
params = dict(action='inspect', projectDir=str(project), installDir=str(install), mode='worker_telemetry', workerId='fixture-worker', host='127.0.0.1', port=port, condaEnv='')
contract = m.lifecycle_contract(params)
state = pathlib.Path(contract['stateDir'])
state.mkdir(parents=True)
session = {'agentInstallDir': str(install), 'agentStateDir': str(state), 'agentVersion':'fixture-old', 'startedAt':'fixture-start'}
(state / 'agent.session.json').write_text(json.dumps(session), encoding='utf-8')
(state / 'worker_availability.json').write_text(json.dumps({'workers':[{'workerId':'fixture-worker','totalGpus':0,'gpus':[]}]}), encoding='utf-8')
(state / 'events.jsonl').write_bytes(b'original historical bytes\n')
probe = '''import json
from http.server import BaseHTTPRequestHandler,HTTPServer
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  body=json.dumps(%r).encode();self.send_response(200);self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
HTTPServer(('127.0.0.1',%d),H).serve_forever()
''' % (dict(schemaVersion=1,projectRoot=str(project),agentInstallDir=str(install),agentStateDir=str(state),runtimeVersion='fixture-old',startedAt='fixture-start',mode='worker_telemetry'),port)
script = runtime / 'cluster_agent.py'
script.write_text(probe, encoding='utf-8')
(runtime / 'cluster_scheduler.py').write_bytes(b'fixture scheduler\n')
argv = [sys.executable,str(script),'serve','--project-dir',str(project),'--mode','worker_telemetry','--host','127.0.0.1','--port',str(port),'--worker-id','fixture-worker']
env = dict(os.environ,SIMPLE_EXPERIMENT_AGENT_INSTALL_DIR=str(install),SIMPLE_EXPERIMENT_CONDA_ENV='')
platform = subprocess.Popen(['sleep','60'])
agent = subprocess.Popen(argv,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
    deadline = time.monotonic()+3
    while not m.lifecycle_health(contract) and time.monotonic()<deadline:
        time.sleep(.02)
    assert agent.poll() is None
    original = {p.name:p.read_bytes() for p in state.iterdir()}
    before = m.lifecycle_control(params)
    migration = before['evidence']['migration']
    assert 'blocked' not in migration, migration
    assert migration['pid']==agent.pid
    assert original == {p.name:p.read_bytes() for p in state.iterdir()}
    for digest in ('', '0'*64):
        try:
            m.lifecycle_control(dict(params,action='migrate',migrationDigest=digest))
            raise AssertionError('unconfirmed migration')
        except m.AgentLifecycleError as e:
            assert e.code=='AGENT_MIGRATION_CONFIRM_REQUIRED'
        assert agent.poll() is None
    queue = state / 'worker_commands_fixture-worker.jsonl'
    queue.write_text(json.dumps({'commandId':'retained-command'})+'\n',encoding='utf-8')
    queued = m.lifecycle_control(params)['evidence']['migration']
    assert queued['activeTasks']==['retained-command']
    try:
        m.lifecycle_control(dict(params,action='migrate',migrationDigest=queued['digest']))
        raise AssertionError('accepted pending command')
    except m.AgentLifecycleError as e:
        assert e.code=='AGENT_ACTIVE_TASK'
    raw=queue.read_bytes();stat=queue.stat()
    pathlib.Path(str(queue)[:-6]+'.cursor.json').write_text(json.dumps({'queueSeq':1,'device':stat.st_dev,'inode':stat.st_ino,'size':len(raw),'prefixLength':len(raw),'prefixSha256':hashlib.sha256(raw).hexdigest()}),encoding='utf-8')
    original = {p.name:p.read_bytes() for p in state.iterdir()}
    verified = m.lifecycle_control(params)['evidence']['migration']
    result=m.lifecycle_control(dict(params,action='migrate',migrationDigest=verified['digest']))
    assert result['status']=='migrated' and result['stoppedPid']==agent.pid
    agent.wait(timeout=2)
    assert platform.poll() is None
    assert all((state/name).read_bytes()==raw for name,raw in original.items())
    assert json.loads((state/'agent.owner.json').read_text())==contract
    print(json.dumps({'legacyPidVerified':True,'explicitDigestRequired':True,'pendingCommandsBlocked':True,'stateBytesPreserved':True,'platformAlive':True}))
finally:
    # These are fixture Popen handles only, never user or server processes.
    if agent.poll() is None:
        agent.terminate();agent.wait(timeout=2)
    platform.terminate();platform.wait(timeout=2)
