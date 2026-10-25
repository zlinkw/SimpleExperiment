// r6 必须项1 + r7 平台分离 + **r9 平台归属闭合**：r9 裁定本文件连同全部断言自
// test/features/jobArtifactStagedSlotReceiver.test.js 一对一迁移至 verification/linux/（通用
// test/*.test.js 与 test/**/*.test.js glob 之外），Windows/无 env 的 acceptance 全 glob 不再
// 自动吸收它；Linux 任务最终清单仍显式必跑本真实路径并绑定 receiver SHA/env（旧→新迁移对账
// 记入 evidence §39，非退役/隔离既有覆盖）。**Linux 专属必验项**——现成 staged-tar-receive.py
// 的真实两代 slot 行为（同代跨入口仅一槽；真实内容变化开第二代；第三个真实不同内容代必须
// TRANSFER_STAGE_PENDING 且不落槽）。receiver 依赖 POSIX python3/fcntl，不在 Windows/CI
// 通用闭包执行。
// 资源显式注入（缺注入=硬失败，不 skip、不用假 receiver）：
//   ZLK_SFTP_RECEIVER          已验证的只读 staged-tar-receive.py 路径（本任务取证为
//                              simple-sftp 仓库工作副本；不写死为本测试唯一位置）
//   ZLK_SFTP_RECEIVER_SHA256   该 receiver 源码 SHA256，必须与实际文件一致（绑定本次
//                              已验证内容，7a262d1b…为 2026-10-24 r5/r6 取证版本）
// 解释器经既有 process.env.PYTHON 注入面（同 idleGpuDispatchLifecycle 先例），默认 python3。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
// r9 迁移后 support 仍在 test/features/（与可移植身份套件共享同一夹具，无副本无分叉）。
const { V1, V2, V3, completedJobEntry, dedicatedEntry, receive, slotsOf } = require("../../test/features/jobArtifactStagedSlot.support.cjs");

test("the real staged receiver keeps one slot per run generation across both entry points and refuses a third generation", async () => {
  const receiverPath = process.env.ZLK_SFTP_RECEIVER;
  const expectedSha = process.env.ZLK_SFTP_RECEIVER_SHA256;
  assert.ok(receiverPath, "Linux 专属套件必须经 ZLK_SFTP_RECEIVER 显式注入已验证的 staged-tar-receive.py 路径（缺注入即失败，不跳过）");
  assert.ok(fs.existsSync(receiverPath), `注入的 receiver 路径必须存在且可读：${receiverPath}`);
  assert.match(String(expectedSha || ""), /^[0-9a-f]{64}$/, "必须经 ZLK_SFTP_RECEIVER_SHA256 注入本次已验证的 receiver 源码 SHA256");
  const actualSha = crypto.createHash("sha256").update(fs.readFileSync(receiverPath)).digest("hex");
  assert.equal(actualSha, expectedSha, "receiver 源码 SHA 必须与本次验证绑定一致（内容已变化须重新取证，不静默放行）");
  console.log(`verified receiver: ${receiverPath} sha256=${actualSha}`);
  const entryA = await completedJobEntry(V1).run();
  const entryB = await dedicatedEntry(V1).run();
  const retentionKey = entryA[0].retentionKey;
  assert.equal(entryB[0].retentionKey, retentionKey);
  // identity 按 extension.js stagedLogicalKey 的既有契约推导（scope=retentionKey，lane0；见证据 §35-1）。
  const identity = crypto.createHash("sha256").update(JSON.stringify([retentionKey, 0])).digest("hex");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "job-slot-"));
  const generation1 = entryA[0].generation;
  const first = receive(receiverPath, root, identity, generation1, V1);
  assert.equal(first.status, 0, first.stderr);
  const resumed = receive(receiverPath, root, identity, entryB[0].generation, V1);
  assert.equal(resumed.status, 0, resumed.stderr);
  const held = slotsOf(root, identity);
  assert.equal(held.length, 1, "同一 run 同一清单跨入口（含重试）只占一个代槽");
  assert.equal(held[0].generation, generation1);
  assert.equal(held[0].status, "committed");
  const generation2 = (await completedJobEntry(V2).run())[0].generation;
  const second = receive(receiverPath, root, identity, generation2, V2);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(slotsOf(root, identity).length, 2, "真实内容变化开第二代，两代窗口保留");
  const generation3 = (await dedicatedEntry(V3).run())[0].generation;
  const third = receive(receiverPath, root, identity, generation3, V3);
  assert.notEqual(third.status, 0);
  assert.match(third.stderr, /TRANSFER_STAGE_PENDING/, "第三个真实不同内容代必须被两代门禁拒绝，不自动释放");
  assert.equal(slotsOf(root, identity).length, 2, "被拒绝的第三代不落任何槽");
});
