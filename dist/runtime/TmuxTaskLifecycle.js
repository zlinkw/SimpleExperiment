"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TMUX_TASK_LIFECYCLE_PYTHON = void 0;
/** Embedded in the existing Agent runtime: no extra deployed module or state database. */
exports.TMUX_TASK_LIFECYCLE_PYTHON = String.raw `
TASK_LIFECYCLE_PROTOCOL = 2
NATIVE_TASK_RUNNER_CONTEXT = None
TASK_SCHEDULER_UPDATE_ERROR = ""

def task_tmux(args, timeout=5):
    proc = subprocess.run(["tmux", *args], capture_output=True, text=True, timeout=timeout)
    if proc.returncode:
        low = (proc.stderr or "").lower()
        absent = "no server running" in low or "no sessions" in low or "error connecting" in low and any(text in low for text in ("no such file or directory", "connection refused"))
        if args[0] in ("list-panes", "list-windows") and absent:
            return ""
        raise RuntimeError("TMUX_QUERY_FAILED: " + (proc.stderr or "")[-1000:])
    return proc.stdout.rstrip("\r\n")

def task_option(target, key, value=None):
    if value is None:
        return task_tmux(["display-message", "-p", "-t", target, "#{@se_" + key + "}"])
    task_tmux(["set-option", "-w", "-t", target, "@se_" + key, str(value)])

def task_safe_path(root, relative):
    value = str(relative or "").replace("\\", "/")
    if not value or value.startswith("/") or any(x in value for x in (":", "*", "?", "\0")) or any(x in ("", ".", "..", ".git", "clean_dir") for x in value.split("/")):
        raise ValueError("UNSAFE_TASK_PATH")
    root = os.path.realpath(root)
    full = os.path.join(root, *value.split("/"))
    parent = root
    for leaf in value.split("/"):
        parent = os.path.join(parent, leaf)
        if os.path.islink(parent):
            raise ValueError("TASK_PATH_LINK")
    if os.path.commonpath([root, os.path.realpath(full)]) != root or os.path.realpath(full) == root:
        raise ValueError("UNSAFE_TASK_PATH")
    return full

def task_inventory(root):
    fmt = "#{pane_id}\t#{window_id}\t#{session_name}\t#{pane_dead}\t#{pane_dead_status}\t#{@se_job}\t#{@se_phase}\t#{@se_gpu}\t#{@se_log}"
    rows = []
    for line in task_tmux(["list-panes", "-a", "-F", fmt]).splitlines():
        fields = line.split("\t")
        if len(fields) != 9 or not fields[5]:
            continue
        try:
            job = json.loads(base64.urlsafe_b64decode(fields[5]).decode("utf-8"))
        except (ValueError, UnicodeError):
            continue
        if job.get("root") != os.path.realpath(root) or job.get("lifecycleProtocol") != 2:
            continue
        if job.get("pane") and job["pane"] != fields[0]:
            continue
        row = {**job, "tmuxPane": fields[0], "tmuxWindowId": fields[1], "tmuxSession": fields[2],
               "dead": fields[3] == "1", "phase": fields[6], "gpuId": fields[7] or job.get("gpuId", ""), "logPath": fields[8]}
        row["exitCode"] = int(fields[4]) if re.fullmatch(r"-?\d+", fields[4]) else None
        rows.append(row)
    return rows

def task_manifest_observation(root, job):
    output = str(job.get("outputDir") or "")
    manifest = task_safe_path(root, output + "/artifact_manifest.json")
    if not os.path.isfile(manifest):
        return None
    if os.path.getsize(manifest) > 1024 * 1024:
        raise ValueError("TASK_MANIFEST_TOO_LARGE")
    with open(manifest, encoding="utf-8") as handle:
        document = json.load(handle)
    report = document.get("simpleExperiment") or {}
    if not report:
        return None  # Historical project evidence remains available to manual result inspection.
    files = list(report.get("weights") or [])
    mode = report.get("mode")
    result_csv = report.get("resultCsv")
    if mode in ("test", "train_test") and result_csv:
        files.append(result_csv)
    present = bool(files) and all(os.path.isfile(task_safe_path(root, file)) for file in files)
    for file in files:
        expected = (report.get("fileStats") or {}).get(file)
        if expected and os.path.isfile(task_safe_path(root, file)):
            info = os.stat(task_safe_path(root, file))
            actual = {"size": info.st_size, "mtimeNs": info.st_mtime_ns, "ctimeNs": info.st_ctime_ns, "inode": info.st_ino, "device": info.st_dev}
            if actual != expected:
                present = False
    if mode in ("train", "train_test") and not report.get("weights"):
        present = False
    if mode in ("test", "train_test") and result_csv != job.get("collectionResultCsv"):
        present = False
    expected_mode = "test" if job.get("checkpointTestOnly") and job.get("executionMode") == "train_test" else job.get("mode") or job.get("executionMode")
    return {"runId": report.get("runId"), "status": report.get("status"), "present": present, "job": report.get("job"),
            "verified": present and report.get("outputDir") == output and (not expected_mode or mode == expected_mode)}

def task_public_observation(root, job, row=None):
    result_error = ""
    try:
        result = task_manifest_observation(root, job)
    except Exception as exc:
        result, result_error = None, str(exc)
    observed = {"lifecycleProtocol": 2, "commandId": job["commandId"], "projectId": job["projectId"],
                "workerId": job["workerId"], "observedAt": now_iso(), "result": result}
    if result_error:
        observed["resultQueryError"] = result_error
    if row:
        observed["tmux"] = {"windowId": row["tmuxWindowId"], "paneId": row["tmuxPane"], "dead": row["dead"],
                            "exitCode": row["exitCode"], "phase": row["phase"]}
    status = "unknown"
    if row and not row["dead"]:
        status = "queued" if row["phase"] in ("queued", "bound", "admitted", "starting") else "running" if row["phase"] == "running" else "unknown"
    elif row and row["exitCode"] != 0:
        status = "failed"
    elif result and result["runId"] == job["commandId"] and result["status"] == "completed" and result["verified"]:
        status = "completed"
    public = {key: job[key] for key in ("commandId", "projectId", "workerId", "workflowId", "globalJobId", "planFile", "planRevision", "codeFingerprint",
        "experimentIndex", "case", "seed", "outputDir", "collectionResultCsv", "resultPathPolicy", "planJobCount", "fullPlanJobCount", "enqueuedAt",
        "executionMode", "mode", "checkpointSource", "lifecycleProtocol", "runKey", "dispatchPolicy") if key in job}
    actual_mode = "test" if job.get("checkpointTestOnly") and job.get("executionMode") == "train_test" else job.get("mode") or job.get("executionMode")
    return {**public, "actualExecutionMode": actual_mode, **({k: row[k] for k in ("tmuxWindowId", "tmuxPane", "tmuxSession", "gpuId", "exitCode")} if row else {}),
            "status": status, "logPath": row.get("logPath") if row else "", "observation": observed, "lifecycleProtocol": 2, "durableAccepted": True}


def task_declared_results(root, declarations):
    if not isinstance(declarations, list) or len(declarations) > 500:
        raise ValueError("DECLARED_RESULT_QUERY_LIMIT")
    results = []
    for declaration in declarations:
        try:
            job = {"outputDir": declaration["output_dir"], "collectionResultCsv": declaration.get("result_csv"), "mode": declaration["mode"]}
            result = task_manifest_observation(root, job)
            expected = {"index": declaration["index"], "case": declaration["case"], "seed": declaration["seed"]}
            results.append({"index": declaration["index"], **job, "completed": bool(result and result["status"] == "completed"
                and result["verified"] and result.get("job") == expected), "runId": result.get("runId") if result else None})
        except Exception as exc:
            results.append({"index": declaration.get("index") if isinstance(declaration, dict) else None, "completed": False, "error": str(exc)})
    return results

def task_query(root, queries=()):
    if not isinstance(queries, (list, tuple)) or len(queries) > 500:
        raise ValueError("TASK_QUERY_LIMIT")
    rows = task_inventory(root)
    valid_queries, query_errors = [], []
    for index, query in enumerate(queries):
        try:
            if not isinstance(query, dict) or not all(isinstance(query.get(key), str) and query[key].strip() for key in ("commandId", "projectId", "workerId", "outputDir")):
                raise ValueError("TASK_QUERY_IDENTITY_REQUIRED")
            task_safe_path(root, query["outputDir"])
            valid_queries.append(query)
        except Exception as exc:
            query_errors.append({"index": index, "commandId": query.get("commandId") if isinstance(query, dict) else None, "error": str(exc)})
    queries = valid_queries
    # Old managed tabs can be controlled by their real tmux markers, without a task snapshot.
    if queries and "local_stop_tmux_inventory" in globals():
        legacy = local_stop_tmux_inventory(root)
        for query in queries:
            if not isinstance(query, dict):
                continue
            for tab in legacy:
                if tab["command"] == query.get("commandId") and tab["project"] == query.get("projectId") and not any(row["tmuxPane"] == tab["pane"] for row in rows):
                    rows.append({**query, "tmuxPane": tab["pane"], "tmuxWindowId": tab["window"], "tmuxSession": tab["session"],
                        "dead": tab["dead"] == "1", "exitCode": int(tab["exitCode"]) if re.fullmatch(r"-?\d+", tab["exitCode"]) else None,
                        "phase": "running", "gpuId": query.get("gpuId", ""), "logPath": ""})
    # Selectors bound artifact reads for absent windows; they cannot hide a real
    # exited pane just because another job was selected for a result query.
    jobs = {(row["projectId"], row["commandId"]): row for row in rows}
    for query in queries:
        if not isinstance(query, dict) or not query.get("commandId") or not query.get("projectId") or not query.get("workerId"):
            raise ValueError("TASK_QUERY_IDENTITY_REQUIRED")
        task_safe_path(root, query.get("outputDir"))
        key = (query["projectId"], query["commandId"])
        if key not in jobs:
            jobs[key] = query
    tasks = []
    cancelled_by_worker = {}
    for key, job in jobs.items():
        row = next((item for item in rows if (item["projectId"], item["commandId"]) == key), None)
        try:
            public = task_public_observation(root, job, row)
            try:
                if job["workerId"] not in cancelled_by_worker:
                    cancelled_by_worker[job["workerId"]] = json.loads(task_option(task_queue_session(root, job["workerId"]) + ":queue", "cancelled") or "[]")
                cancelled = cancelled_by_worker[job["workerId"]]
                public["observation"]["cancelled"] = job["commandId"] in cancelled
                if not row and job["commandId"] in cancelled and public["status"] != "completed":
                    public["status"] = "cancelled"
            except Exception:
                pass
            if public["status"] == "failed" and row:
                try:
                    public["error"] = task_tmux(["capture-pane", "-p", "-t", row["tmuxPane"], "-S", "-80"])[-8000:]
                except RuntimeError as exc:
                    # A user may close an exited tab between inventory and log capture.
                    # A fresh inventory distinguishes disappearance from a broken tmux query.
                    if any(item["tmuxPane"] == row["tmuxPane"] for item in task_inventory(root)):
                        raise
                    public["logQueryError"] = str(exc)
            tasks.append(public)
        except Exception as exc:
            tasks.append({**job, "status": "unknown", "lifecycleProtocol": 2, "observation": {
                "lifecycleProtocol": 2, "commandId": job["commandId"], "projectId": job["projectId"], "workerId": job["workerId"],
                "observedAt": now_iso(), "queryError": str(exc)}})
    cleanup_executors = []
    for line in task_tmux(["list-panes", "-a", "-F", "#{pane_dead}\t#{pane_id}\t#{window_id}\t#{@sftp_cleanup_target}"]).splitlines():
        fields = line.split("\t")
        if len(fields) == 4 and fields[0] != "1" and fields[3]:
            binding = json.loads(base64.urlsafe_b64decode(fields[3]).decode("utf-8"))
            if binding.get("root") == os.path.realpath(root):
                cleanup_executors.append({"paneId": fields[1], "windowId": fields[2], "relativePath": binding["relativePath"], "destination": binding["destination"]})
    return {"schemaVersion": 1, "generatedAt": now_iso(), "tasks": tasks, "queryComplete": True, "queryErrors": query_errors, "cleanupExecutors": cleanup_executors,
            "activeOperations": active_cleanup_operations(root) if "active_cleanup_operations" in globals() else [],
            "capabilities": {"schemaVersion": 1, "durablePlanQueue": True, "declaredJobPaths": True,
                             "idleGpuAdmission": True, "queuedJobRecall": True, "taskLifecycle": 2, "manualDispatch": 1,
                             "gpuMemoryRatioScheduling": task_memory_scheduler_capability(root), "declaredResultQuery": 1}}

def task_queue_session(root, worker_id):
    key = hashlib.sha256((os.path.realpath(root) + "\0" + worker_id).encode("utf-8")).hexdigest()[:16]
    return "simple-sch-" + key

def task_describe_plan(root, discovery):
    plan = str(discovery.get("planFile") or "")
    task_safe_path(root, plan)
    env = os.environ.copy()
    env["SIMPLE_EXPERIMENT_CONDA_ENV"] = str(discovery.get("condaEnv") or "")
    args = [simple_runtime_python(env), "-B", "-X", "utf8", cluster_scheduler_path(root), "--describe-jobs", "--plan", plan]
    proc = subprocess.run(args, cwd=root, env=env, capture_output=True, text=True, timeout=8)
    if proc.returncode or len(proc.stdout) > 2 * 1024 * 1024:
        raise RuntimeError("PLAN_DECLARATIONS_QUERY_FAILED: " + (proc.stderr or "")[-1000:])
    return json.loads(proc.stdout)["jobs"]

def task_queue_endpoint(root, worker_id):
    session = task_queue_session(root, worker_id)
    text = task_tmux(["display-message", "-p", "-t", session + ":queue", "#{@se_endpoint}"])
    endpoint = json.loads(text)
    if endpoint.get("root") != os.path.realpath(root) or endpoint.get("workerId") != worker_id:
        raise ValueError("SCHEDULER_OWNER_MISMATCH")
    return endpoint


def task_runtime_files(root):
    identity = globals().get("AGENT_LIFECYCLE_IDENTITY") or {}
    if identity.get("runtimeFiles"):
        return dict(identity["runtimeFiles"])
    paths = {"cluster_agent.py": os.path.abspath(__file__)}
    if "cluster_scheduler_path" in globals():
        paths["cluster_scheduler.py"] = cluster_scheduler_path(root)
    return {name: hashlib.sha256(pathlib.Path(filename).read_bytes()).hexdigest() for name, filename in paths.items()}


def task_scheduler_runtime_report(root, worker_id):
    """Read the running controller's native binding; never expose its channel secret."""
    session = task_queue_session(root, worker_id)
    try:
        found = subprocess.run(["tmux", "has-session", "-t", "=" + session], capture_output=True, text=True, timeout=3)
        if found.returncode:
            error = (found.stderr or "").lower()
            if any(text in error for text in ("can't find session", "no server running", "no sessions")) or "error connecting" in error and "no such file or directory" in error:
                return {"protocol": 1, "status": "absent", "workerId": worker_id}
            raise RuntimeError("SCHEDULER_QUERY_FAILED: " + error[-500:])
        fields = task_tmux(["display-message", "-p", "-t", session + ":queue",
            "#{window_id}\t#{pane_id}\t#{pane_dead}\t#{window_panes}\t#{@se_job}"]).split("\t")
        if len(fields) != 5 or not re.fullmatch(r"@\d+", fields[0]) or not re.fullmatch(r"%\d+", fields[1]) or fields[3] != "1" or fields[4]:
            raise ValueError("SCHEDULER_CONTROL_WINDOW_UNVERIFIED")
        endpoint = task_queue_endpoint(root, worker_id)
        version = globals().get("RUNTIME_VERSION", "fixture")
        current = fields[2] != "1" and endpoint.get("runningVersion") == version and endpoint.get("runtimeFiles") == task_runtime_files(root)
        return {"protocol": 1, "status": "current" if current else "update_required", "workerId": worker_id,
            "windowId": fields[0], "paneId": fields[1], "dead": fields[2] == "1", "epoch": endpoint["epoch"],
            "runningVersion": endpoint.get("runningVersion"), "runtimeFiles": endpoint.get("runtimeFiles") or {},
            "gpuMemoryRatioScheduling": endpoint.get("gpuMemoryRatioScheduling", 0)}
    except Exception as exc:
        return {"protocol": 1, "status": "unknown", "workerId": worker_id, "error": str(exc)}


def task_update_scheduler_runtime(root, worker_id):
    """Agent deployment replaces only the verified queue controller, retaining all task windows."""
    before = task_scheduler_runtime_report(root, worker_id)
    if before["status"] in ("absent", "current"):
        return before
    if before["status"] != "update_required":
        raise RuntimeError("SCHEDULER_RUNTIME_UNVERIFIED: " + before.get("error", "unknown controller"))
    pane = before["paneId"]
    # Recheck the exact pane, window and epoch immediately before replacement.
    if task_scheduler_runtime_report(root, worker_id) != before:
        raise RuntimeError("SCHEDULER_CONTROL_CHANGED")
    argv = [sys.executable, "-B", os.path.abspath(__file__), "task-queue", "--project-dir", os.path.realpath(root), "--worker-id", worker_id]
    if "agent_dir" in globals():
        argv.extend(["--state-dir", agent_dir(root)])
    task_tmux(["set-option", "-w", "-t", before["windowId"], "remain-on-exit", "on"])
    # -k replaces this controller process tree only. Queued/running tasks have independent windows.
    task_tmux(["respawn-pane", "-k", "-t", pane, "-c", os.path.realpath(root), "exec " + shlex.join(argv)])
    deadline = time.monotonic() + 4
    while True:
        report = task_scheduler_runtime_report(root, worker_id)
        if report["status"] == "current" and report.get("epoch") != before["epoch"]:
            return report
        if time.monotonic() >= deadline:
            raise RuntimeError("SCHEDULER_RESTART_UNCONFIRMED: " + json.dumps(report))
        time.sleep(0.05)


def task_memory_scheduler_capability(root):
    worker_id = os.environ.get("SIMPLE_EXPERIMENT_WORKER_ID") or "worker"
    session = task_queue_session(root, worker_id)
    exists = subprocess.run(["tmux", "has-session", "-t", "=" + session], capture_output=True, timeout=3).returncode == 0
    if not exists:
        return 1  # The next accept starts the new controller.
    try:
        if task_tmux(["display-message", "-p", "-t", session + ":queue", "#{pane_dead}"]) == "1":
            return 1  # A dead controller is already recovered by the existing bounded startup path.
        return int(task_queue_endpoint(root, worker_id).get("gpuMemoryRatioScheduling") == 1)
    except Exception:
        return 0

def task_queue_rpc(root, worker_id, action, payload, ensure=False):
    if ensure:
        session = task_queue_session(root, worker_id)
        previous_epoch = None
        exists = subprocess.run(["tmux", "has-session", "-t", session], capture_output=True, timeout=3).returncode == 0
        argv = [sys.executable, "-B", os.path.abspath(__file__), "task-queue", "--project-dir", os.path.realpath(root), "--worker-id", worker_id]
        if "agent_dir" in globals():
            argv.extend(["--state-dir", agent_dir(root)])
        shell = "exec " + shlex.join(argv)
        if not exists:
            made = subprocess.run(["tmux", "new-session", "-d", "-s", session, "-n", "queue", "-c", root,
                                   shell], capture_output=True, text=True, timeout=5)
            if made.returncode and "duplicate session" not in (made.stderr or "").lower():
                raise RuntimeError("SCHEDULER_START_FAILED: " + str(made.stderr))
            task_tmux(["set-option", "-w", "-t", session + ":queue", "remain-on-exit", "on"])
        elif task_tmux(["display-message", "-p", "-t", session + ":queue", "#{pane_dead}"]) == "1":
            try:
                previous_epoch = task_queue_endpoint(root, worker_id).get("epoch")
            except Exception:
                pass
            # Never kill a healthy controller. Concurrent recovery may already have respawned this dead pane.
            subprocess.run(["tmux", "respawn-pane", "-t", session + ":queue", shell], capture_output=True, timeout=5)
        # Bounded startup observation. This is not an acceptance/termination wait.
        deadline = time.monotonic() + 4
        while True:
            try:
                endpoint = task_queue_endpoint(root, worker_id)
                if previous_epoch and endpoint.get("epoch") == previous_epoch:
                    raise RuntimeError("SCHEDULER_RESTARTING")
                break
            except Exception:
                if time.monotonic() >= deadline:
                    raise RuntimeError("SCHEDULER_QUERY_FAILED: control window is not ready")
                time.sleep(0.05)
    else:
        endpoint = task_queue_endpoint(root, worker_id)
    if action == "accept" and payload.get("dispatchPolicy") != "manual" and (payload.get("options") or {}).get("gpuMemoryRatioEnabled") is True and endpoint.get("gpuMemoryRatioScheduling") != 1:
        raise RuntimeError("SCHEDULER_UPDATE_REQUIRED: restart this project's Scheduler control window to enable memory-ratio scheduling; task windows are preserved")
    body = json.dumps({"action": action, "payload": payload, "epoch": endpoint["epoch"]}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request("http://" + endpoint["host"] + ":" + str(endpoint["port"]) + "/control", data=body,
                                    headers={"Content-Type": "application/json", "Authorization": "Bearer " + endpoint["secret"]})
    with urllib.request.urlopen(request, timeout=8) as response:
        result = json.loads(response.read(1024 * 1024))
    if not result.get("ok"):
        raise RuntimeError(result.get("error") or "SCHEDULER_ACTION_FAILED")
    return result.get("value")

def task_queue_job(root, worker_id, command):
    allowed = {"action", "commandId", "operationId", "runKey", "projectId", "workflowId", "planFile", "planRevision", "codeFingerprint",
               "globalJobId", "experimentIndex", "case", "seed", "outputDir", "collectionResultCsv", "resultPathPolicy", "planJobCount",
               "fullPlanJobCount", "enqueuedAt", "workerId", "gpuId", "requireIdleGpu", "executionMode", "mode", "checkpointSource",
               "checkpointTestOnly", "condaEnv", "distributedResults", "codeSyncProofId", "codeManifest", "manifestDigest", "tmuxSessionPrefix", "maxConcurrentGpus",
               "gpuIdleUtilThreshold", "gpuIdleMemThresholdMb", "schedulerPath", "defaultResultCsvDir", "lifecycleProtocol", "dispatchPolicy",
               "gpuMemoryRatioEnabled", "gpuMemoryPerJobGb", "gpuMemoryMaxJobsPerGpu", "gpuMemoryReserveGb", "gpuMemoryTolerancePercent"}
    job = {key: command[key] for key in allowed if key in command}
    options = command.get("options") if isinstance(command.get("options"), dict) else {}
    job["options"] = {key: value for key, value in options.items() if key in allowed or key == "distributedResults"}
    for key in allowed:
        if key not in job and key in job["options"]:
            job[key] = job["options"][key]
    if job.get("workerId") != worker_id or job.get("resultPathPolicy") != "declared":
        raise ValueError("TASK_OWNER_REQUIRED")
    if job.get("dispatchPolicy", "automatic") not in ("manual", "automatic"):
        raise ValueError("TASK_DISPATCH_POLICY_INVALID")
    if job.get("dispatchPolicy") == "manual" and not str(job.get("gpuId") or "").strip():
        raise ValueError("MANUAL_GPU_REQUIRED")
    if not re.fullmatch(r"[a-zA-Z0-9._:-]{1,128}", str(job.get("commandId") or "")):
        raise ValueError("TASK_COMMAND_ID_REQUIRED")
    for key in ("projectId", "workflowId", "planFile", "outputDir", "collectionResultCsv", "planRevision", "codeFingerprint", "globalJobId"):
        if not job.get(key):
            raise ValueError("TASK_IDENTITY_REQUIRED: " + key)
    for key in ("planFile", "outputDir", "collectionResultCsv"):
        task_safe_path(root, job[key])
    index = job.get("experimentIndex")
    if not isinstance(index, int) or isinstance(index, bool) or index < 0 or job["globalJobId"] != job["workflowId"] + ":" + str(index):
        raise ValueError("TASK_GLOBAL_JOB_ID_MISMATCH")
    if "attempts" in job["outputDir"].split("/"):
        raise ValueError("HISTORICAL_ATTEMPT_READ_ONLY")
    job.update(root=os.path.realpath(root), lifecycleProtocol=2, runKey=job["commandId"], action="start-worker-task")
    overlap = lambda a, b: a == b or a.startswith(b + "/") or b.startswith(a + "/")
    if any(not row["dead"] and row["commandId"] != job["commandId"] and
           any(overlap(str(row.get(a) or ""), job[b]) for a in ("outputDir", "collectionResultCsv") for b in ("outputDir", "collectionResultCsv"))
           for row in task_inventory(root)):
        raise ValueError("TASK_OUTPUT_BUSY: another managed tmux job uses this declared output/result")
    return job

def task_queue_accept(root, worker_id, command, window, prepared=None):
    job = prepared if prepared is not None else task_queue_job(root, worker_id, command)
    title = pathlib.Path(job["planFile"]).stem + "·" + str(job.get("case") or job.get("experimentIndex")) + "·seed" + str(job.get("seed")) + "·" + job["commandId"][-8:]
    title = title.replace(":", "_").replace("\n", "_")[:160]
    runner = [sys.executable, "-B", os.path.abspath(__file__), "task-runner", "--project-dir", root, "--worker-id", worker_id]
    if "agent_dir" in globals():
        runner.extend(["--state-dir", agent_dir(root)])
    pane = task_tmux(["new-window", "-d", "-t", task_queue_session(root, worker_id), "-n", title, "-c", root,
                      "-P", "-F", "#{pane_id}", "--", "sh", "-c", "exec " + shlex.join(runner)])
    job["pane"] = pane
    task_tmux(["set-option", "-w", "-t", pane, "remain-on-exit", "on"])
    task_option(pane, "job", base64.urlsafe_b64encode(json.dumps(job, ensure_ascii=False).encode("utf-8")).decode("ascii"))
    task_option(pane, "phase", "queued")
    for key, value in (("@simple_experiment_command", job["commandId"]), ("@simple_experiment_project", job["projectId"])):
        task_tmux(["set-option", "-w", "-t", pane, key, value])
    return job

def task_memory_info(gpu, options):
    if options.get("gpuMemoryRatioEnabled") is not True:
        return None
    def number(value, default=None):
        try:
            parsed = float(value)
            return parsed if parsed == parsed and abs(parsed) != float("inf") else default
        except (ValueError, TypeError):
            return default
    total = number(next((gpu[key] for key in ("memoryTotalMb", "memory_total_mb", "memoryTotal", "memory_total") if gpu.get(key) is not None), None))
    used = number(next((gpu[key] for key in ("memoryUsedMb", "memory_used_mb", "memoryUsed", "memory_used") if gpu.get(key) is not None), None))
    if total is None or used is None or total <= 0 or used < 0 or used > total:
        return None
    base = max(1, min(1024, number(options.get("gpuMemoryPerJobGb"), 24))) * 1024
    tolerance = max(0, min(5, number(options.get("gpuMemoryTolerancePercent"), 3))) / 100
    ratio = total / base
    upper = int(ratio) + int(ratio != int(ratio))
    limit = max(1, upper if ratio >= upper * (1 - tolerance) else int(ratio))
    ceiling = max(0, min(1024, int(number(options.get("gpuMemoryMaxJobsPerGpu"), 0))))
    if ceiling:
        limit = min(limit, ceiling)
    reserve = max(0, min(1024, number(options.get("gpuMemoryReserveGb"), 0))) * 1024
    return {"limit": limit, "unit": min(total, base) * (1 - tolerance), "budget": total - reserve,
            "free": total - used - reserve - gpu.get("_se_reserved_mb", 0)}


def task_admission_gpu(row, gpus, occupied):
    options = row.get("options") or {}
    pinned = str(row.get("gpuId") or "")
    if row.get("dispatchPolicy") == "manual":
        if not any(gpu_row_id(gpu) == pinned for gpu in gpus):
            raise ValueError("MANUAL_GPU_NOT_VISIBLE: " + pinned)
        return pinned
    cap = max(1, int(row.get("maxConcurrentGpus") or options.get("maxConcurrentGpus") or len(gpus) or 1))
    pinned = pinned if row.get("requireIdleGpu") else ""
    for gpu in gpus:
        gpu_id = gpu_row_id(gpu)
        if pinned and gpu_id != pinned:
            continue
        count = occupied.get(gpu_id, 0) if isinstance(occupied, dict) else int(gpu_id in occupied)
        active_ids = [gpu_row_id(item) for item in gpus if gpu_row_id(item) in occupied]
        if count and gpu_id not in active_ids[:cap]:
            continue
        memory = task_memory_info(gpu, options)
        if count >= (memory["limit"] if memory else 1):
            continue
        if not count and len(occupied) >= min(cap, len(gpus)):
            continue
        if memory and (memory["free"] < memory["unit"] or memory["budget"] < (count + 1) * memory["unit"]):
            continue
        if (not count or not memory) and gpu_row_busy(gpu,
                row.get("gpuIdleUtilThreshold", options.get("gpuIdleUtilThreshold")),
                row.get("gpuIdleMemThresholdMb", options.get("gpuIdleMemThresholdMb"))):
            continue
        return gpu_id
    return None

def task_queue_serve(root, worker_id):
    root = os.path.realpath(root)
    controller = os.environ["TMUX_PANE"]
    secret, epoch = uuid.uuid4().hex, uuid.uuid4().hex
    mutex = threading.RLock()
    wake = threading.Event()
    remembered = set(json.loads(task_option(controller, "cancelled") or "[]"))
    accepted = set(json.loads(task_option(controller, "accepted") or "[]")) | {row["commandId"] for row in task_inventory(root)}
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass
        def do_POST(self):
            try:
                if self.headers.get("Authorization") != "Bearer " + secret:
                    raise ValueError("SCHEDULER_AUTH_REQUIRED")
                size = int(self.headers.get("Content-Length") or 0)
                if size < 1 or size > 256 * 1024:
                    raise ValueError("SCHEDULER_REQUEST_LIMIT")
                request = json.loads(self.rfile.read(size))
                if request.get("epoch") != epoch:
                    raise ValueError("SCHEDULER_INSTANCE_CHANGED")
                payload = request.get("payload") or {}
                with mutex:
                    if request["action"] == "accept":
                        command_id = payload.get("commandId")
                        if command_id in remembered:
                            raise ValueError("TASK_CANCELLED")
                        found = next((row for row in task_inventory(root) if row["commandId"] == command_id), None)
                        if found:
                            if any(found.get(key) != payload.get(key) for key in ("projectId", "workflowId", "outputDir")):
                                raise ValueError("TASK_COMMAND_ID_CONFLICT")
                            value = task_public_observation(root, found, found)
                        elif command_id in accepted:
                            raise ValueError("TASK_ALREADY_ACCEPTED_WINDOW_CLOSED: query result without redispatch")
                        else:
                            prepared = task_queue_job(root, worker_id, payload)
                            if len(accepted) >= 10000:
                                raise ValueError("SCHEDULER_ACCEPTANCE_CAPACITY")
                            # Reserve the command in native window metadata before creating its tab.
                            # A controller restart cannot replay a job whose tab was manually closed.
                            accepted.add(command_id)
                            task_option(controller, "accepted", json.dumps(sorted(accepted)))
                            job = task_queue_accept(root, worker_id, payload, controller, prepared)
                            wake.set()
                            value = {**job, "status": "queued", "durableAccepted": True}
                    elif request["action"] == "cancel":
                        command_id = payload["targetCommandId"]
                        if any(row["projectId"] != payload["projectId"] for row in task_inventory(root) if row["commandId"] == command_id):
                            raise ValueError("TASK_OWNER_MISMATCH")
                        if len(remembered) >= 10000 and command_id not in remembered:
                            raise ValueError("CANCELLATION_CAPACITY")
                        remembered.add(command_id)
                        task_option(controller, "cancelled", json.dumps(sorted(remembered)))
                        for row in task_inventory(root):
                            if row["commandId"] == command_id:
                                if row["projectId"] != payload["projectId"]:
                                    raise ValueError("TASK_OWNER_MISMATCH")
                                task_tmux(["kill-window", "-t", row["tmuxWindowId"]])
                        value = {"cancelled": True}
                        wake.set()
                    else:
                        raise ValueError("UNKNOWN_SCHEDULER_ACTION")
                result = {"ok": True, "value": value}
            except Exception as exc:
                result = {"ok": False, "error": str(exc)}
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers()
            self.wfile.write(body)
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    task_option(controller, "endpoint", json.dumps({"host": server.server_address[0], "port": server.server_address[1],
        "secret": secret, "epoch": epoch, "root": root, "workerId": worker_id, "protocol": 2,
        "runningVersion": globals().get("RUNTIME_VERSION", "fixture"), "runtimeFiles": task_runtime_files(root), "gpuMemoryRatioScheduling": 1}))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    while True:
        queued = []
        try:
            with mutex:
                rows = task_inventory(root)
                occupied = {}
                for live in rows:
                    if live.get("dispatchPolicy") != "manual" and not live["dead"] and live["phase"] in ("admitted", "starting", "running") and live["gpuId"]:
                        occupied[live["gpuId"]] = occupied.get(live["gpuId"], 0) + 1
                queued = sorted([row for row in rows if not row["dead"] and row["phase"] == "queued"], key=lambda row: row.get("dispatchPolicy") != "manual")
                if queued:
                    gpus, error = collect_local_gpu()
                    if gpus or not error:
                        for row in queued:
                            options = row.get("options") or {}
                            if error and row.get("dispatchPolicy") != "manual":
                                continue
                            try:
                                chosen = task_admission_gpu(row, gpus, occupied)
                            except ValueError as exc:
                                task_option(row["tmuxWindowId"], "error", str(exc))
                                task_option(row["tmuxWindowId"], "phase", "rejected")
                                continue
                            if chosen is None:
                                continue
                            session = fixed_gpu_window_name(row.get("tmuxSessionPrefix") or options.get("tmuxSessionPrefix") or os.environ.get("SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"), chosen)
                            if subprocess.run(["tmux", "has-session", "-t", session], capture_output=True, timeout=3).returncode:
                                task_tmux(["new-session", "-d", "-s", session])
                            task_tmux(["move-window", "-s", row["tmuxWindowId"], "-t", session + ":"])
                            task_option(row["tmuxWindowId"], "gpu", chosen)
                            task_option(row["tmuxWindowId"], "phase", "admitted")
                            if row.get("dispatchPolicy") != "manual":
                                occupied[chosen] = occupied.get(chosen, 0) + 1
                                gpu = next(gpu for gpu in gpus if gpu_row_id(gpu) == chosen)
                                memory = task_memory_info(gpu, options)
                                if memory:
                                    gpu["_se_reserved_mb"] = gpu.get("_se_reserved_mb", 0) + memory["unit"]
        except Exception as exc:
            print("[queue] " + str(exc), file=sys.stderr, flush=True)
        wake.wait(timeout=1 if queued else 5)
        wake.clear()

def task_runner(root, worker_id):
    global NATIVE_TASK_RUNNER_CONTEXT
    pane = os.environ["TMUX_PANE"]
    deadline = time.monotonic() + 8
    while not task_option(pane, "job"):
        if time.monotonic() > deadline:
            raise RuntimeError("TASK_WINDOW_BINDING_MISSING")
        time.sleep(0.05)
    job = json.loads(base64.urlsafe_b64decode(task_option(pane, "job")).decode("utf-8"))
    if job.get("root") != os.path.realpath(root) or job.get("workerId") != worker_id or job.get("pane") != pane:
        raise ValueError("TASK_WINDOW_OWNER_MISMATCH")
    while task_option(pane, "phase") != "admitted":
        if task_option(pane, "phase") == "rejected":
            raise ValueError(task_option(pane, "error"))
        time.sleep(0.2)
    job["gpuId"] = task_option(pane, "gpu")
    job["_lifecycleRunner"] = True
    if "cluster_scheduler_path" in globals():
        job["schedulerPath"] = cluster_scheduler_path(root)
    job["durablePlanQueue"] = False
    job["options"] = {**(job.get("options") or {}), "durablePlanQueue": False}
    task_option(pane, "phase", "starting")
    NATIVE_TASK_RUNNER_CONTEXT = (job["commandId"], pane, os.path.realpath(root))
    result = execute_worker_command(root, job, worker_id)
    return 0 if result.get("status") == "completed" else int(result.get("exitCode") or 1)

def task_stop(root, command, worker_id):
    target = str(command.get("targetCommandId") or "")
    project = str(command.get("projectId") or "")
    if not target or not project:
        raise ValueError("TASK_STOP_IDENTITY_REQUIRED")
    rows = [row for row in task_inventory(root) if row["commandId"] == target]
    legacy_tabs = [row for row in local_stop_tmux_inventory(root) if row["command"] == target] if "local_stop_tmux_inventory" in globals() else []
    if any(row["project"] != project for row in legacy_tabs):
        raise ValueError("TASK_OWNER_MISMATCH")
    if any(row["projectId"] != project or row["workerId"] != worker_id for row in rows):
        raise ValueError("TASK_OWNER_MISMATCH")
    try:
        task_queue_rpc(root, worker_id, "cancel", {"targetCommandId": target, "projectId": project}, ensure=True)
    except Exception:
        # Exact tab closure remains possible even when its controller is unhealthy.
        if not rows:
            raise
        for row in rows:
            task_tmux(["kill-window", "-t", row["tmuxWindowId"]])
    for tab in legacy_tabs:
        # Reused/renamed windows are rechecked through stable markers immediately before closure.
        current = [row for row in local_stop_tmux_inventory(root) if row["window"] == tab["window"]]
        if current and all(row["command"] == target and row["project"] == project for row in current):
            task_tmux(["kill-window", "-t", tab["window"]])
    remaining = [row for row in task_inventory(root) if row["commandId"] == target and row["projectId"] == project]
    if remaining:
        raise RuntimeError("TASK_STOP_NOT_CONFIRMED")
    return {"status": "completed", "stoppedTasks": [{"commandId": target, "projectId": project, "workerId": worker_id,
        "workflowId": command.get("workflowId"), "stopBoundary": "local_command", "paneClosed": True, "cacheRetired": True}], "stoppedPids": []}
`;
