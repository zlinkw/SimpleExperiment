"""Real isolated, already-running tmux server; production launch functions only."""
import concurrent.futures
import json
import os
import pathlib
import shlex
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "_helpers"))
from extractRuntimeFunctions import extract_runtime_functions
repo = pathlib.Path(__file__).resolve().parents[2]
agent = extract_runtime_functions(str(repo / "dist/runtime/cluster_agent.py"), ["start_job_in_gpu_pane", "start_simple_tmux_command", "worker_task_tmux_location"])
mode = sys.argv[1]
root = pathlib.Path(tempfile.mkdtemp(prefix="simple-identity-tmux-")).resolve()
socket = "simple-identity-probe-" + str(os.getpid())
wrapper = root / "tmux"
wrapper.write_text("#!/bin/sh\nexec /usr/bin/tmux -L " + shlex.quote(socket) + " -f /dev/null \"$@\"\n", encoding="utf-8")
wrapper.chmod(0o700)
shell = root / "probe-shell"
shell.write_text('#!/bin/sh\nexec /bin/bash --noprofile --norc "$@"\n', encoding="utf-8")
shell.chmod(0o700)
os.environ["PATH"] = str(root) + ":" + os.environ["PATH"]
os.environ["SHELL"] = str(shell)
for key in list(os.environ):
    if key.startswith("SIMPLE_EXPERIMENT_") or key == "CUDA_VISIBLE_DEVICES":
        os.environ.pop(key)
base = os.environ.copy()
subprocess.run([str(wrapper), "new-session", "-d", "-s", "bootstrap", str(shell)], check=True, env=base, timeout=3)
assert subprocess.run([str(wrapper), "show-environment", "-g"], capture_output=True, text=True, timeout=3).returncode == 0
started = []
try:
    def launch(index):
        task_root = root / ("任务 ' " + str(index))
        task_root.mkdir()
        identity = {"workflowId": "workflow 中文 ' space", "commandId": "command \"quoted\" ' " + str(index),
            "globalJobId": "workflow 中文 ' space:" + str(index), "planRevision": "revision", "codeFingerprint": "code",
            "index": index, "opaque": "保留\\斜线\n换行 $() `literal`"}
        raw = json.dumps(identity, ensure_ascii=False, indent=2)
        spec = task_root / "spec.json"
        spec.write_text(json.dumps({"index": index, "revision": "revision"}), encoding="utf-8")
        output = task_root / "received.json"
        env = {**base, "SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY": raw,
            "SIMPLE_EXPERIMENT_JOB_COMMAND_ID": identity["commandId"], "SIMPLE_EXPERIMENT_JOB_PROJECT_ID": "project",
            "SIMPLE_EXPERIMENT_MANAGED_JOB": "1", "CUDA_VISIBLE_DEVICES": str(index), "AGENT_API_TOKEN": "fixture-secret-never-forward"}
        if index == 0:
            env.update(SIMPLE_EXPERIMENT_CHECKPOINT_TEST_ONLY="1", SIMPLE_EXPERIMENT_DISTRIBUTED_RESULTS="1")
        args = [sys.executable, "-B", str(repo / "test/features/formalIdentityProbe.py"), str(spec), str(output)]
        exit_file = task_root / "exit.code"
        session = "probe-gpu-" + str(index) if mode == "gpu" else "simple-sch-probe-" + str(index)
        if mode == "gpu":
            subprocess.run([str(wrapper), "new-session", "-d", "-s", session, str(shell)], check=True, env=base, timeout=3)
            if index == 1:
                for key, value in {"SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY": "stale-other-task", "SIMPLE_EXPERIMENT_CHECKPOINT_TEST_ONLY": "1", "SIMPLE_EXPERIMENT_DISTRIBUTED_RESULTS": "1"}.items():
                    subprocess.run([str(wrapper), "set-environment", "-t", session, key, value], check=True, env=base, timeout=3)
            pane = agent.start_job_in_gpu_pane(session, args, str(task_root), env, str(task_root / "task.log"), str(exit_file))
            assert pane.startswith("%")
        else:
            pane = agent.start_simple_tmux_command(session, args, str(task_root), str(task_root / "task.log"), env, str(exit_file))
        started.append(session)
        location = agent.worker_task_tmux_location(pane, session, str(task_root), env)
        assert location["tmuxPane"].startswith("%") and location["tmuxWindowId"].startswith("@")
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline and (not output.is_file() or not exit_file.is_file() or exit_file.read_text(encoding="utf-8").strip() == "pending"):
            time.sleep(0.02)
        assert output.is_file(), "Probe never completed"
        report = json.loads(output.read_text(encoding="utf-8"))
        assert report["raw"] == raw, report
        assert report["writerEntered"], report
        assert len(report["rejections"]) == 3
        assert report["environment"]["SIMPLE_EXPERIMENT_CHECKPOINT_TEST_ONLY"] == ("1" if index == 0 else None), report
        assert report["environment"]["SIMPLE_EXPERIMENT_DISTRIBUTED_RESULTS"] == ("1" if index == 0 else None), report
        assert report["environment"]["CUDA_VISIBLE_DEVICES"] == str(index), report
        assert report["environment"]["AGENT_API_TOKEN"] is None, report
        assert exit_file.read_text(encoding="utf-8") == "0"
        global_env = subprocess.run([str(wrapper), "show-environment", "-g"], capture_output=True, text=True, timeout=3).stdout
        assert "SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY=" not in global_env
        return {"index": index, "pane": location["tmuxPane"], "window": location["tmuxWindowId"], "rawIdentityEqual": True, "writerEntered": True}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        reports = list(pool.map(launch, [0, 1]))
    print(json.dumps({"ok": True, "mode": mode, "reports": reports, "tmux": subprocess.run(["/usr/bin/tmux", "-V"], capture_output=True, text=True).stdout.strip()}, ensure_ascii=False))
finally:
    # Stop only the server created by this fixture. Retain all files and failure evidence.
    subprocess.run([str(wrapper), "kill-server"], env=base, capture_output=True, timeout=3)
