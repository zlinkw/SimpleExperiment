const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension/legacy.ts");

function method(name) {
  const start = new RegExp(`^\\s*${name}\\(`, "m").exec(source)?.index;
  assert.notEqual(start, undefined, `missing ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1).trim().replace(/\s+as\s+any/g, "");
  }
  throw new Error(`unterminated ${name}`);
}

const sandbox = {
  remoteProjectName: () => "demo",
  normalizeRemoteWorkRoot: (root) => String(root || "").replace(/\/+$/, ""),
  AgentTmuxPolicy_1: {
    ...require("../../dist/tunnel/AgentTmuxPolicy"),
    remoteAgentDirectoryName: require("../../dist/config/RemoteResourcePrefix").remoteAgentDirectoryName,
    defaultAgentTmuxSessionName: (role, id) => `${role}-${id || "hub"}`,
    agentTmuxStartupCommand: ({ installDir }) => `INSTALL_DIR=${installDir}`,
  },
  effectiveWorkerCondaEnv: (worker, hubEnv) => worker.condaEnv || hubEnv,
};
vm.createContext(sandbox);
vm.runInContext(`class Subject {
  ${method("agentRuntimeDirs")}
  ${method("agentStartupTargets")}
  ${method("agentRuntimeDeployTargets")}
  projectTopologyAssessment() { return { hubAllowed: false }; }
  enabledWorkerConfigs() { return this.setupConfig.workerTunnels; }
  assertTopologyReady() { return { hubAllowed: false }; }
  workerActualWorkRootTargets() { return this.setupConfig.workerTunnels.map((worker) => ({ id: worker.id, label: worker.id, remotePath: worker.agentProjectDir, agentInstallDir: worker.agentInstallDir })); }
}
this.Subject = Subject;`, sandbox);

test("worker install directories stay isolated from hub and other worker probes", () => {
  const subject = new sandbox.Subject();
  subject.setupConfig = {
    agentProjectDir: "/hub/root",
    agentInstallDir: "/hub/custom_agent",
    workerTunnels: [
      { id: "nwpu2", savedSessionPath: "2.xsh", agentProjectDir: "/data/nwpu2", agentInstallDir: "/data/nwpu2/custom_agent" },
      { id: "nwpu5", savedSessionPath: "5.xsh", agentProjectDir: "/mnt/nwpu5" },
    ],
  };
  subject.lastProbe = { agentInstallDir: "/wrong/hub_probe" };
  subject.lastWorkerProbes = { nwpu2: { agentInstallDir: "/wrong/worker_probe" } };

  const startup = subject.agentStartupTargets();
  assert.match(startup.find((item) => item.id === "nwpu2").command, /INSTALL_DIR=\/data\/nwpu2\/custom_agent/);
  assert.match(startup.find((item) => item.id === "nwpu5").command, /INSTALL_DIR=\/mnt\/nwpu5\/demo\/simple_agent/);

  const deploy = subject.agentRuntimeDeployTargets();
  assert.equal(deploy.find((item) => item.id === "nwpu2").remotePath, "/data/nwpu2/custom_agent");
  assert.equal(deploy.find((item) => item.id === "nwpu5").remotePath, "/mnt/nwpu5/demo/simple_agent");
});

test("different projects use project-local directories named by the configured global prefix", () => {
  const subject = new sandbox.Subject(); subject.setupConfig = { remoteTmuxSessionPrefix: "alice" };
  assert.equal(subject.agentRuntimeDirs("/srv/projects").installDir, "/srv/projects/demo/alice_agent");
  const projectName = sandbox.remoteProjectName;
  sandbox.remoteProjectName = () => "other";
  try {
    assert.equal(subject.agentRuntimeDirs("/srv/projects").installDir, "/srv/projects/other/alice_agent");
    assert.equal(subject.agentRuntimeDirs("/srv/projects", "/custom/zlk_agent").installDir, "/custom/zlk_agent");
  } finally { sandbox.remoteProjectName = projectName; }
});

test("known project directories are not expanded twice and explicit default-looking paths remain explicit", () => {
  const subject = new sandbox.Subject(); subject.setupConfig = { remoteTmuxSessionPrefix: "alice" };
  assert.equal(subject.agentRuntimeDirs("/srv/projects/remote", "", "/srv/projects/remote").installDir, "/srv/projects/remote/alice_agent");
  assert.equal(subject.agentRuntimeDirs("", "", "/srv/projects/remote").workDir, "/srv/projects/remote");
  const dirs = subject.agentRuntimeDirs("/srv/projects", "/srv/projects/demo/alice_agent");
  assert.equal(dirs.installDir, "/srv/projects/demo/alice_agent");
  assert.equal(dirs.installDirIsExplicit, true);
  assert.equal(subject.agentRuntimeDirs("/srv/projects").installDirIsExplicit, false);
});

test("no open project cannot create a guessed shared Agent startup or deployment target", () => {
  const subject = new sandbox.Subject(); subject.setupConfig = { workerTunnels: [{ id: "one", agentProjectDir: "/srv/projects" }] };
  const projectName = sandbox.remoteProjectName; sandbox.remoteProjectName = () => "";
  try {
    assert.equal(subject.agentRuntimeDirs("/srv/projects").installDir, undefined);
    assert.equal(subject.agentStartupTargets().length, 0);
    assert.throws(() => subject.agentRuntimeDeployTargets(), /缺少本地项目/);
    subject.setupConfig.workerTunnels[0].agentInstallDir = "/explicit/agent";
    assert.equal(subject.agentStartupTargets().length, 0);
    assert.throws(() => subject.agentRuntimeDeployTargets(), /缺少本地项目/);
  } finally { sandbox.remoteProjectName = projectName; }
});

test("real runtime verification checks the exact known project or explicit directory and refuses unresolved paths", async () => {
  const compiled = require("node:fs").readFileSync(require("node:path").join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const start = compiled.indexOf("async verifyDeployedAgentRuntime("), end = compiled.indexOf("async checkRemoteAgentVersionAndNotify(", start);
  assert.ok(start >= 0 && end > start);
  const requests = [], sha = "a".repeat(64);
  const verify = vm.runInNewContext("({" + compiled.slice(start, end) + "}).verifyDeployedAgentRuntime", {
    AbortController, setTimeout, clearTimeout, RuntimeManifest_1: { CURRENT_RUNTIME_VERSION: "v1" },
    tunnelHttpOrigin: (host, port) => `http://${host}:${port}`,
    fetch: async url => { requests.push(url); return { ok: true, json: async () => url.includes("sha256") ? { ok: true, sha256: sha }
      : { agentVersion: "v1", runtimeVersion: "v1", pluginVersion: "v1", schedulerRuntime: { protocol: 1, status: "current", runningVersion: "v1", runtimeFiles: { "cluster_agent.py": sha, "cluster_scheduler.py": sha } } } }; },
  });
  const subject = new sandbox.Subject(); subject.setupConfig = { remoteTmuxSessionPrefix: "alice" }; subject.tunnelConfig = {};
  const target = { label: "worker", remotePath: "/install-hint", projectWorkDir: "/srv/projects/remote", localForwardHost: "configured.example", localForwardPort: 23065 };
  const manifest = { runtimeVersion: "v1", pluginVersion: "v1", files: { "cluster_agent.py": sha, "cluster_scheduler.py": sha } };
  let result = await verify.call(subject, [target], manifest);
  assert.equal(result.fatal.length, 0); assert.equal(result.warnings.length, 0);
  assert.deepEqual(requests.filter(url => url.includes("sha256")).map(url => new URL(url).searchParams.get("path")).sort(),
    ["/srv/projects/remote/alice_agent/simple_cluster/runtime/cluster_agent.py", "/srv/projects/remote/alice_agent/simple_cluster/runtime/cluster_scheduler.py"]);
  requests.length = 0;
  result = await verify.call(subject, [{ ...target, agentInstallDir: "/custom/zlk_agent" }], manifest);
  assert.equal(result.fatal.length, 0);
  assert.ok(requests.filter(url => url.includes("sha256")).every(url => new URL(url).searchParams.get("path").startsWith("/custom/zlk_agent/simple_cluster/runtime/")));
  requests.length = 0;
  result = await verify.call(subject, [{ ...target, projectWorkDir: "", remotePath: "" }], manifest);
  assert.ok(result.fatal.some(message => message.includes("项目目录尚未确定")));
  assert.equal(requests.length, 0);
});
