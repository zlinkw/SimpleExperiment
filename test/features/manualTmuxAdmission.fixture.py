"""A separate bounded real tmux case; reuse only fixture setup and extracted task functions."""
import pathlib
setup = pathlib.Path(__file__).with_name('tmuxTaskLifecycle.fixture.py').read_text(encoding='utf-8').split('\ntry:\n', 1)[0]
exec(compile(setup, 'lifecycle_fixture_setup', 'exec'))
try:
    # Only the actual Agent entry function is extracted. Task children use the CPU probe executor.
    started_at = time.monotonic()
    def phase(name):
        print(name, round(time.monotonic()-started_at, 3), file=sys.stderr, flush=True)
    entry = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'execute_worker_command')
    agent = dict(namespace)
    exec(compile(ast.Module(body=[entry], type_ignores=[]), 'agent_entry', 'exec'), agent)
    phase('entry_ready')
    messages = json.loads(sys.argv[2]) if len(sys.argv) > 2 else [job(4), dict(job(5),dispatchPolicy='manual',gpuId='0'), dict(job(6),dispatchPolicy='manual',gpuId='0')]
    pathlib.Path(root, 'gpu-busy').write_text('synthetic GPU occupancy', encoding='utf-8')
    auto,manual_a,manual_b = messages
    agent['execute_worker_command'](root,auto,'worker')
    phase('auto_queued')
    for manual in (manual_a, manual_b):
        agent['execute_worker_command'](root,manual,'worker')
    phase('manuals_queued')
    started = lambda row: pathlib.Path(root, 'started-' + row['commandId'])
    wait_for(lambda: started(manual_a).exists() and started(manual_b).exists())
    phase('manuals_running')
    assert not started(auto).exists(), 'busy automatic job must not block manual jobs'
    reports = [json.loads(started(row).read_text()) for row in (manual_a, manual_b)]
    assert all(row['gpu'] == '0' for row in reports) and abs(reports[0]['at'] - reports[1]['at']) < 0.8
    stopped = namespace['task_stop'](root, {'targetCommandId': manual_a['commandId'], 'projectId':'project'}, 'worker')
    assert stopped['status'] == 'completed'
    assert any(row['commandId'] == manual_b['commandId'] and not row['dead'] for row in namespace['task_inventory'](root)), 'closing one task must preserve its same-GPU neighbor'
    # Only simulated hardware input changes; there is no production state or task status file.
    pathlib.Path(root, 'gpu-busy').rename(pathlib.Path(root, 'gpu-free'))
    wait_for(lambda: started(auto).exists())
    phase('auto_running')
    assert any(not row['dead'] for row in namespace['task_inventory'](root) if row['commandId'] in (manual_a['commandId'], manual_b['commandId']))
    wait_for(lambda: all(row['dead'] for row in namespace['task_inventory'](root)))
    print(json.dumps(dict(ok=True, realTmux=True, manualConcurrent=True, autoWithManual=True, exactStopIsolated=True)))
finally:
    # Fixture-owned server under this newly created private TMUX_TMPDIR only.
    subprocess.run(['tmux', 'kill-server'], capture_output=True, timeout=2)
