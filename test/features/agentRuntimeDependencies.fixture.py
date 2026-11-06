import ast, hashlib, json, os, pathlib, re, subprocess, sys, tempfile, time, venv

config = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
started = time.monotonic()
preparation_ms, subprocess_ms = {}, []
root = pathlib.Path(tempfile.mkdtemp(prefix='agent-dependency-clean-'))
sources = root/'sources'
sources.mkdir()
# Capture the immutable final-package inputs once on native storage. Repeated
# mounted-file reads/AST parsing do not strengthen the deployment assertions.
for key in ['agent','scheduler','scopeFixture']:
    if not config[key]: continue
    raw = pathlib.Path(config[key]).read_bytes()
    captured = sources/(key+'.py')
    captured.write_bytes(raw)
    assert captured.read_bytes() == raw
    config[key] = str(captured)
trees = {}

def syntax(filename):
    if filename not in trees:
        before = time.monotonic()
        trees[filename] = ast.parse(pathlib.Path(filename).read_text(encoding='utf-8'), filename=str(filename))
        preparation_ms[pathlib.Path(filename).name] = (time.monotonic()-before)*1000
    return trees[filename]

def selected(filename, functions=(), constants=(), classes=()):
    tree = syntax(filename)
    nodes = [node for node in tree.body if
             isinstance(node, ast.FunctionDef) and node.name in functions or
             isinstance(node, ast.ClassDef) and node.name in classes or
             isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id in constants for target in node.targets)]
    return ast.unparse(ast.Module(body=nodes, type_ignores=[]))

