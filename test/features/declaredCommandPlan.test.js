"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("declared PLAN resolves commands and independent outputs", () => {
  const result = spawnSync("python", ["-B", "-X", "utf8", path.join(__dirname, "declaredCommandPlan.fixture.py")],
    { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.match(result.stdout, /declared command plan ok/);
});
