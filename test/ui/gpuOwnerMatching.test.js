const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadOwnerMatching() {
  const sandbox = {
    GPU_OWNER_MATCH_MODES: new Set(["username", "command_contains", "both"]),
    stringArrayCalls: 0,
    stringArray(value) {
      sandbox.stringArrayCalls += 1;
      return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
    },
    pick(value, keys, fallback) {
      for (const key of keys) {
        if (value && value[key] !== undefined && value[key] !== null) return value[key];
      }
      return fallback;
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("normalizeGpuOwnerConfig"),
    extractFunction("isMyGpuProcess"),
    extractFunction("computeGpuOwnerState"),
    "this.normalize = normalizeGpuOwnerConfig;",
    "this.matches = isMyGpuProcess;",
    "this.ownerState = computeGpuOwnerState;",
  ].join("\n"), sandbox);
  return sandbox;
}

test("GPU owner normalization derives reusable matching candidates once", () => {
  const sandbox = loadOwnerMatching();
  const config = sandbox.normalize({
    currentUser: " alice ",
    currentUserAliases: [" bob ", "", null],
    myCommandKeywords: [" train.py ", " experiments/demo "],
    myProcessMatchMode: "invalid",
    localUserHint: " local-alice ",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(config)), {
    currentUser: "alice",
    currentUserAliases: ["bob"],
    myProcessMatchMode: "both",
    myCommandKeywords: ["train.py", "experiments/demo"],
    userCandidates: ["alice", "bob"],
    commandKeywords: ["train.py", "experiments/demo"],
    localUserHint: "local-alice",
    hasUserRule: true,
    hasKeywordRule: true,
  });
  assert.strictEqual(config.commandKeywords, config.myCommandKeywords);
  assert.equal(sandbox.stringArrayCalls, 2);
});

test("GPU process matching preserves username, command and combined modes", () => {
  const sandbox = loadOwnerMatching();
  const base = sandbox.normalize({
    currentUser: "alice",
    currentUserAliases: ["bob"],
    myCommandKeywords: ["train.py"],
  });

  assert.equal(sandbox.matches({ username: "bob", command: "python eval.py" }, { ...base, myProcessMatchMode: "username" }), true);
  assert.equal(sandbox.matches({ username: "carol", commandLine: "python train.py" }, { ...base, myProcessMatchMode: "command_contains" }), true);
  assert.equal(sandbox.matches({ owner: "alice", args: "python eval.py" }, base), true);
  assert.equal(sandbox.matches({ user: "carol", cmd: "python eval.py" }, base), false);
  assert.equal(sandbox.matches({ username: "raw-user", command: "python eval.py" }, { currentUser: " raw-user ", myProcessMatchMode: "username" }), true);
  assert.equal(sandbox.stringArrayCalls, 2);
});

test("GPU owner state counts processes in one pass without rebuilding raw rules", () => {
  const sandbox = loadOwnerMatching();
  const config = sandbox.normalize({ currentUser: "alice", myCommandKeywords: ["train.py"] });
  Object.defineProperties(config, {
    currentUser: { get() { throw new Error("raw currentUser must not be read during process matching"); } },
    currentUserAliases: { get() { throw new Error("raw aliases must not be read during process matching"); } },
    myCommandKeywords: { get() { throw new Error("raw keywords must not be read during process matching"); } },
  });

  const state = sandbox.ownerState([
    { username: "alice", command: "python eval.py" },
    { username: "carol", command: "python train.py" },
    { username: "dave", command: "python eval.py" },
  ], config);

  assert.deepEqual(JSON.parse(JSON.stringify(state)), { isMine: true, myCount: 2, otherCount: 1, shared: true });
  assert.equal(sandbox.stringArrayCalls, 2);
  assert.doesNotMatch(extractFunction("computeGpuOwnerState"), /\.filter\s*\(/);
});
