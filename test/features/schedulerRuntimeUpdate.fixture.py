"""Extracted functions; private tmux socket, synthetic H20 and CPU commands only."""
import pathlib
setup = pathlib.Path(__file__).with_name('tmuxTaskLifecycle.fixture.py').read_text(encoding='utf-8').split('\ntry:\n', 1)[0]
exec(compile(setup, 'scheduler_update_fixture_setup', 'exec'))
try:
    original = probe.read_text(encoding='utf-8').replace('time.sleep(1.2 if case=="slow" else 0.1)',
        'deadline=time.monotonic()+7\nwhile not pathlib.Path(root,"release-"+command).exists() and time.monotonic()<deadline: time.sleep(.02)')
    probe.write_text(original, encoding='utf-8')
    script = program.read_text(encoding='utf-8').replace('return ([{"id":"0"},{"id":"1"}], "")',
        'return ([{"id":"0","index":"0","memoryTotalMb":143771,"memoryUsedMb":0}], "")')
    program.write_text(script, encoding='utf-8')
    namespace['RUNTIME_VERSION'] = 'fixture'
    os.environ['SIMPLE_EXPERIMENT_WORKER_ID'] = 'worker'
    os.environ['SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX'] = 'simple'
    legacy = [dict(job(i), maxConcurrentGpus=1) for i in range(2)]
    for item in legacy:
        namespace['task_queue_rpc'](root, 'worker', 'accept', item, ensure=True)
    wait_for(lambda: pathlib.Path(root, 'started-command-0').is_file())
    before = {r['commandId']: (r['tmuxWindowId'], r['tmuxPane']) for r in namespace['task_inventory'](root)}
    assert sum(r['phase'] == 'queued' for r in namespace['task_inventory'](root)) == 1
    os.environ['SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX'] = 'new-owner'
    control = namespace['task_queue_session'](root, 'worker') + ':queue'
    assert control.startswith('simple-sch-'), 'existing pre-prefix queue must remain the original controller'
    endpoint = namespace['task_queue_endpoint'](root, 'worker')
    old_epoch = endpoint['epoch']
    endpoint['workerId'] = 'other-worker'
    namespace['task_option'](control, 'endpoint', json.dumps(endpoint))
    try:
        namespace['task_update_scheduler_runtime'](root, 'worker')
        raise AssertionError('foreign controller must never be replaced')
    except RuntimeError as failure:
        assert 'SCHEDULER_RUNTIME_UNVERIFIED' in str(failure)
    endpoint['workerId'] = 'worker'
    endpoint.update(runningVersion='old', runtimeFiles={})
    namespace['task_option'](control, 'endpoint', json.dumps(endpoint))
    report = namespace['task_update_scheduler_runtime'](root, 'worker')
    assert report['status'] == 'current', report
    assert 'secret' not in report and 'port' not in report
    assert namespace['task_queue_endpoint'](root, 'worker')['epoch'] != old_epoch
    assert before == {r['commandId']: (r['tmuxWindowId'], r['tmuxPane']) for r in namespace['task_inventory'](root)}
    assert not next(r for r in namespace['task_inventory'](root) if r['commandId'] == 'command-0')['dead']
    epoch = namespace['task_queue_endpoint'](root, 'worker')['epoch']
    namespace['task_update_scheduler_runtime'](root, 'worker')
    assert namespace['task_queue_endpoint'](root, 'worker')['epoch'] == epoch
    pathlib.Path(root, 'release-command-0').touch()
    wait_for(lambda: pathlib.Path(root, 'started-command-1').is_file())
    pathlib.Path(root, 'release-command-1').touch()
    wait_for(lambda: all(r['dead'] for r in namespace['task_inventory'](root)))
    settings = dict(gpuQuotaScheduling=1, gpuJobsPerCard=6, gpuMinFreeMemoryGb=22)
    for i in range(2, 9):
        namespace['task_queue_rpc'](root, 'worker', 'accept', dict(job(i), maxConcurrentGpus=1, options=settings), ensure=True)
    wait_for(lambda: len([r for r in namespace['task_inventory'](root) if r['phase'] == 'running' and not r['dead']]) == 6)
    wait_for(lambda: all(pathlib.Path(root, 'started-command-' + str(i)).is_file() for i in range(2, 8)))
    rows = namespace['task_inventory'](root)
    assert sum(r['phase'] == 'queued' for r in rows) == 1
    assert {json.loads(pathlib.Path(root, 'started-command-' + str(i)).read_text())['gpu'] for i in range(2, 8)} == {'0'}
    for i in range(2, 9):
        pathlib.Path(root, 'release-command-' + str(i)).touch()
    namespace['task_tmux'](['kill-window', '-t', report['windowId']])
    assert namespace['task_queue_session'](root, 'worker', refresh=True).startswith('new-owner-sch-')
    print(json.dumps(dict(ok=True, preservedTasks=2, sharedJobs=6, queuedJobs=1, idempotent=True)))
finally:
    subprocess.run(['tmux', 'kill-server'], capture_output=True, timeout=2)
