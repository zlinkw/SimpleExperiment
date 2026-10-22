/**
 * One structured GPU sampling loop per Worker, carried by its own dedicated tmux
 * session and shared by every consumer (Agent HTTP/telemetry, durable-queue drain,
 * Scheduler admission, host display via the inventory carry). It is deliberately
 * independent of the Agent and VS Code lifecycles: dispatched queues keep running
 * and the sampling sequence keeps advancing when the Agent restarts. The epoch
 * changes only with the collector's own generation, never on Agent reconnect.
 *
 * Consumers never re-run nvidia-smi while a fresh frame exists. A worker whose
 * deployment predates the collector keeps the previous safe direct sampling, but
 * every decision records gpuSource="direct_unoptimized" honestly instead of
 * silently claiming the shared path. A registered-but-stalled collector blocks
 * admission (the job stays queued); freshness is proven by the collector's own
 * monotonic clock and by a request-before seq watermark, so a wall-clock rewind
 * can never manufacture freshness. No new system daemon, socket, NVML binding or
 * screen parsing is introduced, and only the exact collector window is ever
 * touched (never a session/server kill or a process scan).
 */
export const GPU_COLLECTOR_PYTHON = String.raw`
GPU_COLLECTOR_FRESH_MS = max(2000.0, float(os.environ.get("SIMPLE_GPU_COLLECTOR_FRESH_MS") or 5000))
GPU_ADMISSION_WAIT_SECONDS = max(0.0, float(os.environ.get("SIMPLE_GPU_ADMISSION_WAIT_SECONDS") or 2.0))
GPU_COLLECTOR_SOURCE = "worker_gpu_collector"
_GPU_SOURCE_MODE_LAST = {}

def gpu_collector_worker_ns(worker_id):
    return hashlib.sha256(str(worker_id or "worker").encode("utf-8")).hexdigest()[:16]

def gpu_collector_state_root(root=""):
    # Worker-scoped machine state: a sibling of the per-project state namespaces so
    # every project on this Worker shares one collector without sharing project state.
    configured = AGENT_STATE_DIR or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", "")
    if configured:
        anchor = resolve_agent_state_dir(root, configured) if root else os.path.abspath(os.path.expanduser(configured))
    elif root:
        anchor = agent_dir(root)
    else:
        return ""
    parent = os.path.dirname(os.path.abspath(anchor))
    if os.path.basename(os.path.normcase(parent)) == "projects":
        parent = os.path.dirname(parent)
    return os.path.join(parent, "workers")

def gpu_collector_frame_path(worker_id, root=""):
    base = gpu_collector_state_root(root)
    if not base:
        return ""
    return os.path.join(base, gpu_collector_worker_ns(worker_id), "gpu_frame.json")

def gpu_collector_session(worker_id, root=""):
    key = hashlib.sha256((str(worker_id or "worker") + "\0" + gpu_collector_frame_path(worker_id, root)).encode("utf-8")).hexdigest()[:16]
    return task_session_prefix() + "-gpu-collector-" + key

def gpu_collector_command(worker_id, root=""):
    argv = [sys.executable, "-B", os.path.abspath(__file__), "gpu-collector",
            "--worker-id", str(worker_id or "worker"), "--project-dir", os.path.realpath(root or os.getcwd())]
    if AGENT_STATE_DIR or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", ""):
        argv.extend(["--state-dir", AGENT_STATE_DIR or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", "")])
    # tmux children inherit the server environment, not the Agent's; carry the prefix.
    return "exec env " + shlex.join(["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX=" + task_session_prefix(), *argv])

def gpu_collector_tmux(args, timeout=5):
    proc = subprocess.run(["tmux", *args], capture_output=True, text=True, timeout=timeout)
    if proc.returncode:
        raise RuntimeError("GPU_COLLECTOR_TMUX_FAILED: " + ((proc.stderr or proc.stdout or "").strip()[-400:]))
    return (proc.stdout or "").strip()

def gpu_collector_binding(worker_id, frame_path):
    return {"frameSource": GPU_COLLECTOR_SOURCE, "workerId": str(worker_id or "worker"), "framePath": frame_path,
            "epoch": "%d-%d" % (int(time.monotonic() * 1000), os.getpid()), "runningVersion": RUNTIME_VERSION,
            "uid": os.getuid() if hasattr(os, "getuid") else -1}

def gpu_collector_ensure(worker_id, root=""):
    """Idempotent startup on the exact deterministic session; a dead pane is respawned
    with -k on its own pane only. Never touches task, GPU or Scheduler windows."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    frame_path = gpu_collector_frame_path(worker_id, root)
    session = gpu_collector_session(worker_id, root)
    if not frame_path:
        return {"status": "unconfigured", "workerId": worker_id}
    has = subprocess.run(["tmux", "has-session", "-t", "=" + session], capture_output=True, timeout=3).returncode == 0
    if has:
        try:
            fields = gpu_collector_tmux(["display-message", "-p", "-t", session + ":collector",
                "#{window_id}\t#{pane_id}\t#{pane_dead}\t#{@se_gpu_collector}"]).split("\t")
        except RuntimeError:
            return {"status": "unverified", "workerId": worker_id, "session": session}
        if len(fields) != 4 or not re.fullmatch(r"@\d+", fields[0] or "") or not re.fullmatch(r"%\d+", fields[1] or ""):
            return {"status": "unverified", "workerId": worker_id, "session": session}
        binding = {}
        try:
            binding = json.loads(fields[3]) if fields[3] else {}
        except ValueError:
            binding = {}
        if binding.get("framePath") != frame_path or binding.get("workerId") != worker_id:
            # Same name, foreign binding: never take over an unverified window.
            return {"status": "mismatch", "workerId": worker_id, "session": session, "windowId": fields[0]}
        if fields[2] == "1":
            gpu_collector_tmux(["respawn-pane", "-k", "-t", fields[1], gpu_collector_command(worker_id, root)])
            return {"status": "respawned", "workerId": worker_id, "session": session, "windowId": fields[0], "paneId": fields[1]}
        return {"status": "running", "workerId": worker_id, "session": session, "windowId": fields[0],
                "paneId": fields[1], "epoch": str(binding.get("epoch") or "")}
    os.makedirs(os.path.dirname(frame_path), exist_ok=True)
    gpu_collector_tmux(["new-session", "-d", "-s", session, "-n", "collector", gpu_collector_command(worker_id, root)])
    gpu_collector_tmux(["set-option", "-w", "-t", session + ":collector", "remain-on-exit", "on"])
    try:
        binding = gpu_collector_binding(worker_id, frame_path)
        window_id = gpu_collector_tmux(["display-message", "-p", "-t", session + ":collector", "#{window_id}"])
        gpu_collector_tmux(["set-option", "-w", "-t", window_id, "@se_gpu_collector", json.dumps(binding, ensure_ascii=False)])
    except RuntimeError as exc:
        return {"status": "starting", "workerId": worker_id, "session": session, "bindingError": str(exc)[-300:]}
    return {"status": "started", "workerId": worker_id, "session": session, "windowId": window_id, "epoch": binding["epoch"]}

def gpu_collector_note_mode(worker_id, mode, root=""):
    # One machine-journal note per mode transition: consumers never silently switch
    # between the shared frame and the legacy direct sample.
    key = str(worker_id or "")
    if _GPU_SOURCE_MODE_LAST.get(key) == mode:
        return
    _GPU_SOURCE_MODE_LAST[key] = mode
    try:
        if root and "append_event" in globals():
            append_event(root, {"type": "gpu_source_mode", "workerId": key, "payload": {"mode": mode, "generatedAt": now_iso()}})
    except Exception:
        pass
    return mode

def gpu_collector_main(root, worker_id, poll_seconds=1.0):
    """Single writer for the shared frame. Epoch is this collector's generation;
    the sequence advances monotonically for its lifetime and is never reset by an
    Agent restart. Sampling cadence equals the previous core frequency (1s)."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    frame_path = gpu_collector_frame_path(worker_id, root)
    if not frame_path:
        raise RuntimeError("GPU_COLLECTOR_STATE_ROOT_UNCONFIGURED")
    os.makedirs(os.path.dirname(frame_path), exist_ok=True)
    epoch = "%d-%d" % (int(time.monotonic() * 1000), os.getpid())
    binding = gpu_collector_binding(worker_id, frame_path)
    binding["epoch"] = epoch
    try:
        gpu_collector_tmux(["set-option", "-w", "-t", gpu_collector_session(worker_id, root) + ":collector",
                            "@se_gpu_collector", json.dumps(binding, ensure_ascii=False)])
    except Exception as exc:
        print("[gpu-collector] binding annotation failed: " + str(exc), file=sys.stderr, flush=True)
    seq = 0
    interval = max(0.5, float(poll_seconds or 1.0))
    while True:
        started = time.monotonic()
        try:
            gpus, err = collect_local_gpu()
        except Exception as exc:  # A sampler crash must not fake freshness downstream.
            gpus, err = [], str(exc)
        seq += 1
        frame = {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker_id,
                 "epoch": epoch, "seq": seq, "collectedAt": now_iso(),
                 "collectedMonotonicMs": int(started * 1000.0),
                 "status": "ok" if not err else "degraded", "error": str(err or ""),
                 "completeness": "full" if gpus and not err else "partial",
                 "runtimeVersion": RUNTIME_VERSION, "gpu": gpus, "gpus": gpus}
        try:
            atomic_write(frame_path, frame)
        except Exception as exc:
            print("[gpu-collector] frame write failed: " + str(exc), file=sys.stderr, flush=True)
        delay = interval - (time.monotonic() - started)
        if delay > 0:
            time.sleep(delay)

_GPU_COLLECTOR_HEAL_AT = {}

def gpu_collector_self_heal(worker_id, root=""):
    # Bounded watchdog from the Agent sampler only: if the shared frame is not
    # fresh and the collector window itself is dead, respawn that one exact pane
    # (or start the deterministic session when it is gone). Cadence-limited; never
    # scans processes and never touches any other window.
    worker_id = str(worker_id or "worker").strip() or "worker"
    now = time.monotonic()
    if now - float(_GPU_COLLECTOR_HEAL_AT.get(worker_id) or 0.0) < 15.0:
        return None
    _GPU_COLLECTOR_HEAL_AT[worker_id] = now
    if read_gpu_collector_frame(worker_id, root).get("mode") == "fresh":
        return None
    report = gpu_collector_ensure(worker_id, root)
    if report.get("status") in ("started", "respawned"):
        gpu_collector_note_mode(worker_id, "collector_" + str(report.get("status")), root)
    return report

def read_gpu_collector_frame(worker_id, root=""):
    """Validate identity, generation and monotonic freshness of one frame.
    A wall-clock that moved backwards relative to this process can only make a
    frame look stale (negative monotonic age), never fresh."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    frame_path = gpu_collector_frame_path(worker_id, root)
    try:
        exists = bool(frame_path) and os.path.isfile(frame_path)
    except Exception:
        # A stat failure (permissions, path weirdness) can only mean "no shared
        # frame here" — the consumer falls back to the marked direct sample and
        # never manufactures freshness from an unreadable location.
        return {"mode": "absent", "frame": None}
    if not exists:
        return {"mode": "absent", "frame": None}
    try:
        frame = read_json(frame_path, None)
    except Exception:
        return {"mode": "partial", "frame": None}
    if not isinstance(frame, dict) or frame.get("frameSource") != GPU_COLLECTOR_SOURCE \
            or str(frame.get("workerId") or "") != worker_id:
        return {"mode": "foreign", "frame": None}
    seq = frame.get("seq")
    epoch = str(frame.get("epoch") or "")
    mono = frame.get("collectedMonotonicMs")
    gpus = frame.get("gpus")
    if type(seq) is not int or seq <= 0 or not epoch or not isinstance(mono, (int, float)) or not isinstance(gpus, list):
        return {"mode": "partial", "frame": None}
    age_ms = time.monotonic() * 1000.0 - float(mono)
    if age_ms < 0.0 or age_ms > GPU_COLLECTOR_FRESH_MS:
        return {"mode": "stale", "frame": frame, "ageMs": age_ms}
    if frame.get("completeness") != "full":
        return {"mode": "partial", "frame": frame, "ageMs": age_ms}
    return {"mode": "fresh", "frame": frame, "ageMs": age_ms}

def gpu_admission_probe(root, worker_id="", wait_seconds=None):
    """(gpus, error) source for every admission/dispatch decision.
    Causality: capture the seq BEFORE the decision window opens, then accept only
    a frame whose seq advanced past that watermark; request attribution alone does
    not prove the sample was taken after the request. A registered collector that
    stays behind the watermark returns an error so the job remains queued.
    A worker without any collector keeps the legacy direct sample, honestly
    recorded as direct_unoptimized. wait_seconds=0 is for lock-holding rechecks
    (accept the current fresh frame without waiting; never extend a lock hold)."""
    worker_id = str(worker_id or os.environ.get("SIMPLE_EXPERIMENT_WORKER_ID") or "worker").strip() or "worker"
    opening = read_gpu_collector_frame(worker_id, root)
    if opening["mode"] == "absent":
        gpu_collector_note_mode(worker_id, "direct_unoptimized", root)
        return collect_local_gpu()
    watermark = int(opening["frame"]["seq"]) if opening.get("frame") else 0
    if wait_seconds is not None and float(wait_seconds) <= 0:
        # A watermark cannot advance inside a zero-wait window; accept a strictly
        # fresh frame only when the opening read was not itself usable.
        if opening["mode"] == "fresh" and opening.get("frame"):
            gpu_collector_note_mode(worker_id, "collector", root)
            return list(opening["frame"]["gpus"]), ""
        return [], "gpu_collector_no_fresh_frame"
    deadline = time.monotonic() + (GPU_ADMISSION_WAIT_SECONDS if wait_seconds is None else max(0.0, float(wait_seconds)))
    latest = opening
    while True:
        latest = read_gpu_collector_frame(worker_id, root)
        frame = latest.get("frame")
        if latest["mode"] == "fresh" and frame and int(frame["seq"]) > watermark:
            gpu_collector_note_mode(worker_id, "collector", root)
            return list(frame["gpus"]), ""
        if time.monotonic() >= deadline:
            break
        time.sleep(0.1)
    if watermark == 0 and latest["mode"] in ("partial", "foreign"):
        # Never a usable shared frame here (for example a corrupt first write):
        # keep the old safe direct sample, marked.
        gpu_collector_note_mode(worker_id, "direct_unoptimized", root)
        return collect_local_gpu()
    gpu_collector_note_mode(worker_id, "collector_stalled", root)
    return [], "gpu_collector_stalled: no frame newer than seq " + str(watermark) + " within " + format(GPU_ADMISSION_WAIT_SECONDS, ".1f") + "s"
`;
