from __future__ import annotations

import argparse
import logging
import ast
import copy
import csv
import hashlib
import importlib.util
import json
import os
import random
import re
import shlex
import shutil
import subprocess
import sys
import time
import urllib.request
from collections import deque
from concurrent import futures
from dataclasses import dataclass, replace
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import yaml
except ModuleNotFoundError as exc:
    if exc.name != "yaml":
        raise
    yaml = None

# 版本由 build 动态注入（单源：package.json#version -> PLUGIN_VERSION，src/runtime/RuntimeManifest.ts#CURRENT_RUNTIME_VERSION -> 其他），禁止手改；占位值仅用于类型检查，落盘以 dist/runtime/cluster_scheduler.py 为准
SCHEDULER_VERSION = "0.4.92"
RUNTIME_VERSION = "0.4.92"
PLUGIN_VERSION = "0.4.92"

TAIL_BYTES = 16 * 1024
WORKER_AVAILABILITY_REFRESH_TIMEOUT_SECONDS = 5.0
WORKER_AVAILABILITY_REFRESH_WINDOW_SECONDS = 10.0
WORKER_AVAILABILITY_CLOCK_SKEW_SECONDS = 300
ARCHIVE_STATE_PATH = Path("simple_cluster/archive_state.json")
DELETED_EXPERIMENTS_PATH = Path("simple_cluster/deleted_experiments.jsonl")
DELETED_SCHEDULER_ROWS_PATH = Path("simple_cluster/deleted_scheduler_rows.jsonl")
MAX_AGENT_STATE_DIR_CACHE_RECORDS = 8
AGENT_STATE_DIR_CACHE: dict[tuple[str, str], Path] = {}

# === 调度信号化改造：信号类型 / 去抖 / 错误早停 ===
SCHEDULER_SIGNAL_FIRST_RUN = "first_run"
SCHEDULER_SIGNAL_TASK_END = "task_end"
SCHEDULER_SIGNAL_POLL_TICK = "poll_tick"
SCHEDULER_SIGNAL_DEBOUNCE_SECONDS = 5.0
SCHEDULER_ERROR_LOG_PATTERNS = [
    re.compile(r"Traceback \(most recent call last\)", re.I),
    re.compile(r"ModuleNotFoundError", re.I),
    re.compile(r"CondaValueError", re.I),
    re.compile(r"SyntaxError", re.I),
    re.compile(r"returned non-zero exit status", re.I),
    re.compile(r"\bError\s*:", re.I),
    re.compile(r"\bException\s*:", re.I),
    re.compile(r"No such file", re.I),
    re.compile(r"psutil\.AccessDenied", re.I),
]


def scheduler_signal_from_control(control: dict[str, Any]) -> str:
    raw = str(control.get("signal") or control.get("action") or "").strip().lower()
    if raw in {SCHEDULER_SIGNAL_FIRST_RUN, "first-run", "first"}:
        return SCHEDULER_SIGNAL_FIRST_RUN
    if raw in {SCHEDULER_SIGNAL_TASK_END, "task-end", "task_end", "taskend"}:
        return SCHEDULER_SIGNAL_TASK_END
    if raw:
        return raw
    return ""


def scheduler_log_shows_error(tail: str) -> bool:
    if not tail:
        return False
    filtered_lines = []
    for line in str(tail).splitlines():
        low = line.lower()
        if "dispatch_probe" in low:
            continue
        if re.search(r"idle\s*=\s*0", low):
            continue
        if "wait pending" in low:
            continue
        filtered_lines.append(line)
    filtered = "\n".join(filtered_lines)
    if not filtered.strip():
        return False
    return any(p.search(filtered) for p in SCHEDULER_ERROR_LOG_PATTERNS)


def write_scheduler_signal(control_path: Path, signal: str) -> None:
    try:
        current = {}
        if control_path.is_file():
            try:
                current = json.loads(control_path.read_text(encoding="utf-8"))
                if not isinstance(current, dict):
                    current = {}
            except Exception:
                current = {}
        current["signal"] = signal
        current["action"] = signal
        current["emittedAt"] = now()
        current["emittedMonotonic"] = time.monotonic()
        atomic_write_json(control_path, current)
    except Exception:
        pass


def refresh_worker_availability_for_signal(workers: list[dict[str, Any]], availability_path: str = "", force: bool = False) -> None:
    # 首轮强制直连：忽略 fresh/stale，直接对全量 workers 直连探活，避免 fresh 但内容为“无空卡/空”时 60s 误判阻塞
    if force:
        stale_workers = list(workers)
    else:
        stale_workers = [w for w in workers if not availability_is_fresh(w)]
    if not stale_workers:
        return
    def _refresh(worker: dict[str, Any]) -> None:
        try:
            row = fetch_worker_availability(worker)
            note_availability_receipt(worker, row)
            worker["_agent_status"] = "online"
            worker["worker_status_ttl_seconds"] = int(row.get("ttlSeconds") or worker.get("worker_status_ttl_seconds") or 180)
            # 信号路径不写 worker_availability.json：仅内存 note_availability_receipt，避免信号风暴写放大与缓存污染
        except Exception as exc:
            worker["_agent_status"] = f"offline: {exc}"
    with futures.ThreadPoolExecutor(max_workers=min(4, len(stale_workers))) as pool:
        pending = {pool.submit(_refresh, w): w for w in stale_workers}
        deadline = time.monotonic() + WORKER_AVAILABILITY_REFRESH_WINDOW_SECONDS
        for fut in pending:
            remaining = max(0.0, deadline - time.monotonic())
            try:
                fut.result(timeout=remaining)
            except Exception:
                pass


def scheduler_should_fail_fast(failed: list[dict[str, Any]], active: dict[str, Any], testing: dict[str, Any]) -> bool:
    if failed:
        return True
    for item in list(active.values()) + list(testing.values()):
        tail = str(item.get("console_tail") or item.get("log_tail") or "")
        if scheduler_log_shows_error(tail):
            return True
        if item.get("exit_code") not in (None, 0, "0"):
            try:
                if int(item.get("exit_code")) != 0:
                    return True
            except Exception:
                if str(item.get("exit_code")).strip():
                    return True
    return False


def scheduler_fail_pending_queue(queue: deque, failed: list[dict[str, Any]], reason: str) -> int:
    count = 0
    while queue:
        failed.append({"experiment_index": queue.popleft(), "finished_at": now(), "error": reason, "status": "failed", "completion_type": "failed", "failedBySignal": True})
        count += 1
    return count


def scheduler_version_info() -> dict[str, Any]:
    return {
        "schedulerVersion": SCHEDULER_VERSION,
        "runtimeVersion": RUNTIME_VERSION,
        "pluginVersion": PLUGIN_VERSION,
        "checkedAt": datetime.now().astimezone().isoformat(),
    }


def scheduler_dependency_status() -> dict[str, Any]:
    conda_env = simple_conda_env_name(os.environ)
    environment = {
        "kind": "conda" if conda_env else "system_python",
        "name": conda_env,
        "label": f"Conda {conda_env}" if conda_env else "系统 Python",
        "python": sys.executable,
    }
    missing = [] if yaml is not None else [{"module": "yaml", "package": "PyYAML"}]
    if conda_env:
        install_command = f"conda run -n {shlex.quote(conda_env)} python -m pip install PyYAML"
    else:
        install_command = shlex.join([sys.executable, "-m", "pip", "install", "PyYAML"])
    if missing:
        message = (
            f"Scheduler 依赖预检失败。当前执行环境：{environment['label']} "
            f"({environment['python']})；缺失模块：yaml (PyYAML)；"
            f"安装命令：{install_command}。安装完成后重新校验 Plan。"
        )
    else:
        message = f"Scheduler 依赖已就绪：{environment['label']} ({environment['python']})。"
    return {
        "schemaVersion": 1,
        "ok": not missing,
        "environment": environment,
        "missingModules": missing,
        "installCommand": install_command if missing else "",
        "message": message,
    }


def require_scheduler_dependencies() -> dict[str, Any]:
    status = scheduler_dependency_status()
    if not status["ok"]:
        raise SystemExit(status["message"])
    return status

CPU_SAMPLE_SCRIPT = r"""
import json, os, time

def snap():
    parts = open('/proc/stat', 'r', encoding='utf-8').readline().split()[1:]
    nums = [int(x) for x in parts]
    idle = nums[3] + (nums[4] if len(nums) > 4 else 0)
    return sum(nums), idle

t1, i1 = snap()
time.sleep(0.25)
t2, i2 = snap()
dt = max(1, t2 - t1)
cpu = max(0.0, min(100.0, (1.0 - ((i2 - i1) / dt)) * 100.0))
load1 = os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0.0
cores = os.cpu_count() or 1
print(json.dumps({'cpu_usage_percent': round(cpu, 1), 'load_average_1': round(float(load1), 2), 'cpu_cores': int(cores)}))
""".strip()


@dataclass(frozen=True)
class Job:
    index: int
    suite: str
    case: str
    seed: int
    config: dict[str, Any]
    output_dir: str
    result_csv: str
    train_command: str
    test_command: str
    run_wrapper: str
    wrap_output: bool
    base_config_path: str
    template_values: dict[str, Any]
    result_aliases: dict[str, str]


def now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def raw_iso_age_seconds(value: object) -> float | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        stamp = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return (datetime.now().astimezone() - stamp).total_seconds()
    except Exception:
        return None


def iso_age_seconds(value: object) -> float | None:
    age = raw_iso_age_seconds(value)
    return None if age is None else max(0.0, age)


def load_yaml_file(path: str | Path) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.tmp.{os.getpid()}.{int(time.time() * 1000)}")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def atomic_write_json(path: Path, payload: Any) -> None:
    atomic_write_text(path, json.dumps(payload, indent=2, ensure_ascii=False))


