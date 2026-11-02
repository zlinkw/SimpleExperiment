"""Private tmux with an older server environment and the current Agent prefix."""
import pathlib
setup = pathlib.Path(__file__).with_name('tmuxTaskLifecycle.fixture.py').read_text(encoding='utf-8').split('\ntry:\n', 1)[0]
exec(compile(setup, 'scheduler_prefix_setup', 'exec'))
try:
    os.environ['SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX'] = 'stale-owner'
    namespace['task_tmux'](['new-session', '-d', '-s', 'unrelated-user', 'sleep 20'])
    os.environ['SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX'] = 'configured-owner'
    namespace['task_queue_rpc'](root, 'worker', 'accept', job(0), ensure=True)
    wait_for(lambda: pathlib.Path(root, 'started-command-0').is_file())
    rows = namespace['task_inventory'](root)
    assert len(rows) == 1 and rows[0]['commandId'] == 'command-0', rows
    sessions = namespace['task_tmux'](['list-sessions', '-F', '#{session_name}']).splitlines()
    assert all(name == 'unrelated-user' or name.startswith('configured-owner-') for name in sessions), sessions
    assert namespace['task_tmux'](['has-session', '-t', '=unrelated-user']) == ''
    original = namespace['task_queue_session'](root, 'worker')
    identity = [(row['commandId'], row['tmuxWindowId']) for row in rows]
    os.environ['SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX'] = 'next-owner'
    assert namespace['task_queue_session'](root, 'worker') == original
    assert [(row['commandId'], row['tmuxWindowId']) for row in namespace['task_inventory'](root)] == identity
    namespace['task_tmux'](['new-session', '-d', '-s', 'foreign-controller', '-n', 'queue', 'sleep 20'])
    namespace['task_option']('foreign-controller:queue', 'endpoint', json.dumps({'root': root + '-other', 'workerId': 'worker'}))
    assert namespace['task_queue_session'](root, 'worker', refresh=True) == original
    following = dict(job(1), tmuxSessionPrefix='next-owner')
    namespace['task_queue_rpc'](root, 'worker', 'accept', following, ensure=True)
    wait_for(lambda: pathlib.Path(root, 'started-command-1').is_file())
    sessions = namespace['task_tmux'](['list-sessions', '-F', '#{session_name}']).splitlines()
    controllers = [name for name in sessions if '-sch-' in name]
    assert controllers == [original], controllers
    assert any(name.startswith('next-owner-gpu-') for name in sessions), sessions
    pending = 'pending-sch-' + original.rsplit('-sch-', 1)[1]
    namespace['task_tmux'](['new-session', '-d', '-s', pending, '-n', 'queue', 'sleep 20'])
    pending_id = namespace['task_tmux'](['display-message', '-p', '-t', pending + ':queue', '#{window_id}'])
    try:
        namespace['task_queue_session'](root, 'worker', refresh=True)
        raise AssertionError('unbound live controller must not permit a duplicate launch')
    except RuntimeError as failure:
        assert 'controller identity is not ready' in str(failure), failure
    namespace['task_option'](pending + ':queue', 'endpoint', json.dumps({'root': root, 'workerId': 'other-worker'}))
    try:
        namespace['task_queue_session'](root, 'worker', refresh=True)
        raise AssertionError('a matching name key cannot replace endpoint ownership proof')
    except ValueError as failure:
        assert 'SCHEDULER_OWNER_MISMATCH' in str(failure), failure
    namespace['task_tmux'](['kill-window', '-t', pending_id])
    assert namespace['task_queue_session'](root, 'worker', refresh=True) == original
    duplicate = 'duplicate-sch-' + original.rsplit('-sch-', 1)[1]
    namespace['task_tmux'](['new-session', '-d', '-s', duplicate, '-n', 'queue', 'sleep 20'])
    namespace['task_option'](duplicate + ':queue', 'endpoint', json.dumps({'root': root, 'workerId': 'worker'}))
    try:
        namespace['task_queue_session'](root, 'worker', refresh=True)
        raise AssertionError('multiple active controllers must never be chosen by prefix')
    except ValueError as failure:
        assert 'SCHEDULER_OWNER_AMBIGUOUS' in str(failure), failure
    assert namespace['task_tmux'](['has-session', '-t', '=unrelated-user']) == ''
    print(json.dumps(dict(ok=True, configuredPrefix=True, unchangedOtherUser=True)))
finally:
    close_fixture_tmux_windows(lambda args: subprocess.run(["tmux", *args], capture_output=True, text=True, timeout=2), private_root=root)
