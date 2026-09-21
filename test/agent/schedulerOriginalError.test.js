const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const root = path.join(__dirname, "../..");
const runtime = path.join(root, "dist/runtime/cluster_scheduler.py");

test("failure output prints stderr only and omits wrapper metadata and stdout noise", () => {
  const script = `
import contextlib, importlib.util, io, json, pathlib, sys, tempfile, types
spec = importlib.util.spec_from_file_location("scheduler", pathlib.Path(${JSON.stringify(runtime)}))
scheduler = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = scheduler
spec.loader.exec_module(scheduler)
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    (base / "stderr.log").write_text("torch.OutOfMemoryError: CUDA out of memory\\n", encoding="utf-8")
    (base / "stdout.log").write_text("checkpoint: huge parameter dump\\n", encoding="utf-8")
    (base / "run_wrapper_report.json").write_text(json.dumps({"error": "secret context-json parameter dump"}), encoding="utf-8")
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        shown = scheduler.surface_original_error(types.SimpleNamespace(output_dir=str(base)), "train")
    text = out.getvalue()
assert shown is True
assert "torch.OutOfMemoryError: CUDA out of memory" in text, text
assert "checkpoint: huge parameter dump" not in text, text
assert "secret context-json parameter dump" not in text, text
assert text.rstrip().endswith("========== end stderr.log =========="), text
print("ok")
`;
  const result = spawnSync("python", ["-X", "utf8", "-c", script], {
    encoding: "utf8",
    cwd: root,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("handled child failure exits nonzero without re-raising CalledProcessError", () => {
  const source = readSource("src/clusterSchedulerRuntime.ts");
  const block = source.slice(source.indexOf("def run_job(job:"), source.indexOf("def run_job_mode("));
  assert.match(block, /except subprocess\.CalledProcessError as exc:/);
  assert.match(block, /raise SystemExit\(_failed_process_exit_code\(exc\)\) from None/);
  assert.doesNotMatch(block, /surface_original_error\(job, "(?:train|test)"\)\s+raise\r?\n/);
});
