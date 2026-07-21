const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("new realtime UI actions do not invoke ssh scp or rsync", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  for (const method of ["manualGpuSnapshot", "manualSchedulerSnapshot", "manualTracesSnapshot"]) {
    const match = source.match(new RegExp(`async ${method}\\(\\): Promise<void> \\{([\\s\\S]*?)\\n  \\}`));
    assert.ok(match, method);
    assert.doesNotMatch(match[1], /\bssh\b|\bscp\b|\brsync\b|runSsh|execFile|spawn/i, method);
  }
  const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.doesNotMatch(panel, /\bssh\b|\bscp\b|\brsync\b|direct_ssh|runSsh|execFile|spawn/i);
});