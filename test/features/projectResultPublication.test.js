const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { assertProjectResultPublicationBaseGeneration, publishProjectResultFiles, projectResultPublicationJournalPath, recoverProjectResultPublication } = require("../../dist/results/ProjectResultPublication");

const resultDirectory = "experiments/results";
const tablePath = resultDirectory + "/set/final/final.csv";
const registryPath = "simple_cluster/results/project_table_registry.json";
const hash = text => crypto.createHash("sha256").update(text, "utf8").digest("hex");

async function workspace(t) {
  const root = fsSync.mkdtempSync(path.join(os.tmpdir(), "simple-result-publication-"));
  t.after(() => fsSync.rmSync(root, { recursive: true, force: true }));
  return root;
}

async function write(root, relative, text) {
  const full = path.join(root, ...relative.split("/"));
  fsSync.mkdirSync(path.dirname(full), { recursive: true });
  fsSync.writeFileSync(full, text, "utf8");
}

test("multi-file publication rolls back all targets after a rename failure", async t => {
  const root = await workspace(t);
  await write(root, tablePath, "old-table");
  await write(root, registryPath, "old-registry");
  const id = crypto.randomUUID();
  const nextRegistry = JSON.stringify({ schemaVersion: 1, publicationGeneration: id, plans: {} });
  let targetRenames = 0;
  const rename = async (from, to) => {
    if (!String(from).includes("project_table_publication.json.tmp-")) {
      targetRenames++;
      if (targetRenames === 2) throw new Error("injected publish rename failure");
    }
    return fs.rename(from, to);
  };
  await assert.rejects(publishProjectResultFiles(root, resultDirectory, [
    { relativePath: tablePath, contents: "new-table" },
    { relativePath: registryPath, contents: nextRegistry },
  ], { rename, generationId: id }), /injected publish rename failure/);
  assert.equal(fsSync.readFileSync(path.join(root, ...tablePath.split("/")), "utf8"), "old-table");
  assert.equal(fsSync.readFileSync(path.join(root, ...registryPath.split("/")), "utf8"), "old-registry");
  assert.equal(fsSync.existsSync(projectResultPublicationJournalPath(root)), false);
  assert.equal(fsSync.existsSync(path.join(root, "simple_cluster", "tmp", "result_publication")), false);
});

test("recovery completes a prepared generation before readers consume its registry", async t => {
  const root = await workspace(t);
  await write(root, tablePath, "old-table");
  await write(root, registryPath, "old-registry");
  const id = crypto.randomUUID();
  const stageRoot = `simple_cluster/tmp/result_publication/${id}`;
  const nextRegistry = JSON.stringify({ schemaVersion: 1, publicationGeneration: id, plans: {} });
  const rows = [
    { target: tablePath, contents: "new-table" },
    { target: registryPath, contents: nextRegistry },
  ];
  const entries = [];
  for (const [index, row] of rows.entries()) {
    const staged = `${stageRoot}/${index}.new`;
    const backup = `${stageRoot}/${index}.old`;
    await write(root, staged, row.contents);
    await write(root, backup, row.target === tablePath ? "old-table" : "old-registry");
    entries.push({ target: row.target, staged, backup, hadPrevious: true, nextHash: hash(row.contents), previousHash: hash(row.target === tablePath ? "old-table" : "old-registry") });
  }
  await fs.rename(path.join(root, ...entries[0].staged.split("/")), path.join(root, ...entries[0].target.split("/")));
  await write(root, "simple_cluster/results/project_table_publication.json", JSON.stringify({ schemaVersion: 1, id, resultDirectory, status: "publishing", entries }));
  assert.equal(await recoverProjectResultPublication(root, resultDirectory), "recovered");
  assert.equal(fsSync.readFileSync(path.join(root, ...tablePath.split("/")), "utf8"), "new-table");
  assert.equal(fsSync.readFileSync(path.join(root, ...registryPath.split("/")), "utf8"), nextRegistry);
  assert.equal(fsSync.existsSync(projectResultPublicationJournalPath(root)), false);
});

test("recovery rejects transaction targets outside the configured result directory", async t => {
  const root = await workspace(t);
  const id = crypto.randomUUID();
  await write(root, "simple_cluster/results/project_table_publication.json", JSON.stringify({ schemaVersion: 1, id, resultDirectory, status: "preparing", entries: [
    { target: "src/extension.ts", staged: `simple_cluster/tmp/result_publication/${id}/0.new`, backup: `simple_cluster/tmp/result_publication/${id}/0.old`, hadPrevious: false, nextHash: hash("x") },
  ] }));
  await assert.rejects(recoverProjectResultPublication(root, resultDirectory), /目录外目标/);
});

test("a stale result registry generation cannot overwrite a newer publication", async t => {
  const root = await workspace(t);
  await write(root, registryPath, JSON.stringify({ schemaVersion: 1, publicationGeneration: "new-generation", plans: {} }));
  await assert.rejects(assertProjectResultPublicationBaseGeneration(root, "old-generation"), error => error.code === "RESULT_REGISTRY_CONFLICT");
  await assert.doesNotReject(assertProjectResultPublicationBaseGeneration(root, "new-generation"));
});

test("same-process publications serialize and the registry remains the last generation marker", async t => {
  const root = await workspace(t);
  const firstId = crypto.randomUUID();
  const secondId = crypto.randomUUID();
  const first = publishProjectResultFiles(root, resultDirectory, [
    { relativePath: tablePath, contents: "first-table" },
    { relativePath: registryPath, contents: JSON.stringify({ schemaVersion: 1, publicationGeneration: firstId, plans: {} }) },
  ], { generationId: firstId });
  const second = publishProjectResultFiles(root, resultDirectory, [
    { relativePath: tablePath, contents: "second-table" },
    { relativePath: registryPath, contents: JSON.stringify({ schemaVersion: 1, publicationGeneration: secondId, plans: {} }) },
  ], { generationId: secondId });
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.generationId, firstId);
  assert.equal(secondResult.generationId, secondId);
  assert.equal(fsSync.readFileSync(path.join(root, ...tablePath.split("/")), "utf8"), "second-table");
  assert.equal(JSON.parse(fsSync.readFileSync(path.join(root, ...registryPath.split("/")), "utf8")).publicationGeneration, secondId);
  assert.equal(fsSync.existsSync(projectResultPublicationJournalPath(root)), false);
  await assert.rejects(publishProjectResultFiles(root, resultDirectory, [
    { relativePath: registryPath, contents: "invalid-order" },
    { relativePath: tablePath, contents: "invalid-order" },
  ]), /必须是最后提交/);
});

test("recovery refuses journal staging paths that are not owned by that transaction", async t => {
  const root = await workspace(t);
  await write(root, "simple_cluster/results/project_table_publication.json", JSON.stringify({ schemaVersion: 1, id: crypto.randomUUID(), resultDirectory, status: "preparing", entries: [
    { target: tablePath, staged: "simple_cluster/results/project_table_registry.json", backup: "simple_cluster/results/other.json", hadPrevious: false, nextHash: hash("x") },
  ] }));
  await assert.rejects(recoverProjectResultPublication(root, resultDirectory), /暂存路径不属于当前事务/);
});
