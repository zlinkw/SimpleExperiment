"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPU_COLLECTOR_PYTHON = void 0;
/**
 * One structured GPU sampling loop per Worker, carried by its own dedicated tmux
 * session and shared by every consumer (Agent HTTP/telemetry, durable-queue drain,
 * Scheduler admission, host display via the inventory carry). It is deliberately
 * independent of the Agent and VS Code lifecycles: dispatched queues keep running
 * and the sampling sequence keeps advancing when the Agent restarts.
 *
 * Identity: the canonical single-source identity is the Worker id inside the
 * calling UID's tmux server ("se-gpu-collector-<sha(workerId)>"), derived only
 * from the Worker id — never from per-project installDir/stateDir/prefix, so two
 * projects can never each start their own collector. The frame/registration
 * directory should come from the deployment-level SIMPLE_EXPERIMENT_WORKER_STATE_DIR;
 * without it the per-project derivation is a documented compatibility fallback.
 *
 * Causality: admission accepts a frame only when its sampling START (the
 * collector's own monotonic clock) is at or after this request's boundary, the
 * frame's epoch equals the registration file's published generation, and the
 * frame is within the monotonic freshness bound. A sample that started before
 * the request and finished after it is NOT accepted; an old-generation frame is
 * never accepted no matter how high its seq; a lock-holding reserve rechecks the
 * exact accepted evidence (same epoch+seq+start) instead of reusing any cache.
 *
 * Degradation: direct nvidia-smi sampling happens only when the Worker is
 * confirmed legacy (no registration and no frame). Once a collector is
 * registered, failures (stale/partial/foreign/unreadable) return errors so jobs
 * stay queued — they never revive a second sampler, never fake "ready" and
 * never reset the Agent-side epoch. The mode is visible to API/inventory
 * consumers via frameSource/collectorMode, not only in the journal.
 *
 * No new system daemon, socket, NVML binding or screen parsing; only the exact
 * collector window is ever managed (never a session/server kill or a scan).
 */
