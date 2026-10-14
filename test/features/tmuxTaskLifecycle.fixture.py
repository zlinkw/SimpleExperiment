"""Only extracted lifecycle functions, real isolated tmux, stdlib CPU probes."""
import ast, base64, datetime, hashlib, json, os, pathlib, re, shlex, subprocess, sys, tempfile, threading, time, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

runtime = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
tree = ast.parse(runtime)
nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name.startswith("task_")]
code = ast.unparse(ast.Module(body=nodes, type_ignores=[]))
root = tempfile.mkdtemp(prefix="se-native-lifecycle-")
os.environ["TMUX_TMPDIR"] = root
bootstrap = '''import base64, datetime, hashlib, json, os, pathlib, re, shlex, subprocess, sys, threading, time, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
def now_iso(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def collect_local_gpu(): return ([{"id":"0"},{"id":"1"}], "")
def gpu_row_id(row): return row["id"]
def gpu_row_busy(*args): return False
def fixed_gpu_window_name(prefix, gpu): return (prefix or "fixture")+"-gpu-"+gpu
def execute_worker_command(root, job, worker):
    task_option(os.environ["TMUX_PANE"],"phase","running")
    identity=json.dumps({"workflowId":job["workflowId"],"commandId":job["commandId"]},ensure_ascii=False)
    probe=pathlib.Path(root)/"probe.py"
    env=dict(os.environ,SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY=identity)
    proc=subprocess.run([sys.executable,str(probe),root,job["commandId"],job["case"],job["outputDir"],job["collectionResultCsv"]],env=env)
    return {"status":"completed" if proc.returncode==0 else "failed","exitCode":proc.returncode}
'''
program = pathlib.Path(root)/"runtime.py"
program.write_text(bootstrap+code+'''
if __name__=="__main__":
    mode=sys.argv[1];root=sys.argv[3];worker=sys.argv[5]
    sys.exit(task_queue_serve(root,worker) if mode=="task-queue" else task_runner(root,worker))
''',encoding="utf-8")
probe = pathlib.Path(root)/"probe.py"
probe.write_text('''import json,os,pathlib,sys,time
root,command,case,output,csv=sys.argv[1:]
identity=json.loads(os.environ["SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY"])
assert identity["commandId"]==command
time.sleep(1.2 if case=="slow" else 0.1)
if case=="failure": sys.exit(7)
out=pathlib.Path(root)/output;out.mkdir(parents=True,exist_ok=True)
(out/"model.pth").write_bytes(b"cpu-fixture")
metrics=pathlib.Path(root)/csv;metrics.parent.mkdir(parents=True,exist_ok=True);metrics.write_text("metric,value\\nacc,1\\n",encoding="utf-8")
(out/"artifact_manifest.json").write_text(json.dumps({"simpleExperiment":{"runId":command,"status":"completed","mode":"train_test","outputDir":output,"weights":[output+"/model.pth"],"resultCsv":csv}}),encoding="utf-8")
''',encoding="utf-8")
namespace={"__file__":str(program)}
exec(bootstrap+code,namespace)
def wait_for(check):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        try:
            value=check()
            if value:return value
        except (RuntimeError, ValueError, OSError):pass
        time.sleep(.05)
    raise AssertionError("bounded native observation timed out")
def job(index,case="slow"):
    return dict(commandId="command-"+str(index),projectId="project",workerId="worker",workflowId="workflow",
        planFile="experiments/plans/中文 plan.yaml",planRevision="a"*64,codeFingerprint="b"*64,globalJobId="workflow:"+str(index),
        experimentIndex=index,case=case,seed=42,resultPathPolicy="declared",outputDir="work/job"+str(index),
        collectionResultCsv="tmp/result/job"+str(index)+".csv",planJobCount=4,mode="train_test",executionMode="train_test",maxConcurrentGpus=2)
