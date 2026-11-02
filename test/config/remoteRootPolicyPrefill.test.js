const assert = require("node:assert/strict");
const test = require("node:test");

const {
  deriveRemoteRootPolicyPrefill,
  prefillRemoteRootPolicy,
} = require("../../dist/config/RemoteRootPolicyPrefill.js");

test("remote root policy prefill derives allow and deny lists from prior server configuration", () => {
  const value = deriveRemoteRootPolicyPrefill({
    setupConfig: {
      agentProjectDir: "/media/npu/Data/zlk",
      workerTunnels: [
        { agentProjectDir: "/data/qgking/zlk" },
        { agentProjectDir: "/mnt/runtime/zlk_agent/projects" },
        { agentProjectDir: "/srv/simple_agent/projects" },
        { agentProjectDir: "/data/qgking/simple" },
        { agentProjectDir: "/data/../invalid" },
      ],
    },
    serverProfiles: {
      servers: [
        { remotePath: "/data/qgking/zlk/MultiModal" },
        { remotePath: "/root/disk1/qgking/zlk/MultiModal" },
      ],
    },
    remoteSshInstallPaths: { nwpu3: "/data/qgking/zlk" },
  }, "MultiModal");

  assert.deepEqual(value.allowedRoots, ["/data/qgking/zlk", "/mnt/runtime/zlk_agent/projects", "/srv/simple_agent/projects", "/data/qgking/simple"]);
  assert.deepEqual(value.deniedRoots, [
    "/root/disk1/qgking/zlk",
  ]);
});

function createPrefillHarness({ setupConfig, allowed, denied, folders = ["D:/GitRepo/MultiModal"] } = {}) {
  const values = new Map([
    ["simpleExperiment.remoteRootPolicyPrefillVersion", 0],
  ]);
  const updates = [];
  const makeConfig = (section) => ({
    get(key) {
      if (section === "remote" && key === "SSH.serverInstallPath") return { nwpu3: "/data/qgking/zlk" };
      return undefined;
    },
    inspect(key) {
      const suffix = key.replace(/^remote\./, "");
      return { globalValue: suffix === "allowedRoots" ? allowed : denied };
    },
    async update(key, value) {
      updates.push({ section, key, value });
    },
  });
  const vscode = {
    workspace: {
      workspaceFolders: folders.map((fsPath) => ({ uri: { fsPath } })),
      getConfiguration(...args) { return makeConfig(args[0] || ""); },
    },
    ConfigurationTarget: { WorkspaceFolder: 3 },
  };
  const context = {
    workspaceState: {
      get: (key, fallback) => (values.has(key) ? values.get(key) : fallback),
      update: async (key, value) => { values.set(key, value); },
    },
  };
  return { context, vscode, values, updates };
}

test("prefill writes only unset policy arrays from saved roots", async () => {
  const setupConfig = {
    agentProjectDir: "/media/npu/Data/zlk",
    workerTunnels: [{ agentProjectDir: "/data/qgking/zlk" }],
  };
  const first = createPrefillHarness({ setupConfig, allowed: undefined, denied: undefined });
  const value = await prefillRemoteRootPolicy(first.context, setupConfig, first.vscode, {
    readServerProfiles: () => ({ servers: [{ remotePath: "/data/qgking/zlk/MultiModal" }] }),
  });

  assert.deepEqual(value.allowedRoots, ["/data/qgking/zlk"]);
  assert.deepEqual(value.deniedRoots, []);
  assert.deepEqual(first.updates, [
    { section: "simpleExperiment", key: "remote.allowedRoots", value: value.allowedRoots },
  ]);
  assert.equal(first.values.get("simpleExperiment.remoteRootPolicyPrefillVersion"), 1);

  const second = createPrefillHarness({ setupConfig, allowed: undefined, denied: undefined });
  second.values.set("simpleExperiment.remoteRootPolicyPrefillVersion", 1);
  assert.equal(await prefillRemoteRootPolicy(second.context, setupConfig, second.vscode, {
    readServerProfiles: () => ({}),
  }), undefined);
  assert.deepEqual(second.updates, []);
  const onlyDenied = createPrefillHarness({ setupConfig, allowed: undefined, denied: ["/data/qgking/simple"] });
  await prefillRemoteRootPolicy(onlyDenied.context, setupConfig, onlyDenied.vscode, { readServerProfiles: () => ({}) });
  assert.deepEqual(onlyDenied.updates, [{ section: "simpleExperiment", key: "remote.allowedRoots", value: ["/data/qgking/zlk"] }]);
  const onlyAllowed = createPrefillHarness({ setupConfig, allowed: ["/custom/simple"], denied: undefined });
  await prefillRemoteRootPolicy(onlyAllowed.context, setupConfig, onlyAllowed.vscode, {
    readServerProfiles: () => ({ servers: [{ remotePath: "/root/unsafe/MultiModal" }] }),
  });
  assert.deepEqual(onlyAllowed.updates, [{ section: "simpleExperiment", key: "remote.deniedRoots", value: ["/root/unsafe"] }]);
});

test("prefill preserves explicit user decisions for either array", async () => {
  const setupConfig = { workerTunnels: [{ agentProjectDir: "/data/qgking/zlk" }] };
  const harness = createPrefillHarness({ setupConfig, allowed: ["/only/this"], denied: [] });
  const value = await prefillRemoteRootPolicy(harness.context, setupConfig, harness.vscode, {
    readServerProfiles: () => ({}),
  });

  assert.equal(value, undefined);
  assert.deepEqual(harness.updates, []);
  const none = createPrefillHarness({ folders: [] });
  assert.equal(await prefillRemoteRootPolicy(none.context, setupConfig, none.vscode, { readServerProfiles: () => ({}) }), undefined);
  assert.deepEqual(none.updates, []);
});
