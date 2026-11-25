const test = require("node:test"), assert = require("node:assert/strict");
require("../_helpers/registerTsRequire");
const { executeEmptyParents } = require("../../src/features/IsolationEmptyParents.ts");

test("independent parent requests report acceptance and uncertainty separately", async () => {
  const node = { id: "worker", kind: "remote", root: "/project" }, entered = [];
  let finish, fail;
  const ports = { sftp: async (_method, { token }) => {
    entered.push(token);
    return new Promise((resolve, reject) => { if (token === "a") finish = resolve; else fail = reject; });
  } };
  const pending = executeEmptyParents(ports, ["a", "b"].map(token => ({ token, digest: "d", operationId: "op-" + token, node, confirmations: 2 })));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(entered, ["a", "b"]);
  finish({ state: "accepted", token: "a", operationId: "op-a" }); fail(Error("connection lost"));
  const results = await pending;
  assert.equal(results[0].state, "accepted"); assert.equal(results[1].state, "unknown");
  assert.match(results[1].error, /connection lost/);
});

test("a completed response without its operation receipt stays unknown", async () => {
  const node = { id: "worker", kind: "remote", root: "/project" };
  const ports = { sftp: async () => ({ state: "completed" }) };
  const [result] = await executeEmptyParents(ports, [{ token: "a", digest: "d", operationId: "op", node, confirmations: 2 }]);
  assert.equal(result.state, "unknown");
  ports.sftp = async () => ({ state: "completed", receipt: { phase: "completed", action: "prune-isolation-parents", operationId: "other" } });
  assert.equal((await executeEmptyParents(ports, [{ token: "a", digest: "d", operationId: "op", node, confirmations: 2 }]))[0].state, "unknown");
  ports.sftp = async () => ({ state: "completed", receipt: { phase: "completed", action: "prune-isolation-parents", operationId: "op" } });
  assert.equal((await executeEmptyParents(ports, [{ token: "a", digest: "d", operationId: "op", node, confirmations: 2 }]))[0].state, "completed");
});