def deep_merge(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for key, value in (patch or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def set_dotted(data: dict[str, Any], dotted: str, value: Any) -> None:
    cur = data
    parts = dotted.split(".")
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    cur[parts[-1]] = value


def render_template(template: str, values: dict[str, Any]) -> str:
    out = template
    for key, value in values.items():
        out = out.replace("$" + "{" + key + "}", str(value)).replace("{" + key + "}", str(value))
    return out


def render_config_templates(value: Any, values: dict[str, Any]) -> Any:
    if isinstance(value, str):
        return render_template(value, values)
    if isinstance(value, dict):
        return {key: render_config_templates(item, values) for key, item in value.items()}
    if isinstance(value, list):
        return [render_config_templates(item, values) for item in value]
    return value


def load_config(path: str | Path, inheritance_stack: tuple[Path, ...] = ()) -> dict[str, Any]:
    config_path = Path(path).expanduser()
    resolved_path = config_path.resolve()
    if resolved_path in inheritance_stack:
        cycle = " -> ".join(item.as_posix() for item in (*inheritance_stack, resolved_path))
        raise ValueError(f"配置 defaults_from 存在循环：{cycle}")
    cfg = load_yaml_file(config_path)
    if not isinstance(cfg, dict):
        raise ValueError(f"配置文件根节点必须是对象：{config_path.as_posix()}")
    parent = cfg.get("defaults_from")
    if parent:
        if not isinstance(parent, (str, Path)) or not str(parent).strip():
            raise ValueError(f"defaults_from 必须是配置路径：{config_path.as_posix()}")
        parent_path = Path(parent).expanduser()
        if not parent_path.is_absolute():
            adjacent = config_path.parent / parent_path
            project_relative = parent_path
            parent_path = adjacent if adjacent.is_file() or not project_relative.is_file() else project_relative
        return deep_merge(load_config(parent_path, (*inheritance_stack, resolved_path)), {k: v for k, v in cfg.items() if k != "defaults_from"})
    return cfg


def load_plan(path: str | Path) -> dict[str, Any]:
    plan = load_yaml_file(path)
    plan["_file"] = str(path)
    return plan


def plan_execution_mode(plan: dict[str, Any], requested: str = "") -> str:
    raw = re.sub(r"[\s-]+", "_", str(requested or plan.get("mode") or "train_test").strip().lower())
    aliases = {
        "training": "train",
        "train_only": "train",
        "eval": "test",
        "evaluate": "test",
        "evaluation": "test",
        "test_only": "test",
        "eval_only": "test",
        "train_and_test": "train_test",
        "both": "train_test",
        "all": "train_test",
    }
    mode = aliases.get(raw, raw)
    if mode not in {"train", "test", "train_test"}:
        raise SystemExit(f"不支持运行模式：{raw}；mode 只能使用 train、test 或 train_test")
    return mode


def load_project_adapter_config(root: Path | None = None) -> dict[str, Any]:
    config_path = (root or Path.cwd()) / "experiments" / "simple_project.yaml"
    if not config_path.is_file():
        return {}
    try:
        loaded = load_yaml_file(config_path)
        return loaded if isinstance(loaded, dict) else {}
    except Exception:
        return {}


def text_field(record: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = record.get(key)
        if isinstance(value, (str, int, float)) and str(value).strip():
            return str(value).strip()
    return ""


def dict_field(record: dict[str, Any], *keys: str) -> dict[str, Any]:
    for key in keys:
        value = record.get(key)
        if isinstance(value, dict):
            return value
    return {}


def bool_field(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        text = value.strip().lower()
        if text in {"1", "true", "yes", "y", "on"}:
            return True
        if text in {"0", "false", "no", "n", "off"}:
            return False
    return default


RESULT_FILE_KEYS = (
    "path", "file", "result", "resultFile", "result_file",
    "result_csv", "resultCsv", "results_csv", "resultsCsv",
    "metrics_csv", "metricsCsv", "summary_csv", "summaryCsv",
    "output", "outputFile", "output_file", "output_csv", "outputCsv",
    "result_json", "resultJson", "metrics_json", "metricsJson",
    "summary_txt", "summaryTxt", "log", "log_file", "logFile",
)

DIRECT_RESULT_KEYS = (
    "result_csv", "resultCsv", "results_csv", "resultsCsv",
    "metrics_csv", "metricsCsv", "summary_csv", "summaryCsv",
    "output_csv", "outputCsv", "result_json", "resultJson",
    "metrics_json", "metricsJson", "summary_txt", "summaryTxt",
    "log_file", "logFile",
)

OUTPUT_DIR_KEYS = (
    "output_dir", "outputDir", "result_dir", "resultDir",
    "results_dir", "resultsDir", "work_dir", "workDir", "workdir",
    "save_dir", "saveDir", "log_dir", "logDir",
)

RESULT_TEMPLATE_ALIAS_KEYS = DIRECT_RESULT_KEYS

OUTPUT_TEMPLATE_ALIAS_KEYS = OUTPUT_DIR_KEYS

COMMAND_RESULT_FLAG_ALIASES = {
    "result-csv": "result_csv", "result_csv": "result_csv",
    "results-csv": "results_csv", "results_csv": "results_csv",
    "metrics-csv": "metrics_csv", "metrics_csv": "metrics_csv",
    "summary-csv": "summary_csv", "summary_csv": "summary_csv",
    "output-csv": "output_csv", "output_csv": "output_csv",
    "result-json": "result_json", "result_json": "result_json",
    "metrics-json": "metrics_json", "metrics_json": "metrics_json",
    "summary-txt": "summary_txt", "summary_txt": "summary_txt",
    "log-file": "log_file", "log_file": "log_file",
    "stdout": "log_file", "stderr": "log_file",
}

COMMAND_RESULT_DIR_FLAGS = {
    "output", "out", "output-dir", "output_dir", "out-dir", "out_dir",
    "result-dir", "result_dir", "results-dir", "results_dir",
    "work-dir", "work_dir", "workdir", "save-dir", "save_dir",
    "log-dir", "log_dir", "logging-dir", "logging_dir", "loggingdir",
    "tensorboard-log-dir", "tensorboard_log_dir", "tensorboardlogdir",
    "tb-log-dir", "tb_log_dir", "tblogdir", "run-dir", "run_dir", "rundir",
    "default-root-dir", "default_root_dir",
    "defaultrootdir", "dirpath", "hydra.run.dir", "hydra.sweep.dir",
    "logger.save_dir", "logger.save-dir", "trainer.default_root_dir",
    "trainer.default-root-dir",
}

RESULT_ALIAS_VARIANTS = {
    "result_csv": ("result_csv", "resultCsv"),
    "results_csv": ("results_csv", "resultsCsv"),
    "metrics_csv": ("metrics_csv", "metricsCsv"),
    "summary_csv": ("summary_csv", "summaryCsv"),
    "output_csv": ("output_csv", "outputCsv"),
    "result_json": ("result_json", "resultJson"),
    "metrics_json": ("metrics_json", "metricsJson"),
    "summary_txt": ("summary_txt", "summaryTxt"),
    "log_file": ("log_file", "logFile"),
}

RESULT_ROOT_FILES = {
    "metrics_summary.csv", "metrics_case.csv", "results.csv", "result.csv",
    "metrics.csv", "summary.csv", "scores.csv", "score.csv",
    "detailed_metrics.csv", "test_metrics.csv", "classification_report.csv",
    "metrics.json", "summary.json", "result.json", "results.json",
    "classification_report.json", "summary.txt", "result.txt", "results.txt",
    "classification_report.txt", "stdout.log", "stderr.log", "train.log",
    "test.log", "console.log", "output.out",
}

RESULT_TOP_DIRS = {
    "work_dirs", "exports", "results", "outputs", "runs", "logs",
    "test_results", "lightning_logs", "custom_results", "reports",
    "artifacts", "evals", "eval", "evaluation", "predictions", "submissions",
}

RESULT_PREFIX_PAIRS = {
    ("experiments", "results"), ("experiments", "runs"),
    ("simple_cluster", "results"), ("simple_cluster", "logs"),
    ("simple_cluster", "tmux_logs"), ("simple_cluster", "archive"),
}

RESULT_EXACT_PAIRS = {("experiments", "results.csv")}

# 历史产物解耦：用于调度前检测 output_dir 是否已有产物的标记文件（与 RESULT_ROOT_FILES 交叉但聚焦关键产物）
EXISTING_ARTIFACT_MARKERS = (
    "metrics_summary.csv", "metrics.csv", "results.csv", "summary.csv",
    "best_model.pth", "checkpoint.pth", "latest.pth", "model.pth",
    "train.log", "test.log", "stdout.log", "stderr.log", "console.log",
    "artifact_manifest.json", "checkpoint_manifest.json",
    "config_snapshot.yaml", "env_snapshot.json",
)


def has_existing_artifacts(output_dir: str | Path) -> dict[str, Any]:
    base = Path(str(output_dir or "").strip())
    if not base.is_dir():
        return {"exists": False, "markers": [], "totalFiles": 0}
    markers: list[str] = []
    total = 0
    try:
        for child in base.iterdir():
            total += 1
            if child.name in EXISTING_ARTIFACT_MARKERS:
                markers.append(child.name)
        # 深层 checkpoint 兜底
        for name in ("best_model.pth", "checkpoint.pth", "latest.pth"):
            if not any(m == name for m in markers) and (base / name).exists():
                markers.append(name)
            # work_dirs 常见 checkpoint 子目录
            ckpt_dir = base / "checkpoints"
            if ckpt_dir.is_dir():
                for p in ckpt_dir.iterdir():
                    if p.is_file() and p.suffix in (".pth", ".ckpt", ".pt"):
                        markers.append(f"checkpoints/{p.name}")
                        break
    except Exception:
        pass
    return {"exists": bool(markers or total > 0 and (base / "artifact_manifest.json").exists()), "markers": sorted(set(markers)), "totalFiles": total}


def detect_existing_outputs(jobs: list[Job]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for job in jobs:
        info = has_existing_artifacts(job.output_dir)
        if info["exists"]:
            out.append({"index": job.index, "case": job.case, "seed": job.seed, "output_dir": job.output_dir, "markers": info["markers"], "totalFiles": info["totalFiles"]})
    return out


def check_existing_mode(args: argparse.Namespace) -> None:
    plan = load_plan(args.plan) if args.plan else {}
    jobs = jobs_for_args(plan, args)
    existing = detect_existing_outputs(jobs)
    payload = {"schemaVersion": 1, "ok": True, "plan": args.plan, "total": len(jobs), "existingCount": len(existing), "existing": existing}
    print(json.dumps(payload, ensure_ascii=False))



def direct_result_field(*records: dict[str, Any]) -> str:
    for record in records:
        if isinstance(record, dict):
            value = text_field(record, *DIRECT_RESULT_KEYS)
            if value:
                return value
    return ""


def direct_result_alias_fields(*records: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for record in records:
        if not isinstance(record, dict):
            continue
        for key in DIRECT_RESULT_KEYS:
            if key not in out:
                value = text_field(record, key)
                if value:
                    out[key] = value
    return out


def expand_result_alias_variants(values: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in values.items():
        if not value:
            continue
        for variant in RESULT_ALIAS_VARIANTS.get(key, (key,)):
            out[variant] = value
    return out


def existing_project_file_text(root: Path, value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    candidate = Path(text)
    check = candidate if candidate.is_absolute() else root / candidate
    if not check.is_file():
        return ""
    return str(candidate if candidate.is_absolute() else candidate.as_posix())


def project_adapter_runner_defaults(root: Path | None = None) -> dict[str, Any]:
    project_root = root or Path.cwd()
    adapter_config = load_project_adapter_config(project_root)
    if not adapter_config:
        return {}
    entrypoints = adapter_config.get("entrypoints") if isinstance(adapter_config.get("entrypoints"), dict) else {}
    adapter = adapter_config.get("adapter") if isinstance(adapter_config.get("adapter"), dict) else {}
    runner: dict[str, Any] = {}
    train_template = text_field(entrypoints, "trainCommandTemplate", "train_command_template", "trainCommand", "train_command")
    test_template = text_field(entrypoints, "testCommandTemplate", "test_command_template", "testCommand", "test_command")
    if train_template:
        runner["train_command"] = train_template
    if test_template:
        runner["test_command"] = test_template
    wrapper = text_field(adapter, "runWrapper", "run_wrapper") or text_field(adapter_config, "runWrapper", "run_wrapper")
    wrapper_path = existing_project_file_text(project_root, wrapper)
    if wrapper_path:
        runner["_adapter_run_wrapper"] = wrapper_path
        runner["_adapter_wrap_output"] = True
    return runner


def scalar_template_fields(record: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in (record or {}).items():
        if isinstance(value, (str, int, float, bool)):
            out[str(key)] = value
    return out


def normalize_case_items(plan: dict[str, Any]) -> list[dict[str, Any]]:
    default_case = text_field(plan, "case", "name", "id", "experiment_id", "experimentId") or "baseline"
    if "cases" in plan:
        raw = plan.get("cases")
    elif "experiments" in plan:
        raw = plan.get("experiments")
    else:
        raw = [{"case": default_case, "overrides": {}}]
    if isinstance(raw, dict):
        return [deep_merge({"case": str(key)}, value if isinstance(value, dict) else {"value": value}) for key, value in raw.items()]
    if isinstance(raw, list):
        return [item if isinstance(item, dict) else {"case": str(item), "overrides": {}} for item in raw]
    return [{"case": "baseline", "overrides": {}}]


def case_label(case_item: dict[str, Any], index: int) -> str:
    return text_field(case_item, "case", "name", "id", "experiment_id", "experimentId") or f"case_{index}"


def case_runner(plan_runner: dict[str, Any], case_item: dict[str, Any]) -> dict[str, Any]:
    case_runner_config = case_item.get("runner") if isinstance(case_item.get("runner"), dict) else {}
    runner = deep_merge(plan_runner, case_runner_config)
    case_command = text_field(case_item, "command")
    has_case_train = bool(text_field(case_item, "train_command", "trainCommand") or text_field(case_runner_config, "train_command", "trainCommand"))
    if case_command and not has_case_train:
        runner["train_command"] = case_command
    if text_field(case_item, "train_command", "trainCommand"):
        runner["train_command"] = text_field(case_item, "train_command", "trainCommand")
    if text_field(case_item, "test_command", "testCommand"):
        runner["test_command"] = text_field(case_item, "test_command", "testCommand")
    if text_field(case_runner_config, "trainCommand") and not text_field(case_runner_config, "train_command"):
        runner["train_command"] = text_field(case_runner_config, "trainCommand")
    if text_field(case_runner_config, "testCommand") and not text_field(case_runner_config, "test_command"):
        runner["test_command"] = text_field(case_runner_config, "testCommand")
    return runner


def plan_runner(plan: dict[str, Any]) -> dict[str, Any]:
    runner = project_adapter_runner_defaults(Path.cwd())
    if isinstance(plan.get("runner"), dict):
        runner = deep_merge(runner, plan.get("runner") or {})
    plan_runner_config = plan.get("runner") if isinstance(plan.get("runner"), dict) else {}
    if text_field(plan, "train_command", "trainCommand"):
        runner["train_command"] = text_field(plan, "train_command", "trainCommand")
    if text_field(plan, "test_command", "testCommand"):
        runner["test_command"] = text_field(plan, "test_command", "testCommand")
    if text_field(plan_runner_config, "trainCommand") and not text_field(plan_runner_config, "train_command"):
        runner["train_command"] = text_field(plan_runner_config, "trainCommand")
    if text_field(plan_runner_config, "testCommand") and not text_field(plan_runner_config, "test_command"):
        runner["test_command"] = text_field(plan_runner_config, "testCommand")
    if text_field(plan, "command") and not runner.get("train_command"):
        runner["train_command"] = text_field(plan, "command")
    return runner


def runner_wrapper(runner: dict[str, Any]) -> tuple[str, bool]:
    wrapper_value = text_field(runner, "run_wrapper", "runWrapper", "_adapter_run_wrapper")
    wrapper = existing_project_file_text(Path.cwd(), wrapper_value)
    wrap_setting = runner.get("wrap_output", runner.get("wrapOutput", runner.get("useRunWrapper", runner.get("use_run_wrapper", runner.get("_adapter_wrap_output", bool(wrapper))))))
    enabled = bool_field(wrap_setting, bool(wrapper))
    return (wrapper if enabled else ""), bool(wrapper and enabled)


def safe_project_source_file(root: Path, value: object) -> Path | None:
    text = str(value or "").strip().strip('"\'')
    if not text or not text.lower().endswith(".py") or re.search(r"[<>|;&]", text):
        return None
    candidate = Path(text)
    full = candidate if candidate.is_absolute() else root / candidate
    try:
        full = full.resolve()
        full.relative_to(root.resolve())
    except Exception:
        return None
    return full if full.is_file() else None


def job_source_files(root: Path, job: Job) -> list[Path]:
    files: list[Path] = []
    for command in (job.train_command, job.test_command):
        try:
            parts = shlex.split(str(command or ""), posix=(os.name != "nt"))
        except Exception:
            parts = str(command or "").split()
        for item in parts:
            source = safe_project_source_file(root, item)
            if source and source not in files:
                files.append(source)
    for name in ("train.py", "test.py"):
        source = safe_project_source_file(root, name)
        if source and source not in files:
            files.append(source)
    return files[:24]


def python_call_name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        prefix = python_call_name(node.value)
        return f"{prefix}.{node.attr}" if prefix else node.attr
    return ""


def python_output_writer_evidence(paths: list[Path]) -> dict[str, bool]:
    evidence = {"adapter": False, "tensorboard": False}
    for path in paths:
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except Exception:
            continue
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = [alias.name for alias in getattr(node, "names", [])]
                modules = names[:] + ([getattr(node, "module", "") or ""] if isinstance(node, ast.ImportFrom) else [])
                if any(re.search(r"(?:^|\.)(?:tensorboard|tensorboardX)$|torch\.utils\.tensorboard", item, re.I) for item in modules):
                    evidence["tensorboard"] = True
                continue
            if not isinstance(node, ast.Call):
                continue
            name = python_call_name(node.func).lower()
            if name.rsplit(".", 1)[-1] in {"collect_outputs", "write_metrics_summary"}:
                evidence["adapter"] = True
            if name.rsplit(".", 1)[-1] in {"summarywriter", "eventfilewriter"} or name.endswith("add_scalar"):
                evidence["tensorboard"] = True
    return evidence


def tensorboard_conversion_available() -> bool:
    return importlib.util.find_spec("tensorboard") is not None


def output_interface_report(root: Path, jobs: list[Job]) -> dict[str, Any]:
    root = root.resolve()
    rows: list[dict[str, Any]] = []
    for job in jobs:
        commands = [str(job.train_command or ""), str(job.test_command or "")]
        command_text = "\n".join(commands)
        wrapper_ready = bool(job.wrap_output and job.run_wrapper and existing_project_file_text(root, job.run_wrapper))
        command_adapter = bool(re.search(r"(?:run_wrapper\.py|collect_outputs\s*\(|write_metrics_summary\s*\()", command_text, re.I))
        sources = job_source_files(root, job)
        code_evidence = python_output_writer_evidence(sources)
        adapter_ready = command_adapter or code_evidence["adapter"]
        tensorboard_evidence = bool(code_evidence["tensorboard"] or re.search(r"summarywriter|tensorboard", command_text, re.I))
        tensorboard_ready = tensorboard_evidence and tensorboard_conversion_available()
        channels = []
        if wrapper_ready:
            channels.append({"type": "run_wrapper", "path": job.run_wrapper})
        if adapter_ready:
            channels.append({"type": "adapter_call", "files": [path.relative_to(root).as_posix() for path in sources]})
        if tensorboard_ready:
            channels.append({"type": "tensorboard_scalars"})
        missing: list[str] = []
        if not channels:
            if tensorboard_evidence and not tensorboard_conversion_available():
                missing.append("TensorBoard 标量转换依赖 tensorboard；请在远端环境安装 tensorboard")
            else:
                missing.append("未验证的输出接口：请使用 simple_adapter/run_wrapper 包裹命令，或在入口代码调用 collect_outputs/write_metrics_summary，或使用 TensorBoard SummaryWriter 并安装 tensorboard")
        rows.append({
            "index": job.index,
            "case": job.case,
            "seed": job.seed,
            "ok": bool(channels),
            "channels": channels,
            "missing": missing,
            "sourceFiles": [path.relative_to(root).as_posix() for path in sources],
        })
    failed = [row for row in rows if not row["ok"]]
    return {
        "schemaVersion": 1,
        "ok": not failed,
        "checkedAt": now(),
        "rows": rows,
        "failedIndexes": [row["index"] for row in failed],
        "missing": list(dict.fromkeys(item for row in failed for item in row["missing"])),
        "message": "" if not failed else f"{len(failed)} 个任务缺少可验证的结果输出接口",
    }


def expected_result_candidates(record: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for key in ("expectedResults", "expected_results", "resultFiles", "result_files", "outputFiles", "output_files"):
        value = record.get(key)
        out.extend(result_candidate_values(value))
    return [item for item in dict.fromkeys(out) if item]


def result_candidate_values(value: Any) -> list[str]:
    out: list[str] = []
    if isinstance(value, str):
        candidate = normalize_result_candidate(value)
        if candidate:
            out.append(candidate)
    elif isinstance(value, list):
        for item in value:
            out.extend(result_candidate_values(item))
    elif isinstance(value, dict):
        for key in RESULT_FILE_KEYS:
            if key in value:
                out.extend(result_candidate_values(value.get(key)))
    return out


def normalize_result_candidate(value: Any) -> str:
    text = str(value or "").strip().strip("'\"").replace("\\", "/")
    if not text or text.lower() in ("none", "null", "false"):
        return ""
    if text.startswith("#") or text.endswith("/"):
        return ""
    name = Path(text).name.lower()
    if name == "jobs.csv":
        return ""
    if not re.search(r"\.(csv|json|txt|log|out)$", text, re.I):
        return ""
    parts = [part for part in text.lstrip("/").split("/") if part and part != "."]
    lowered = [part.lower() for part in parts]
    if not lowered or any(part == ".." for part in lowered):
        return ""
    if len(lowered) == 1 and lowered[0] in RESULT_ROOT_FILES:
        return "/".join(parts)
    if tuple(lowered) in RESULT_EXACT_PAIRS:
        return "/".join(parts)
    if lowered[0] in RESULT_TOP_DIRS:
        return "/".join(parts)
    if len(lowered) >= 2 and tuple(lowered[:2]) in RESULT_PREFIX_PAIRS:
        return "/".join(parts)
    return ""


def command_result_candidates(command: Any) -> list[str]:
    return list(command_result_alias_fields(command).values())


def command_result_alias_fields(command: Any) -> dict[str, str]:
    text = normalize_command_text(str(command or "")).replace("\n", " ")
    if not text:
        return {}
    try:
        tokens = shlex.split(text, posix=True)
    except Exception:
        tokens = text.split()
    out: dict[str, str] = {}
    dir_flag_aliases = {item.replace("_", "-").lower() for item in COMMAND_RESULT_DIR_FLAGS}
    for index, token in enumerate(tokens):
        if token.startswith("--"):
            flag_text = token[2:]
            value = ""
            if "=" in flag_text:
                flag, value = flag_text.split("=", 1)
            else:
                flag = flag_text
                if index + 1 < len(tokens) and not str(tokens[index + 1]).startswith("-"):
                    value = str(tokens[index + 1])
            alias_key = COMMAND_RESULT_FLAG_ALIASES.get(flag.replace("_", "-").lower())
            if alias_key:
                candidate = normalize_result_candidate(value)
                if candidate and alias_key not in out:
                    out[alias_key] = candidate
            elif flag.replace("_", "-").lower() in {item.replace("_", "-") for item in COMMAND_RESULT_DIR_FLAGS}:
                candidate = default_result_candidate_for_dir(value)
                if candidate:
                    out.setdefault("result_csv", candidate)
            continue
        if "=" in str(token):
            key, value = str(token).split("=", 1)
            normalized_key = key.replace("_", "-").lower()
            if normalized_key in dir_flag_aliases or re.search(r"(?:output_dir|output-dir|outputDir|out_dir|out-dir|work_dir|work-dir|workDir|workdir|save_dir|save-dir|saveDir|log_dir|log-dir|logDir|logging_dir|logging-dir|loggingDir|tensorboard_log_dir|tensorboard-log-dir|tensorboardLogDir|tb_log_dir|tb-log-dir|tbLogDir|run_dir|run-dir|runDir|rundir|result_dir|result-dir|resultDir|results_dir|results-dir|resultsDir|default_root_dir|default-root-dir|defaultRootDir|dirpath|hydra\.run\.dir|hydra\.sweep\.dir|logger\.save_dir|logger\.save-dir|trainer\.default_root_dir|trainer\.default-root-dir)$", key):
                candidate = default_result_candidate_for_dir(value)
                if candidate:
                    out.setdefault("result_csv", candidate)
    return out

def default_result_candidate_for_dir(value: Any) -> str:
    text = str(value or "").strip().strip("'\"").replace("\\", "/").strip("/")
    if not text or re.search(r"/?[^/]+\.[A-Za-z0-9]{1,8}$", text):
        return ""
    return normalize_result_candidate(f"{text}/metrics_summary.csv")


def runner_result_candidates(runner: dict[str, Any]) -> list[str]:
    return list(dict.fromkeys([*command_result_candidates(runner.get("test_command")), *command_result_candidates(runner.get("train_command"))]))


def runner_result_alias_fields(runner: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for command in (runner.get("test_command"), runner.get("train_command")):
        for key, value in command_result_alias_fields(command).items():
            out.setdefault(key, value)
    return out


def normalize_default_result_csv_dir(value: Any) -> str:
    text = str(value or "experiments/results").strip().replace("\\", "/")
    if text.startswith("/") or re.match(r"^[A-Za-z]:", text):
        raise SystemExit("--default-result-csv-dir 必须是项目内相对目录。")
    text = text.strip("/")
    parts = [part for part in text.split("/") if part and part != "."]
    if not parts or any(part == ".." for part in parts):
        raise SystemExit("--default-result-csv-dir 必须是项目内相对目录。")
    return "/".join(parts)


def build_jobs(plan: dict[str, Any], default_result_csv_dir: str = "experiments/results") -> tuple[dict[str, Any], list[Job]]:
    suite = str(plan.get("suite") or slug(Path(plan.get("_file", "plan")).stem, "suite"))
    seeds = [int(seed) for seed in (plan.get("seeds") or [42])]
    cases = normalize_case_items(plan)
    top_config = plan.get("config")
    top_base_config = plan.get("base_config")
    base_config_path = str(top_base_config if isinstance(top_base_config, str) else (top_config if isinstance(top_config, str) else "") or "")
    plan_config_patch: dict[str, Any] = {}
    if isinstance(top_base_config, dict):
        plan_config_patch = deep_merge(plan_config_patch, top_base_config)
    if isinstance(top_config, dict):
        plan_config_patch = deep_merge(plan_config_patch, top_config)
    has_case_config_source = any(
        text_field(item, "base_config") or isinstance(item.get("config"), str) or isinstance(item.get("base_config"), dict) or isinstance(item.get("config"), dict)
        for item in cases
    )
    if not base_config_path and not plan_config_patch and not has_case_config_source:
        raise SystemExit("计划缺少 base_config。")
    config_cache: dict[str, dict[str, Any]] = {}
    naming = plan.get("naming") or {}
    runner = plan_runner(plan)
    plan_expected_results = expected_result_candidates(plan)
    sweep_dir_tpl = str(naming.get("sweep_dir") or "work_dirs/multirun/" + "$" + "{suite}")
    job_name_tpl = str(naming.get("job_name") or "$" + "{index}_" + "$" + "{case}_seed" + "$" + "{seed}")
    plan_paper = plan.get("paper") if isinstance(plan.get("paper"), dict) else {}

    def load_config_cached(path: str) -> dict[str, Any]:
        if not str(path or "").strip():
            return {}
        if path not in config_cache:
            config_cache[path] = load_config(path)
        return config_cache[path]

    jobs: list[Job] = []
    index = 0
    for case_item in cases:
        case_name = case_label(case_item, index)
        case_config_value = case_item.get("config")
        case_base_config_value = case_item.get("base_config")
        case_base_config_tpl = text_field(case_item, "base_config") or (str(case_config_value) if isinstance(case_config_value, str) else "") or base_config_path
        case_config_patch: dict[str, Any] = {}
        if isinstance(case_base_config_value, dict):
            case_config_patch = deep_merge(case_config_patch, case_base_config_value)
        if isinstance(case_config_value, dict):
            case_config_patch = deep_merge(case_config_patch, case_config_value)
        overrides = case_item.get("overrides") or case_item.get("override") or {}
        local_runner = case_runner(runner, case_item)
        run_wrapper, wrap_output = runner_wrapper(local_runner)
        case_expected_results = expected_result_candidates(case_item)
        for seed in seeds:
            case_base_config_path = case_base_config_tpl
            values = {
                **scalar_template_fields(plan),
                **scalar_template_fields(case_item),
                "suite": suite,
                "case": case_name,
                "name": text_field(case_item, "name") or case_name,
                "id": text_field(case_item, "id") or case_name,
                "seed": seed,
                "index": index,
                "base_config": case_base_config_path,
                "base_config_path": case_base_config_path,
            }
            if case_base_config_path:
                case_base_config_path = render_template(case_base_config_path, values)
                values.update({"base_config": case_base_config_path, "base_config_path": case_base_config_path})
            job_name = render_template(job_name_tpl, values)
            experiment_name = render_template(str(naming.get("experiment_name") or "$" + "{suite}/" + "$" + "{case}/seed_" + "$" + "{seed}"), {**values, "job_name": job_name})
            values.update({"job_name": job_name, "experiment_name": experiment_name})
            output_tpl = text_field(case_item, *OUTPUT_DIR_KEYS) or text_field(plan, *OUTPUT_DIR_KEYS)
            output_dir = render_template(output_tpl, values) if output_tpl else (Path(render_template(sweep_dir_tpl, values)) / job_name).as_posix()
            output_dir = output_dir.replace("\\\\", "/")
            values.update({"output_dir": output_dir, "outputDir": output_dir})
            for alias_key in OUTPUT_TEMPLATE_ALIAS_KEYS:
                values[alias_key] = output_dir
            case_paper = case_item.get("paper") if isinstance(case_item.get("paper"), dict) else {}
            result_alias_values = direct_result_alias_fields(case_item, case_paper, plan_paper, plan)
            runner_result_alias_values = runner_result_alias_fields(local_runner)
            runner_expected_results = list(runner_result_alias_values.values())
            result_csv_tpl = direct_result_field(case_item, case_paper, plan_paper, plan) or (case_expected_results + plan_expected_results + runner_expected_results + [f"{normalize_default_result_csv_dir(default_result_csv_dir)}/{suite}.csv"])[0]
            result_csv = render_template(result_csv_tpl, values)
            values.update({"result_csv": result_csv, "resultCsv": result_csv})
            for alias_key, alias_tpl in result_alias_values.items():
                values[alias_key] = render_template(alias_tpl, values)
            for alias_key, alias_tpl in expand_result_alias_variants(runner_result_alias_values).items():
                values[alias_key] = render_template(alias_tpl, values)
            actual_result_aliases = {
                "result_csv": result_csv,
                "resultCsv": result_csv,
                **{key: render_template(value, values) for key, value in result_alias_values.items()},
                **{key: render_template(value, values) for key, value in expand_result_alias_variants(runner_result_alias_values).items()},
            }
            for alias_key in RESULT_TEMPLATE_ALIAS_KEYS:
                values.setdefault(alias_key, result_csv)
            result_aliases = {
                key: str(actual_result_aliases.get(key) or "")
                for key in RESULT_TEMPLATE_ALIAS_KEYS
                if str(actual_result_aliases.get(key) or "").strip()
            }
            cfg = copy.deepcopy(load_config_cached(case_base_config_path))
            if plan_config_patch:
                cfg = deep_merge(cfg, copy.deepcopy(plan_config_patch))
            if case_config_patch:
                cfg = deep_merge(cfg, copy.deepcopy(case_config_patch))
            cfg["seed"] = seed
            cfg["experiment_name"] = experiment_name
            set_dotted(cfg, "runtime.output_dir", output_dir)
            for key, value in overrides.items():
                set_dotted(cfg, str(key), value)
            cfg = render_config_templates(cfg, values)
            jobs.append(Job(
                index=index,
                suite=suite,
                case=case_name,
                seed=seed,
                config=cfg,
                output_dir=output_dir,
                result_csv=result_csv,
                train_command=str(local_runner.get("train_command") or ""),
                test_command=str(local_runner.get("test_command") or ""),
                run_wrapper=run_wrapper,
                wrap_output=wrap_output,
                base_config_path=case_base_config_path,
                template_values=values,
                result_aliases=result_aliases,
            ))
            index += 1
    return plan, jobs


def debug_run_root(plan_file: str, run_id: str) -> str:
    return f"simple_cluster/debug_runs/{plan_runtime_key(plan_file)}/{slug(run_id, 'debug', 64)}"


def rewrite_debug_config_paths(value: Any, job_dir: str, result_csv: str, formal_output_dir: str, formal_aliases: dict[str, str], key: str = "") -> Any:
    normalized_key = re.sub(r"[-_]", "", str(key or "")).lower()
    output_keys = {re.sub(r"[-_]", "", item).lower() for item in OUTPUT_DIR_KEYS}
    result_keys = {re.sub(r"[-_]", "", item).lower() for item in RESULT_TEMPLATE_ALIAS_KEYS}
    if normalized_key in output_keys:
        return job_dir
    if normalized_key in result_keys:
        return result_csv
    if isinstance(value, dict):
        return {item_key: rewrite_debug_config_paths(item_value, job_dir, result_csv, formal_output_dir, formal_aliases, str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, list):
        return [rewrite_debug_config_paths(item, job_dir, result_csv, formal_output_dir, formal_aliases) for item in value]
    if isinstance(value, str):
        text = value.replace("\\", "/")
        replacements = [(formal_output_dir, job_dir), *[(path, result_csv) for path in formal_aliases.values()]]
        for original, target in replacements:
            source = str(original or "").replace("\\", "/").rstrip("/")
            if source and (text == source or text.startswith(source + "/")):
                return target + text[len(source):]
    return value


def isolate_debug_jobs(jobs: list[Job], plan_file: str, run_id: str, output_root: str = "") -> list[Job]:
    root = str(output_root or debug_run_root(plan_file, run_id)).replace("\\", "/").strip("/")
    isolated: list[Job] = []
    for job in jobs:
        job_dir = f"{root}/artifacts/job-{job.index}__case-{slug(job.case, 'case', 40)}__seed-{slug(job.seed, 'seed', 24)}"
        result_csv = f"{job_dir}/results.csv"
        aliases: dict[str, str] = {}
        for key, value in job.result_aliases.items():
            name = Path(str(value or "")).name or f"{slug(key, 'result', 40)}.dat"
            aliases[key] = f"{job_dir}/{name}"
        aliases["result_csv"] = result_csv
        aliases["resultCsv"] = result_csv
        values = dict(job.template_values or {})
        values["formal_output_dir"] = job.output_dir
        values["formal_result_csv"] = job.result_csv
        for key in OUTPUT_TEMPLATE_ALIAS_KEYS:
            values[key] = job_dir
        for key in RESULT_TEMPLATE_ALIAS_KEYS:
            values[key] = aliases.get(key) or result_csv
        values.update({"output_dir": job_dir, "outputDir": job_dir, "result_csv": result_csv, "resultCsv": result_csv})
        config = rewrite_debug_config_paths(copy.deepcopy(job.config), job_dir, result_csv, job.output_dir, job.result_aliases)
        set_dotted(config, "runtime.output_dir", job_dir)
        set_dotted(config, "runtime.debug_mode", True)
        set_dotted(config, "runtime.debug_run_id", slug(run_id, "debug", 64))
        isolated.append(replace(job, config=config, output_dir=job_dir, result_csv=result_csv, template_values=values, result_aliases=aliases))
    return isolated


def jobs_for_args(plan: dict[str, Any], args: argparse.Namespace) -> list[Job]:
    _, jobs = build_jobs(plan, str(getattr(args, "default_result_csv_dir", "") or "experiments/results"))
    allowed_indices = only_indices_for_args(args)
    if allowed_indices:
        allowed = set(allowed_indices)
        jobs = [job for job in jobs if int(job.index) in allowed]
        missing = sorted(allowed.difference(int(job.index) for job in jobs))
        if missing:
            raise SystemExit("Assigned experiment indices are not present in Plan: " + ",".join(str(index) for index in missing))
    if bool(getattr(args, "debug_mode", False)):
        jobs = isolate_debug_jobs(jobs, str(getattr(args, "plan", "") or plan.get("_file") or "plan"), str(getattr(args, "debug_run_id", "") or "debug"), str(getattr(args, "debug_output_dir", "") or ""))
    return jobs


def only_indices_for_args(args: argparse.Namespace) -> list[int]:
    raw = str(getattr(args, "only_indices", "") or "").strip()
    if not raw:
        return []
    values: set[int] = set()
    for item in raw.split(","):
        text = item.strip()
        if not text:
            continue
        try:
            index = int(text)
        except ValueError as exc:
            raise SystemExit(f"Invalid --only-indices value: {text}") from exc
        if index < 0:
            raise SystemExit(f"Invalid --only-indices value: {text}")
        values.add(index)
    if not values:
        raise SystemExit("--only-indices must contain at least one experiment index")
    return sorted(values)


def write_job_config(job: Job) -> Path:
    out_dir = Path(job.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    config_path = out_dir / "job_config.yaml"
    config_path.write_text(yaml.safe_dump(job.config, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return config_path


def metric_prefers_lower(name: str) -> bool:
    lower = str(name or "").lower()
    return any(token in lower for token in ("loss", "error", "perplexity", "ece", "brier", "mae", "mse", "rmse", "hd95"))


def write_env_snapshot(path: Path, job: Job) -> None:
    payload = {
        "schemaVersion": 1,
        "python": sys.version.split()[0],
        "command": f"scheduler index={job.index} case={job.case} seed={job.seed}",
        "seed": job.seed,
        "generatedAt": now(),
        "source": "tensorboard_output_adapter",
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_tensorboard_csv(path: Path, rows: list[dict[str, Any]]) -> int:
    fieldnames = [
        "experiment_id", "attempt_id", "study_id", "plan_id", "suite", "method", "dataset", "split",
        "fold", "seed", "metric", "value", "unit", "higher_is_better", "epoch", "step", "timestamp",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    existing: list[dict[str, Any]] = []
    if path.is_file():
        with path.open("r", newline="", encoding="utf-8-sig") as f:
            existing = [row for row in csv.DictReader(f) if row]
    seen = {
        tuple(str(row.get(key, "")) for key in ("experiment_id", "method", "dataset", "split", "seed", "metric", "step"))
        for row in existing
    }
    added = 0
    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if not existing:
            writer.writeheader()
        for row in rows:
            key = tuple(str(row.get(key, "")) for key in ("experiment_id", "method", "dataset", "split", "seed", "metric", "step"))
            if key in seen:
                continue
            writer.writerow(row)
            seen.add(key)
            added += 1
    return added


def collect_tensorboard_metrics(job: Job) -> dict[str, Any]:
    output_dir = Path(job.output_dir)
    if not output_dir.is_dir() or not tensorboard_conversion_available():
        return {"ok": False, "reason": "tensorboard_unavailable_or_no_dir"}
    try:
        from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
    except Exception as exc:
        return {"ok": False, "reason": str(exc)}
    values = {}
    event_count = 0
    for event_file in sorted(output_dir.rglob("events.out.tfevents.*")):
        try:
            accumulator = EventAccumulator(str(event_file.parent), size_guidance={"scalars": 0})
            accumulator.Reload()
            tags = accumulator.Tags().get("scalars") or []
            for tag in tags:
                scalars = accumulator.Scalars(tag)
                if scalars:
                    values[tag] = scalars[-1]
                    event_count += len(scalars)
        except Exception:
            continue
    context = job.template_values or {}
    timestamp = now()
    rows = []
    for tag, scalar in sorted(values.items()):
        rows.append({
            "experiment_id": str(context.get("experiment_id") or context.get("experimentId") or f"{job.suite}/{job.case}/seed_{job.seed}"),
            "attempt_id": "attempt-1",
            "study_id": str(context.get("study_id") or ""),
            "plan_id": str(context.get("plan_id") or ""),
            "suite": job.suite,
            "method": str(context.get("method") or job.case),
            "dataset": str(context.get("dataset") or "unknown"),
            "split": str(context.get("split") or "test"),
            "fold": str(context.get("fold") or ""),
            "seed": job.seed,
            "metric": tag,
            "value": float(scalar.value),
            "unit": "",
            "higher_is_better": not metric_prefers_lower(tag),
            "epoch": "",
            "step": int(scalar.step),
            "timestamp": timestamp,
        })
    added = merge_tensorboard_csv(Path(job.result_csv), rows) if rows else 0
    config_target = output_dir / "config_snapshot.yaml"
    env_target = output_dir / "env_snapshot.json"
    if not config_target.exists():
        config_target.write_text(yaml.safe_dump(job.config, allow_unicode=True, sort_keys=False), encoding="utf-8")
    if not env_target.exists():
        write_env_snapshot(env_target, job)
    return {"ok": bool(rows), "eventCount": event_count, "metricCount": len(rows), "addedRows": added, "resultCsv": job.result_csv}


def append_jobs_csv(jobs: list[Job], path: Path = Path("experiments/results/jobs.csv"), plan_file: str = "") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    exists = path.exists()
    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["plan_file", "planFile", "index", "suite", "case", "seed", "output_dir", *RESULT_TEMPLATE_ALIAS_KEYS])
        if not exists:
            writer.writeheader()
        for job in jobs:
            aliases = {key: str(job.result_aliases.get(key) or job.result_csv).replace("\\", "/") for key in RESULT_TEMPLATE_ALIAS_KEYS}
            writer.writerow({
                "plan_file": str(plan_file or "").replace("\\", "/"),
                "planFile": str(plan_file or "").replace("\\", "/"),
                "index": job.index,
                "suite": job.suite,
                "case": job.case,
                "seed": job.seed,
                "output_dir": job.output_dir.replace("\\", "/"),
                **aliases,
            })


def simple_conda_env_name(env: dict[str, str] | None = None) -> str:
    source = os.environ if env is None else env
    value = str(source.get("SIMPLE_EXPERIMENT_CONDA_ENV") or "").strip()
    return "" if value in {"-", "--"} else value


def simple_conda_required(env: dict[str, str] | None = None) -> bool:
    source = os.environ if env is None else env
    return str(source.get("SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV") or "").strip().lower() in {"1", "true", "yes", "on"}


def simple_runtime_env(base=None):
    env = dict(os.environ if base is None else base)
    if str(env.get("SIMPLE_EXPERIMENT_CONDA_ENV") or "").strip() in {"-", "--"}:
        env["SIMPLE_EXPERIMENT_CONDA_ENV"] = ""
    env.setdefault("SIMPLE_EXPERIMENT_CONDA_ENV", "")
    env.setdefault("SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV", "1" if str(env.get("SIMPLE_EXPERIMENT_CONDA_ENV") or "").strip() else "0")
    return env


def _simple_conda_env_python_candidates(conda_env: str) -> list[str]:
    name = str(conda_env or "").strip()
    if not name or name in {"-", "--"}:
        return []
    # 绝对路径支持：如 /path/to/conda_envs/<env_name> 直接取 {path}/bin/python；仅以 / 开头的绝对路径为主流程，环境名分支保留为降级兜底不再作为主路径
    if name.strip().startswith("/"):
        clean = name.strip().rstrip("/\\")
        if clean.endswith("/bin/python"):
            return [clean]
        return [clean + "/bin/python"]
    home = os.path.expanduser("~")
    candidates: list[str] = []
    for base in [
        os.path.join(home, "miniconda3", "envs", name, "bin", "python"),
        os.path.join(home, "anaconda3", "envs", name, "bin", "python"),
        os.path.join(home, "miniforge3", "envs", name, "bin", "python"),
        os.path.join(home, "mambaforge", "envs", name, "bin", "python"),
        f"/opt/conda/envs/{name}/bin/python",
        f"/opt/anaconda3/envs/{name}/bin/python",
        f"/usr/local/anaconda3/envs/{name}/bin/python",
    ]:
        candidates.append(base)
    return candidates


def _simple_conda_resolve_env_python(conda_env: str) -> str | None:
    name = str(conda_env or "").strip()
    if not name or name in {"-", "--"}:
        return None
    # 仅接受绝对路径：以 / 开头，直接取 {path}/bin/python；仅环境名已废弃，经 runtime_python_command 强校验后此处不再探测 conda run
    if name.strip().startswith("/"):
        clean = name.strip().rstrip("/\\")
        if clean.endswith("/bin/python"):
            candidate = clean
        else:
            candidate = clean + "/bin/python"
        try:
            if os.path.isfile(candidate):
                return candidate
        except Exception:
            pass
        # 远端文件系统可能与调度器本机不同，仍返回绝对路径供 runtime_python_command 与 tmux 包裹使用
        return candidate
    # 降级兜底保留：仅环境名（如 <env_name>）曾走候选探测，现已要求绝对路径，此分支保留为历史兼容但主流程已在 runtime_python_command 处直接失败
    try:
        proc = subprocess.run(
            ["bash", "-lc", f"conda run -n {shlex.quote(name)} python -c 'import sys; print(sys.executable)'"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=10,
        )
        if proc.returncode == 0:
            lines = [ln.strip() for ln in (proc.stdout or "").strip().splitlines() if ln.strip()]
            if lines:
                candidate = lines[-1]
                if candidate:
                    return candidate
    except Exception:
        pass
    for cand in _simple_conda_env_python_candidates(name):
        try:
            if os.path.isfile(cand):
                return cand
        except Exception:
            continue
    return None


def simple_conda_activation_script(env: dict[str, str] | None = None) -> str:
    # 变量化：不写死 zlk，运行时从 SIMPLE_EXPERIMENT_CONDA_ENV 取名；先尝试 source conda.sh 再 activate，兼容非交互 shell
    raw_env_name = simple_conda_env_name(env)
    if not raw_env_name:
        return "true"
    return (
        'export SIMPLE_EXPERIMENT_CONDA_ENV=' + shlex.quote(str(raw_env_name)) + '; '
        'if [ -n "$SIMPLE_EXPERIMENT_CONDA_ENV" ]; then '
        '__conda_root="$(conda info --base 2>/dev/null)"; '
        '__conda_sh=""; '
        'if [ -n "$CONDA_PREFIX" ] && [ -f "$CONDA_PREFIX/etc/profile.d/conda.sh" ]; then __conda_sh="$CONDA_PREFIX/etc/profile.d/conda.sh"; '
        'elif [ -n "$__conda_root" ] && [ -f "$__conda_root/etc/profile.d/conda.sh" ]; then __conda_sh="$__conda_root/etc/profile.d/conda.sh"; '
        'elif [ -n "$CONDA_EXE" ]; then __conda_sh="$(dirname $CONDA_EXE)/../etc/profile.d/conda.sh"; fi; '
        'if [ -n "$__conda_sh" ] && [ -f "$__conda_sh" ]; then . "$__conda_sh"; fi; '
        '_c_ok=0; for _i in 1 2 3 4 5; do '
        'if conda activate "$SIMPLE_EXPERIMENT_CONDA_ENV" 2>/dev/null; then _c_ok=1; break; fi; '
        'echo "[simple-agent] conda activate attempt $_i failed for $SIMPLE_EXPERIMENT_CONDA_ENV"; conda env list 2>&1 | head -20; sleep 1; done; '
        'if [ "$_c_ok" != "1" ]; then echo "[simple-agent] conda activate $SIMPLE_EXPERIMENT_CONDA_ENV failed PATH=$PATH CONDA_EXE=$CONDA_EXE"; conda activate "$SIMPLE_EXPERIMENT_CONDA_ENV"; exit 127; fi; fi'
    )


def simple_conda_wrapped_args(args: list[str], env: dict[str, str]) -> list[str]:
    # 变量化：tmux 人工发送模式仍需在 bash -lc 前拼接 conda activate；不依赖 shutil.which，保持在非交互 shell 也能 activate
    if os.name == "nt":
        return args
    conda_env = str(env.get("SIMPLE_EXPERIMENT_CONDA_ENV") or "").strip()
    if not (simple_conda_required(env) or conda_env):
        return args
    return shell_command_args(f"{simple_conda_activation_script(env)} && exec {shlex.join(args)}")


def _replace_bare_python_prefix(text: str, python_bin: str) -> str:
    # 将裸 python 首 token 固化为绝对路径，避免 bash -lc 非交互 shell 找不到 torch
    if not text or not python_bin or not os.path.isabs(python_bin):
        return text
    stripped = text.lstrip()
    if not stripped:
        return text
    leading = text[: len(text) - len(stripped)]
    # 首 token 为 bare python/python3/python3.x 形式的替换
    m = re.match(r"^(python3?(\.\d+)?)(\s|$|;)", stripped)
    if m:
        return leading + python_bin + stripped[m.end(1) :]
    # 处理 shell 连接符后的 bare python（如 "&& python" 或 "; python"）
    if re.search(r"(?:&&|;|\|\|)\s*python3?(\.\d+)?\b", text):
        text = re.sub(r"((?:&&|;|\|\|)\s*)python3?(\.\d+)?\b", r"\1" + python_bin, text)
    return text


def runtime_python_command(env: dict[str, str] | None = None) -> str:
    # 固化为绝对路径：仅接受以 / 开头的绝对路径（可选以 /bin/python 结尾），否则直接失败提示“请填写完整环境路径”；跨平台以 "/" 判定，避免 Windows isabs 误判
    source = simple_runtime_env(env) if env is not None else simple_runtime_env()
    conda_env = str(source.get("SIMPLE_EXPERIMENT_CONDA_ENV") or "").strip()
    if conda_env:
        # 必须为绝对路径：以 / 开头，精确到环境文件夹如 /path/to/conda_envs/<env_name>，可选以 /bin/python 结尾；空值表示不激活 conda
        if not conda_env.strip().startswith("/"):
            raise RuntimeError(f"condaEnv 请填写完整环境路径，以 / 开头（精确到环境文件夹，如 /path/to/conda_envs/<env_name>，可选以 /bin/python 结尾），当前值: {conda_env!r}；仅环境名已废弃")
        clean = conda_env.strip().rstrip("/\\")
        if clean.endswith("/bin/python"):
            return clean
        return clean + "/bin/python"
    if sys.executable and os.path.isabs(sys.executable):
        return sys.executable
    return sys.executable


def run_command(args: list[str], env: dict[str, str]) -> None:
    print("[simple-experiment-runtime]", " ".join(args), flush=True)
    subprocess.run(simple_conda_wrapped_args(args, env), check=True, env=env)


def normalize_command_text(command: str) -> str:
    text = str(command or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    text = re.sub(r"\\[ \t]*\n[ \t]*", " ", text)
    lines = [line.strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


def command_requires_shell(command: str) -> bool:
    text = str(command or "")
    if "\n" in text:
        return True
    if re.search(r"(^|\s)(?:&&|\|\||;|\||>|<|2>|&>)", text):
        return True
    if re.search(r"(^|\s)(?:source\s+|export\s+[A-Za-z_][A-Za-z0-9_]*=|[A-Za-z_][A-Za-z0-9_]*=\S+\s+)", text):
        return True
    return False


def shell_command_args(command: str) -> list[str]:
    if os.name == "nt":
        return ["cmd.exe", "/d", "/s", "/c", command.replace("\n", " && ")]
    shell = os.environ.get("SHELL") or ("/bin/bash" if Path("/bin/bash").is_file() else "/bin/sh")
    return [shell, "-lc", command]


def render_command(template: str, job: Job, config_path: Path, args: argparse.Namespace) -> list[str]:
    values = dict(job.template_values or {})
    python_bin = runtime_python_command(dict(os.environ))
    values.update({
        "index": job.index,
        "suite": job.suite,
        "case": job.case,
        "seed": job.seed,
        "config": config_path.as_posix(),
        "config_path": config_path.as_posix(),
        "base_config": job.base_config_path,
        "base_config_path": job.base_config_path,
        "output_dir": job.output_dir,
        "outputDir": job.output_dir,
        "result_csv": job.result_csv,
        "resultCsv": job.result_csv,
        "worker_id": str(args.worker_id or "local"),
        "gpu_ids": str(args.gpu_ids or ""),
        "mode": str(args.mode or ""),
        "plan": str(args.plan or ""),
        "plan_file": str(args.plan or ""),
        "python": python_bin,
    })
    # 同时支持模板使用 {python} 占位；未使用占位时后续 _replace_bare_python_prefix 会固化首 token
    values["python"] = python_bin
    rendered = normalize_command_text(render_template(template, values))
    if bool(getattr(args, "debug_mode", False)):
        rendered = rewrite_debug_command_outputs(rendered, job)
    rendered = _replace_bare_python_prefix(rendered, python_bin)
    if command_requires_shell(rendered):
        return shell_command_args(rendered)
    return shlex.split(rendered)


def rewrite_debug_command_outputs(command: str, job: Job) -> str:
    rendered = str(command or "")
    formal_output_dir = str((job.template_values or {}).get("formal_output_dir") or "").replace("\\", "/").rstrip("/")
    formal_result_csv = str((job.template_values or {}).get("formal_result_csv") or "").replace("\\", "/")
    if formal_output_dir:
        rendered = rendered.replace(formal_output_dir, job.output_dir)
    if formal_result_csv:
        rendered = rendered.replace(formal_result_csv, job.result_csv)
    dir_flags = sorted({re.escape(str(item)).replace("_", "[-_]") for item in COMMAND_RESULT_DIR_FLAGS}, key=len, reverse=True)
    result_flags = sorted({re.escape(str(item)).replace("_", "[-_]") for item in COMMAND_RESULT_FLAG_ALIASES}, key=len, reverse=True)
    if dir_flags:
        pattern = re.compile(r"(?P<prefix>(?:^|\s)--(?:" + "|".join(dir_flags) + r")(?:\s+|=))(?P<quote>['\"]?)(?P<value>[^\s'\";&|]+)(?P=quote)", re.I)
        rendered = pattern.sub(lambda match: match.group("prefix") + match.group("quote") + job.output_dir + match.group("quote"), rendered)
    if result_flags:
        pattern = re.compile(r"(?P<prefix>(?:^|\s)--(?:" + "|".join(result_flags) + r")(?:\s+|=))(?P<quote>['\"]?)(?P<value>[^\s'\";&|]+)(?P=quote)", re.I)
        rendered = pattern.sub(lambda match: match.group("prefix") + match.group("quote") + job.result_csv + match.group("quote"), rendered)
    return rendered


def wrapper_context(job: Job, config_path: Path, args: argparse.Namespace, stage: str) -> dict[str, Any]:
    values = dict(job.template_values or {})
    config_text = ""
    try:
        config_text = config_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        config_text = ""
    values.update({
        "schemaVersion": 1,
        "stage": stage,
        "index": job.index,
        "suite": job.suite,
        "case": job.case,
        "experiment_id": job.template_values.get("experiment_id") or job.template_values.get("experimentId") or job.template_values.get("experiment_name") or f"{job.suite}/{job.case}/seed_{job.seed}",
        "method": job.template_values.get("method") or job.case,
        "dataset": job.template_values.get("dataset") or "unknown",
        "split": job.template_values.get("split") or "test",
        "seed": job.seed,
        "config_text": config_text,
        "config": config_path.as_posix(),
        "config_path": config_path.as_posix(),
        "base_config": job.base_config_path,
        "base_config_path": job.base_config_path,
        "output_dir": job.output_dir,
        "outputDir": job.output_dir,
        "result_csv": job.result_csv,
        "resultCsv": job.result_csv,
        "worker_id": str(args.worker_id or "local"),
        "gpu_ids": str(args.gpu_ids or ""),
        "mode": str(args.mode or ""),
        "plan": str(args.plan or ""),
        "plan_file": str(args.plan or ""),
    })
    return values


def wrap_command(command: list[str], job: Job, config_path: Path, args: argparse.Namespace, stage: str) -> list[str]:
    if not job.wrap_output or not job.run_wrapper:
        return command
    wrapper_path = existing_project_file_text(Path.cwd(), job.run_wrapper)
    if not wrapper_path:
        print(f"[simple-experiment-runtime] adapter run wrapper missing, command runs without wrapper: {job.run_wrapper}", flush=True)
        return command
    context_json = json.dumps(wrapper_context(job, config_path, args, stage), ensure_ascii=False, separators=(",", ":"))
    return [runtime_python_command(dict(os.environ)), wrapper_path, "--output-dir", job.output_dir, "--context-json", context_json, "--", *command]


def surface_original_error(job: "Job", phase: str) -> None:
    """Re-emit the original program's stdout/stderr into the scheduler pane so the tmux
    window (and the task log the panel reads) transparently shows the real error instead
    of only the scheduler's CalledProcessError wrapper. The actual training/test output is
    captured by run_wrapper into output_dir/{stderr,stdout}.log."""
    od = Path(str(job.output_dir))
    print(f"[simple-experiment-runtime] {phase} command failed; surfacing original program output from {od}", flush=True)
    for name in ("stderr.log", "stdout.log"):
        p = od / name
        if not p.is_file():
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if not text.strip():
            continue
        lines = text.splitlines()
        tail = lines[-300:] if len(lines) > 300 else lines
        print("========== " + name + " (original program output) ==========", flush=True)
        for _ln in tail:
            print(_ln, flush=True)
        print("========== end " + name + " ==========", flush=True)
    rep = od / "run_wrapper_report.json"
    if rep.is_file():
        try:
            data = json.loads(rep.read_text(encoding="utf-8", errors="replace"))
            err = data.get("error") or data.get("stderr") or data.get("message") or data.get("traceback")
            if err:
                print("========== run_wrapper_report error ==========", flush=True)
                print(str(err)[-4000:], flush=True)
        except Exception:
            pass


def run_job(job: Job, args: argparse.Namespace) -> None:
    manifest = Path(job.output_dir) / "artifact_manifest.json"
    overwrite = bool(getattr(args, "overwrite", False) or getattr(args, "overwrite_existing", False))
    # 解耦：调度/显卡状态不再受历史产物阻塞；仅当 --resume 且非 --overwrite 时才跳过已完成的 manifest
    if not overwrite and args.resume and manifest.exists() and args.mode != "test":
        info = has_existing_artifacts(job.output_dir)
        print(f"[simple-experiment-runtime] skip existing job index={job.index} output={job.output_dir} markers={info.get('markers') or []} (use --overwrite to force rerun)", flush=True)
        return
    if overwrite and manifest.exists():
        print(f"[simple-experiment-runtime] overwrite existing job index={job.index} output={job.output_dir}", flush=True)
    config_path = write_job_config(job)
    # Publish the resolved experiment output_dir to a sidecar so the agent's tmux window can
    # mirror stdout.log/stderr.log live. Only active when the agent injected the env vars.
    _sidecar_dir = os.environ.get("SIMPLE_EXPERIMENT_TMUX_LOG_DIR")
    _sidecar_sess = os.environ.get("SIMPLE_EXPERIMENT_TMUX_SESSION")
    if _sidecar_dir and _sidecar_sess:
        try:
            _sidecar_path = os.path.join(str(_sidecar_dir), str(_sidecar_sess) + ".output_dir")
            os.makedirs(str(_sidecar_dir), exist_ok=True)
            with open(_sidecar_path, "w", encoding="utf-8") as _sf:
                _sf.write(os.path.abspath(str(job.output_dir)))
        except Exception:
            pass
    env = os.environ.copy()
    if bool(getattr(args, "debug_mode", False)):
        env["SIMPLE_EXPERIMENT_DEBUG"] = "1"
        env["SIMPLE_EXPERIMENT_DEBUG_RUN_ID"] = str(getattr(args, "debug_run_id", "") or "debug")
        env["SIMPLE_EXPERIMENT_DEBUG_OUTPUT_DIR"] = job.output_dir
    if args.gpu_ids:
        env["CUDA_VISIBLE_DEVICES"] = str(args.gpu_ids)
    if args.mode in {"train", "train_test"}:
        command = render_command(job.train_command, job, config_path, args) if job.train_command else [runtime_python_command(env), "train.py", "--config", str(config_path), "--output-dir", job.output_dir, "--case", job.case, "--seed", str(job.seed), "--worker-id", str(args.worker_id or "local")]
        command = wrap_command(command, job, config_path, args, "train")
        try:
            run_command(command, env)
        except subprocess.CalledProcessError:
            surface_original_error(job, "train")
            raise
        if args.mode == "train":
            collect_tensorboard_metrics(job)
    if args.mode in {"test", "train_test"}:
        command = render_command(job.test_command, job, config_path, args) if job.test_command else [runtime_python_command(env), "test.py", "--config", str(config_path), "--output-dir", job.output_dir, "--case", job.case, "--seed", str(job.seed), "--suite", job.suite, "--result-csv", job.result_csv]
        command = wrap_command(command, job, config_path, args, "test")
        try:
            run_command(command, env)
        except subprocess.CalledProcessError:
            surface_original_error(job, "test")
            raise
        collect_tensorboard_metrics(job)


def run_job_mode(args: argparse.Namespace) -> None:
    plan = load_plan(args.plan)
    args.mode = plan_execution_mode(plan, args.mode)
    jobs = jobs_for_args(plan, args)
    chosen = [job for job in jobs if int(job.index) == int(args.only_index)]
    if not chosen:
        raise SystemExit(f"No job selected for index {args.only_index}.")
    jobs_csv = Path(str(args.debug_output_dir)) / "jobs.csv" if args.debug_mode else Path(normalize_default_result_csv_dir(args.default_result_csv_dir)) / "jobs.csv"
    append_jobs_csv(chosen, jobs_csv, plan_file=str(args.plan or ""))
    # Write the exit code from Python as a robust completion signal (in addition to the shell
    # 'printf' appended by start_simple_tmux_command). This guarantees the scheduler detects task
    # completion/failure even if the training code errors and the shell redirect is unreliable.
    exit_code_path = os.environ.get("SIMPLE_EXPERIMENT_EXIT_CODE_PATH") or ""
    rc = 0
    try:
        for job in chosen:
            print(f"[simple-experiment-runtime] start index={job.index} case={job.case} seed={job.seed} at {now()}", flush=True)
            run_job(job, args)
            print(f"[simple-experiment-runtime] done index={job.index} at {now()}", flush=True)
    except SystemExit as exc:
        code = getattr(exc, "code", None)
        rc = int(code) if isinstance(code, int) else 1
        raise
    except Exception:
        rc = 1
        raise
    finally:
        if exit_code_path:
            try:
                with open(str(exit_code_path), "w", encoding="utf-8") as _ecf:
                    _ecf.write(str(rc))
            except Exception:
                pass


def print_job_dir_mode(args: argparse.Namespace) -> None:
    _, jobs = build_jobs(load_plan(args.plan), args.default_result_csv_dir)
    for job in jobs:
        if int(job.index) == int(args.only_index):
            print(job.output_dir)
            return
    raise SystemExit(f"No job selected for index {args.only_index}.")


def validate_plan_mode(args: argparse.Namespace) -> None:
    project_root = Path.cwd()
    plan, jobs = build_jobs(load_plan(args.plan), args.default_result_csv_dir)
    mode = plan_execution_mode(plan, args.mode)
    if not jobs:
        raise SystemExit("plan produced no jobs")
    missing: list[str] = []
    if mode in {"train", "train_test"} and any(not job.train_command for job in jobs) and not (project_root / "train.py").is_file():
        missing.append("train.py, runner.train_command 或 simple_project.entrypoints.trainCommandTemplate")
    if mode in {"test", "train_test"} and any(not job.test_command for job in jobs) and not (project_root / "test.py").is_file():
        missing.append("test.py, runner.test_command 或 simple_project.entrypoints.testCommandTemplate")
    if missing:
        raise SystemExit("缺少必要运行入口：" + ", ".join(missing))
    output_interface = output_interface_report(project_root, jobs)
    if not output_interface["ok"]:
        raise SystemExit("输出接口预检失败：" + "；".join(output_interface["missing"]))
    payload = {
        "ok": True,
        "plan": args.plan,
        "suite": str(plan.get("suite") or ""),
        "execution_mode": mode,
        "job_count": len(jobs),
        "outputInterface": output_interface,
        "jobs": [
            {
                "index": job.index,
                "case": job.case,
                "seed": job.seed,
                "output_dir": job.output_dir,
                "result_csv": job.result_csv,
            }
            for job in jobs
        ],
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def dry_run_plan_mode(args: argparse.Namespace) -> None:
    project_root = Path.cwd()
    plan = load_plan(args.plan)
    jobs = jobs_for_args(plan, args)
    mode = plan_execution_mode(plan, args.mode)
    workers = json.loads(Path(args.workers_json).read_text(encoding="utf-8")) if args.workers_json else []
    worker_status_ttl_seconds = max(60, int(args.worker_status_ttl_seconds or 180))
    read_availability_cache(args.availability_path, workers, worker_status_ttl_seconds)
    refresh_missing_worker_availability(workers, args.availability_path)
    simulated_active: dict[str, dict[str, Any]] = {}
    queue = deque(job.index for job in jobs)
    jobs_by_index = {int(job.index): job for job in jobs}
    assignments: list[dict[str, Any]] = []
    dispatch_probe: list[dict[str, Any]] = []
    for worker in ordered_workers_for_dispatch(workers):
        probe = probe_idle_gpus(worker, simulated_active)
        dispatch_probe.append(probe)
        for gpu_id in list(probe.get("idle_gpu_ids") or []):
            if not queue:
                break
            experiment_index = queue.popleft()
            job = jobs_by_index[int(experiment_index)]
            slot_key = f"{worker.get('id')}:{gpu_id}:{experiment_index}"
            simulated_active[slot_key] = {"worker_id": worker.get("id"), "gpu_id": gpu_id, "experiment_index": experiment_index}
            assignments.append({
                "experimentIndex": experiment_index,
                "case": job.case,
                "seed": job.seed,
                "workerId": str(worker.get("id") or ""),
                "workerName": str(worker.get("name") or worker.get("id") or ""),
                "gpuId": str(gpu_id),
                "outputDir": job.output_dir,
                "reason": "dry_run_slot_available",
            })
    blocked_reasons: list[str] = []
    for probe in dispatch_probe:
        if probe.get("error"):
            blocked_reasons.append(f"{probe.get('worker_id') or probe.get('worker_name')}: {probe.get('error')}")
        elif not probe.get("idle_gpu_ids"):
            rejected = probe.get("rejected") or []
            if rejected:
                reasons = sorted({str(item.get("reason") or "") for item in rejected if isinstance(item, dict) and item.get("reason")})
                blocked_reasons.append(f"{probe.get('worker_id') or probe.get('worker_name')}: {','.join(reasons) or 'no_idle_gpu'}")
            else:
                blocked_reasons.append(f"{probe.get('worker_id') or probe.get('worker_name')}: no_idle_gpu")
    runner_missing: list[str] = []
    if mode in {"train", "train_test"} and any(not job.train_command for job in jobs) and not (project_root / "train.py").is_file():
        runner_missing.append("train.py, runner.train_command 或 simple_project.entrypoints.trainCommandTemplate")
    if mode in {"test", "train_test"} and any(not job.test_command for job in jobs) and not (project_root / "test.py").is_file():
        runner_missing.append("test.py, runner.test_command 或 simple_project.entrypoints.testCommandTemplate")
    output_interface = output_interface_report(project_root, jobs)
    payload = {
        "schemaVersion": 1,
        "ok": bool(output_interface["ok"]),
        "mode": "dry-run-plan",
        "executionMode": mode,
        "plan": args.plan,
        "suite": str(plan.get("suite") or ""),
        "totalExperiments": len(jobs),
        "workerCount": len(workers),
        "assignableNow": len(assignments),
        "queued": len(queue),
        "willQueue": len(queue) > 0,
        "assignments": assignments,
        "queuedExperimentIndexes": list(queue),
        "blockedReasons": blocked_reasons,
        "runnerWarnings": runner_missing,
        "outputInterface": output_interface,
        "availabilitySource": "hub_availability_cache",
        "workerStatusTtlSeconds": worker_status_ttl_seconds,
        "dispatchProbe": dispatch_probe,
        "generatedAt": now(),
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def q(value: str | Path) -> str:
    return shlex.quote(str(value))


def slug(value: object, fallback: str = "unknown", limit: int = 48) -> str:
    raw = str(value or "").strip()
    text = re.sub(r"[^A-Za-z0-9._-]+", "-", raw).strip(".-_") or fallback
    if len(text) <= limit:
        return text
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
    return f"{text[: max(8, limit - 9)].rstrip('.-_')}-{digest}"


def plan_runtime_key(plan: str | Path, fallback: str = "plan") -> str:
    raw = str(plan or "").strip()
    try:
        path = Path(raw)
        resolved = path.resolve()
        try:
            identity = resolved.relative_to(Path.cwd().resolve()).as_posix()
        except ValueError:
            identity = resolved.as_posix()
    except Exception:
        identity = raw.replace("\\", "/")
    stem = Path(raw).stem if raw else fallback
    prefix = slug(stem, fallback, 34)
    digest = hashlib.sha1((identity or raw or fallback).encode("utf-8")).hexdigest()[:10]
    return f"{prefix}-{digest}"


AGENT_STATE_DIR = ""


def scheduler_project_state_namespace(root: Path) -> str:
    try:
        resolved = root.resolve()
    except Exception:
        resolved = root
    digest = hashlib.sha1(str(resolved).encode("utf-8")).hexdigest()[:12]
    stem = slug(resolved.name or "project", "project", 36)
    return f"{stem}-{digest}"


def scheduler_default_agent_state_dir() -> Path:
    return Path("simple_agent/state/projects") / scheduler_project_state_namespace(Path.cwd())


def compute_scheduler_agent_state_dir(project_dir: str | Path = ".", configured: str = "") -> Path:
    root = Path(project_dir or ".").expanduser()
    try:
        root = root.resolve()
    except Exception:
        root = Path(project_dir or ".")
    namespace = scheduler_project_state_namespace(root)
    text = str(configured or "").strip()
    if not text:
        return Path("simple_agent/state/projects") / namespace
    base = Path(text).expanduser()
    try:
        base = base.resolve()
    except Exception:
        pass
    # Honor the explicitly configured state dir (passed by the agent via --agent-state-dir)
    # exactly. The agent reads the worker command queue from this same directory, so the
    # scheduler must write there too; rewriting the leaf to our own namespace would desync
    # the queue and leave tasks unregistered (empty task cards) while the scheduler believes
    # they are already running.
    return base


def resolve_scheduler_agent_state_dir(project_dir: str | Path = ".", configured: str = "") -> Path:
    raw = Path(project_dir or ".").expanduser()
    if not raw.is_absolute():
        return compute_scheduler_agent_state_dir(project_dir, configured)
    cache_key = (str(raw), str(configured or ""))
    cached = AGENT_STATE_DIR_CACHE.get(cache_key)
    if cached is not None:
        return cached
    resolved = compute_scheduler_agent_state_dir(project_dir, configured)
    if len(AGENT_STATE_DIR_CACHE) >= MAX_AGENT_STATE_DIR_CACHE_RECORDS:
        AGENT_STATE_DIR_CACHE.clear()
    AGENT_STATE_DIR_CACHE[cache_key] = resolved
    return resolved


def scheduler_agent_state_dir() -> Path:
    configured = AGENT_STATE_DIR or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", "")
    return resolve_scheduler_agent_state_dir(Path.cwd(), configured)

def scheduler_seq_path() -> Path:
    return scheduler_agent_state_dir() / "seq.txt"


def read_agent_seq() -> int:
    try:
        return int(scheduler_seq_path().read_text(encoding="utf-8").strip() or "0")
    except Exception:
        return 0


def write_agent_seq(seq: int) -> None:
    atomic_write_text(scheduler_seq_path(), str(seq))


def append_agent_event(event: dict[str, Any]) -> dict[str, Any]:
    base = scheduler_agent_state_dir()
    base.mkdir(parents=True, exist_ok=True)
    seq = read_agent_seq() + 1
    item = {
        "schemaVersion": 1,
        "seq": seq,
        "generatedAt": now(),
        "source": "cluster_scheduler",
        "hubId": event.get("hubId", "hub"),
        **event,
    }
    with (base / "events.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")
    write_agent_seq(seq)
    return item


def run_agent_completion_pipeline(project_dir: str | Path, event: dict[str, Any]) -> None:
    if str(event.get("type") or "") not in ("operation_completed", "operation_failed"):
        return
    payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    if bool(payload.get("debugMode") or event.get("debugMode")):
        return
    if str(payload.get("action") or event.get("action") or "") not in ("run-plan", "reproduce-plan"):
        return
    agent_path = Path(__file__).with_name("cluster_agent.py")
    if not agent_path.is_file():
        return
    try:
        spec = importlib.util.spec_from_file_location("simple_cluster_agent_runtime_for_scheduler", agent_path)
        if not spec or not spec.loader:
            return
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        hook = getattr(module, "maybe_auto_run_completion_pipeline", None)
        if callable(hook):
            hook(str(project_dir), event)
    except Exception as exc:
        append_log(Path(project_dir) / "simple_cluster" / "logs" / "scheduler_auto_completion.log", f"[{now()}] auto_completion_skipped {exc}")


def append_scheduler_operation_event(args: argparse.Namespace, status: str, message: str, extra: dict[str, Any] | None = None) -> None:
    operation_id = str(getattr(args, "operation_id", "") or "").strip()
    if not operation_id:
        return
    action = str(getattr(args, "operation_action", "") or "run-plan").strip()
    op_id = str(getattr(args, "op_id", "") or operation_id).strip()
    event_type = "operation_completed" if status == "completed" else ("operation_failed" if status in ("failed", "stalled", "cancelled") else "operation_progress")
    payload = {
        "action": action,
        "opId": op_id,
        "status": status,
        "message": message,
        "plan": str(getattr(args, "plan", "") or ""),
        "planFile": str(getattr(args, "plan", "") or ""),
        "planRevision": str(getattr(args, "plan_revision", "") or ""),
        "workerSetRevision": str(getattr(args, "worker_set_revision", "") or ""),
        "schedulerOwnerWorkerId": str(getattr(args, "scheduler_owner_worker_id", "") or ""),
        "assignedExperimentIndices": only_indices_for_args(args),
        "debugMode": bool(getattr(args, "debug_mode", False)),
        "debugRunId": str(getattr(args, "debug_run_id", "") or ""),
        "debugOutputDir": str(getattr(args, "debug_output_dir", "") or ""),
        "schedulerStarted": True,
        "schedulerFinished": event_type in ("operation_completed", "operation_failed"),
    }
    if extra:
        payload.update(extra)
    event = append_agent_event({"type": event_type, "operationId": operation_id, "payload": payload})
    run_agent_completion_pipeline(getattr(args, "project_dir", ".") or ".", event)


def append_scheduler_operation_event_robust(args: argparse.Namespace, status: str, message: str, extra: dict[str, Any] | None = None) -> None:
    # Primary path: normal event writer. If it raises (e.g. state dir unwritable,
    # journal locked, early startup before state dir initialised), fall back to a
    # direct atomic append of the terminal failed event into events.jsonl so the
    # Operations panel is never stuck on "等待 scheduler 终态".
    try:
        append_scheduler_operation_event(args, status, message, extra)
    except Exception:
        try:
            _fallback_append_failed_event(args, message, extra or {})
        except Exception:
            pass


def _fallback_append_failed_event(args: argparse.Namespace, message: str, extra: dict[str, Any]) -> None:
    base = scheduler_agent_state_dir()
    base.mkdir(parents=True, exist_ok=True)
    journal = base / "events.jsonl"
    seq = read_agent_seq() + 1
    operation_id = str(getattr(args, "operation_id", "") or os.environ.get("SIMPLE_SCHEDULER_OPERATION_ID") or os.environ.get("SIMPLE_EXPERIMENT_OPERATION_ID") or "").strip()
    if not operation_id:
        return
    item = {
        "schemaVersion": 1,
        "seq": seq,
        "generatedAt": now(),
        "source": "cluster_scheduler",
        "hubId": "hub",
        "type": "operation_failed",
        "operationId": operation_id,
        "payload": {
            "action": str(getattr(args, "operation_action", "") or "run-plan").strip() or "run-plan",
            "opId": str(getattr(args, "op_id", "") or operation_id).strip() or operation_id,
            "status": "failed",
            "message": message,
            "schedulerStarted": True,
            "schedulerFinished": True,
            **(extra if isinstance(extra, dict) else {}),
        },
    }
    with journal.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")
    write_agent_seq(seq)


def safe_worker_id(value: object) -> str:
    text = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in str(value or "worker"))[:80]
    return text or "worker"


def worker_command_queue_path(worker: dict[str, Any]) -> Path:
    return scheduler_agent_state_dir() / f"worker_commands_{safe_worker_id(worker.get('id') or 'worker')}.jsonl"


def enqueue_worker_command(worker: dict[str, Any], command: dict[str, Any]) -> dict[str, Any]:
    item = {
        "schemaVersion": 1,
        "commandId": str(command.get("commandId") or f"cmd-{int(time.time() * 1000)}"),
        "workerId": str(worker.get("id") or ""),
        "createdAt": now(),
        **command,
    }
    path = worker_command_queue_path(worker)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")
    return item


def is_terminal_worker_command_event(event: dict[str, Any]) -> bool:
    event_type = str(event.get("type") or "")
    payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    status = str(payload.get("status") or "").lower()
    # P0/P1 修复：调度器需识别 worker_command_exec_error 为终态，避免 running=4 虚增后 idle=0 永循环
    if event_type in ("worker_task_completed", "worker_task_failed", "worker_command_completed", "worker_command_failed", "worker_task_stopped", "worker_command_exec_error", "worker_command_failed"):
        return True
    # 兼容 payload.error 含 path outside / exec_error 的情况视为失败终态
    if event_type == "worker_command_exec_error":
        return True
    if "exec_error" in event_type or "path outside" in str(payload.get("error") or "").lower():
        return True
    return status in ("completed", "failed", "cancelled", "canceled", "stalled", "stopped", "error")


def command_result_events(command_ids: set[str]) -> dict[str, dict[str, Any]]:
    if not command_ids:
        return {}
    out: dict[str, dict[str, Any]] = {}
    journal = scheduler_agent_state_dir() / "events.jsonl"
    if not journal.exists():
        return out
    try:
        with journal.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    event = json.loads(line)
                except Exception:
                    continue
                payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
                if str(event.get("type") or "").startswith("worker_") and is_terminal_worker_command_event(event):
                    for command_id in command_ids:
                        if worker_event_matches_command_id(event, command_id):
                            out[command_id] = event
    except Exception:
        return out
    return out


def worker_event_matches_command_id(event: dict[str, Any], command_id: str) -> bool:
    wanted = str(command_id or "").strip()
    if not wanted:
        return False
    payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    candidates = [
        payload.get("commandId"),
        payload.get("operationId"),
        payload.get("runKey"),
        payload.get("session"),
        event.get("operationId"),
    ]
    for task in payload.get("stoppedTasks") or []:
        if isinstance(task, dict):
            candidates.extend([task.get("commandId"), task.get("operationId"), task.get("runKey"), task.get("session")])
    return wanted in {str(item or "").strip() for item in candidates if str(item or "").strip()}


def session_alive(worker: dict[str, Any], session: str) -> bool:
    return bool(session) and str(session) not in command_result_events({str(session)})


def read_remote_tail(worker: dict[str, Any], relative: str, max_bytes: int = TAIL_BYTES) -> str:
    return ""


def exit_code_from_tail(text: str) -> int | None:
    matches = re.findall(r"exit_code=(\d+)", text or "")
    return int(matches[-1]) if matches else None


PASSIVE_INTERRUPT_EXIT_CODES = {-15, -9, 130, 137, 143, 255}
PASSIVE_INTERRUPT_PATTERNS = (
    "out of memory", "cuda out of memory", "oom", "killed", "sigkill", "sigterm",
    "preempt", "preempted", "evicted", "worker lost", "node lost", "connection reset",
    "connection refused", "connection lost", "timeout", "heartbeat", "no space left",
    "disk quota", "server overloaded",
)
MANUAL_STOP_TYPES = {"manual_stop_bad_code_or_no_effect", "manual_stop_converged"}


def normalize_exit_code(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def worker_event_text(event: dict[str, Any], payload: dict[str, Any]) -> str:
    try:
        return json.dumps({"event": event, "payload": payload}, ensure_ascii=False, sort_keys=True).lower()
    except Exception:
        return (str(event) + " " + str(payload)).lower()


def manual_interruption_type(event: dict[str, Any], payload: dict[str, Any]) -> str:
    event_type = str(event.get("type") or "").lower()
    status = str(payload.get("status") or "").lower()
    reason = str(payload.get("manualStopType") or payload.get("stopReason") or payload.get("reason") or "").strip()
    source = str(payload.get("stopSource") or payload.get("source") or "").lower()
    if reason in MANUAL_STOP_TYPES:
        return reason
    if event_type == "worker_task_stopped" or status in {"stopped", "cancelled", "canceled"}:
        if "converged" in reason or "收敛" in reason:
            return "manual_stop_converged"
        if source in {"user", "manual", "local"} or reason.startswith("manual_stop") or not reason:
            return "manual_stop_bad_code_or_no_effect"
    return ""


def passive_interruption_reason(event: dict[str, Any], payload: dict[str, Any], exit_code: int | None) -> str:
    event_type = str(event.get("type") or "").lower()
    status = str(payload.get("status") or "").lower()
    if manual_interruption_type(event, payload):
        return ""
    text = worker_event_text(event, payload)
    if event_type == "worker_task_failed" or status in {"failed", "stalled", "error"}:
        if exit_code in PASSIVE_INTERRUPT_EXIT_CODES:
            return f"passive_interrupt_exit_code={exit_code}"
        for pattern in PASSIVE_INTERRUPT_PATTERNS:
            if pattern in text:
                return f"passive_interrupt_pattern={pattern}"
    return ""


def busy_gpu_uuids(worker: dict[str, Any]) -> set[str]:
    return set()


def _normalize_gpu_numeric_id(value: Any) -> str:
    s = str(value if value is not None else "").strip()
    if not s or s == "-":
        return ""
    if re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-", s, re.I):
        m = re.search(r"(?:gpu)[-_]?(\d+)\b", s, re.I)
        if m:
            v = m.group(1)
            try:
                if 0 <= int(v) < 64:
                    return v
            except Exception:
                pass
        return ""
    if re.match(r"^\d+$", s):
        try:
            if 0 <= int(s) < 64:
                return s
        except Exception:
            pass
        return s
    m2 = re.search(r"(?:gpu)[-_]?(\d+)\b", s, re.I)
    if m2:
        return m2.group(1)
    return ""


def gpu_process_pids(worker: dict[str, Any], gpu_id: str) -> list[str]:
    return []


def probe_idle_gpus(worker: dict[str, Any], active: dict[str, dict[str, Any]]) -> dict[str, Any]:
    stamp = now()
    probe: dict[str, Any] = {
        "worker_id": str(worker.get("id") or ""),
        "worker_name": str(worker.get("name") or ""),
        "checked_at": stamp,
        "idle_gpu_ids": [],
        "rejected": [],
        "error": "",
    }
    availability = worker.get("_availability") if isinstance(worker.get("_availability"), dict) else {}
    if not availability:
        probe["error"] = "Worker 可用性缓存缺失"
        probe["structuredError"] = {
            "workerId": str(worker.get("id") or ""),
            "expectedStateKey": str(worker.get("_availability_state_key") or ""),
            "lastSeenAt": None,
            "ttlSeconds": int(worker.get("worker_status_ttl_seconds") or 45),
            "agentStatus": str(worker.get("_agent_status") or "unknown"),
            "suggestedAction": "确认 Agent 在线后点击检测全部；调度器会自动刷新；仍失败时检查 Xshell 隧道与 localForwardPort。",
        }
        return probe
    updated_at = str(availability.get("updatedAt") or "")
    ttl = int(availability.get("ttlSeconds") or worker.get("workerStatusTtlSeconds") or worker.get("worker_status_ttl_seconds") or worker.get("sessionCheckMinSeconds") or 45)
    age = availability_age_seconds(worker)
    if age is None or age > ttl:
        probe["error"] = f"worker availability stale age={age if age is not None else 'unknown'} ttl={ttl}"
        probe["structuredError"] = {
            "workerId": str(worker.get("id") or ""),
            "expectedStateKey": str(worker.get("_availability_state_key") or ""),
            "lastSeenAt": updated_at,
            "ttlSeconds": ttl,
            "agentStatus": str(worker.get("_agent_status") or "stale"),
            "suggestedAction": "确认 Agent 在线并等待一次有界刷新；若持续过期，检查本机时钟和 Xshell 隧道。",
        }
        return probe
    if availability.get("available") is False:
        probe["error"] = str(availability.get("reason") or "worker unavailable")
        return probe
    raw_allowed = [str(item).strip() for item in worker.get("allowed_gpu_ids", []) if str(item).strip()]
    # 语义修复：空、"-"、"--" 均表示全部允许；仅数字 ID 透传；非法值告警并置空，避免 not_allowed 全拒
    if not raw_allowed:
        allowed: set[str] = set()
    elif len(raw_allowed) == 1 and raw_allowed[0] in ("-", "--"):
        allowed = set()
    elif any(item in ("-", "--") for item in raw_allowed):
        print(f"[allowed_gpu_ids] 非法占位 {raw_allowed!r} 已置空为全部允许", flush=True)
        allowed = set()
    else:
        invalid = [item for item in raw_allowed if not item.isdigit()]
        if invalid:
            print(f"[allowed_gpu_ids] 非法 GPU ID {invalid!r} 已置空为全部允许，仅数字 0..N 有效", flush=True)
            allowed = set()
        else:
            allowed = set(raw_allowed)
    # 每服务器空卡阈值：worker 优先，availability 透传次之，全局默认值兜底
    thr_util = worker.get("gpu_idle_util_threshold")
    if thr_util is None:
        thr_util = worker.get("gpuIdleUtilThreshold")
    if thr_util is None:
        thr_util = availability.get("gpuIdleUtilThreshold") if isinstance(availability, dict) else None
    if thr_util is None:
        thr_util = availability.get("gpu_idle_util_threshold") if isinstance(availability, dict) else None
    thr_mem = worker.get("gpu_idle_mem_threshold")
    if thr_mem is None:
        thr_mem = worker.get("gpuIdleMemThresholdMb")
    if thr_mem is None:
        thr_mem = availability.get("gpuIdleMemThresholdMb") if isinstance(availability, dict) else None
    if thr_mem is None:
        thr_mem = availability.get("gpu_idle_mem_threshold") if isinstance(availability, dict) else None
    # 若 availability 含原始 gpus 列表，则用每服务器阈值重算 busy/available，避免全局阈值误判
    raw_gpus = availability.get("gpus") if isinstance(availability.get("gpus"), list) else None
    if raw_gpus is not None:
        recomputed_available: list[str] = []
        recomputed_busy: set[str] = set()
        for row in raw_gpus:
            if not isinstance(row, dict):
                continue
            gid = ""
            for cand in (row.get("index"), row.get("gpu_index"), row.get("gpuId"), row.get("gpu_id"), row.get("id"), row.get("uuid")):
                norm = _normalize_gpu_numeric_id(cand)
                if norm:
                    gid = norm
                    break
            if not gid:
                try:
                    raw_idx = str(row.get("index") or row.get("gpu_index") or "").strip()
                    if raw_idx and re.match(r"^\d+$", raw_idx):
                        gid = raw_idx
                    else:
                        continue
                except Exception:
                    continue
            if not gid:
                continue
            # 动态阈值判定，与 agent 侧 gpu_row_busy 一致
            busy_flag = False
            try:
                util = None
                for k in ("utilizationPercent", "utilization", "gpu_util", "utilizationGpu", "utilization_gpu"):
                    if k in row and row.get(k) is not None:
                        try:
                            v = float(row.get(k))
                            if v == v:
                                util = v
                                break
                        except Exception:
                            continue
                mem = None
                for k in ("memoryUsedMb", "memory_used_mb", "memoryUsed", "memory_used", "used"):
                    if k in row and row.get(k) is not None:
                        try:
                            v = float(row.get(k))
                            if v == v:
                                mem = v
                                break
                        except Exception:
                            continue
                if util is not None and mem is not None:
                    u_thr = float(thr_util) if thr_util is not None else 5.0
                    m_thr = float(thr_mem) if thr_mem is not None else 200.0
                    busy_flag = not (float(util) < u_thr and float(mem) < m_thr)
                else:
                    procs = row.get("processes") or row.get("procs") or []
                    if isinstance(procs, list) and len(procs) > 0:
                        busy_flag = True
                    else:
                        try:
                            busy_flag = int(row.get("processCount") or row.get("process_count") or 0) > 0
                        except Exception:
                            busy_flag = False
            except Exception:
                busy_flag = False
            if busy_flag:
                recomputed_busy.add(gid)
            else:
                recomputed_available.append(gid)
        # 用重算结果覆盖 stale 的 busy/available
        busy = recomputed_busy
        # 覆盖可用列表为重算后的 idle 集合（保持原有 availableGpuIds 语义为 idle）
        availability_available = recomputed_available
    else:
        busy = {str(item).strip() for item in availability.get("busyGpuIds") or [] if str(item).strip()}
        availability_available = [str(item).strip() for item in availability.get("availableGpuIds") or [] if str(item).strip()]
    # 快照滞后窗口修复：合并 active 占用，即使快照判 idle，已占即 busy（双重保险）
    busy_gpus_from_active = {str(item.get("gpu_id") or "").strip() for item in active.values() if str(item.get("worker_id") or "") == str(worker.get("id") or "") and str(item.get("gpu_id") or "").strip()}
    busy = busy | busy_gpus_from_active
    capacity = max(1, int(worker.get("max_concurrent_gpus") or worker.get("maxConcurrentGpus") or availability.get("capacityLimit") or 1))
    active_count = sum(1 for item in active.values() if str(item.get("worker_id") or "") == str(worker.get("id") or ""))
    if active_count >= capacity:
        probe["rejected"].append({"reason": "capacity_limit", "active": active_count, "capacity": capacity})
        return probe
    out: list[str] = []
    for gpu_id in availability_available:
        reason = ""
        if f"{worker['id']}:{gpu_id}" in active:
            reason = "active_slot"
        elif gpu_id in busy_gpus_from_active:
            reason = "active_slot"
        elif allowed and gpu_id not in allowed:
            reason = "not_allowed"
        elif gpu_id in busy:
            reason = "busy"
        if reason:
            probe["rejected"].append({"gpu_id": gpu_id, "reason": reason})
            continue
        out.append(gpu_id)
        if active_count + len(out) >= capacity:
            break
    probe["idle_gpu_ids"] = out
    probe["source"] = availability.get("source") or "hub_cached_snapshot"
    if thr_util is not None:
        probe["gpuIdleUtilThreshold"] = int(thr_util)
    if thr_mem is not None:
        probe["gpuIdleMemThresholdMb"] = int(thr_mem)
    return probe


def idle_gpus(worker: dict[str, Any], active: dict[str, dict[str, Any]]) -> list[str]:
    return list(probe_idle_gpus(worker, active).get("idle_gpu_ids") or [])


def worker_cpu_usage_percent(worker: dict[str, Any]) -> float:
    availability = worker.get("_availability") if isinstance(worker.get("_availability"), dict) else {}
    if availability and availability.get("available"):
        return 0.0
    return 100.0


def ordered_workers_for_dispatch(workers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scored = []
    for worker in workers:
        cpu = worker_cpu_usage_percent(worker)
        try:
            base = float(worker.get("machine_score"))
        except Exception:
            base = cpu
        score = base + cpu * 0.25
        scored.append((score, str(worker.get("name") or worker.get("id") or ""), worker))
    return [worker for _, _, worker in sorted(scored, key=lambda item: (item[0], item[1]))]


def safe_read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def read_availability_cache(path: str, workers: list[dict[str, Any]], ttl_seconds: int) -> None:
    data = safe_read_json(Path(path), {}) if path else {}
    entries = data.get("workers") if isinstance(data, dict) else {}
    if isinstance(entries, list):
        entries = {str(item.get("workerId") or ""): item for item in entries if isinstance(item, dict)}
    if not isinstance(entries, dict):
        entries = {}
    for worker in workers:
        worker_id = str(worker.get("id") or "")
        worker["_availability_state_key"] = f"{path}#workers/{worker_id}"
        availability = entries.get(worker_id)
        if isinstance(availability, dict):
            note_availability_receipt(worker, dict(availability))
            worker["worker_status_ttl_seconds"] = int(availability.get("ttlSeconds") or ttl_seconds)


def availability_age_seconds(worker: dict[str, Any]) -> float | None:
    availability = worker.get("_availability")
    if not isinstance(availability, dict):
        return None
    receipt_monotonic = float(worker.get("_availability_received_monotonic") or 0)
    if receipt_monotonic > 0:
        age = time.monotonic() - receipt_monotonic
    else:
        age = raw_iso_age_seconds(availability.get("updatedAt"))
        if age is not None and age < -WORKER_AVAILABILITY_CLOCK_SKEW_SECONDS:
            return None
        age = None if age is None else max(0.0, age)
    return age


def availability_is_fresh(worker: dict[str, Any]) -> bool:
    availability = worker.get("_availability")
    if not isinstance(availability, dict):
        return False
    age = availability_age_seconds(worker)
    try:
        ttl = max(1, int(availability.get("ttlSeconds") or worker.get("worker_status_ttl_seconds") or 45))
    except Exception:
        ttl = 45
    return age is not None and age <= ttl


def note_availability_receipt(worker: dict[str, Any], row: dict[str, Any]) -> None:
    previous = worker.get("_availability")
    previous_updated_at = str(previous.get("updatedAt") or "") if isinstance(previous, dict) else ""
    receipt = float(worker.get("_availability_received_monotonic") or 0)
    if previous_updated_at != str(row.get("updatedAt") or "") or receipt <= 0:
        receipt = time.monotonic()
    worker["_availability"] = row
    worker["_availability_received_monotonic"] = receipt


def fetch_worker_availability(worker: dict[str, Any]) -> dict[str, Any]:
    base_url = str(worker.get("local_agent_url") or "").rstrip("/")
    if not base_url:
        raise RuntimeError("local_agent_url 未配置")
    with urllib.request.urlopen(f"{base_url}/api/worker/availability", timeout=WORKER_AVAILABILITY_REFRESH_TIMEOUT_SECONDS) as response:
        payload = json.loads(response.read(1024 * 1024).decode("utf-8"))
    rows = payload.get("workers") if isinstance(payload, dict) and isinstance(payload.get("workers"), list) else []
    worker_id = str(worker.get("id") or "")
    row = next((item for item in rows if isinstance(item, dict) and str(item.get("workerId") or item.get("worker_id") or "") == worker_id), None)
    if not isinstance(row, dict):
        raise RuntimeError("Worker Agent 未返回可用性快照")
    row["workerId"] = worker_id
    row["source"] = str(row.get("source") or "worker_agent_direct_refresh")
    row["receivedAt"] = now()
    row["ttlSeconds"] = max(30, int(row.get("ttlSeconds") or worker.get("worker_status_ttl_seconds") or 180))
    return row


def persist_worker_availability(path: str, row: dict[str, Any]) -> None:
    if not path:
        return
    state_path = Path(path)
    data = safe_read_json(state_path, {})
    entries = data.get("workers") if isinstance(data, dict) else {}
    if isinstance(entries, list):
        entries = {str(item.get("workerId") or ""): item for item in entries if isinstance(item, dict)}
    if not isinstance(entries, dict):
        entries = {}
    worker_id = str(row.get("workerId") or "")
    if worker_id:
        entries[worker_id] = row
    atomic_write_json(state_path, {
        "schemaVersion": 1,
        "generatedAt": now(),
        "workers": entries,
    })


def refresh_missing_worker_availability(workers: list[dict[str, Any]], availability_path: str = "") -> None:
    """Boundedly refresh missing or expired snapshots directly from online Agents."""
    stale_workers = [worker for worker in workers if not availability_is_fresh(worker)]
    if not stale_workers:
        return

    def refresh(worker: dict[str, Any]) -> None:
        try:
            row = fetch_worker_availability(worker)
            note_availability_receipt(worker, row)
            worker["_agent_status"] = "online"
            worker["worker_status_ttl_seconds"] = int(row.get("ttlSeconds") or worker.get("worker_status_ttl_seconds") or 180)
            persist_worker_availability(availability_path, row)
        except Exception as exc:
            worker["_agent_status"] = f"offline: {exc}"

    with futures.ThreadPoolExecutor(max_workers=min(4, len(stale_workers))) as pool:
        pending = {pool.submit(refresh, worker): worker for worker in stale_workers}
        deadline = time.monotonic() + WORKER_AVAILABILITY_REFRESH_WINDOW_SECONDS
        for pending_item in pending:
            remaining = max(0.0, deadline - time.monotonic())
            try:
                pending_item.result(timeout=remaining)
            except Exception:
                pass


def job_for(item: dict[str, Any], jobs_by_index: dict[int, Any]) -> Any | None:
    try:
        return jobs_by_index.get(int(item.get("experiment_index")))
    except Exception:
        return None


def console_path(plan: str, item: dict[str, Any], worker: dict[str, Any] | None, job: Any | None, status: str) -> str:
    plan_slug = plan_runtime_key(plan)
    index = slug(item.get("experiment_index"), "unknown", 20)
    case = slug(getattr(job, "case", "") if job else item.get("case", ""), "case", 40)
    seed = slug(getattr(job, "seed", "") if job else item.get("seed", ""), "seed", 24)
    worker_slug = slug(worker.get("name") if worker else item.get("worker_name") or item.get("worker_id"), "worker", 32)
    gpu = slug(item.get("gpu_id"), "gpu", 16)
    session = slug(item.get("session"), "session", 32)
    state = slug(status, "status", 20)
    name = f"exp-{index}__case-{case}__seed-{seed}__worker-{worker_slug}__gpu-{gpu}__status-{state}__session-{session}.log"
    if len(name) > 180:
        digest = hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]
        name = f"exp-{index}__worker-{worker_slug}__status-{state}__session-{session}__{digest}.log"
    debug_root = str(item.get("debugOutputDir") or item.get("debug_output_dir") or "").strip().strip("/")
    return f"{debug_root}/console/{name}" if item.get("debugMode") and debug_root else f"simple_cluster/console_logs/{plan_slug}/{name}"


def set_console_fields(plan: str, item: dict[str, Any], worker: dict[str, Any] | None, job: Any | None, status: str) -> None:
    item["hub_console_log"] = console_path(plan, item, worker, job, status)


def mark_archived_paths(relatives: list[str], worker: dict[str, Any], status: str, summary: str) -> None:
    normalized = sorted({str(item).strip().replace("\\", "/").lstrip("./").rstrip("/") for item in relatives if str(item).strip()})
    if not normalized:
        return
    state = safe_read_json(ARCHIVE_STATE_PATH, {})
    if not isinstance(state, dict):
        state = {}
    entries = state.get("entries")
    if not isinstance(entries, dict):
        entries = {}
    stamp = now()
    for relative in normalized:
        previous = entries.get(relative) if isinstance(entries.get(relative), dict) else {}
        entries[relative] = {
            "archived": True,
            "path": relative,
            "source_worker_id": str(worker.get("id") or ""),
            "source_worker_name": str(worker.get("name") or ""),
            "status": status,
            "archived_at": str(previous.get("archived_at") or stamp),
            "last_verified_at": stamp,
            "sync_summary": summary,
        }
    state["project"] = Path.cwd().name
    state["updated_at"] = stamp
    state["entries"] = entries
    atomic_write_json(ARCHIVE_STATE_PATH, state)


def sync_worker_paths(worker: dict[str, Any], relatives: list[str]) -> bool:
    normalized = sorted({str(item).strip().replace("\\", "/").lstrip("./") for item in relatives if str(item).strip()})
    if not normalized:
        return False
    raise RuntimeError("Worker path synchronization disabled in tunnel-only scheduler.")


def sync_worker_dir(worker: dict[str, Any], remote_relative: str, local_relative: str) -> None:
    sync_worker_paths(worker, [str(remote_relative).strip("/").replace("\\", "/") + "/"])


def normalize_comparable_path(value: Any) -> str:
    return re.sub(r"^\./", "", re.sub(r"/+", "/", str(value or "").strip().replace("\\", "/"))).rstrip("/")


def comparable_path_variants(value: Any) -> set[str]:
    normalized = normalize_comparable_path(value)
    if not normalized:
        return set()
    variants = {normalized}
    marker_index = normalized.find("/simple_cluster/")
    if marker_index >= 0:
        variants.add(normalized[marker_index + 1:])
    legacy_archive = "simple_cluster/archive/"
    legacy_index = normalized.find(legacy_archive)
    if legacy_index >= 0:
        variants.add(normalized[legacy_index + len(legacy_archive):])
    for prefix in ["/work_dirs/", "/cluster_runs/", "/experiments/"]:
        index = normalized.find(prefix)
        if index >= 0:
            variants.add(normalized[index + 1:])
    return {item for item in variants if item}


def is_managed_artifact_path(value: Any) -> bool:
    normalized = normalize_comparable_path(value)
    if not normalized or normalized.startswith("[simple]") or re.match(r"^\[[^\]]+\]", normalized):
        return False
    return any(
        variant.startswith(prefix)
        for variant in comparable_path_variants(normalized)
        for prefix in [
            "work_dirs/",
            "cluster_runs/",
            "experiments/runs/",
            "experiments/results/",
            "simple_cluster/console_logs/",
            "simple_cluster/tmux_logs/",
            "simple_cluster/tmp/cluster_scheduler/logs/",
            "simple_cluster/tmp/cluster_scheduler/",
            "simple_cluster/tmp/tmux_logs/",
            "simple_cluster/tmp/console_logs/",
            "tmp/console_logs/",
            "tmp/tmux_logs/",
            "tmp/cluster_scheduler/logs/",
            "tmp/cluster_scheduler/",
            "tmp/",
            "simple_cluster/tmp/",
        ]
    )


def path_matches_any(value: Any, candidates: set[str]) -> bool:
    for variant in comparable_path_variants(value):
        for candidate in candidates:
            if variant == candidate:
                return True
            if variant.startswith(candidate + "/"):
                return True
            if candidate.startswith(variant + "/"):
                return True
            if variant.endswith("/" + candidate):
                return True
            if candidate.endswith("/" + variant):
                return True
    return False


def read_deleted_experiment_matchers() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        text = DELETED_EXPERIMENTS_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return out
    except Exception:
        return out
    for line in text.splitlines():
        try:
            item = json.loads(line)
        except Exception:
            continue
        if isinstance(item, dict) and item:
            out.append(item)
    return out


def experiment_entry_matches_deletion(entry: dict[str, Any], deleted: dict[str, Any]) -> bool:
    entry_ids = [str(entry.get(key) or "").strip() for key in ["run_id", "global_job_id"] if str(entry.get(key) or "").strip()]
    deleted_ids = [str(deleted.get(key) or "").strip() for key in ["run_id", "global_job_id"] if str(deleted.get(key) or "").strip()]
    if entry_ids and any(item in entry_ids for item in deleted_ids):
        return True
    deleted_paths: set[str] = set()
    path_keys = ["hub_job_dir", "worker_job_dir", "native_job_dir", "hub_console_log", "results_csv", "checkpoint_path", "path", "archive_key", "output_dir", "outputDir"]
    for key in path_keys:
        if is_managed_artifact_path(deleted.get(key)):
            deleted_paths.update(comparable_path_variants(deleted.get(key)))
    deleted_paths.update(variant for item in (deleted.get("deleted_paths") or []) for variant in comparable_path_variants(item) if is_managed_artifact_path(item))
    if not deleted_paths:
        return False
    return any(path_matches_any(entry.get(key), deleted_paths) for key in path_keys)


def filter_deleted_experiment_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deleted = read_deleted_experiment_matchers()
    if not deleted:
        return entries
    return [entry for entry in entries if not any(experiment_entry_matches_deletion(entry, matcher) for matcher in deleted)]


def job_deleted(job: Any, worker: dict[str, Any], item: dict[str, Any] | None = None) -> bool:
    worker_project_dir = str(worker["project_dir"]).rstrip("/")
    worker_job_dir = f"{worker_project_dir}/{str(job.output_dir).strip('/')}"
    entry = {
        "global_job_id": f"{getattr(job, 'suite', '')}:{getattr(job, 'case', '')}:{getattr(job, 'seed', '')}",
        "run_id": str((item or {}).get("run_id") or ""),
        "suite": str(getattr(job, "suite", "")),
        "case": str(getattr(job, "case", "")),
        "seed": str(getattr(job, "seed", "")),
        "hub_job_dir": str(job.output_dir),
        "worker_id": str(worker.get("id") or ""),
        "worker_host": str(worker.get("target") or worker.get("name") or ""),
        "worker_job_dir": worker_job_dir,
        "native_job_dir": worker_job_dir,
        "results_csv": str(getattr(job, "result_csv", "")),
        "hub_console_log": str((item or {}).get("hub_console_log") or (item or {}).get("log_path") or ""),
    }
    return any(experiment_entry_matches_deletion(entry, matcher) for matcher in read_deleted_experiment_matchers())


def index_entry_from_manifest(manifest_path: Path, worker: dict[str, Any], job: Any, item: dict[str, Any]) -> dict[str, Any]:
    parsed = safe_read_json(manifest_path, {})
    hub_job_dir = manifest_path.parent.as_posix()
    worker_project_dir = str(worker["project_dir"]).rstrip("/")
    worker_job_dir = f"{worker_project_dir}/{str(job.output_dir).strip('/')}"
    checkpoint = Path(job.output_dir) / "best_model.pth"
    return {
        "global_job_id": str(parsed.get("global_job_id") or f"{getattr(job, 'suite', '')}:{getattr(job, 'case', '')}:{getattr(job, 'seed', '')}"),
        "run_id": str(parsed.get("run_id") or Path(job.output_dir).name),
        "suite": str(parsed.get("suite") or getattr(job, "suite", "")),
        "case": str(parsed.get("case") or getattr(job, "case", "")),
        "seed": str(parsed.get("seed") or getattr(job, "seed", "")),
        "hub_job_dir": hub_job_dir,
        "worker_id": str(worker.get("id") or ""),
        "worker_host": str(worker.get("target") or worker.get("name") or ""),
        "worker_job_dir": worker_job_dir,
        "native_job_dir": worker_job_dir,
        "config_path": str(Path(job.output_dir) / "job_config.yaml"),
        "checkpoint_path": checkpoint.as_posix() if checkpoint.exists() else "",
        "results_csv": str(getattr(job, "result_csv", "")),
        "hub_console_log": str(item.get("hub_console_log") or ""),
        "status": str(parsed.get("status") or ""),
        "started_at": str(item.get("started_at") or ""),
        "finished_at": str(item.get("finished_at") or now()),
        "synced_at": now(),
    }


def upsert_experiment_index(entries: list[dict[str, Any]]) -> None:
    entries = filter_deleted_experiment_entries(entries)
    if not entries:
        return
    index_path = Path("simple_cluster/experiment_index.json")
    current = safe_read_json(index_path, [])
    if not isinstance(current, list):
        current = []
    keys = {str(entry.get("hub_job_dir") or "") for entry in entries}
    kept = filter_deleted_experiment_entries([entry for entry in current if str(entry.get("hub_job_dir") or "") not in keys])
    atomic_write_json(index_path, filter_deleted_experiment_entries([*kept, *entries]))


def archived_entry_exists(job: Any, worker: dict[str, Any]) -> bool:
    if job_deleted(job, worker):
        return True
    job_dir = Path(str(job.output_dir))
    if (job_dir / "artifact_manifest.json").exists():
        return True
    index_path = Path("simple_cluster/experiment_index.json")
    current = safe_read_json(index_path, [])
    if not isinstance(current, list):
        return False
    worker_project_dir = str(worker["project_dir"]).rstrip("/")
    worker_job_dir = f"{worker_project_dir}/{str(job.output_dir).strip('/')}"
    job_dir_text = job_dir.as_posix()
    for entry in current:
        if not isinstance(entry, dict):
            continue
        if str(entry.get("hub_job_dir") or "") == job_dir_text:
            return True
        if str(entry.get("worker_job_dir") or entry.get("native_job_dir") or "") == worker_job_dir:
            return True
    return False


def sync_finished_artifacts(plan: str, items: list[dict[str, Any]], workers_by_id: dict[str, dict[str, Any]], jobs_by_index: dict[int, Any]) -> None:
    entries: list[dict[str, Any]] = []
    paths_by_worker: dict[str, list[str]] = {}
    rows_by_worker: dict[str, list[tuple[dict[str, Any], Any, str]]] = {}
    for item in items:
        worker = workers_by_id.get(str(item.get("worker_id") or ""))
        job = job_for(item, jobs_by_index)
        if not worker or not job:
            continue
        if job_deleted(job, worker, item):
            item["artifact_sync_skipped"] = "deleted_by_local_ledger"
            continue
        status = "completed" if int(item.get("exit_code") or 1) == 0 and not item.get("error") else "failed"
        try:
            if archived_entry_exists(job, worker):
                item["artifact_synced_at"] = item.get("artifact_synced_at") or now()
                item["artifact_sync_skipped"] = "already_archived"
            else:
                paths_by_worker.setdefault(str(worker.get("id") or ""), []).append(str(job.output_dir).strip("/").replace("\\", "/") + "/")
            raw_log = str(item.get("log_path") or "").strip()
            if raw_log:
                item["hub_console_log"] = raw_log
                paths_by_worker.setdefault(str(worker.get("id") or ""), []).append(raw_log)
            rows_by_worker.setdefault(str(worker.get("id") or ""), []).append((item, job, status))
        except Exception as exc:
            item["sync_error"] = str(exc)
    for worker_id, paths in paths_by_worker.items():
        worker = workers_by_id.get(worker_id)
        if not worker:
            continue
        try:
            changed = sync_worker_paths(worker, paths)
            for item, job, status in rows_by_worker.get(worker_id, []):
                raw_log = str(item.get("log_path") or "").strip()
                if changed and raw_log:
                    item["console_tail"] = read_remote_tail(worker, raw_log)
                    item["log_synced_at"] = now()
                elif not changed:
                    item["sync_skipped"] = "unchanged"
                manifest_path = Path(str(job.output_dir)) / "artifact_manifest.json"
                if manifest_path.exists():
                    entries.append(index_entry_from_manifest(manifest_path, worker, job, item))
                item["artifact_synced_at"] = item.get("artifact_synced_at") or now()
                item.pop("sync_error", None)
        except Exception as exc:
            for item, _, _ in rows_by_worker.get(worker_id, []):
                item["sync_error"] = str(exc)
    upsert_experiment_index(entries)


def sync_running_console_logs(plan: str, items: list[dict[str, Any]], workers_by_id: dict[str, dict[str, Any]], jobs_by_index: dict[int, Any], status: str) -> None:
    # P0: 移除 sync_worker_paths/read_remote_tail 文件拉取，改为消费 agent 的 log_tail events（或直接透传 live_output），避免抛 RuntimeError
    for item in items:
        worker = workers_by_id.get(str(item.get("worker_id") or ""))
        if not worker:
            continue
        raw_log = str(item.get("log_path") or "").strip()
        if not raw_log:
            continue
        job = job_for(item, jobs_by_index)
        if job and job_deleted(job, worker, item):
            item["sync_skipped"] = "deleted_by_local_ledger"
            continue
        item["hub_console_log"] = raw_log
        item["output_dir"] = str(getattr(job, "output_dir", item.get("output_dir", "")) or "")
        gid = str(item.get("gpu_id") or item.get("gpuId") or item.get("gpu") or "").strip()
        tmux_target = str(item.get("tmuxTarget") or item.get("tmuxSession") or item.get("window") or "").strip()
        if not tmux_target and gid:
            try:
                _pfx = str(item.get("tmuxPrefix") or "") or "simple"
                import re as _re2
                tmux_target = _re2.sub(r"[^A-Za-z0-9_.-]+", "-", f"{_pfx}-gpu-{gid}").strip("-").lower() or f"simple-gpu-{gid}"
            except Exception:
                tmux_target = f"simple-gpu-{gid}" if gid else ""
        tail = ""
        try:
            # window 维度优先：live_output/{tmuxTarget}.json 真实 pane 直链
            if tmux_target:
                import re as _re3
                _safe_t = _re3.sub(r"[^A-Za-z0-9_.-]+", "-", tmux_target).strip("-") or tmux_target
                for _base in [scheduler_agent_state_dir() / "live_output" / f"{_safe_t}.json", Path("simple_agent/state/projects") / "live_output" / f"{_safe_t}.json"]:
                    try:
                        if _base.is_file():
                            _data = safe_read_json(_base, {})
                            _t = _data.get("tail") if isinstance(_data, dict) else None
                            if isinstance(_t, list) and _t:
                                tail = "\n".join(str(x) for x in _t[-50:]) + "\n"
                                break
                            elif isinstance(_t, str) and _t.strip():
                                tail = _t
                                break
                    except Exception:
                        continue
            # 1) 兼容旧路径 live_output/{gid}.json
            if not tail and gid:
                for _base in [scheduler_agent_state_dir() / "live_output" / f"{gid}.json", Path("simple_agent/state/projects") / "live_output" / f"{gid}.json"]:
                    try:
                        if _base.is_file():
                            _data = safe_read_json(_base, {})
                            _t = _data.get("tail") if isinstance(_data, dict) else None
                            if isinstance(_t, list) and _t:
                                tail = "\n".join(str(x) for x in _t[-50:]) + "\n"
                                break
                            elif isinstance(_t, str) and _t.strip():
                                tail = _t
                                break
                    except Exception:
                        continue
            # 2) 其次消费 agent 的 log_tail events（最近 200 行 journal）
            if not tail:
                try:
                    journal = scheduler_agent_state_dir() / "events.jsonl"
                    if journal.is_file():
                        lines = journal.read_text(encoding="utf-8", errors="replace").splitlines()[-200:]
                        for line in reversed(lines):
                            try:
                                ev = json.loads(line)
                                if str(ev.get("type") or "") == "log_tail":
                                    pay = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
                                    ev_gid = str(pay.get("gpu") or pay.get("gid") or "").strip()
                                    ev_tail = pay.get("tail") or pay.get("text") or ""
                                    if ev_tail:
                                        if not gid or ev_gid == gid or not ev_gid:
                                            if isinstance(ev_tail, list):
                                                tail = "\n".join(str(x) for x in ev_tail[-50:]) + "\n"
                                            else:
                                                tail = str(ev_tail)
                                            break
                            except Exception:
                                continue
                except Exception:
                    pass
            if tail:
                item["console_tail"] = tail[-TAIL_BYTES:]
                item["log_tail"] = tail[-TAIL_BYTES:]
                item["log_synced_at"] = now()
                item.pop("sync_skipped", None)
                item.pop("log_sync_error", None)
            else:
                # 无 tail 不抛异常，保持调度流程，避免 RuntimeError
                item["sync_skipped"] = "no_tail_yet"
                item.pop("log_sync_error", None)
        except Exception as exc:
            # 容错：避免抛 RuntimeError 阻断调度
            item["log_sync_error"] = str(exc)[:200]


def ensure_worker_runtime(worker: dict[str, Any]) -> str:
    install_dir = str(worker.get("agent_runtime_dir") or worker.get("agentRuntimeDir") or "").strip().rstrip("/")
    if install_dir:
        return f"{install_dir}/simple_cluster/runtime/cluster_scheduler.py"
    if worker.get("_runtime_uploaded"):
        return "simple_cluster/runtime/cluster_scheduler.py"
    return "simple_agent/simple_cluster/runtime/cluster_scheduler.py"


def write_state(path: Path, payload: dict[str, Any]) -> None:
    payload["updated_at"] = now()
    atomic_write_json(path, payload)


def launch_experiment(worker: dict[str, Any], plan: str, experiment_index: int, gpu_id: str, log_dir: Path, mode: str = "train_test", debug_mode: bool = False, debug_run_id: str = "", debug_output_dir: str = "", default_result_csv_dir: str = "experiments/results", overwrite_existing: bool = False) -> str:
    conda_env = simple_conda_env_name({
        "SIMPLE_EXPERIMENT_CONDA_ENV": str(worker.get("conda_env") or worker.get("condaEnv") or ""),
    })
    if not conda_env:
        raise RuntimeError(f"Worker {worker.get('id') or worker.get('name') or '-'} 未配置 condaEnv；请在设置 > 服务器 或 project.prepare 的 workerTunnels[].condaEnv 中配置。")
    prefix = "dbg" if debug_mode else ("tst" if mode == "test" else "run")
    session = f"{prefix}{experiment_index}-{int(time.time() * 1000) % 1000000}-{random.randint(100, 999)}"
    project_dir = str(worker["project_dir"])
    runtime_path = ensure_worker_runtime(worker)
    raw_log = log_dir / f"{slug(worker['id'], 'worker')}_{experiment_index}_{gpu_id}_{slug(session, 'session')}.log"
    command_id = session
    enqueue_worker_command(worker, {
        "action": "start-worker-task",
        "commandId": command_id,
        "runKey": command_id,
        "session": session,
        "projectDir": project_dir,
        "schedulerPath": runtime_path,
        "plan": plan,
        "experimentIndex": experiment_index,
        "gpuId": gpu_id,
        "mode": mode,
        "condaEnv": conda_env,
        "logPath": raw_log.as_posix(),
        "debugMode": bool(debug_mode),
        "debugRunId": str(debug_run_id or ""),
        "debugOutputDir": str(debug_output_dir or ""),
        "defaultResultCsvDir": normalize_default_result_csv_dir(default_result_csv_dir),
        "overwriteExisting": bool(overwrite_existing),
        "overwrite": bool(overwrite_existing),
    })
    return session


def kill_session(worker: dict[str, Any], session: str, reason: str = "manual_stop_bad_code_or_no_effect", stop_source: str = "scheduler") -> None:
    if session:
        enqueue_worker_command(worker, {
            "action": "stop-worker-task",
            "commandId": f"stop-{slug(worker.get('id'), 'worker')}-{slug(session, 'session')}-{int(time.time() * 1000)}",
            "session": session,
            "stopReason": reason,
            "manualStopType": reason if reason in MANUAL_STOP_TYPES else "",
            "stopSource": stop_source,
        })


def read_control(path: Path) -> dict[str, Any]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(parsed, dict):
            return {}
        # 信号类型枚举兼容：signal 字段与 action 互为别名，统一归一化
        if parsed.get("signal") and not parsed.get("action"):
            parsed["action"] = str(parsed.get("signal") or "")
        if parsed.get("action") and not parsed.get("signal"):
            parsed["signal"] = str(parsed.get("action") or "")
        return parsed
    except FileNotFoundError:
        return {}
    except Exception as exc:
        return {"action": "error", "signal": "error", "error": str(exc)}


def append_log(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(text.rstrip() + "\n")


def read_scheduler_deletion_matchers() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        text = DELETED_SCHEDULER_ROWS_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return out
    except Exception:
        return out
    for line in text.splitlines():
        try:
            item = json.loads(line)
        except Exception:
            continue
        if isinstance(item, dict) and item:
            out.append(item)
    return out


def scheduler_matcher_matches_plan(plan: str, matcher: dict[str, Any]) -> bool:
    suite = str(matcher.get("suite") or "").strip()
    explicit_plan = str(matcher.get("plan") or "").strip()
    if explicit_plan and explicit_plan not in plan:
        return False
    if suite and suite not in plan:
        return False
    return True


def parse_time_ms(value: Any) -> float | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp() * 1000
    except Exception:
        return None


def row_comparable_time(item: dict[str, Any], state: dict[str, Any] | None = None) -> float | None:
    values = [
        item.get("finished_at"),
        item.get("finishedAt"),
        item.get("testing_started_at"),
        item.get("started_at"),
        item.get("startedAt"),
        (state or {}).get("updated_at"),
    ]
    for value in values:
        parsed = parse_time_ms(value)
        if parsed is not None:
            return parsed
    return None


def scheduler_matcher_matches_pending(plan: str, state: dict[str, Any], index: Any, matcher: dict[str, Any]) -> bool:
    if not scheduler_matcher_matches_plan(plan, matcher):
        return False
    if str(index) != str(matcher.get("experimentIndex") or ""):
        return False
    scheduler_session = str(matcher.get("schedulerSession") or "").strip()
    state_session = str(state.get("scheduler_session") or "").strip()
    if scheduler_session and scheduler_session != state_session:
        return False
    if bool(matcher.get("affectsPending")):
        return True
    return bool(scheduler_session and scheduler_session == state_session)


def scheduler_matcher_matches_item(plan: str, item: dict[str, Any], matcher: dict[str, Any], state: dict[str, Any] | None = None) -> bool:
    if not scheduler_matcher_matches_plan(plan, matcher):
        return False
    if str(item.get("experiment_index") or "") != str(matcher.get("experimentIndex") or ""):
        return False
    worker_id = str(matcher.get("workerId") or "").strip()
    if worker_id and str(item.get("worker_id") or "").strip() != worker_id:
        return False
    worker_host = str(matcher.get("workerHost") or "").strip()
    if worker_host:
        candidates = {str(item.get(key) or "").strip() for key in ["worker_host", "worker_name", "worker_id", "server"]}
        if worker_host not in candidates:
            return False
    scheduler_session = str(matcher.get("schedulerSession") or "").strip()
    session = str(matcher.get("session") or "").strip()
    log_path = normalize_comparable_path(str(matcher.get("logPath") or ""))
    has_strong_identity = bool(scheduler_session or session or log_path)
    if scheduler_session and scheduler_session != str((state or {}).get("scheduler_session") or item.get("scheduler_session") or "").strip():
        return False
    if session and session != str(item.get("session") or "").strip():
        return False
    if log_path and normalize_comparable_path(str(item.get("log_path") or item.get("logPath") or "")) != log_path:
        return False
    if has_strong_identity:
        return True
    deleted_at = parse_time_ms(matcher.get("deletedAt"))
    if deleted_at is not None:
        row_at = row_comparable_time(item, state)
        if row_at is not None and row_at > deleted_at:
            return False
    return True


def apply_scheduler_deletions_to_state(state: dict[str, Any]) -> bool:
    matchers = read_scheduler_deletion_matchers()
    if not matchers:
        return False
    changed = False
    plan = str(state.get("plan") or "")
    row_matchers = [m for m in matchers if str(m.get("deleteMode") or "row") == "row"]
    log_matchers = [m for m in matchers if str(m.get("deleteMode") or "") == "log_fields"]
    for key in ["running_experiments", "testing_experiments", "completed_experiments", "failed_experiments", "stopped_experiments"]:
        rows = state.get(key) or []
        if not isinstance(rows, list):
            continue
        if log_matchers:
            for item in rows:
                if not isinstance(item, dict) or not any(scheduler_matcher_matches_item(plan, item, m, state) for m in log_matchers):
                    continue
                for field in ["hub_console_log", "console_tail", "log_tail", "log_synced_at", "log_sync_error", "sync_error"]:
                    if field in item:
                        item.pop(field, None)
                        changed = True
        kept = [item for item in rows if not isinstance(item, dict) or not any(scheduler_matcher_matches_item(plan, item, m, state) for m in row_matchers)]
        if len(kept) != len(rows):
            state[key] = kept
            changed = True
    queue = state.get("pending_experiments")
    if isinstance(queue, list):
        kept_queue = [index for index in queue if not any(scheduler_matcher_matches_pending(plan, state, index, m) for m in row_matchers)]
        if len(kept_queue) != len(queue):
            state["pending_experiments"] = kept_queue
            changed = True
    return changed


def sync_state_once(args: argparse.Namespace) -> None:
    state_path = Path(args.state_path)
    state = safe_read_json(state_path, {})
    if not isinstance(state, dict):
        raise SystemExit(f"invalid state json: {state_path}")
    workers = json.loads(Path(args.workers_json).read_text(encoding="utf-8"))
    workers_by_id = {str(worker.get("id") or ""): worker for worker in workers}
    plan = str(args.plan or state.get("plan") or "")
    apply_scheduler_deletions_to_state(state)
    _, jobs = build_jobs(load_plan(plan), args.default_result_csv_dir)
    jobs_by_index = {int(job.index): job for job in jobs}
    completed = state.setdefault("completed_experiments", [])
    failed = state.setdefault("failed_experiments", [])
    live_sync: dict[str, list[dict[str, Any]]] = {"running": [], "testing": []}
    for status, key in [("running", "running_experiments"), ("testing", "testing_experiments")]:
        kept = []
        for item in state.get(key) or []:
            worker = workers_by_id.get(str(item.get("worker_id") or ""))
            if not worker:
                kept.append(item)
                continue
            try:
                if session_alive(worker, str(item.get("session") or "")):
                    job = job_for(item, jobs_by_index)
                    if job:
                        item["output_dir"] = str(job.output_dir)
                    item["gpu_process_pids"] = gpu_process_pids(worker, str(item.get("gpu_id") or ""))
                    live_sync.setdefault(status, []).append(item)
                    kept.append(item)
                    continue
                tail = read_remote_tail(worker, str(item.get("log_path") or ""))
                exit_code = exit_code_from_tail(tail)
                item["finished_at"] = now()
                item["exit_code"] = exit_code
                item["console_tail"] = tail[-TAIL_BYTES:]
                target_status = "completed" if exit_code == 0 else "failed"
                if exit_code == 0:
                    completed.append(item)
                else:
                    item["error"] = f"exit_code={exit_code if exit_code is not None else 'unknown'}"
                    failed.append(item)
                kill_session(worker, str(item.get("session") or ""), "scheduler_sync_finished", "scheduler")
            except Exception as exc:
                item["log_sync_error"] = str(exc)
                kept.append(item)
        state[key] = kept
    for status, rows in live_sync.items():
        sync_running_console_logs(plan, rows, workers_by_id, jobs_by_index, status)
    apply_scheduler_deletions_to_state(state)
    apply_scheduler_deletions_to_state(state)
    write_state(state_path, state)


_SCHEDULER_ARGS_FOR_GUARD = None  # type: ignore


def _scheduler_terminal_emitted(args) -> bool:
    # Avoid emitting a duplicate terminal operation event (the scheduling loop
    # already writes its own failed/completed event before re-raising).
    op_id = str(getattr(args, "operation_id", "") or "").strip()
    if not op_id:
        return False
    journal = scheduler_agent_state_dir() / "events.jsonl"
    if not journal.is_file():
        return False
    try:
        with journal.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    ev = json.loads(line)
                except Exception:
                    continue
                if str(ev.get("operationId") or "") != op_id:
                    continue
                if str(ev.get("type") or "") in ("operation_completed", "operation_failed", "operation_stalled"):
                    return True
    except Exception:
        pass
    return False


def main() -> None:
    global AGENT_STATE_DIR, _SCHEDULER_ARGS_FOR_GUARD
    parser = argparse.ArgumentParser(description="SimpleExperiment Hub-side scheduler runtime.")
    parser.add_argument("--plan", default="")
    parser.add_argument("--workers-json", default="")
    parser.add_argument("--poll-seconds", type=int, default=600)
    parser.add_argument("--scheduler-session", default="")
    parser.add_argument("--scheduler-log", default="")
    parser.add_argument("--sync-state", action="store_true")
    parser.add_argument("--state-path", default="")
    parser.add_argument("--run-job", action="store_true")
    parser.add_argument("--print-job-dir", action="store_true")
    parser.add_argument("--validate-plan", action="store_true")
    parser.add_argument("--dry-run-plan", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--overwrite-existing", action="store_true")
    parser.add_argument("--check-existing", action="store_true")
    parser.add_argument("--mode", choices=["train_test", "train", "test"], default="")
    parser.add_argument("--only-index", type=int)
    parser.add_argument("--only-indices", default="")
    parser.add_argument("--gpu-ids", default="")
    parser.add_argument("--worker-id", default="local")
    parser.add_argument("--availability-path", default="")
    parser.add_argument("--worker-status-ttl-seconds", type=int, default=180)
    parser.add_argument("--poll-jitter-seconds", type=int, default=30)
    parser.add_argument("--session-check-min-seconds", type=int, default=60)
    parser.add_argument("--gpu-idle-util-threshold", type=int, default=5)
    parser.add_argument("--gpu-idle-mem-threshold", type=int, default=200)
    parser.add_argument("--gpu-history-bucket", type=int, default=60)
    parser.add_argument("--gpu-history-bucket-seconds", type=int, default=60)
    parser.add_argument("--gpu-history-retention", type=int, default=72)
    parser.add_argument("--gpu-history-retention-hours", type=int, default=72)
    parser.add_argument("--gpu-history-retention-seconds", type=int, default=259200)
    parser.add_argument("--passive-interrupt-max-retries", type=int, default=3)
    parser.add_argument("--passive-interrupt-backoff-seconds", type=int, default=0)
    parser.add_argument("--agent-state-dir", default="")
    parser.add_argument("--operation-id", default="")
    parser.add_argument("--op-id", default="")
    parser.add_argument("--operation-action", default="run-plan")
    parser.add_argument("--plan-revision", default="")
    parser.add_argument("--worker-set-revision", default="")
    parser.add_argument("--scheduler-owner-worker-id", default="")
    parser.add_argument("--debug-mode", action="store_true")
    parser.add_argument("--debug-run-id", default="")
    parser.add_argument("--debug-output-dir", default="")
    parser.add_argument("--default-result-csv-dir", default="experiments/results")
    parser.add_argument("--check-dependencies-json", action="store_true")
    args = parser.parse_args()
    _SCHEDULER_ARGS_FOR_GUARD = args
    args.default_result_csv_dir = normalize_default_result_csv_dir(args.default_result_csv_dir)
    if args.debug_mode:
        args.debug_run_id = str(args.debug_run_id or args.operation_id or f"debug-{int(time.time())}")
        args.debug_output_dir = str(args.debug_output_dir or debug_run_root(args.plan or "plan", args.debug_run_id))
    AGENT_STATE_DIR = str(args.agent_state_dir or os.environ.get("SIMPLE_EXPERIMENT_AGENT_STATE_DIR", "")).strip()
    if getattr(args, "check_existing", False):
        if not args.plan:
            raise SystemExit("--check-existing 必须同时提供 --plan")
        check_existing_mode(args)
        return
    if args.check_dependencies_json:
        print(json.dumps(scheduler_dependency_status(), ensure_ascii=False))
        return
    try:
        require_scheduler_dependencies()
    except SystemExit as _exc:
        # Even when startup fails before run_job_mode, publish a terminal failed event so
        # the operation journal is never left pending waiting for a scheduler terminal that
        # will never arrive (defense in depth beyond the agent-side wait_scheduler fallback).
        try:
            _early_msg = str(_exc).strip().splitlines()[0][:200] if str(_exc).strip() else f"调度器依赖检查未通过：{_exc}"
            append_scheduler_operation_event(args, "failed", f"调度器依赖检查未通过：{_exc}", {"failureSource": "scheduler_dependency_check", "schedulerStarted": True, "schedulerErrorZh": _early_msg[:200]})
        except Exception:
            pass
        try:
            _msg = f"[{now()}] scheduler_dependency_check_failed {_exc}"
            _sched_log = str(getattr(args, "scheduler_log", "") or "").strip()
            if _sched_log:
                append_log(Path(_sched_log), _msg)
            _op = str(getattr(args, "operation_id", "") or getattr(args, "op_id", "") or "").strip()
            if _op:
                append_log(Path(f"simple_cluster/tmp/cluster_scheduler/{_op}.log"), _msg)
        except Exception:
            pass
        raise
    if args.print_job_dir:
        if args.only_index is None:
            raise SystemExit("--print-job-dir 必须同时提供 --only-index")
        print_job_dir_mode(args)
        return
    if args.validate_plan:
        if not args.plan:
            raise SystemExit("--validate-plan 必须同时提供 --plan")
        validate_plan_mode(args)
        return
    if args.dry_run_plan:
        if not args.plan:
            raise SystemExit("--dry-run-plan 必须同时提供 --plan")
        dry_run_plan_mode(args)
        return
    if args.run_job:
        if args.only_index is None:
            raise SystemExit("--run-job 必须同时提供 --only-index")
        run_job_mode(args)
        return
    if args.sync_state:
        if not args.state_path:
            raise SystemExit("--sync-state 必须同时提供 --state-path")
        if not args.workers_json:
            raise SystemExit("--sync-state 必须同时提供 --workers-json")
        sync_state_once(args)
        return
    if not args.plan:
        raise SystemExit("缺少 --plan。")
    if not args.workers_json:
        raise SystemExit("缺少 --workers-json。")

    # poll 下限保持 60：校园网封禁风险，配合首跑/任务结束主动探活，无需短轮询
    poll_seconds = max(60, int(args.poll_seconds or 600))
    poll_jitter_seconds = max(0, int(args.poll_jitter_seconds or 0))
    workers = json.loads(Path(args.workers_json).read_text(encoding="utf-8"))
    worker_status_ttl_seconds = max(60, int(args.worker_status_ttl_seconds or 180))
    session_check_min_seconds = max(30, int(args.session_check_min_seconds or 60))
    passive_interrupt_max_retries = max(0, int(args.passive_interrupt_max_retries or 0))
    passive_interrupt_base_backoff = max(60, int(args.passive_interrupt_backoff_seconds or poll_seconds))
    read_availability_cache(args.availability_path, workers, worker_status_ttl_seconds)
    refresh_missing_worker_availability(workers, args.availability_path)
    workers_by_id = {str(worker.get("id") or ""): worker for worker in workers}
    try:
        plan = load_plan(args.plan)
    except SystemExit as _exc:
        try:
            _early_msg2 = str(_exc).strip().splitlines()[0][:200] if str(_exc).strip() else f"计划加载失败：{_exc}"
            append_scheduler_operation_event(args, "failed", f"计划加载失败：{_exc}", {"failureSource": "scheduler_load_plan", "planFile": args.plan, "schedulerStarted": True, "schedulerErrorZh": _early_msg2[:200]})
        except Exception:
            pass
        try:
            _msg = f"[{now()}] scheduler_load_plan_failed {_exc} plan={args.plan}"
            _sched_log = str(getattr(args, "scheduler_log", "") or "").strip()
            if _sched_log:
                append_log(Path(_sched_log), _msg)
            _op = str(getattr(args, "operation_id", "") or getattr(args, "op_id", "") or "").strip()
            if _op:
                append_log(Path(f"simple_cluster/tmp/cluster_scheduler/{_op}.log"), _msg)
            try:
                _pk = plan_runtime_key(args.plan)
                append_log(Path(f"simple_cluster/tmp/cluster_scheduler/{_pk}.log"), _msg)
            except Exception:
                pass
        except Exception:
            pass
        raise
    except Exception as _exc:
        try:
            _early_msg3 = str(_exc).strip().splitlines()[0][:200] if str(_exc).strip() else f"计划加载异常：{_exc}"
            append_scheduler_operation_event(args, "failed", f"计划加载异常：{_exc}", {"failureSource": "scheduler_load_plan", "planFile": args.plan, "schedulerStarted": True, "schedulerErrorZh": _early_msg3[:200]})
        except Exception:
            pass
        try:
            _msg = f"[{now()}] scheduler_load_plan_exception {_exc} plan={args.plan}"
            _sched_log = str(getattr(args, "scheduler_log", "") or "").strip()
            if _sched_log:
                append_log(Path(_sched_log), _msg)
            _op = str(getattr(args, "operation_id", "") or getattr(args, "op_id", "") or "").strip()
            if _op:
                append_log(Path(f"simple_cluster/tmp/cluster_scheduler/{_op}.log"), _msg)
            try:
                _pk = plan_runtime_key(args.plan)
                append_log(Path(f"simple_cluster/tmp/cluster_scheduler/{_pk}.log"), _msg)
            except Exception:
                pass
        except Exception:
            pass
        raise
    jobs = jobs_for_args(plan, args)
    execution_mode = plan_execution_mode(plan, args.mode)
    args.mode = execution_mode
    jobs_by_index = {int(job.index): job for job in jobs}
    queue = deque(job.index for job in (jobs[:1] if args.debug_mode else jobs))
    active: dict[str, dict[str, Any]] = {}
    testing: dict[str, dict[str, Any]] = {}
    completed: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    stopped: list[dict[str, Any]] = []
    dispatch_probe: list[dict[str, Any]] = []
    scheduler_wait_reason = ""
    last_session_check: dict[str, float] = {}
    passive_retry_counts: dict[int, int] = {}
    passive_backoff_until = 0.0
    tmp_dir = Path("simple_cluster/tmp/cluster_scheduler")
    log_dir = Path(args.debug_output_dir) / "worker_logs" if args.debug_mode else tmp_dir / "logs"
    plan_key = plan_runtime_key(args.plan)
    state_key = f"{plan_key}__debug__{slug(args.debug_run_id, 'debug', 64)}" if args.debug_mode else plan_key
    state_path = tmp_dir / f"{state_key}_state.json"
    control_path = tmp_dir / f"{state_key}_control.json"
    _scheduler_log_arg = str(getattr(args, "scheduler_log", "") or "").strip()
    if _scheduler_log_arg:
        queue_log = Path(_scheduler_log_arg)
    elif args.debug_mode:
        queue_log = Path(args.debug_output_dir) / "scheduler.log"
    else:
        queue_log = tmp_dir / f"{plan_key}.log"

    def _append_scheduler_log(text: str) -> None:
        # 控制台直显：print 到 stdout 并 flush，直显 tmux；备份到 tmp 仅用 logging.FileHandler 追加
        try:
            print(text, flush=True)
            try:
                sys.stdout.flush()
            except Exception:
                pass
        except Exception:
            pass
        try:
            import logging as _logging
            def _fh_append(_path: Path, _msg: str) -> None:
                _path.parent.mkdir(parents=True, exist_ok=True)
                _h = _logging.FileHandler(str(_path), encoding="utf-8")
                _h.setLevel(_logging.INFO)
                _h.setFormatter(_logging.Formatter("%(message)s"))
                _lg = _logging.getLogger(f"scheduler_backup_{str(_path)}")
                _lg.addHandler(_h)
                _lg.setLevel(_logging.INFO)
                _lg.propagate = False
                _lg.info(_msg)
                _h.close()
                _lg.removeHandler(_h)
            _fh_append(queue_log, text)
            if _scheduler_log_arg:
                _explicit = Path(_scheduler_log_arg)
                if _explicit != queue_log:
                    _fh_append(_explicit, text)
        except Exception:
            pass

    def apply_scheduler_deletions_to_runtime() -> bool:
        matchers = read_scheduler_deletion_matchers()
        if not matchers:
            return False
        changed = False
        row_matchers = [m for m in matchers if str(m.get("deleteMode") or "row") == "row"]
        log_matchers = [m for m in matchers if str(m.get("deleteMode") or "") == "log_fields"]
        runtime_state = {
            "plan": args.plan,
            "scheduler_session": args.scheduler_session,
        }

        def row_deleted(item: dict[str, Any]) -> bool:
            return any(scheduler_matcher_matches_item(args.plan, item, matcher, runtime_state) for matcher in row_matchers)

        def scrub_logs(item: dict[str, Any]) -> None:
            nonlocal changed
            if not any(scheduler_matcher_matches_item(args.plan, item, matcher, runtime_state) for matcher in log_matchers):
                return
            for field in ["hub_console_log", "console_tail", "log_tail", "log_synced_at", "log_sync_error", "sync_error"]:
                if field in item:
                    item.pop(field, None)
                    changed = True

        original_queue_count = len(queue)
        kept_queue = [index for index in queue if not any(scheduler_matcher_matches_pending(args.plan, runtime_state, index, matcher) for matcher in row_matchers)]
        if len(kept_queue) != original_queue_count:
            queue.clear()
            queue.extend(kept_queue)
            changed = True
        for group in [completed, failed, stopped]:
            for item in list(group):
                if row_deleted(item):
                    group.remove(item)
                    changed = True
                else:
                    scrub_logs(item)
        for group in [active, testing]:
            for key, item in list(group.items()):
                if row_deleted(item):
                    worker = workers_by_id.get(str(item.get("worker_id") or ""))
                    if worker:
                        kill_session(worker, str(item.get("session") or ""), "scheduler_row_deleted", "scheduler")
                    group.pop(key, None)
                    changed = True
                else:
                    scrub_logs(item)
        return changed

    def state_payload(error: str = "") -> dict[str, Any]:
        apply_scheduler_deletions_to_runtime()
        return {
            "plan": args.plan,
            "planRevision": str(getattr(args, "plan_revision", "") or ""),
            "workerSetRevision": str(args.worker_set_revision or ""),
            "schedulerOwnerWorkerId": str(args.scheduler_owner_worker_id or ""),
            "assignedExperimentIndices": only_indices_for_args(args),
            "debugMode": bool(args.debug_mode),
            "debugRunId": str(args.debug_run_id or ""),
            "debugOutputDir": str(args.debug_output_dir or ""),
            "execution_mode": execution_mode,
            "total_experiments": len(jobs),
            "pending_experiments": list(queue),
            "running_experiments": list(active.values()),
            "testing_experiments": list(testing.values()),
            "completed_experiments": completed,
            "failed_experiments": failed,
            "stopped_experiments": stopped,
            "scheduler_error": error,
            "scheduler_wait_reason": scheduler_wait_reason,
            "dispatch_probe": dispatch_probe[-20:],
            "scheduler_session": args.scheduler_session,
            "scheduler_log": args.scheduler_log,
            "control_path": str(control_path),
        }

    def write_current_state(error: str = "") -> None:
        write_state(state_path, state_payload(error))

    def request_passive_cleanup(worker: dict[str, Any], item: dict[str, Any]) -> None:
        job = job_for(item, jobs_by_index)
        output_dir = str(getattr(job, "output_dir", "") if job else item.get("output_dir") or "").replace("\\", "/").strip().strip("/")
        if not output_dir:
            return
        command_id = f"cleanup-passive-{slug(worker.get('id'), 'worker')}-{slug(item.get('experiment_index'), 'exp')}-{int(time.time() * 1000)}"
        enqueue_worker_command(worker, {
            "action": "delete-worker-artifacts",
            "commandId": command_id,
            "selectedArchiveKeys": [output_dir],
            "reason": "passive_interrupted_retry_cleanup",
            "passiveCleanup": True,
        })
        item["passive_cleanup_requested"] = output_dir
        item["passive_cleanup_command_id"] = command_id

    def requeue_passive_interruption(kind: str, item: dict[str, Any], worker: dict[str, Any], reason: str) -> bool:
        nonlocal passive_backoff_until
        try:
            index = int(item.get("experiment_index"))
        except Exception:
            return False
        attempts = passive_retry_counts.get(index, 0) + 1
        item["status"] = "passive_interrupted_retryable"
        item["completion_type"] = "passive_interrupted_retryable"
        item["interruption_kind"] = "passive"
        item["interruptionKind"] = "passive"
        item["passiveInterrupted"] = True
        item["interruptionReason"] = reason
        item["retryAttempt"] = attempts
        item["maxRetryAttempts"] = passive_interrupt_max_retries
        if attempts > passive_interrupt_max_retries:
            item["status"] = "failed"
            item["completion_type"] = "failed"
            item["error"] = f"{reason}; passive retry exhausted"
            return False
        passive_retry_counts[index] = attempts
        if index not in queue:
            queue.append(index)
        item["retryQueued"] = True
        request_passive_cleanup(worker, item)
        delay = min(900, passive_interrupt_base_backoff * attempts)
        passive_backoff_until = max(passive_backoff_until, time.time() + delay)
        stopped.append(item)
        _append_scheduler_log( f"[{now()}] passive_interrupt_requeue {kind} experiment={index} server={item.get('worker_name')} gpu={item.get('gpu_id')} attempt={attempts}/{passive_interrupt_max_retries} delay_seconds={delay} reason={reason}")
        return True

    def finish_item(kind: str, key: str, item: dict[str, Any], worker: dict[str, Any]) -> None:
        events = command_result_events({str(item.get("session") or "")})
        event = events.get(str(item.get("session") or "")) or {}
        payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
        exit_code = normalize_exit_code(payload.get("exitCode") if payload.get("exitCode") is not None else (0 if str(payload.get("status") or "") == "completed" else 1))
        item["finished_at"] = now()
        item["exit_code"] = exit_code
        item["console_tail"] = ""
        item["worker_event_type"] = str(event.get("type") or "")
        manual_type = manual_interruption_type(event, payload)
        passive_reason = passive_interruption_reason(event, payload, exit_code)
        if manual_type:
            item["status"] = "manual_interrupted_completed"
            item["completion_type"] = "manual_interrupted_completed"
            item["interruption_kind"] = "manual"
            item["interruptionKind"] = "manual"
            item["manualInterrupted"] = True
            item["manualStopType"] = manual_type
            item["stop_reason"] = manual_type
            item["requiresManualReview"] = True
            completed.append(item)
            status = "completed"
            _append_scheduler_log( f"[{now()}] manual_interrupted {kind} experiment={item['experiment_index']} server={item['worker_name']} gpu={item['gpu_id']} reason={manual_type}")
        elif exit_code == 0:
            item["status"] = "normal_completed"
            item["completion_type"] = "normal_completed"
            completed.append(item)
            status = "completed"
            _append_scheduler_log( f"[{now()}] done {kind} experiment={item['experiment_index']} server={item['worker_name']} gpu={item['gpu_id']} exit_code=0")
        elif passive_reason and requeue_passive_interruption(kind, item, worker, passive_reason):
            status = "queued"
        else:
            item["error"] = f"exit_code={exit_code if exit_code is not None else 'unknown'}"
            item["status"] = "failed"
            item["completion_type"] = "failed"
            if passive_reason:
                item["interruption_kind"] = "passive"
                item["interruptionKind"] = "passive"
                item["passiveInterrupted"] = True
                item["interruptionReason"] = passive_reason
            failed.append(item)
            status = "failed"
            _append_scheduler_log( f"[{now()}] failed {kind} experiment={item['experiment_index']} server={item['worker_name']} gpu={item['gpu_id']} {item['error']}")
        if kind == "test":
            testing.pop(key, None)
        else:
            active.pop(key, None)
        # 主动探活：任务结束立即刷新可用性，再由上层调度/下次派发消费（无需经 control.json 信号等待轮询，最坏唤醒由 5s 休眠兜底）
        try:
            refresh_worker_availability_for_signal(workers, args.availability_path)
        except Exception:
            pass

    def reap_finished_items() -> bool:
        changed = False
        command_ids = {str(item.get("session") or "") for item in list(testing.values()) + list(active.values()) if str(item.get("session") or "")}
        finished_events = command_result_events(command_ids)
        # P1 快速回滚：exec_error 不受 session_check_min_seconds 节流，需立即释放 running 槽位
        for key, item in list(testing.items()):
            sess = str(item.get("session") or "")
            if sess in finished_events:
                ev = finished_events.get(sess) or {}
                if str(ev.get("type") or "") == "worker_command_exec_error":
                    # bypass throttling for exec_error
                    worker = workers_by_id.get(str(item.get("worker_id") or ""))
                    if worker:
                        finish_item("test", key, item, worker)
                    else:
                        item["finished_at"] = now()
                        item["error"] = "worker config missing"
                        failed.append(item)
                        testing.pop(key, None)
                    changed = True
                    continue
            if time.time() - last_session_check.get(key, 0.0) < session_check_min_seconds:
                continue
            last_session_check[key] = time.time()
            worker = workers_by_id.get(str(item.get("worker_id") or ""))
            if not worker:
                item["finished_at"] = now()
                item["error"] = "worker config missing"
                failed.append(item)
                testing.pop(key, None)
                changed = True
                continue
            if sess in finished_events:
                finish_item("test", key, item, worker)
                changed = True
        for key, item in list(active.items()):
            sess = str(item.get("session") or "")
            if sess in finished_events:
                ev = finished_events.get(sess) or {}
                if str(ev.get("type") or "") == "worker_command_exec_error":
                    worker = workers_by_id.get(str(item.get("worker_id") or ""))
                    if worker:
                        # 标记为 exec_error 失败并立即释放
                        item["error"] = str((ev.get("payload") or {}).get("error") or "worker_command_exec_error")
                        item["finished_at"] = now()
                        item["status"] = "failed"
                        item["completion_type"] = "failed"
                        failed.append(item)
                        active.pop(key, None)
                        _append_scheduler_log(f"[{now()}] exec_error_reap experiment={item.get('experiment_index')} session={sess} error={item['error'][:120]}")
                    else:
                        item["finished_at"] = now()
                        item["error"] = "worker config missing"
                        failed.append(item)
                        active.pop(key, None)
                    changed = True
                    continue
            if time.time() - last_session_check.get(key, 0.0) < session_check_min_seconds:
                continue
            last_session_check[key] = time.time()
            worker = workers_by_id.get(str(item.get("worker_id") or ""))
            if not worker:
                item["finished_at"] = now()
                item["error"] = "worker config missing"
                failed.append(item)
                active.pop(key, None)
                changed = True
                continue
            if sess in finished_events:
                finish_item("train", key, item, worker)
                changed = True
        return changed

    def handle_control() -> bool:
        control = read_control(control_path)
        sig = scheduler_signal_from_control(control)
        # 信号类型区分：first_run / task_end 视为调度信号，区别于轮询 poll_tick
        if sig in (SCHEDULER_SIGNAL_FIRST_RUN, SCHEDULER_SIGNAL_TASK_END):
            _append_scheduler_log( f"[{now()}] signal_received type={sig} via_control")
            try:
                atomic_write_json(control_path, {"action": "", "signal": "", "handled_at": now(), "previous_signal": sig})
            except Exception:
                pass
            return False
        # 兼容：control 仅有 poll_tick 时按轮询处理（不中断）
        if sig == SCHEDULER_SIGNAL_POLL_TICK:
            return False
        action = str(control.get("action") or "")
        if not action:
            return False
        if action == "abort_cleanup":
            _append_scheduler_log( f"[{now()}] control abort_cleanup")
            manual_type = manual_interruption_type({"type": "scheduler_control"}, control) or "manual_stop_bad_code_or_no_effect"
            for item in list(active.values()) + list(testing.values()):
                worker = workers_by_id.get(str(item.get("worker_id") or ""))
                if worker:
                    kill_session(worker, str(item.get("session") or ""), manual_type, "user")
                item["finished_at"] = now()
                item["status"] = "manual_interrupted_completed"
                item["completion_type"] = "manual_interrupted_completed"
                item["interruption_kind"] = "manual"
                item["interruptionKind"] = "manual"
                item["manualInterrupted"] = True
                item["manualStopType"] = manual_type
                item["stop_reason"] = manual_type
                item["requiresManualReview"] = True
                completed.append(item)
            for index in queue:
                completed.append({"experiment_index": index, "finished_at": now(), "status": "manual_interrupted_completed", "completion_type": "manual_interrupted_completed", "interruption_kind": "manual", "interruptionKind": "manual", "manualInterrupted": True, "manualStopType": manual_type, "stop_reason": manual_type, "requiresManualReview": True})
            queue.clear()
            active.clear()
            testing.clear()
            write_current_state()
            return True
        if action == "stop_and_test":
            _append_scheduler_log( f"[{now()}] control stop_and_test")
            if execution_mode != "train_test":
                control["action"] = "abort_cleanup"
                control["manualStopType"] = "manual_stop_converged"
                atomic_write_json(control_path, control)
                return handle_control()
            for index in queue:
                completed.append({"experiment_index": index, "finished_at": now(), "status": "manual_interrupted_completed", "completion_type": "manual_interrupted_completed", "interruption_kind": "manual", "interruptionKind": "manual", "manualInterrupted": True, "manualStopType": "manual_stop_converged", "stop_reason": "manual_stop_converged", "requiresManualReview": True})
            queue.clear()
            for key, item in list(active.items()):
                worker = workers_by_id.get(str(item.get("worker_id") or ""))
                if not worker:
                    item["finished_at"] = now()
                    item["error"] = "worker config missing"
                    failed.append(item)
                    active.pop(key, None)
                    continue
                kill_session(worker, str(item.get("session") or ""), "manual_stop_converged", "user")
                try:
                    overwrite_existing = bool(getattr(args, "overwrite", False) or getattr(args, "overwrite_existing", False))
                    session = launch_experiment(worker, args.plan, int(item["experiment_index"]), str(item["gpu_id"]), log_dir, "test", args.debug_mode, args.debug_run_id, args.debug_output_dir, args.default_result_csv_dir, overwrite_existing)
                    item["train_session"] = item.get("session", "")
                    item["session"] = session
                    item["testing_started_at"] = now()
                    job = job_for(item, jobs_by_index)
                    if job:
                        item["output_dir"] = str(job.output_dir)
                    item["gpu_process_pids"] = gpu_process_pids(worker, str(item.get("gpu_id") or ""))
                    testing[key] = item
                    _append_scheduler_log( f"[{now()}] test_dispatch experiment={item['experiment_index']} server={worker['name']} gpu={item['gpu_id']} session={session}")
                except Exception as exc:
                    item["finished_at"] = now()
                    item["error"] = str(exc)
                    failed.append(item)
                active.pop(key, None)
            write_current_state()
            return False
        if action == "retry_failed":
            retry_indexes = []
            active_indexes = {int(item.get("experiment_index")) for item in list(active.values()) + list(testing.values()) if str(item.get("experiment_index") or "").isdigit()}
            queued_indexes = {int(index) for index in queue}
            for item in list(failed):
                try:
                    index = int(item.get("experiment_index"))
                except Exception:
                    continue
                if index in active_indexes or index in queued_indexes:
                    continue
                queue.append(index)
                queued_indexes.add(index)
                retry_indexes.append(index)
                failed.remove(item)
            _append_scheduler_log( f"[{now()}] control retry_failed queued={retry_indexes}")
            atomic_write_json(control_path, {"action": "", "handled_at": now(), "previous_action": action, "retry_indexes": retry_indexes})
            write_current_state()
            return False
        if action == "reproduce_missing":
            active_indexes = {int(item.get("experiment_index")) for item in list(active.values()) + list(testing.values()) if str(item.get("experiment_index") or "").isdigit()}
            completed_indexes = {int(item.get("experiment_index")) for item in completed if str(item.get("experiment_index") or "").isdigit()}
            queued_indexes = {int(index) for index in queue}
            queued_now = []
            for job in jobs:
                index = int(job.index)
                if index in active_indexes or index in queued_indexes or index in completed_indexes:
                    continue
                queue.append(index)
                queued_indexes.add(index)
                queued_now.append(index)
            queued_now_set = set(queued_now)
            def not_requeued(item: dict[str, Any]) -> bool:
                try:
                    return int(item.get("experiment_index")) not in queued_now_set
                except Exception:
                    return True
            failed[:] = [item for item in failed if not_requeued(item)]
            stopped[:] = [item for item in stopped if not_requeued(item)]
            _append_scheduler_log( f"[{now()}] control reproduce_missing queued={queued_now}")
            atomic_write_json(control_path, {"action": "", "handled_at": now(), "previous_action": action, "queued_indexes": queued_now})
            write_current_state()
            return False
        if action == "error":
            _append_scheduler_log( f"[{now()}] control_error {control.get('error')}")
        return False

    _append_scheduler_log( f"[{now()}] scheduler_start mode={execution_mode} experiments={len(queue)} workers={len(workers)} poll_seconds={poll_seconds}")
    write_current_state()
    # 首跑主动探活：强制直连全量 workers（忽略 fresh），超时 5s/10s，确保首批 4 任务 60s 内派发而非等待下一轮 poll
    try:
        refresh_worker_availability_for_signal(workers, args.availability_path, force=True)
        _append_scheduler_log( f"[{now()}] availability_first_run_probe active poll_seconds={poll_seconds} jitter={poll_jitter_seconds} force=True")
    except Exception as _e:
        _append_scheduler_log( f"[{now()}] availability_first_run_fallback error={_e}")
        try:
            read_availability_cache(args.availability_path, workers, worker_status_ttl_seconds)
        except Exception:
            pass
    _scheduler_signal_debounce_seconds = SCHEDULER_SIGNAL_DEBOUNCE_SECONDS
    _last_poll_monotonic = 0.0
    _last_signal_monotonic = time.monotonic()
    _last_signal_type = SCHEDULER_SIGNAL_FIRST_RUN
    # 首轮已强制刷新内存，首轮 dispatch 走信号路径避免被 read_availability_cache 覆盖为过期文件内容
    _pending_signal_type = SCHEDULER_SIGNAL_FIRST_RUN
    _signal_storm_count = 0
    no_dispatch_error_cycles = 0
    _scheduler_abort = {"sig": None}
    def _handle_scheduler_signal(signum, _frame):
        _scheduler_abort["sig"] = signum
    try:
        import signal as _signal_module
        _signal_module.signal(_signal_module.SIGTERM, _handle_scheduler_signal)
        _signal_module.signal(_signal_module.SIGINT, _handle_scheduler_signal)
    except Exception:
        pass
    scheduler_abort_message = ""
    try:
        while queue or active or testing:
            if _scheduler_abort["sig"] is not None:
                scheduler_abort_message = f"调度器收到终止信号 {_scheduler_abort['sig']}，已安全结束并写入终态"
                _append_scheduler_log( f"[{now()}] scheduler_abort signal={_scheduler_abort['sig']}")
                write_current_state(scheduler_abort_message)
                break
            scheduler_wait_reason = ""
            if handle_control():
                break
            if reap_finished_items():
                write_current_state()
            # 错误早停：任一 failed 或 logShowsError 即 while queue: failed.append 并 terminal failed（原子标记，原需3轮改1轮）
            if scheduler_should_fail_fast(failed, active, testing):
                _fail_reason = "fail_fast: 任一任务失败/日志报错触发，停整个 plan"
                if failed:
                    _fail_reason = str(failed[-1].get("error") or _fail_reason)[:200]
                else:
                    for _it in list(active.values()) + list(testing.values()):
                        _tail = str(_it.get("console_tail") or _it.get("log_tail") or "")
                        if scheduler_log_shows_error(_tail):
                            _fail_reason = _tail.strip().splitlines()[-1][:200] if _tail.strip() else _fail_reason
                            break
                _append_scheduler_log( f"[{now()}] fail_fast_trigger pending={len(queue)} failed={len(failed)} reason={_fail_reason[:120]}")
                scheduler_fail_pending_queue(queue, failed, _fail_reason)
                write_current_state(_fail_reason)
                break
            # 信号类型枚举与直连 vs 缓存分流：信号路径尽可能不利用缓存发信号（B路径 stale才直连 + C piggyback）
            _is_signal_dispatch = _pending_signal_type in (SCHEDULER_SIGNAL_FIRST_RUN, SCHEDULER_SIGNAL_TASK_END) and (time.monotonic() - _last_signal_monotonic) < (_scheduler_signal_debounce_seconds + 2.0)
            if _is_signal_dispatch:
                try:
                    _force_refresh = _pending_signal_type == SCHEDULER_SIGNAL_FIRST_RUN
                    refresh_worker_availability_for_signal(workers, args.availability_path, force=_force_refresh)
                    _append_scheduler_log( f"[{now()}] availability_signal_path type={_pending_signal_type} force={_force_refresh}")
                except Exception as _e:
                    _append_scheduler_log( f"[{now()}] availability_signal_fallback error={_e}")
                    read_availability_cache(args.availability_path, workers, worker_status_ttl_seconds)
                    refresh_missing_worker_availability(workers, args.availability_path)
            else:
                read_availability_cache(args.availability_path, workers, worker_status_ttl_seconds)
                refresh_missing_worker_availability(workers, args.availability_path)
            # 去抖记录：本轮 dispatch 视为一次 poll，更新 last_poll
            _last_poll_monotonic = time.monotonic()
            _pending_signal_type = SCHEDULER_SIGNAL_POLL_TICK
            for worker in ordered_workers_for_dispatch(workers):
                busy_slots = {**active, **testing}
                probe = probe_idle_gpus(worker, busy_slots)
                dispatch_probe.append(probe)
                if probe.get("error"):
                    _append_scheduler_log( f"[{now()}] dispatch_probe worker={worker.get('name')} error={probe.get('error')}")
                elif not probe.get("idle_gpu_ids"):
                    _append_scheduler_log( f"[{now()}] dispatch_probe worker={worker.get('name')} idle=0 rejected={len(probe.get('rejected') or [])}")
                for gpu_id in list(probe.get("idle_gpu_ids") or []):
                    if not queue:
                        break
                    experiment_index = queue.popleft()
                    try:
                        overwrite_existing = bool(getattr(args, "overwrite", False) or getattr(args, "overwrite_existing", False))
                        session = launch_experiment(worker, args.plan, experiment_index, gpu_id, log_dir, execution_mode, args.debug_mode, args.debug_run_id, args.debug_output_dir, args.default_result_csv_dir, overwrite_existing)
                        item = {
                            "experiment_index": experiment_index,
                            "worker_id": worker["id"],
                            "worker_name": worker["name"],
                            "gpu_id": gpu_id,
                            "session": session,
                            "mode": execution_mode,
                            "log_path": str(log_dir / f"{slug(worker['id'], 'worker')}_{experiment_index}_{gpu_id}_{slug(session, 'session')}.log"),
                            "started_at": now(),
                            "debugMode": bool(args.debug_mode),
                            "debugRunId": str(args.debug_run_id or ""),
                            "debugOutputDir": str(args.debug_output_dir or ""),
                        }
                        job = jobs_by_index.get(experiment_index)
                        if job:
                            item["output_dir"] = str(job.output_dir)
                        item["gpu_process_pids"] = gpu_process_pids(worker, gpu_id)
                        initial_status = "testing" if execution_mode == "test" else "running"
                        set_console_fields(args.plan, item, worker, jobs_by_index.get(experiment_index), initial_status)
                        if execution_mode == "test":
                            item["testing_started_at"] = item["started_at"]
                            key = f"{worker['id']}:{gpu_id}"
                            if key in testing:
                                _append_scheduler_log(f"[{now()}] skip overwrite active_slot {key} experiment={experiment_index} already running {testing[key].get('experiment_index')}")
                                try:
                                    queue.appendleft(experiment_index)
                                except Exception:
                                    queue.append(experiment_index)
                                continue
                            testing[key] = item
                        else:
                            key = f"{worker['id']}:{gpu_id}"
                            if key in active:
                                _append_scheduler_log(f"[{now()}] skip overwrite active_slot {key} experiment={experiment_index} already running {active[key].get('experiment_index')}")
                                try:
                                    queue.appendleft(experiment_index)
                                except Exception:
                                    queue.append(experiment_index)
                                continue
                            active[key] = item
                        dispatch_probe.append({"worker_id": worker["id"], "worker_name": worker["name"], "gpu_id": gpu_id, "experiment_index": experiment_index, "status": "dispatched", "checked_at": now(), "session": session})
                        _append_scheduler_log( f"[{now()}] dispatch experiment={experiment_index} server={worker['name']} gpu={gpu_id} session={session}")
                    except Exception as exc:
                        dispatch_probe.append({"worker_id": worker["id"], "worker_name": worker["name"], "gpu_id": gpu_id, "experiment_index": experiment_index, "status": "launch_failed", "checked_at": now(), "error": str(exc)})
                        failed.append({
                            "experiment_index": experiment_index,
                            "worker_id": worker["id"],
                            "worker_name": worker["name"],
                            "gpu_id": gpu_id,
                            "session": "",
                            "started_at": now(),
                            "finished_at": now(),
                            "error": str(exc),
                        })
                    write_current_state()
                    try:
                        time.sleep(2)
                    except InterruptedError:
                        pass
            write_current_state()
            if queue or active or testing:
                if queue and not active and not testing:
                    latest = dispatch_probe[-len(workers):] if workers else []
                    errors = [str(item.get("error") or "") for item in latest if item.get("error")]
                    scheduler_wait_reason = "; ".join(errors[:3]) if errors else "no_idle_gpu_from_hub_probe"
                    if latest and errors and len(errors) == len(latest):
                        no_dispatch_error_cycles += 1
                        if no_dispatch_error_cycles >= 1:
                            reason = scheduler_wait_reason or "all worker dispatch probes failed"
                            _append_scheduler_log( f"[{now()}] fail_pending reason={reason} fail_fast_cycles={no_dispatch_error_cycles}")
                            scheduler_fail_pending_queue(queue, failed, reason)
                            write_current_state(reason)
                            break
                    else:
                        no_dispatch_error_cycles = 0
                # 60s阻塞修复：动态 sleep_target + 5s 快探 idle（有 pending 且有 idle 时不等 60s）
                _has_idle_for_pending = False
                if queue:
                    try:
                        _probe_busy = {**active, **testing}
                        for _w in workers:
                            _pp = probe_idle_gpus(_w, _probe_busy)
                            if _pp.get("idle_gpu_ids"):
                                _has_idle_for_pending = True
                                break
                    except Exception:
                        _has_idle_for_pending = False
                if queue and _has_idle_for_pending:
                    _base_poll = poll_seconds + (random.uniform(0, poll_jitter_seconds) if poll_jitter_seconds else 0)
                    sleep_target = min(5.0, float(_base_poll))
                    if passive_backoff_until > time.time():
                        _rem = passive_backoff_until - time.time()
                        sleep_target = max(sleep_target, min(_rem, 5.0))
                    _append_scheduler_log( f"[{now()}] wait pending={len(queue)} running={len(active)} poll_seconds={poll_seconds} jitter_seconds={poll_jitter_seconds} sleep_seconds={sleep_target:.1f} has_idle=True short_sleep")
                    if sleep_target <= 0:
                        continue
                else:
                    sleep_target = poll_seconds + (random.uniform(0, poll_jitter_seconds) if poll_jitter_seconds else 0)
                    if passive_backoff_until > time.time():
                        sleep_target = max(sleep_target, passive_backoff_until - time.time())
                    _append_scheduler_log( f"[{now()}] wait pending={len(queue)} running={len(active)} poll_seconds={poll_seconds} jitter_seconds={poll_jitter_seconds} sleep_seconds={sleep_target:.1f}")
                if not queue and not active and not testing:
                    break
                slept = 0
                while slept < sleep_target:
                    # 信号优先分支：收到信号立即 break 并 reap+dispatch（5s粒度，最坏唤醒5s，配合主动探活无需0.5s高频）
                    _ctrl = read_control(control_path)
                    _sig = scheduler_signal_from_control(_ctrl)
                    if _sig or _ctrl.get("action"):
                        _now_mono = time.monotonic()
                        _is_dup_poll = _sig == SCHEDULER_SIGNAL_POLL_TICK and (_now_mono - _last_signal_monotonic) < _scheduler_signal_debounce_seconds
                        _is_dup_signal = _sig in (SCHEDULER_SIGNAL_FIRST_RUN, SCHEDULER_SIGNAL_TASK_END) and _sig == _last_signal_type and (_now_mono - _last_signal_monotonic) < _scheduler_signal_debounce_seconds
                        if _is_dup_signal:
                            # 风暴合并：同类信号在去抖窗口内合并，丢弃后者
                            _signal_storm_count += 1
                            _append_scheduler_log( f"[{now()}] signal_coalesced type={_sig} storm={_signal_storm_count} debounce={_scheduler_signal_debounce_seconds}s")
                            try:
                                atomic_write_json(control_path, {"action": "", "signal": "", "handled_at": now(), "previous_signal": _sig, "coalesced": True})
                            except Exception:
                                pass
                        elif _is_dup_poll:
                            # 去抖：轮询与信号间隔<5s丢弃后者（优先信号）
                            _append_scheduler_log( f"[{now()}] dropped_duplicate_poll signal={_last_signal_type} poll_interval={_now_mono - _last_signal_monotonic:.1f}s prioritize_signal")
                            try:
                                atomic_write_json(control_path, {"action": "", "signal": "", "handled_at": now(), "previous_signal": _sig, "dropped": "poll"})
                            except Exception:
                                pass
                        else:
                            if _sig in (SCHEDULER_SIGNAL_FIRST_RUN, SCHEDULER_SIGNAL_TASK_END):
                                _last_signal_monotonic = _now_mono
                                _last_signal_type = _sig
                                _pending_signal_type = _sig
                                _signal_storm_count = 0
                                _append_scheduler_log( f"[{now()}] signal_wake type={_sig} slept={slept:.1f}/{sleep_target:.1f} prioritize_signal")
                                # 信号路径直连：first_run 强制全量刷新（忽略 fresh），task_end 仅 stale
                                try:
                                    _force_wake = _sig == SCHEDULER_SIGNAL_FIRST_RUN
                                    refresh_worker_availability_for_signal(workers, args.availability_path, force=_force_wake)
                                except Exception:
                                    try:
                                        read_availability_cache(args.availability_path, workers, worker_status_ttl_seconds)
                                    except Exception:
                                        pass
                                try:
                                    atomic_write_json(control_path, {"action": "", "signal": "", "handled_at": now(), "previous_signal": _sig})
                                except Exception:
                                    pass
                            else:
                                # 通用 action 信号也优先唤醒
                                _pending_signal_type = _sig or str(_ctrl.get("action") or "unknown")
                                _append_scheduler_log( f"[{now()}] control_wake action={_pending_signal_type} slept={slept:.1f}")
                                try:
                                    atomic_write_json(control_path, {"action": "", "signal": "", "handled_at": now(), "previous_signal": _pending_signal_type})
                                except Exception:
                                    pass
                            break
                    if _scheduler_abort["sig"] is not None:
                        break
                    if reap_finished_items():
                        write_current_state()
                        # 任务结束 piggyback：reap 产生新完成即视为 task_end 信号，触发立即 dispatch
                        if scheduler_should_fail_fast(failed, active, testing):
                            _append_scheduler_log( f"[{now()}] fail_fast_in_sleep pending={len(queue)}")
                            break
                        # 风暴合并：多个 finish 在去抖窗口内合并为一次 dispatch
                        _pending_signal_type = SCHEDULER_SIGNAL_TASK_END
                        _last_signal_monotonic = time.monotonic()
                        _last_signal_type = SCHEDULER_SIGNAL_TASK_END
                        if not queue and not active and not testing:
                            break
                        # 收到 reap 信号立即 break 去 dispatch，无需等待剩余 sleep_target
                        break
                    # 60s阻塞修复：每次 5s 唤醒前快探 idle，若 queue 非空且有 idle 立即 break 去 dispatch（不等 60s 耗尽）
                    if queue:
                        try:
                            _busy_for_probe = {**active, **testing}
                            _any_idle = False
                            for _w in workers:
                                _pp2 = probe_idle_gpus(_w, _busy_for_probe)
                                if _pp2.get("idle_gpu_ids"):
                                    _any_idle = True
                                    break
                            if _any_idle:
                                _append_scheduler_log( f"[{now()}] idle_wake pending={len(queue)} running={len(active)} slept={slept:.1f}/{sleep_target:.1f} has_idle=True")
                                break
                        except Exception:
                            pass
                    # 休息时 5s 粒度轮询，最坏唤醒 5s（配合首跑/任务结束主动探活，避免0.5s高频与校园网封禁）
                    try:
                        time.sleep(5)
                    except InterruptedError:
                        break
                    slept += 5
    except Exception as exc:
        _append_scheduler_log( f"[{now()}] scheduler_error {exc}")
        write_current_state(str(exc))
        # Surface the failure: include a tail of the scheduler log and the
        # traceback so the Operations panel can render the root cause instead of
        # staying on "waiting for scheduler terminal".
        _tail = ""
        try:
            _log_path = Path(str(args.scheduler_log or queue_log))
            if _log_path.is_file():
                with _log_path.open("rb") as _h:
                    _h.seek(max(0, _log_path.stat().st_size - 8 * 1024))
                    _tail = _h.read().decode("utf-8", "replace")[-2000:]
        except Exception:
            _tail = ""
        _sched_zh = str(exc).strip().splitlines()[0][:200] if str(exc).strip() else f"调度器异常：{exc}"
        append_scheduler_operation_event_robust(args, "failed", f"调度器异常：{exc}", {
            "statePath": str(state_path).replace("\\", "/"),
            "schedulerLog": str(args.scheduler_log or queue_log).replace("\\", "/"),
            "logTail": _tail,
            "error": traceback.format_exc(),
            "schedulerErrorZh": _sched_zh[:200],
            "totalExperiments": len(jobs),
            "pendingCount": len(queue),
            "runningCount": len(active),
            "testingCount": len(testing),
            "completedCount": len(completed),
            "failedCount": len(failed),
            "stoppedCount": len(stopped),
        })
        raise
    _append_scheduler_log( f"[{now()}] scheduler_finish")
    final_error = scheduler_abort_message
    if queue and not active and not testing and not completed and not failed and not stopped:
        final_error = "Hub 调度器仍有排队实验但没有任何派发。请检查 dispatch_probe、availability cache 和 Worker command queue 运行细节。"
    write_current_state(final_error)
    failed_count = len(failed)
    stopped_count = len(stopped)
    completed_count = len(completed)
    terminal_status = "failed" if final_error or failed_count else "completed"
    if final_error:
        terminal_message = final_error
    elif failed_count:
        terminal_message = f"调度结束：完成 {completed_count}，失败 {failed_count}，停止 {stopped_count}。"
    else:
        terminal_message = f"调度完成：完成 {completed_count}，停止 {stopped_count}。"
    append_scheduler_operation_event(args, terminal_status, terminal_message, {
        "statePath": str(state_path).replace("\\", "/"),
        "schedulerLog": str(args.scheduler_log or queue_log).replace("\\", "/"),
        "totalExperiments": len(jobs),
        "pendingCount": len(queue),
        "runningCount": len(active),
        "testingCount": len(testing),
        "completedCount": completed_count,
        "failedCount": failed_count,
        "stoppedCount": stopped_count,
        "schedulerError": final_error,
    })


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as _sched_guard_exc:
        # Startup / scheduler failure path: the scheduling loop's own except block
        # already emits a terminal event and re-raises, so we skip here when one
        # exists. For crashes before the loop (conda env missing, YAML parse,
        # dependency import, workers json, etc.) emit a terminal failed event with
        # the traceback so the Operations panel is never stuck on "等待 scheduler 终态".
        try:
            _guard_args = _SCHEDULER_ARGS_FOR_GUARD
            # 早期参数解析失败也可能使 operation_id 为空；用 args 或环境变量兜底，
            # 确保仍能落 failed 事件（否则面板会卡在 running）。
            _op_id = ""
            if _guard_args is not None:
                _op_id = str(getattr(_guard_args, "operation_id", "") or "").strip()
            if not _op_id:
                _op_id = str(os.environ.get("SIMPLE_SCHEDULER_OPERATION_ID") or os.environ.get("SIMPLE_EXPERIMENT_OPERATION_ID") or "").strip()
            if _op_id:
                _already = False
                try:
                    # _scheduler_terminal_emitted 自身可能异常/失效，失效时仍要兜底写 failed。
                    _already = _scheduler_terminal_emitted(_guard_args) if _guard_args is not None else False
                except Exception:
                    _already = False
                if not _already:
                    _tb = traceback.format_exc()
                    _emit_args = _guard_args if _guard_args is not None else argparse.Namespace()
                    try:
                        setattr(_emit_args, "operation_id", _op_id)
                    except Exception:
                        pass
                    _guard_zh = str(_sched_guard_exc).strip().splitlines()[0][:200] if str(_sched_guard_exc).strip() else f"调度器启动/运行异常：{_sched_guard_exc}"
                    append_scheduler_operation_event_robust(_emit_args, "failed", f"调度器启动/运行异常：{_sched_guard_exc}", {
                        "failureSource": "scheduler_guard",
                        "error": _tb,
                        "schedulerErrorZh": _guard_zh[:200],
                        "schedulerLog": str(getattr(_guard_args, "scheduler_log", "") or "") if _guard_args is not None else "",
                        "planFile": str(getattr(_guard_args, "plan", "") or "") if _guard_args is not None else "",
                    })
        except Exception:
            pass
        raise
