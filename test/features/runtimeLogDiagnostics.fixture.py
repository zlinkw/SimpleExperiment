import ast, hashlib, json, os, pathlib, re, sys, threading, tempfile

source = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
tree = ast.parse(source)
ns = dict(hashlib=hashlib, json=json, os=os, re=re, threading=threading)
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name.startswith('task_log_')], type_ignores=[]), 'log-functions', 'exec'), ns)
new, feed, report = ns['task_log_new'], ns['task_log_feed'], ns['task_log_report']
def marker(command, event, phase='initialization'):
    return '[simple-experiment-runtime-log] ' + json.dumps(dict(commandId=command,event=event,phase=phase))+'\n'
def parse(text, command='command', chunk=13):
    state=new(command,'raw.log')
    data=text.encode('utf-8')
    for i in range(0,len(data),chunk): feed(state,data[i:i+chunk])
    feed(state,b'',True)
    return report(state,True,True)
normal=marker('command','begin')+'WARNING: zero predicted classes; metric=0\nProcess dataset: 100\nError budget: 0; RuntimeError counter=0\n[simple-adapter] Prefer environment nvJitLink over system CUDA\n进度 300/300\r'+marker('command','end')
assert parse(normal)['state']=='clear'
callback='Exception ignored on calling ctypes callback function: <function probe at 0x1>\nTraceback (most recent call last):\n  File "threadpoolctl.py", line 1, in callback\n    get_config().split()\nAttributeError: \'NoneType\' object has no attribute \'split\'\n'
error=marker('command','begin')+marker('command','phase','train')+callback+'epoch 300/300\n'+marker('command','phase','test')+'test succeeded; acc=0\n'+marker('command','end','test')
value=parse(error,chunk=1)
assert value['state']=='anomalous' and value['scanComplete'] and value['count']==1
assert value['types']=={'AttributeError':1} and value['phases']=={'train':1}
event=value['exceptions'][0]
assert event['complete'] and callback.strip() in event['summary']
assert error.encode('utf8')[event['byteStart']:event['byteEnd']].decode('utf8').startswith('Exception ignored')
ignored='Exception ignored in: <function destructor>\nTraceback (most recent call last):\n  File "a.py", line 2\nRuntimeError: destructor failure\n'
assert parse(marker('command','begin')+ignored+marker('command','end'))['types']=={'RuntimeError':1}
ordinary='Traceback (most recent call last):\n  File "a.py", line 3\nValueError: failed input\n'
assert parse(marker('command','begin')+ordinary+marker('command','end'))['count']==1
child='subprocess.CalledProcessError: Command child returned non-zero exit status 2.\n'
assert parse(marker('command','begin')+child+marker('command','end'))['count']==1
assert parse(marker('old','begin')+callback+marker('old','end')+normal)['count']==0
assert parse(marker('command','begin')+callback+callback+marker('command','end'))['count']==2
many=parse(marker('command','begin')+callback*105+marker('command','end'))
assert many['count']==105 and len(many['exceptions'])==100 and many['truncatedExceptions']==5
assert parse(marker('command','begin')+'\x1b[31m'+ordinary+'\x1b[0m\n'+marker('command','end'))['types']=={'ValueError':1}
assert parse(callback)['state']=='unverified'
assert parse(marker('command','begin')+'ok\n')['state']=='scanning'
root=tempfile.mkdtemp(prefix='simpleex-log-scan-')
file=pathlib.Path(root,'raw.log')
file.write_text(marker('command','begin')+callback+('epoch 300/300\n'*400000)+marker('command','end'),encoding='utf8')
ns['task_safe_path']=lambda root,relative:str(pathlib.Path(root,relative))
job={'commandId':'command'}
first=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
assert first['count']==1 and not first['scanComplete']
last=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
assert last['count']==1 and last['scanComplete']
again=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
assert again==last
# Rewriting the tail with unchanged inode/length invalidates a previously complete scan.
data=file.read_bytes();file.write_bytes(data.replace(b'AttributeError',b'AssertionError'))
changed=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
while not changed['scanComplete']:changed=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
assert changed['types']=={'AssertionError':1}
file.write_bytes(data)
ns.pop('TASK_LOG_DIAGNOSTIC_CACHE')
ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
last=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
ns.pop('TASK_LOG_DIAGNOSTIC_CACHE')
ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
reconnected=ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)
assert reconnected['count']==1 and reconnected['exceptions'][0]['id']==last['exceptions'][0]['id']
file.write_text(marker('new','begin')+'ok\n'+marker('new','end'),encoding='utf8')
assert ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)['state']=='unverified'
assert ns['task_log_diagnostics'](root,{'commandId':'new'},{'logPath':'raw.log'},True)['state']=='clear'
assert ns['task_log_diagnostics'](root,job,{'logPath':'missing.log'},True)['state']=='unverified'
file.write_text(callback,encoding='utf8')
assert ns['task_log_diagnostics'](root,job,{'logPath':'raw.log'},True)['state']=='unverified'
historical=ns['task_log_diagnostics'](root,{**job,'runtimeLogAnalysisId':'explicit'}, {'logPath':'raw.log'},True)
assert historical['count']==1 and historical['scanComplete']
file.write_text(marker('old','begin')+callback+marker('old','end')+normal,encoding='utf8')
isolated=ns['task_log_diagnostics'](root,{**job,'runtimeLogAnalysisId':'explicit-new-scan'}, {'logPath':'raw.log'},True)
assert isolated['state']=='clear' and isolated['count']==0
print(json.dumps({'ok':True,'scenarios':12,'originalLogsRetained':True}))
