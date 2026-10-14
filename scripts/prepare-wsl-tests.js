"use strict";

// Prepare the external test runtime before the per-file twenty-second budget.
// This launches no Python, Agent, tmux, transfer or research command.
if (process.platform === "win32") {
  const { spawn } = require("node:child_process");
  const started = Date.now();
  const child = spawn("wsl.exe", ["--distribution", process.env.SIMPLE_TEST_WSL_DISTRO || "Ubuntu-Codex", "--exec", "/usr/bin/true"],
    { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let error = "";
  const timer = setTimeout(() => { error = "WSL test runtime preparation timed out"; child.kill(); }, 15000);
  child.stderr.on("data", data => { error = (error + data.toString()).slice(-2000); });
  child.once("error", cause => { clearTimeout(timer); process.exitCode = 1; process.stderr.write(cause.message + "\n"); });
  child.once("close", code => {
    clearTimeout(timer);
    if (code !== 0 || error.includes("timed out")) {
      process.exitCode = 1;
      process.stderr.write((error || "WSL test runtime unavailable") + "\n");
    } else process.stdout.write("[test-runtime] WSL ready in " + (Date.now() - started) + " ms\n");
  });
}