constants = ['RUNTIME_PYYAML_VERSION','RUNTIME_PYYAML_SHA256','RUNTIME_PYYAML_BUNDLE','RUNTIME_DEPENDENCIES']
functions = ['runtime_dependency_prepare','runtime_dependency_check','main']
agent = selected(config['agent'], functions, constants)
assert all(name in agent for name in functions), 'missing actual production dependency/check entry'
before_venv = time.monotonic()
venv.EnvBuilder(with_pip=False).create(root/'python')
preparation_ms['venv'] = (time.monotonic()-before_venv)*1000
python = root/'python'/('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
runtime = root/'install'/'simple_cluster'/'runtime'
runtime.mkdir(parents=True)
probe = runtime/'cluster_agent.py'
header = 'import json, os, sys\n'
footer = '\nif __name__ == "__main__":\n    sys.exit(main() or 0)\n'
probe.write_text(header+agent+footer, encoding='utf-8')
(runtime/'cluster_scheduler.py').write_text('# isolated scheduler artifact\n', encoding='utf-8')
project = root/'研究 项目'
project.mkdir()
for name in ['config.yaml','history.json','plan.yaml','results.json']:
    (project/name).write_text('retained '+name, encoding='utf-8')
preserved = {p.name:p.read_bytes() for p in project.iterdir()}

def run(script, *args):
    before = time.monotonic()
    result = subprocess.run([str(python),'-I','-S','-B',str(script),*args], capture_output=True, text=True, encoding='utf-8', timeout=8)
    subprocess_ms.append(dict(script=script.name,args=args,elapsedMs=(time.monotonic()-before)*1000))
    assert result.returncode == 0, result.stderr + result.stdout
    return json.loads(result.stdout)

# Reproduce the shipped 0.5.325 collector without importing/executing its module.
if config['oldAgent']:
    old = selected(config['oldAgent'], ['plan_source_scope'])
    repro = root/'old-repro.py'
    repro.write_text('import importlib.util, json\nassert importlib.util.find_spec("yaml") is None\n'+old+'\ntry:\n    plan_source_scope("unused", "unused", "unused")\nexcept ModuleNotFoundError as error:\n    assert error.name == "yaml"\n    print(json.dumps({"old325MissingYaml":True}))\nelse:\n    raise AssertionError("old bug not reproduced")\n', encoding='utf-8')
    assert run(repro)['old325MissingYaml']

initial = run(probe,'runtime-check')
assert initial['ok'] and initial['safeLoad'] and initial['offline']
assert initial['executable'] == str(python)
assert '.python-dependencies' in initial['module']
again = run(probe,'runtime-check')
assert again == initial
scheduler_probe = runtime/'scheduler-check.py'
scheduler_probe.write_text(header+selected(config['scheduler'],['runtime_dependency_prepare','runtime_dependency_check'],constants)+'\nprint(json.dumps(runtime_dependency_check()))\n',encoding='utf-8')
assert run(scheduler_probe)['sha256'] == initial['sha256']
health_ns = dict(os=os,RUNTIME_DEPENDENCIES=initial,SCHEMA_VERSION=1,AGENT_VERSION='fixture',API_VERSION='1',RUNTIME_VERSION='fixture',PLUGIN_VERSION='fixture',AGENT_LIFECYCLE_IDENTITY={},TASK_SCHEDULER_UPDATE_ERROR='',read_runtime_json_cached=lambda *args:{},path_for=lambda *args:'unused',inspect_agent=lambda *args:{},iso_age_seconds=lambda *args:0,now_iso=lambda:'now',task_scheduler_runtime_report=lambda *args:{},agent_install_dir=lambda *args:'runtime',agent_dir=lambda *args:'state',gpu_collector_state_root=lambda *args:'worker-state')
exec(compile(selected(config['agent'],['api_health']),'isolated-health','exec'),health_ns)
assert health_ns['api_health'](str(project),'worker_telemetry')['runtimeDependencies'] == initial
serve = next(node for node in syntax(config['agent']).body if isinstance(node,ast.FunctionDef) and node.name=='serve_http')
assert isinstance(serve.body[1],ast.Expr) and isinstance(serve.body[1].value,ast.Call) and serve.body[1].value.func.id=='runtime_dependency_prepare'

# Simulate existing 0.5.325 runtime with no managed dependency cache, then the
# normal runtime replacement. No user state or training files are recreated.
upgrade = root/'upgrade'/'simple_cluster'/'runtime'
upgrade.mkdir(parents=True)
upgrade_probe = upgrade/'cluster_agent.py'
upgrade_probe.write_text('# previous 0.5.325 runtime, no YAML deployment\n', encoding='utf-8')
upgrade_probe.write_bytes(probe.read_bytes())
assert run(upgrade_probe,'runtime-check')['ok']

# Corrupt ONLY a fixture-owned cached dependency. Redeploy/ensure repairs it
# from the locked offline bytes, without pip, network, or project mutation.
bundle = pathlib.Path(initial['bundle'])
bundle.write_bytes(b'corrupted managed cache')
assert run(probe,'runtime-check')['ok']
assert hashlib.sha256(bundle.read_bytes()).hexdigest() == initial['sha256']

# Corrupt fixture-only embedded bytes. Bootstrap must fail visibly before the
# Agent serves requests. The shared SimpleSFTP lifecycle protocol is unchanged.
original = probe.read_text(encoding='utf-8')
bad = ast.parse(original)
for node in bad.body:
    if isinstance(node, ast.Assign) and any(isinstance(t,ast.Name) and t.id=='RUNTIME_PYYAML_BUNDLE' for t in node.targets):
        node.value = ast.Constant('Y29ycnVwdA==')
probe.write_text(ast.unparse(bad), encoding='utf-8')
corrupt = subprocess.run([str(python),'-I','-S',str(probe),'runtime-check'], capture_output=True,text=True,encoding='utf-8',timeout=8)
assert corrupt.returncode == 1
failure = json.loads(corrupt.stdout)
assert failure['code'] == 'AGENT_RUNTIME_DEPENDENCY_FAILED'
assert str(python) in failure['error']
for expected in ['PyYAML','repair','Offline']: assert expected in failure['error'], failure
probe.write_text(original, encoding='utf-8')
assert run(probe,'runtime-check')['ok']

# Filesystem deployment failure is visible, not deferred to a plan HTTP 400.
blocked = root/'blocked'
blocked.mkdir()
(blocked/'.python-dependencies').write_text('not a directory',encoding='utf-8')
blocked_probe = blocked/'cluster_agent.py'
blocked_probe.write_bytes(probe.read_bytes())
failure = subprocess.run([str(python),'-I','-S',str(blocked_probe),'runtime-check'], capture_output=True,text=True,encoding='utf-8',timeout=8)
assert failure.returncode == 1
failed = json.loads(failure.stdout)
assert failed['code']=='AGENT_RUNTIME_DEPENDENCY_FAILED' and str(python) in failed['error'] and 'managedPath=' in failed['error']

# The real source-scope fixture uses the production file/hash and submission
# guards, never imports models or starts training. Run inside clean Python AFTER
# the exact same bootstrap (not a host-installed yaml dependency).
scope_probe = root/'scope.py'
# Reuse the already parsed immutable Agent for the clean child's source fixture.
# Keep every actual scope/admission validator; avoid reparsing the full unrelated
# HTTP/runtime implementation a second time merely to select these same nodes.
scope_agent = root/'scope-agent-functions.py'
scope_names = [node.name for node in syntax(config['agent']).body if isinstance(node, ast.FunctionDef) and
               (node.name.startswith(('plan_scope_', 'plan_source_')) or node.name in
                ('verify_plan_execution_source', 'inspect_plan_code_scope', '_code_sync_stat_record', 'resolve_durable_code_sync_proof', 'task_queue_job'))]
scope_agent.write_text(selected(config['agent'], scope_names), encoding='utf-8')
scope_probe.write_text(header+agent+'\n__file__='+repr(str(probe))+'\nruntime_dependency_prepare()\nimport yaml\ntry:\n    yaml.safe_load("!!python/object/apply:os.system [echo forbidden]")\n    raise AssertionError("unsafe YAML accepted")\nexcept yaml.constructor.ConstructorError:\n    pass\nimport runpy\nsys.argv=['+repr(config['scopeFixture'])+','+repr(str(scope_agent))+']\nrunpy.run_path(sys.argv[0],run_name="__main__")\n',encoding='utf-8')
assert run(scope_probe)['actualInputsVerified']
assert {p.name:p.read_bytes() for p in project.iterdir()} == preserved
print(json.dumps(dict(fresh=True,upgrade=True,repair=True,failureBeforeServing=True,sameInterpreter=True,safeLoad=True,sourcePreflight=True,noTrainingOrProjectMutation=True,yamlVersion=initial['version'],python=initial['python'],executable=initial['executable'],module=initial['module'],fixture=str(root),preparationMs=preparation_ms,subprocessMs=subprocess_ms,totalMs=(time.monotonic()-started)*1000)))
