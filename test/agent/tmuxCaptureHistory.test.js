const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const root = path.join(__dirname, "../..");
const runtime = path.join(root, "dist/runtime/cluster_agent.py");

test("tmux capture requests joined scrollback instead of the visible viewport", () => {
  const source = readSource("src/clusterAgentRuntime.ts");
  const route = source.slice(source.indexOf('if route == "/api/tmux/capture"'), source.indexOf('if route == "/api/tmux/list"'));
  assert.match(route, /"capture-pane", "-p", "-J", "-S", f"-\{history_lines\}"/);
  assert.match(route, /_tmux_focus_diagnostic_text\(raw_text\)/);
});

test("tmux capture focuses the original CUDA error instead of the command parameter preamble", () => {
  const script = `
import importlib.util, pathlib
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(runtime)}))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
prefix = [f"checkpoint: parameter-{i}" for i in range(900)]
failure = [
    "Traceback (most recent call last):",
    "  File train.py, line 88, in train",
    "torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB",
    "subprocess.CalledProcessError: Command returned non-zero exit status 1",
]
text, focus = agent._tmux_focus_diagnostic_text("\\n".join(prefix + failure))
assert focus == "error", focus
assert "CUDA out of memory" in text, text
assert "Traceback (most recent call last):" in text, text
assert "checkpoint: parameter-0" not in text, text[:300]
print("ok")
`;
  const result = spawnSync("python", ["-X", "utf8", "-c", script], {
    encoding: "utf8",
    cwd: root,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("extension keeps the useful capture tail and labels error-focused output", () => {
  const source = readSource("src/extension.ts");
  const block = source.slice(source.indexOf("async fetchTmuxCaptureFromUi("), source.indexOf("async fetchTmuxListFromUi("));
  assert.doesNotMatch(block, /slice\(0, 12000\)/);
  assert.match(block, /rawText\.slice\(-48000\)/);
  assert.match(block, /focus: String\(result\?\.focus/);
});
