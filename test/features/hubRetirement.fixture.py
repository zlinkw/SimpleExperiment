import argparse
import ast
import json
import os
import pathlib
import sys

agent_tree=ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
ns={}
nodes=[n for n in agent_tree.body if isinstance(n,ast.FunctionDef) and n.name in ('api_capabilities','api_openapi')]
exec(compile(ast.Module(body=nodes,type_ignores=[]),'retired_hub_api','exec'),ns)
for name in ('api_capabilities','api_openapi'):
    try:
        ns[name]('/unused',mode='hub_control')
        raise AssertionError('Hub execution remained enabled')
    except ValueError as error:
        assert 'HUB_REMOVED' in str(error)
scheduler=ast.parse(pathlib.Path(sys.argv[2]).read_text(encoding='utf-8'))
main=next(n for n in scheduler.body if isinstance(n,ast.FunctionDef) and n.name=='main')
ns=dict(argparse=argparse,os=os,normalize_default_result_csv_dir=lambda p:p)
exec(compile(ast.Module(body=[main],type_ignores=[]),'worker_main','exec'),ns)
sys.argv=['scheduler','--plan','unused.yaml']
try:
    ns['main']()
    raise AssertionError('global scheduler was started')
except SystemExit as error:
    assert 'GLOBAL_SCHEDULER_REMOVED' in str(error),str(error)
print(json.dumps({'hubApiRejected':True,'globalSchedulerRejected':True}))
