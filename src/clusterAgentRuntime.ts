export const CLUSTER_AGENT_RUNTIME = String.raw`#!/usr/bin/env python3
import argparse, glob, json, os, signal, subprocess, sys, time, traceback

SCHEMA_VERSION = 1
MAX_EVENTS = 5000

def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def agent_dir(root):
    return os.path.join(root, "zlk_cluster", "tmp", "cluster_agent")

def path_for(root, name):
    return os.path.join(agent_dir(root), name)

def atomic_write(path, payload):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp.{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)

def read_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback

def read_seq(root):
    try:
        return int(open(path_for(root, "seq.txt"), "r", encoding="utf-8").read().strip() or "0")
    except Exception:
        return 0

def write_seq(root, seq):
    atomic_write(path_for(root, "seq.txt"), seq)

def append_event(root, event):
    os.makedirs(agent_dir(root), exist_ok=True)
    seq = read_seq(root) + 1
    event = {"schemaVersion": SCHEMA_VERSION, "seq": seq, "generatedAt": now_iso(), "source": "hub_agent", **event}
    with open(path_for(root, "events.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
    write_seq(root, seq)
    compact_journal(root)
    return event

def compact_journal(root):
    journal = path_for(root, "events.jsonl")
    try:
        with open(journal, "r", encoding="utf-8") as f:
            lines = f.readlines()
        if len(lines) <= MAX_EVENTS:
            return
        tmp = journal + f".tmp.{os.getpid()}"
        with open(tmp, "w", encoding="utf-8") as f:
            f.writelines(lines[-MAX_EVENTS:])
        os.replace(tmp, journal)
    except Exception:
        pass

def is_pid_running(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except Exception:
        return False

def acquire_pid(root):
    os.makedirs(agent_dir(root), exist_ok=True)
    pid_path = path_for(root, "agent.pid")
    old = read_json(pid_path, {})
    if old.get("pid") and is_pid_running(old.get("pid")):
        return False
    atomic_write(pid_path, {"pid": os.getpid(), "startedAt": now_iso()})
    return True

def run_cmd(cmd, timeout=8):
    return subprocess.run(cmd, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)

def collect_scheduler(root):
    states = []
    for p in glob.glob(os.path.join(root, "zlk_cluster", "tmp", "cluster_scheduler", "*_state.json")):
        data = read_json(p, None)
        if isinstance(data, dict):
            data.setdefault("file", p)
            data["source"] = "hub_agent"
            data["generatedAt"] = now_iso()
            states.append(data)
    return states

def collect_traces(root):
    data = read_json(os.path.join(root, "zlk_cluster", "experiment_index.json"), [])
    if not isinstance(data, list):
        return []
    for row in data:
        if isinstance(row, dict):
            row.setdefault("source", "hub_agent")
            row.setdefault("generatedAt", now_iso())
    return data

def collect_live_output(states, max_lines=120):
    events = []
    for state in states:
        for key in ("running_experiments", "testing_experiments"):
            for row in state.get(key) or []:
                log = str(row.get("log_path") or row.get("hub_console_log") or row.get("schedulerLog") or "")
                if not log or not os.path.isfile(log):
                    continue
                try:
                    with open(log, "r", encoding="utf-8", errors="replace") as f:
                        lines = f.readlines()[-max_lines:]
                    run_key = scheduler_row_run_key(row)
                    live_key = run_key or "|".join(str(row.get(x) or "") for x in ("source", "plan", "experiment", "worker_id", "session", "log_path"))
                    events.append({"key": live_key, "runKey": run_key or live_key, "text": "".join(lines), "path": log, "offset": os.path.getsize(log)})
                except Exception:
                    pass
    return events

def scheduler_row_run_key(row):
    for key in ("runKey", "run_key", "id", "experimentId", "experiment_id", "global_job_id", "session", "log_path"):
        value = str(row.get(key) or "").strip()
        if value:
            return value
    return ""

def collect_worker_gpu(worker):
    target = worker.get("target") or worker.get("host") or ""
    if not target:
        return [], "missing target"
    port = f" -p {int(worker['port'])}" if worker.get("port") else ""
    cmd = "nvidia-smi --query-gpu=index,uuid,name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv,noheader,nounits"
    ssh_cmd = f"ssh -o ControlMaster=auto -o ControlPersist=300s -o ConnectTimeout=5 -o ConnectionAttempts=1 -o NumberOfPasswordPrompts=0{port} {target!r} {cmd!r}"
    try:
        res = run_cmd(ssh_cmd, timeout=10)
        if res.returncode != 0:
            return [], (res.stderr or res.stdout or "gpu query failed").strip()
        gpus = []
        for line in res.stdout.splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 7:
                continue
            gpus.append({
                "index": int(float(parts[0] or 0)),
                "uuid": parts[1],
                "name": parts[2],
                "memoryUsedMb": int(float(parts[3] or 0)),
                "memoryTotalMb": int(float(parts[4] or 0)),
                "utilizationGpu": int(float(parts[5] or 0)),
                "temperatureGpu": int(float(parts[6] or 0)),
                "processes": [],
                "source": "hub_agent_stream",
                "generatedAt": now_iso(),
            })
        return gpus, ""
    except Exception as exc:
        return [], str(exc)

def write_snapshots(root, hub_id, workers, scheduler, traces, gpu, health, errors, ttl):
    generated = now_iso()
    expires = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + ttl))
    base = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated,
        "expiresAt": expires,
        "ttlSeconds": ttl,
        "hubId": hub_id,
        "workers": workers,
        "errors": errors,
        "partialFailure": bool(errors),
        "source": "hub_agent_snapshot",
    }
    atomic_write(path_for(root, "cluster_snapshot.json"), {**base, "schedulerStates": scheduler})
    atomic_write(path_for(root, "gpu_snapshot.json"), {**base, "gpu": gpu, "health": health})
    atomic_write(path_for(root, "experiment_traces_snapshot.json"), {**base, "experimentTraces": traces})
    atomic_write(path_for(root, "health_snapshot.json"), {**base, "health": health})

def run_agent(args):
    if not acquire_pid(args.project_dir):
        return 0
    stop_path = path_for(args.project_dir, "stop")
    try:
        os.remove(stop_path)
    except FileNotFoundError:
        pass
    workers = json.loads(args.workers_json or "[]")
    error_counts = {}
    last_payloads = {}
    while not os.path.exists(stop_path):
        errors, gpu, health = [], {}, {}
        scheduler = collect_scheduler(args.project_dir)
        traces = collect_traces(args.project_dir)
        for worker in workers:
            wid = str(worker.get("id") or worker.get("name") or worker.get("target") or "")
            gpus, err = collect_worker_gpu(worker)
            if err:
                error_counts[wid] = error_counts.get(wid, 0) + 1
                errors.append(f"{wid}: {err}")
                health[wid] = {"status": "degraded", "lastError": err, "errorCount": error_counts[wid], "generatedAt": now_iso()}
            else:
                error_counts[wid] = 0
                gpu[wid] = gpus
                health[wid] = {"status": "ok", "lastOkAt": now_iso(), "errorCount": 0, "generatedAt": now_iso()}
        write_snapshots(args.project_dir, args.hub_id, workers, scheduler, traces, gpu, health, errors, args.ttl_seconds)
        payloads = {
            "scheduler": {"schedulerStates": scheduler},
            "trace": {"experimentTraces": traces},
            "health": {"health": health, "errors": errors},
        }
        for wid, gpus in gpu.items():
            payloads[f"gpu:{wid}"] = {"serverId": wid, "gpus": gpus}
        for item in collect_live_output(scheduler):
            payloads[f"log_tail:{item.get('key')}"] = item
        for name, payload in payloads.items():
            text = json.dumps(payload, sort_keys=True, ensure_ascii=False)
            if last_payloads.get(name) != text or name == "health":
                typ = name.split(":", 1)[0]
                append_event(args.project_dir, {"type": typ, "serverId": payload.get("serverId", ""), "payload": payload})
                last_payloads[name] = text
        append_event(args.project_dir, {"type": "agent_heartbeat", "payload": {"errors": errors, "partialFailure": bool(errors)}})
        time.sleep(max(1, args.poll_seconds))
    append_event(args.project_dir, {"type": "health", "payload": {"status": "stopped"}})
    return 0

def stream_events(args):
    journal = path_for(args.project_dir, "events.jsonl")
    pos = 0
    since = int(args.since or 0)
    while True:
        if os.path.exists(journal):
            with open(journal, "r", encoding="utf-8") as f:
                if pos:
                    f.seek(pos)
                for line in f:
                    try:
                        event = json.loads(line)
                    except Exception:
                        continue
                    if int(event.get("seq") or 0) > since:
                        print(json.dumps(event, ensure_ascii=False, separators=(",", ":")), flush=True)
                        since = int(event.get("seq") or since)
                pos = f.tell()
        time.sleep(0.5)

def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name in ("run", "snapshot", "health", "stop"):
        p = sub.add_parser(name)
        p.add_argument("--project-dir", required=True)
        p.add_argument("--hub-id", default="hub")
        p.add_argument("--workers-json", default="[]")
        p.add_argument("--poll-seconds", type=int, default=3)
        p.add_argument("--ttl-seconds", type=int, default=15)
    p = sub.add_parser("stream")
    p.add_argument("--project-dir", required=True)
    p.add_argument("--since", type=int, default=0)
    args = parser.parse_args()
    if args.cmd == "run":
        return run_agent(args)
    if args.cmd == "stream":
        return stream_events(args)
    if args.cmd == "stop":
        open(path_for(args.project_dir, "stop"), "w").close()
        return 0
    if args.cmd == "snapshot":
        print(json.dumps(read_json(path_for(args.project_dir, "cluster_snapshot.json"), {}), ensure_ascii=False))
        return 0
    if args.cmd == "health":
        print(json.dumps(read_json(path_for(args.project_dir, "health_snapshot.json"), {}), ensure_ascii=False))
        return 0

if __name__ == "__main__":
    try:
        sys.exit(main() or 0)
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception:
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)
`;