try:
    # Deliberately corrupt legacy state: none of the native functions can read it.
    for name in ("worker_task_snapshot.json","distributed_plan_queue.json","worker_start_claims.json"):
        (pathlib.Path(root)/name).write_text("corrupt legacy state",encoding="utf-8")
    a,b,c=job(0),job(1),job(2,"failure")
    namespace["task_queue_rpc"](root,"worker","accept",a,ensure=True)
    namespace["task_queue_rpc"](root,"worker","accept",b,ensure=True)
    first=wait_for(lambda: len([r for r in namespace["task_inventory"](root) if r["phase"]=="running" and not r["dead"]])==2)
    duplicate=namespace["task_queue_rpc"](root,"worker","accept",a,ensure=True)
    assert len([r for r in namespace["task_inventory"](root) if r["commandId"]==a["commandId"]])==1
    conflict={**job(8),"outputDir":a["outputDir"]}
    try:
        namespace["task_queue_rpc"](root,"worker","accept",conflict,ensure=True)
        raise AssertionError("same declared output must have only one managed tmux writer")
    except RuntimeError as exc:
        assert "TASK_OUTPUT_BUSY" in str(exc)
    namespace["task_queue_rpc"](root,"worker","accept",c,ensure=True)
    wait_for(lambda: any(r["commandId"]==c["commandId"] and r["phase"]=="queued" for r in namespace["task_inventory"](root)))
    control=namespace["task_queue_session"](root,"worker")+":queue"
    epoch=namespace["task_queue_endpoint"](root,"worker")["epoch"]
    namespace["task_tmux"](["send-keys","-t",control,"C-c"])
    wait_for(lambda: namespace["task_tmux"](["display-message","-p","-t",control,"#{pane_dead}"])=="1")
    # Existing queued/running tabs remain the queue across controller recovery.
    namespace["task_queue_rpc"](root,"worker","accept",a,ensure=True)
    assert namespace["task_queue_endpoint"](root,"worker")["epoch"]!=epoch
    stopped=namespace["task_stop"](root,{"targetCommandId":c["commandId"],"projectId":"project","workflowId":"workflow"},"worker")
    assert stopped["stoppedTasks"][0]["paneClosed"]
    wait_for(lambda: all(row["dead"] for row in namespace["task_inventory"](root)))
    observed=namespace["task_query"](root,[a,b])
    assert all(row["status"]=="completed" for row in observed["tasks"]),observed
    row=namespace["task_inventory"](root)[0]
    namespace["task_tmux"](["rename-window","-t",row["tmuxWindowId"],"manually renamed"])
    namespace["task_tmux"](["kill-window","-t",row["tmuxWindowId"]])
    namespace["task_tmux"](["send-keys","-t",control,"C-c"])
    wait_for(lambda: namespace["task_tmux"](["display-message","-p","-t",control,"#{pane_dead}"])=="1")
    try:
        namespace["task_queue_rpc"](root,"worker","accept",a if row["commandId"]==a["commandId"] else b,ensure=True)
        raise AssertionError("manually closed accepted task must never be replayed")
    except RuntimeError as exc:
        assert "TASK_ALREADY_ACCEPTED_WINDOW_CLOSED" in str(exc)
    assert namespace["task_query"](root,[a,b])["tasks"][-1]["status"]=="completed"
    failure=job(3,"failure")
    namespace["task_queue_rpc"](root,"worker","accept",failure,ensure=True)
    wait_for(lambda: any(r["commandId"]==failure["commandId"] and r["dead"] for r in namespace["task_inventory"](root)))
    failed=next(row for row in namespace["task_query"](root,[failure])["tasks"] if row["commandId"]==failure["commandId"])
    assert failed["status"]=="failed" and failed["exitCode"]==7,failed
    print(json.dumps(dict(ok=True,realTmux=True,callbacks=0,stateFilesRead=0)))
finally:
    # This is the fixture's newly created server under its private TMUX_TMPDIR only.
    subprocess.run(["tmux","kill-server"],capture_output=True,timeout=2)