exports.GPU_COLLECTOR_PYTHON = String.raw `
GPU_COLLECTOR_FRESH_MS = max(2000.0, float(os.environ.get("SIMPLE_GPU_COLLECTOR_FRESH_MS") or 5000))
GPU_ADMISSION_WAIT_SECONDS = max(0.0, float(os.environ.get("SIMPLE_GPU_ADMISSION_WAIT_SECONDS") or 2.0))
GPU_COLLECTOR_SOURCE = "worker_gpu_collector"
GPU_WORKER_STATE_ENV = "SIMPLE_EXPERIMENT_WORKER_STATE_DIR"
_GPU_SOURCE_MODE_LAST = {}

def gpu_collector_worker_ns(worker_id):
    return hashlib.sha256(str(worker_id or "worker").encode("utf-8")).hexdigest()[:16]

def gpu_collector_state_root(root=""):
    # Deployment-level Worker state dir (shared across projects by design) wins;
    # otherwise the per-project agent state namespace's sibling workers/ directory
    # is a compatibility fallback for deployments that have not set the variable.
    configured_worker = str(os.environ.get(GPU_WORKER_STATE_ENV) or "").strip()
    if configured_worker:
        return os.path.abspath(os.path.expanduser(configured_worker))
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

def gpu_collector_register_path(worker_id, root=""):
    frame_path = gpu_collector_frame_path(worker_id, root)
    if not frame_path:
        return ""
    return os.path.join(os.path.dirname(frame_path), "gpu_collector.register")

def gpu_collector_session(worker_id, root=""):
    # Canonical single-source identity: ONLY the Worker id (same UID + tmux server
    # context). Never the project-derived frame path or the per-project session
    # prefix, so different projects cannot each open a collector source.
    key = hashlib.sha256((str(worker_id or "worker")).encode("utf-8")).hexdigest()[:16]
    return "se-gpu-collector-" + key

def gpu_collector_command(worker_id, root=""):
    argv = [sys.executable, "-B", os.path.abspath(__file__), "gpu-collector",
            "--worker-id", str(worker_id or "worker"), "--project-dir", os.path.realpath(root or os.getcwd())]
    if AGENT_STATE_DIR or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", ""):
        argv.extend(["--state-dir", AGENT_STATE_DIR or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", "")])
    # tmux children inherit the server environment, not the Agent's; carry the prefix
    # AND the deployment-level Worker state dir, or the collector would resolve a frame
    # path that differs from the one every consumer reads (identity split, stall forever).
    carry = ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX=" + task_session_prefix()]
    worker_state = str(os.environ.get(GPU_WORKER_STATE_ENV) or "").strip()
    if worker_state:
        carry.append(GPU_WORKER_STATE_ENV + "=" + worker_state)
    return "exec env " + shlex.join([*carry, *argv])

def gpu_collector_tmux(args, timeout=5):
    proc = subprocess.run(["tmux", *args], capture_output=True, text=True, timeout=timeout)
    if proc.returncode:
        raise RuntimeError("GPU_COLLECTOR_TMUX_FAILED: " + ((proc.stderr or proc.stdout or "").strip()[-400:]))
    return (proc.stdout or "").strip()

def gpu_collector_binding(worker_id, frame_path, epoch):
    # Only the RUNNING collector publishes a binding (gpu_collector_main); ensure
    # never invents an epoch, so no second generation can exist on the window.
    return {"frameSource": GPU_COLLECTOR_SOURCE, "workerId": str(worker_id or "worker"), "framePath": frame_path,
            "epoch": str(epoch or ""), "runningVersion": RUNTIME_VERSION,
            "uid": os.getuid() if hasattr(os, "getuid") else -1}

def gpu_collector_publish_generation(worker_id, root, epoch):
    # The collector publishes its own generation: the registration file is the
    # authority admission binds to, the window annotation is the human/tmux-visible
    # mirror of the same object.
    frame_path = gpu_collector_frame_path(worker_id, root)
    binding = gpu_collector_binding(worker_id, frame_path, epoch)
    register_path = gpu_collector_register_path(worker_id, root)
    if register_path:
        registration = dict(binding)
        registration["genStartedMonotonicMs"] = int(time.monotonic() * 1000)
        atomic_write(register_path, registration)
    try:
        gpu_collector_tmux(["set-option", "-w", "-t", gpu_collector_session(worker_id, root) + ":collector",
                            "@se_gpu_collector", json.dumps(binding, ensure_ascii=False)])
    except Exception as exc:
        print("[gpu-collector] binding annotation failed: " + str(exc), file=sys.stderr, flush=True)
    return binding

def gpu_collector_read_registration(worker_id, root=""):
    """Registration presence is the capability authority: a Worker is legacy ONLY
    when both the registration and the frame are confirmed absent. Anything else
    (unreadable, foreign, stale) is a registered Worker in a failed state and must
    never fall through to a second sampler."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    register_path = gpu_collector_register_path(worker_id, root)
    if not register_path:
        return {"mode": "unconfigured", "registration": None}
    try:
        if not os.path.isfile(register_path):
            return {"mode": "absent", "registration": None}
        registration = read_json(register_path, None)
    except Exception:
        return {"mode": "unreadable", "registration": None}
    if not isinstance(registration, dict) or registration.get("frameSource") != GPU_COLLECTOR_SOURCE \
            or str(registration.get("workerId") or "") != worker_id \
            or not str(registration.get("epoch") or "") \
            or not isinstance(registration.get("genStartedMonotonicMs"), (int, float)):
        return {"mode": "invalid", "registration": None}
    return {"mode": "registered", "registration": registration}

def gpu_collector_ensure(worker_id, root=""):
    """Idempotent startup on the exact deterministic session. Only the running
    collector publishes the binding epoch; ensure verifies identity and manages
    only its own exact window (respawn -k on its own pane). A losing startup race
    re-verifies the winner instead of overwriting; a foreign binding, foreign UID
    or foreign frame path is reported and never taken over."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    frame_path = gpu_collector_frame_path(worker_id, root)
    session = gpu_collector_session(worker_id, root)
    if not frame_path:
        return {"status": "unconfigured", "workerId": worker_id}
    def _inspect():
        fields = gpu_collector_tmux(["display-message", "-p", "-t", session + ":collector",
            "#{window_id}\t#{pane_id}\t#{pane_dead}\t#{@se_gpu_collector}"]).split("\t")
        if len(fields) != 4 or not re.fullmatch(r"@\d+", fields[0] or "") or not re.fullmatch(r"%\d+", fields[1] or ""):
            return None
        binding = {}
        try:
            binding = json.loads(fields[3]) if fields[3] else {}
        except ValueError:
            binding = {}
        return {"windowId": fields[0], "paneId": fields[1], "dead": fields[2] == "1", "binding": binding}
    has = subprocess.run(["tmux", "has-session", "-t", "=" + session], capture_output=True, timeout=3).returncode == 0
    if has:
        try:
            observed = _inspect()
        except RuntimeError:
            return {"status": "unverified", "workerId": worker_id, "session": session}
        if observed is None:
            return {"status": "unverified", "workerId": worker_id, "session": session}
        binding = observed["binding"]
        if binding:
            if str(binding.get("frameSource") or "") != GPU_COLLECTOR_SOURCE or str(binding.get("workerId") or "") != worker_id \
                    or str(binding.get("framePath") or "") != frame_path:
                # Same name, foreign identity or a different frame root: never take
                # over an unverified window; the operator/parent decides.
                return {"status": "mismatch", "workerId": worker_id, "session": session, "windowId": observed["windowId"]}
            our_uid = os.getuid() if hasattr(os, "getuid") else -1
            try:
                binding_uid = int(binding.get("uid"))
            except (TypeError, ValueError):
                binding_uid = -2
            if binding_uid >= 0 and our_uid >= 0 and binding_uid != our_uid:
                return {"status": "foreign_uid", "workerId": worker_id, "session": session, "windowId": observed["windowId"]}
        if observed["dead"]:
            gpu_collector_tmux(["respawn-pane", "-k", "-t", observed["paneId"], gpu_collector_command(worker_id, root)])
            # The respawned collector publishes its own NEW generation; ensure adds none.
            return {"status": "respawned", "workerId": worker_id, "session": session, "windowId": observed["windowId"], "paneId": observed["paneId"]}
        if not binding:
            # Started but not yet publishing: honest "starting", no fabricated epoch.
            return {"status": "starting", "workerId": worker_id, "session": session, "windowId": observed["windowId"], "paneId": observed["paneId"]}
        return {"status": "running", "workerId": worker_id, "session": session, "windowId": observed["windowId"],
                "paneId": observed["paneId"], "epoch": str(binding.get("epoch") or ""),
                "collectorVersion": str(binding.get("runningVersion") or ""),
                "versionCurrent": str(binding.get("runningVersion") or "") == str(RUNTIME_VERSION)}
    os.makedirs(os.path.dirname(frame_path), exist_ok=True)
    try:
        gpu_collector_tmux(["new-session", "-d", "-s", session, "-n", "collector", gpu_collector_command(worker_id, root)])
    except RuntimeError:
        # Startup race: another process may have won new-session. Re-verify the
        # winner's window; never overwrite its state, never create a second one.
        try:
            if subprocess.run(["tmux", "has-session", "-t", "=" + session], capture_output=True, timeout=3).returncode == 0:
                observed = _inspect()
                if observed is not None:
                    if observed["binding"]:
                        return {"status": "race_won_by_other", "workerId": worker_id, "session": session, "windowId": observed["windowId"]}
                    return {"status": "starting", "workerId": worker_id, "session": session, "windowId": observed["windowId"]}
        except RuntimeError:
            pass
        return {"status": "unverified", "workerId": worker_id, "session": session}
    gpu_collector_tmux(["set-option", "-w", "-t", session + ":collector", "remain-on-exit", "on"])
    return {"status": "started", "workerId": worker_id, "session": session}

def gpu_collector_note_mode(worker_id, mode, root=""):
    # One machine-journal note per mode transition: consumers never silently switch
    # between the shared frame and the legacy direct sample. The visible truth for
    # API/UI consumers is the frameSource/collectorMode fields on every payload.
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
    """Single writer for the shared frame. The epoch is this collector's own
    generation and is published here (registration + window annotation) — nowhere
    else. The sequence advances monotonically for the collector's lifetime and is
    never reset by an Agent restart. Cadence matches the previous core frequency."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    frame_path = gpu_collector_frame_path(worker_id, root)
    if not frame_path:
        raise RuntimeError("GPU_COLLECTOR_STATE_ROOT_UNCONFIGURED")
    os.makedirs(os.path.dirname(frame_path), exist_ok=True)
    epoch = "%d-%d" % (int(time.monotonic() * 1000), os.getpid())
    gpu_collector_publish_generation(worker_id, root, epoch)
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
    A stat/read failure is "unreadable" (unknown), never "absent": only a
    confirmed absence may indicate a legacy worker, and an unreadable location
    can never manufacture freshness or authorize direct sampling."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    frame_path = gpu_collector_frame_path(worker_id, root)
    if not frame_path:
        return {"mode": "unconfigured", "frame": None}
    try:
        exists = os.path.isfile(frame_path)
    except Exception:
        return {"mode": "unreadable", "frame": None}
    if not exists:
        return {"mode": "absent", "frame": None}
    try:
        frame = read_json(frame_path, None)
    except Exception:
        return {"mode": "unreadable", "frame": None}
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

def gpu_admission_probe_bound(root, worker_id=""):
    """(gpus, error, evidence) source for every admission/dispatch decision.
    Causality fence (all required): the frame's sampling START is at or after this
    request's monotonic boundary T0 (a sample that started before the request and
    merely finished after it is NOT evidence for it); the frame's epoch equals the
    registration file's CURRENT generation (an old generation is rejected at any
    seq; a collector restart during the request is followed because the registration
    file moves first); the frame is fresh by the collector's own monotonic clock.
    Legacy direct sampling runs ONLY when registration and frame are both
    confirmed absent; every registered failure returns an error so the job stays
    queued. Evidence returned on success binds worker+root+epoch+seq+start for a
    later in-lock recheck (gpu_admission_recheck_evidence)."""
    worker_id = str(worker_id or os.environ.get("SIMPLE_EXPERIMENT_WORKER_ID") or "worker").strip() or "worker"
    opening_frame = read_gpu_collector_frame(worker_id, root)
    registration = gpu_collector_read_registration(worker_id, root)
    if opening_frame["mode"] == "unconfigured" or registration["mode"] == "unconfigured":
        return [], "gpu_collector_state_unconfigured", None
    legacy_confirmed = registration["mode"] == "absent" and opening_frame["mode"] == "absent"
    if legacy_confirmed:
        gpu_collector_note_mode(worker_id, "direct_unoptimized", root)
        gpus, err = collect_local_gpu()
        return gpus, err, None
    if opening_frame["mode"] == "foreign" or registration["mode"] in ("foreign", "invalid", "unreadable"):
        # Something registered itself under this identity but failed validation:
        # never treat it as legacy and never sample a second source here.
        gpu_collector_note_mode(worker_id, "collector_" + ("foreign" if opening_frame["mode"] == "foreign" else registration["mode"]), root)
        return [], "gpu_collector_identity_unverified", None
    t0 = time.monotonic() * 1000.0
    deadline = t0 + max(0.0, GPU_ADMISSION_WAIT_SECONDS) * 1000.0
    last_accepted_epoch, last_accepted_seq = "", 0
    latest = opening_frame
    # A collector version predating the registration file keeps running: with a
    # live frame but no registration, admission falls back to FRAME-ONLY mode —
    # the request-bound causality fence and per-probe monotonic ordering are
    # still mandatory, only the generation binding is downgraded (visible via
    # the gpu_source_mode journal + the caller-visible stalled error text).
    frame_only_mode = registration["mode"] == "absent"
    max_mono_seen = -1.0
    while True:
        reg_now = gpu_collector_read_registration(worker_id, root)
        generation = (reg_now.get("registration") or {}) if reg_now["mode"] == "registered" else {}
        latest = read_gpu_collector_frame(worker_id, root)
        frame = latest.get("frame")
        if latest["mode"] == "fresh" and frame and (generation or frame_only_mode):
            epoch = str(frame["epoch"])
            seq = int(frame["seq"])
            mono = float(frame["collectedMonotonicMs"])
            gen_start = float(generation.get("genStartedMonotonicMs") or 0.0)
            current_generation = (epoch == str(generation.get("epoch") or "")) if generation else True
            request_after_start = mono >= t0 and mono >= gen_start
            ordered = mono > max_mono_seen and (epoch != last_accepted_epoch or seq > last_accepted_seq)
            if current_generation and request_after_start and ordered:
                max_mono_seen = mono
                last_accepted_epoch, last_accepted_seq = epoch, seq
                gpu_collector_note_mode(worker_id, "collector", root)
                evidence = {"workerId": worker_id, "root": str(os.path.abspath(root) if root else ""),
                            "epoch": epoch, "seq": seq, "collectedMonotonicMs": mono}
                return list(frame["gpus"]), "", evidence
        if time.monotonic() * 1000.0 >= deadline:
            break
        time.sleep(0.1)
    gpu_collector_note_mode(worker_id, "collector_stalled", root)
    return [], "gpu_collector_stalled: no request-bound sample from the current generation within " \
        + format(GPU_ADMISSION_WAIT_SECONDS, ".1f") + "s (last frame mode " + str(latest.get("mode")) + ")", None

def gpu_admission_probe(root, worker_id=""):
    # (gpus, error) convenience wrapper for lock-free decision loops (drain,
    # scheduler, accept). The bounded wait replaces the historical direct
    # nvidia-smi call at the SAME call sites; fast inventory and stop paths never
    # call this and never wait.
    gpus, error, _evidence = gpu_admission_probe_bound(root, worker_id)
    return gpus, error

def gpu_admission_recheck_evidence(root, worker_id, evidence):
    """In-lock revalidation for the GPU reserve: the accepted evidence must still
    be the frame on disk — same epoch, same seq, same sampling start, still fresh,
    and still the published generation. Without this credential there is no
    zero-wait path; the caller fails and the job stays queued."""
    worker_id = str(worker_id or "worker").strip() or "worker"
    if not isinstance(evidence, dict):
        return [], "gpu_admission_evidence_missing"
    if str(evidence.get("workerId") or worker_id) != worker_id:
        return [], "gpu_admission_evidence_worker_mismatch"
    frame_obs = read_gpu_collector_frame(worker_id, root)
    frame = frame_obs.get("frame")
    if frame_obs["mode"] != "fresh" or not frame:
        return [], "gpu_admission_evidence_frame_not_fresh"
    if str(frame.get("epoch")) != str(evidence.get("epoch")) \
            or int(frame.get("seq")) != int(evidence.get("seq")) \
            or float(frame.get("collectedMonotonicMs")) != float(evidence.get("collectedMonotonicMs")):
        return [], "gpu_admission_evidence_changed"
    reg = gpu_collector_read_registration(worker_id, root)
    if reg["mode"] != "registered" or str((reg.get("registration") or {}).get("epoch") or "") != str(frame.get("epoch")):
        return [], "gpu_admission_evidence_generation_changed"
    return list(frame["gpus"]), ""
`;
