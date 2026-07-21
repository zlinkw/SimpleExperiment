const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("source does not contain legacy direct connection runner terms", () => {
  const forbidden = [
    "runSsh(",
    "sshTransportMode",
    "ControlMaster",
    "ControlPath",
    "persistent_shell",
    "oneshot",
    "connectSshSessions",
    "closeControlMasterSessions",
    "writeRemoteBase64",
    "scp",
    "rsync",
  ];
  const files = walk(path.join(root, "src"))
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => !file.includes(`${path.sep}test${path.sep}`));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const item of forbidden) {
      assert.equal(text.includes(item), false, `${item} in ${path.relative(root, file)}`);
    }
  }
});

function walk(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}