"""Only extracted lifecycle functions, real isolated tmux, stdlib CPU probes."""
import ast, base64, datetime, hashlib, json, os, pathlib, re, shlex, subprocess, sys, tempfile, threading, time, urllib.request, urllib.parse, uuid, textwrap
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

runtime = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
tree = ast.parse(runtime)
nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name.startswith("task_")]
code = ast.unparse(ast.Module(body=nodes, type_ignores=[]))
code += '''
_modern_task_tmux = task_tmux
def task_tmux(args, timeout=5, **kwargs):
    # Emulate the deployed older tmux protocol, while all accepted commands still
    # run against a real isolated tmux server.
    if args[:2] == ["source-file", "-"]: raise RuntimeError("TMUX_QUERY_FAILED: -: No such file or directory")
    if sum(len(str(arg).encode("utf-8")) + 1 for arg in args) > 4096: raise RuntimeError("TMUX_QUERY_FAILED: command too long")
    return _modern_task_tmux(args, timeout=timeout, **kwargs)
'''
root = tempfile.mkdtemp(prefix="se-native-lifecycle-")
os.environ["TMUX_TMPDIR"] = root
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "fixture"
bootstrap = '''import base64, datetime, hashlib, json, os, pathlib, re, shlex, subprocess, sys, threading, time, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
def now_iso(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def collect_local_gpu(): return ([{"id":"0"},{"id":"1"}], "")
def gpu_row_id(row): return row["id"]
def gpu_row_busy(*args): return pathlib.Path(os.environ["TMUX_TMPDIR"], "gpu-busy").exists()
def fixed_gpu_window_name(prefix, gpu): return (prefix or "fixture")+"-gpu-"+gpu
def execute_worker_command(root, job, worker):
    if job["commandId"] == "command-0" and "codeManifest" in job: assert len(job["codeManifest"]) == 180
    task_option(os.environ["TMUX_PANE"],"phase","running")
    identity=json.dumps({"workflowId":job["workflowId"],"commandId":job["commandId"]},ensure_ascii=False)
    probe=pathlib.Path(root)/"probe.py"
    env=dict(os.environ,SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY=identity,CUDA_VISIBLE_DEVICES=str(job["gpuId"]))
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
pathlib.Path(root,"started-"+command).write_text(json.dumps({"at":time.monotonic(),"gpu":os.environ["CUDA_VISIBLE_DEVICES"]}),encoding="utf-8")
time.sleep(1.2 if case=="slow" else 0.1)
if case=="failure": sys.exit(7)
out=pathlib.Path(root)/output;out.mkdir(parents=True,exist_ok=True)
(out/"model.pth").write_bytes(b"cpu-fixture")
metrics=pathlib.Path(root)/csv;metrics.parent.mkdir(parents=True,exist_ok=True);metrics.write_text("metric,value\\nacc,1\\n",encoding="utf-8")
(out/"artifact_manifest.json").write_text(json.dumps({"simpleExperiment":{"runId":command,"status":"completed","mode":"train_test","job":{"index":int(command.split("-")[-1]),"case":case,"seed":42},"outputDir":output,"weights":[output+"/model.pth"],"resultCsv":csv}}),encoding="utf-8")
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
    a["codeManifest"] = {"source/module_" + str(i) + ".py": {"size": i, "sha256": hashlib.sha256(str(i).encode()).hexdigest()} for i in range(180)}
    a["distributedResults"] = {"label": "中文 'quoted' $literal \\ value\n" * 12}
    namespace["task_queue_rpc"](root,"worker","accept",a,ensure=True)
    assert next(row for row in namespace["task_inventory"](root) if row["commandId"] == a["commandId"])["codeManifest"] == a["codeManifest"]
    assert next(row for row in namespace["task_inventory"](root) if row["commandId"] == a["commandId"])["distributedResults"] == a["distributedResults"]
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
    assert control.startswith("fixture-sch-"), control
    epoch=namespace["task_queue_endpoint"](root,"worker")["epoch"]
    namespace["task_tmux"](["send-keys","-t",control,"C-c"])
    wait_for(lambda: namespace["task_tmux"](["display-message","-p","-t",control,"#{pane_dead}"])=="1")
    # Existing queued/running tabs remain the queue across controller recovery.
    namespace["task_queue_rpc"](root,"worker","accept",a,ensure=True)
    assert namespace["task_queue_endpoint"](root,"worker")["epoch"]!=epoch
    stopped=namespace["task_stop"](root,{"targetCommandId":c["commandId"],"projectId":"project","workflowId":"workflow"},"worker")
    assert stopped["stoppedTasks"][0]["paneClosed"]
    # tmux can expose pane_dead before publishing pane_dead_status. Observe a
    # settled exit before asserting the result; do not race that native update.
    wait_for(lambda: all(row["dead"] and row["exitCode"] is not None for row in namespace["task_inventory"](root)))
    observed=namespace["task_query"](root,[a,b])
    assert all(row["status"]=="completed" for row in observed["tasks"]),observed
    # Some live tmux builds return an empty status for retained dead panes.
    # Keep the real inventory/windows/manifests; omit only the unavailable field.
    real_tmux=namespace["task_tmux"]
    def missing_exit_status(args, timeout=5):
        text=real_tmux(args, timeout)
        if args[0]=="list-panes" and "#{pane_dead_status}" in args[-1]:
            lines=[]
            for line in text.splitlines():
                fields=line.split("\t")
                if len(fields)==9 and fields[3]=="1": fields[4]=""
                lines.append("\t".join(fields))
            return "\n".join(lines)
        return text
    namespace["task_tmux"]=missing_exit_status
    try:
        unknown_exit=namespace["task_query"](root,[a,b])["tasks"]
        assert all(row["status"]=="completed" and row["exitCode"] is None for row in unknown_exit),unknown_exit
        ended=namespace["task_inventory"](root)[0]
        manifest=namespace["task_manifest_observation"](root,ended)
        assert manifest["runId"]==ended["commandId"] and manifest["verified"]
        assert namespace["task_public_observation"](root,{**ended,"commandId":"new-run"},ended)["status"]=="unknown"
        assert namespace["task_public_observation"](root,{**ended,"outputDir":"work/not-produced"},ended)["status"]=="unknown"
        assert namespace["task_public_observation"](root,ended,{**ended,"exitCode":7})["status"]=="failed"
    finally:
        namespace["task_tmux"]=real_tmux
    row=namespace["task_inventory"](root)[0]
    # Execute only the actual HTTP capture branch against this private tmux server.
    route_source = runtime.split('            if route == "/api/tmux/capture":', 1)[1].split('            if route == "/api/tmux/list":', 1)[0]
    route_source = 'def capture(self, parsed):\n' + textwrap.indent(textwrap.dedent(route_source), '    ')
    route_globals = dict(re=re, subprocess=subprocess, parse_qs=urllib.parse.parse_qs, SCHEMA_VERSION=1)
    exec(route_source, route_globals)
    class Response:
        def send_json(self, data, status=200): return status, data
    capture = lambda target: route_globals['capture'](Response(), urllib.parse.urlparse('/api/tmux/capture?window=' + urllib.parse.quote(target)))
    status, data = capture(row['tmuxWindowId'])
    assert status == 200 and data['ok'], (status, data)
    assert capture('@1;echo bad')[0] == 400
    namespace["task_tmux"](["rename-window","-t",row["tmuxWindowId"],"manually renamed"])
    assert capture(row['tmuxWindowId'])[1]['ok'], 'window log must remain readable after rename'
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
    declarations=[dict(index=item["experimentIndex"],case=item["case"],seed=item["seed"],mode=item["mode"],output_dir=item["outputDir"],result_csv=item["collectionResultCsv"]) for item in (a,b,failure)]
    assert [item["completed"] for item in namespace["task_declared_results"](root,declarations)]==[True,True,False]
    option = namespace["task_option"]
    damaged = job(4)
    damaged["codeManifest"] = a["codeManifest"]
    prepared = namespace["task_queue_job"](root,"worker",damaged)
    def interrupted(target,key,value=None):
        if key.startswith("job_") and value: raise RuntimeError("synthetic metadata channel failure")
        return option(target,key,value)
    namespace["task_option"] = interrupted
    try:
        namespace["task_queue_accept"](root,"worker",damaged,control,prepared=prepared)
        raise AssertionError("injected metadata failure accepted")
    except RuntimeError as exc: assert "synthetic metadata" in str(exc)
    finally: namespace["task_option"] = option
    rejected = wait_for(lambda: next((row for row in namespace["task_inventory"](root) if row["commandId"] == damaged["commandId"] and row["dead"]),None))
    assert rejected["phase"] == "rejected" and rejected["exitCode"] != 0
    assert not pathlib.Path(root,"started-command-4").exists()
    namespace["task_write_job"](rejected["tmuxPane"],prepared)
    assert namespace["task_read_job"](rejected["tmuxPane"]) == prepared
    header=json.loads(base64.urlsafe_b64decode(option(rejected["tmuxPane"],"job")))
    key="job_"+header["_se_payload"]["sha256"][:16]+"_0"
    saved=option(rejected["tmuxPane"],key)
    option(rejected["tmuxPane"],key,"corrupt")
    try:
        namespace["task_read_job"](rejected["tmuxPane"])
        raise AssertionError("incomplete payload accepted")
    except RuntimeError as exc: assert "TASK_WINDOW_PAYLOAD_INCOMPLETE" in str(exc)
    option(rejected["tmuxPane"],key,saved)
    assert namespace["task_read_job"](rejected["tmuxPane"]) == prepared
    print(json.dumps(dict(ok=True,realTmux=True,callbacks=0,stateFilesRead=0)))
finally:
    # This is the fixture's newly created server under its private TMUX_TMPDIR only.
    subprocess.run(["tmux","kill-server"],capture_output=True,timeout=2)
