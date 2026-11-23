from pathlib import Path
from types import SimpleNamespace
import hashlib
import posixpath
import re
import threading
import time

source = (Path(__file__).resolve().parents[2] / 'src/clusterAgentRuntime.legacy.ts').read_text(encoding='utf-8')
function = source[source.index('def cache_delete_exact_file('):source.index('\ndef cache_delete_confirmed_batch(')]
start = source.index('    if action in ("check-confirmed-cache-candidates", "delete-confirmed-cache-candidates"):')
end = source.index('    if action == "delete-cache-candidates":', start)
branch = source[start:end] + '    return None\n'

files = {'/project/tmp/a.log': SimpleNamespace(st_dev=7, st_ino=9, st_size=1, st_mtime_ns=100, st_nlink=1),
         '/project/tmp/b.log': SimpleNamespace(st_dev=7, st_ino=10, st_size=1, st_mtime_ns=100, st_nlink=1)}
def stat_file(value, **_kwargs):
    if value in ('/project', '/project/tmp'):
        return SimpleNamespace(st_dev=7)
    if value not in files:
        raise FileNotFoundError(value)
    return files[value]

paths = SimpleNamespace(realpath=lambda value: value, join=posixpath.join, dirname=posixpath.dirname,
    basename=posixpath.basename, abspath=posixpath.abspath, commonpath=posixpath.commonpath, splitext=posixpath.splitext,
    isdir=lambda value: value in ('/project', '/project/tmp'), isfile=lambda value: value in files,
    islink=lambda _value: False, lexists=lambda value: value in files)
fake_os = SimpleNamespace(path=paths, stat=stat_file, lstat=stat_file, name='posix', environ={'SIMPLE_EXPERIMENT_WORKER_ID': 'a'})
effects = []
env = {'os': fake_os, 'hashlib': hashlib, 're': re, 'time': time, 'SCHEMA_VERSION': 1,
       'cache_delete_confirmed_batch': lambda rows: effects.append(('delete', rows)),
       'append_event': lambda *_args: effects.append(('event', None))}
exec(compile(function + '\ndef selected_action(root, action, payload, operation_id, op_id):\n' + branch,
             '<extracted cache functions>', 'exec'), env)

def row(name, inode):
    relative = 'tmp/' + name
    token = hashlib.sha256(f'{relative}|7|{inode}|1|100'.encode('utf-8')).hexdigest()
    return {'path': relative, 'type': 'file', 'token': token}

payload = {'authorizationMode': 'confirmed_paths', 'confirm': True, 'pathConfirmed': True,
           'workerId': 'a', 'candidates': [row('a.log', 9), row('b.log', 10)]}
call = env['selected_action']
result = call('/project', 'check-confirmed-cache-candidates', payload, 'op', 'id')
assert result['status'] == 'completed' and result['workerId'] == 'a' and result['root'] == '/project'
assert result['candidates'] == payload['candidates'] and not effects
bad = dict(payload, candidates=[row('a.log', 9), row('b.log', 99)])
assert call('/project', 'delete-confirmed-cache-candidates', bad, 'op', 'id')['status'] == 'failed' and not effects
assert call('/project', 'delete-confirmed-cache-candidates', dict(payload, workerId='b'), 'op', 'id')['status'] == 'failed' and not effects
assert call('/project', 'delete-confirmed-cache-candidates', dict(payload, candidates=[row('../weights.log', 9)]), 'op', 'id')['status'] == 'failed' and not effects
result = call('/project', 'delete-confirmed-cache-candidates', payload, 'op', 'id')
assert result['status'] == 'completed' and result['deletedCount'] == 2 and len(effects) == 2
effects.clear()
missing = dict(payload, candidates=[row('missing.log', 3)])
result = call('/project', 'check-confirmed-cache-candidates', missing, 'op', 'id')
assert result['status'] == 'completed' and result['absent'] == ['tmp/missing.log'] and not effects
query_start = source.index('    if action == "query-confirmed-cache-cleanup":')
query_branch = source[query_start:start] + '    return None\n'
env.update({'INACTIVITY_ACTIONS_LOCK': threading.RLock(), 'LIVE_CLEANUP_ACTIONS': {}, 'CACHE_CLEANUP_RECEIPTS': {}})
exec(compile('def query_action(root, action, payload):\n' + query_branch, '<extracted query>', 'exec'), env)
query = env['query_action']
query_payload = {'workerId': 'a', 'targetOperationId': 'original'}
assert query('/project', 'query-confirmed-cache-cleanup', query_payload)['status'] == 'unknown'
env['LIVE_CLEANUP_ACTIONS'][('/project', 'original')] = {'action': 'delete-confirmed-cache-candidates'}
assert query('/project', 'query-confirmed-cache-cleanup', query_payload)['status'] == 'live'
env['LIVE_CLEANUP_ACTIONS'].clear()
env['CACHE_CLEANUP_RECEIPTS'][('/project', 'original')] = 'settled'
assert query('/project', 'query-confirmed-cache-cleanup', query_payload)['status'] == 'settled'
assert query('/other-project', 'query-confirmed-cache-cleanup', query_payload)['status'] == 'unknown'
tracked = source[source.index('def tracked_cleanup_action('):source.index('\ndef active_cleanup_operations(')]
env['handle_action'] = lambda *_args: {'status': 'completed'}
exec(compile(tracked, '<extracted active cleanup guard>', 'exec'), env)
for existing in ('delete-cache-candidates', 'delete-confirmed-cache-candidates'):
    env['LIVE_CLEANUP_ACTIONS'][('/project', 'prior')] = {'action': existing, 'payload': payload}
    for incoming in ('delete-cache-candidates', 'delete-confirmed-cache-candidates', 'check-confirmed-cache-candidates'):
        blocked = env['tracked_cleanup_action']('/project', incoming, payload, 'next', 'next')
        assert blocked['status'] == 'rejected' and blocked['notStarted'] is True and not effects
env['LIVE_CLEANUP_ACTIONS'].clear()
accepted = env['tracked_cleanup_action']('/project', 'delete-confirmed-cache-candidates', payload, 'next', 'next')
assert accepted['status'] == 'completed' and env['CACHE_CLEANUP_RECEIPTS'][('/project', 'next')] == 'settled'
print('confirmed paths extracted functions: ok')
