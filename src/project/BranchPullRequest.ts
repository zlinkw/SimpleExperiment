/**
 * src/project/BranchPullRequest.ts - 块C4/C5：科研仓 PR 预览/创建与合并后祖先快进（gh/git 执行器注入）。
 *
 * 契约（主控 2026-10-25 批准的 C4/C5 指导）：
 * - 目标必须来自登记祖先“真实 origin”的规范化结果（host/owner/repo），凭证一律剥离，任何输出
 *   只含无凭证 displayUrl；漂移（登记 remoteUrl 与当前实际 remote 规范化后不等）即停，不猜测。
 * - 创建前 preview → 调用方 modal 确认 → 写前复核（identity/remote/PR 列表重查，digest 一致才写）。
 * - 写操作先记 attempt 收据再执行；结果未知（超时/传输错/无法证实的退出）的收据永不自动重放：
 *   下一次必须先只读对账（ls-remote / gh pr list），只有对账能确定动作时才继续，且仍写新收据。
 * - push 只允许普通快推 refs/heads/<b>:refs/heads/<b>，绝不 force；已存在 PR 仅在
 *   headRefOid===源SHA 且 baseRefName===目标分支 时按身份复用，不重复创建。
 * - 合并只允许 gh pr merge --merge --match-head-commit=<已验SHA>；无 admin、无 force；
 *   命令退出码不是结论——必须 gh pr view 重查 state===MERGED 且有 mergeCommit 才算合并成功。
 * - 祖先 ff 仅在真实 MERGED 之后：干净、就在目标分支的登记根，fetch 精确 origin 目标分支，
 *   merge --ff-only；脏/分叉即停。合并后由调用方标注“原验证来自候选SHA”。
 * - 本开发轮次不对任何真实科研仓 push/PR/merge：测试全部经注入执行器（Windows 临时 Git 仓 + gh stub）。
 */
import { spawn } from "node:child_process";
import { sanitizeGitEnv } from "./GitIdentityProbe";

export type PullRequestRunner = (args: string[], cwd: string, stdin?: string) => Promise<{ code: number; stdout: Buffer; stderr: string }>;

const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const GIT_TIMEOUT_MS = 120_000;
const GH_TIMEOUT_MS = 120_000;

/** 真实执行器（git 复用 clean-env 口径；gh 同走无 shell spawn，输出上限/超时失败关闭）。 */
export function makeRunner(binary: "git" | "gh", timeoutMs: number): PullRequestRunner {
  return (args, cwd, stdin) => new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(binary, args, { cwd, env: sanitizeGitEnv(process.env), windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) { reject(error); return; }
    const chunks: Buffer[] = [];
    let bytes = 0; let overflow = false; let stderr = "";
    const timer = setTimeout(() => { overflow = true; try { child.kill("SIGKILL"); } catch { /* 已退出 */ } }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > MAX_OUTPUT_BYTES) { overflow = true; try { child.kill("SIGKILL"); } catch { /* 已退出 */ } } else chunks.push(chunk); });
    child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 8192) stderr += chunk.toString("utf8"); });
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (overflow) reject(new Error(`${binary} 输出超过上限或超时，按未知处理。`));
      else resolve({ code: code ?? -1, stdout: Buffer.concat(chunks), stderr: stderr.slice(0, 600) });
    });
    child.stdin.on("error", () => undefined);
    if (stdin === undefined) child.stdin.end(); else child.stdin.end(stdin);
  });
}
export const runGitPullRequest = makeRunner("git", GIT_TIMEOUT_MS);
export const runGh = makeRunner("gh", GH_TIMEOUT_MS);

/** 无凭证目标：支持 https 与 ssh 常见形态；owner/repo 规则为两段路径（允许多段仓库组）。 */
export function normalizeGithubTarget(rawUrl: string): { host: string; owner: string; repo: string; repoSlug: string; displayUrl: string } | undefined {
  const raw = String(rawUrl || "").trim();
  if (!raw || /[\s\x00-\x1f]/.test(raw)) return undefined;
  let host = ""; let pathPart = "";
  if (/^https?:\/\//i.test(raw)) {
    let url; try { url = new URL(raw); } catch { return undefined; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return undefined;
    host = url.hostname.toLowerCase(); pathPart = url.pathname;
  } else {
    const match = /^(?:ssh:\/\/)?(?:[^@/\s]+@)?([^:/\s]+)[:/](.+)$/i.exec(raw);
    if (!match) return undefined;
    host = match[1].toLowerCase(); pathPart = "/" + match[2];
  }
  const segments = pathPart.split("/").filter(Boolean);
  if (segments.length < 2) return undefined;
  if (segments[segments.length - 1].toLowerCase().endsWith(".git")) segments.pop();
  if (segments.length < 2) return undefined;
  if (segments.some(segment => !/^[A-Za-z0-9._-]+$/.test(segment))) return undefined;
  const repo = segments[segments.length - 1]; const owner = segments[segments.length - 2];
  return { host, owner, repo, repoSlug: segments.join("/"), displayUrl: `https://${host}/${segments.join("/")}` };
}

/** stderr 分类：只有命中已知“写请求确定未执行/被拒”的特征才算 definite-failed，其余非零一律 unknown（保守，不重放）。 */
const DEFINITE_REJECT_PATTERNS = [/\((?:non-fast-forward|fetch first|stale info)\)/i, /rejected/i, /already exists/i, /must be reviewed/i, /could not (?:read from remote repository|find repository|resolve)/i, /invalid argument|unknown flag|unknown argument/i, /protected branch/i, /permission denied \(/i];
export function classifyWriteFailure(stderr: string, exception?: unknown): "definite-failed" | "unknown" {
  if (exception) return "unknown";
  const text = String(stderr || "");
  return DEFINITE_REJECT_PATTERNS.some(pattern => pattern.test(text)) ? "definite-failed" : "unknown";
}

export type PrListRow = { number: number; state?: string; isDraft?: boolean; headRefOid?: string; baseRefOid?: string; baseRefName?: string; url?: string };

/** gh pr list 输出解析：非 JSON/解析失败如实 throw（调用方按未知处理，不猜测列表为空）。 */
export function parsePrList(stdoutText: string): PrListRow[] {
  const parsed = JSON.parse(String(stdoutText || "").trim());
  if (!Array.isArray(parsed)) throw new Error("gh pr list 返回不是数组");
  return parsed.map(row => ({
    number: Number(row?.number), state: row?.state ? String(row.state) : undefined, isDraft: Boolean(row?.isDraft),
    headRefOid: row?.headRefOid ? String(row.headRefOid) : undefined, baseRefOid: row?.baseRefOid ? String(row.baseRefOid) : undefined,
    baseRefName: row?.baseRefName ? String(row.baseRefName) : undefined, url: row?.url ? String(row.url) : undefined,
  })).filter(row => Number.isInteger(row.number) && row.number > 0);
}

export type PrPreview = {
  ok: boolean; reason?: string;
  target?: { host: string; owner: string; repo: string; repoSlug: string; displayUrl: string };
  remoteName?: string; base?: string; branch?: string; sourceSha?: string; baseSha?: string;
  baseState?: "found" | "missing" | "unknown";
  /** 远端该分支当前头（""=远端还没有此分支）：写前复核必须连它一起核对。 */
  branchRemoteSha?: string;
  existing?: { kind: "none" | "reuse" | "updates-existing" | "unknown"; pr?: PrListRow; note: string };
  divergence?: { ahead: number; behind: number } | "unknown";
  digest?: string;
};

/** 只读预览：真实 origin 规范化 → ls-remote 目标分支与分支头 → 本地 ahead/behind（无基线则如实 unknown）→ gh pr list 身份。 */
export async function previewBranchPullRequest(options: {
  git: PullRequestRunner; gh?: PullRequestRunner;
  cwd: string; remoteName: string; registeredRemoteUrl: string; branch: string; base: string; sourceSha: string;
}): Promise<PrPreview> {
  const { git, gh, cwd, remoteName, registeredRemoteUrl, branch, base, sourceSha } = options;
  const fail = (reason: string): PrPreview => ({ ok: false, reason, existing: { kind: "unknown", note: "未查询" } });
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || /^[.-]/.test(branch) || branch.includes("..")) return fail("分支名不符合 Git 引用规则，拒绝任何远端操作。");
  if (!/^[A-Za-z0-9._/-]+$/.test(base) || /^[.-]/.test(base) || base.includes("..")) return fail("目标分支名不符合 Git 引用规则。");
  if (!/^[0-9a-f]{40}$/i.test(String(sourceSha || ""))) return fail("源提交 SHA 无效（需要完整 40 位），未查询远端。");
  const remoteShow = await git(["remote", "get-url", remoteName], cwd);
  if (remoteShow.code !== 0) return fail(`本地不存在远端 ${remoteName}（登记祖先可能已改动 remote），未查询。`);
  const live = normalizeGithubTarget(remoteShow.stdout.toString("utf8"));
  const registered = normalizeGithubTarget(registeredRemoteUrl);
  if (!live) return fail("当前 origin URL 无法规范化为无凭证 https/github 目标（可能含凭证或非 http/ssh 协议），按未知停止。");
  if (registered && live.displayUrl !== registered.displayUrl)
    return fail(`实际 origin（${live.displayUrl}）与登记时（${registered.displayUrl}）不一致——目标漂移，请重新登记祖先后再操作。`);
  const baseQuery = await git(["ls-remote", "--heads", remoteName, base], cwd);
  if (baseQuery.code !== 0) return fail(`目标分支查询失败（${baseQuery.stderr.slice(0, 160) || `exit ${baseQuery.code}`}），按未知停止。`);
  const baseLine = baseQuery.stdout.toString("utf8").split(/\r?\n/).map(line => line.split("\t")).filter(parts => parts[1] === `refs/heads/${base}`)[0];
  const branchQuery = await git(["ls-remote", "--heads", remoteName, branch], cwd);
  if (branchQuery.code !== 0) return fail(`分支头查询失败（${branchQuery.stderr.slice(0, 160) || `exit ${branchQuery.code}`}），按未知停止。`);
  const branchLine = branchQuery.stdout.toString("utf8").split(/\r?\n/).map(line => line.split("\t")).filter(parts => parts[1] === `refs/heads/${branch}`)[0];
  let divergence: PrPreview["divergence"] = "unknown";
  try {
    const counts = await git(["rev-list", "--count", "--left-right", `refs/remotes/${remoteName}/${base}...${sourceSha}`], cwd);
    if (counts.code === 0) {
      const parts = counts.stdout.toString("utf8").trim().split(/\s+/).map(Number);
      if (parts.length === 2 && parts.every(Number.isFinite)) divergence = { behind: parts[0], ahead: parts[1] };
    }
  } catch { /* 保持 unknown */ }
  const preview: PrPreview = {
    ok: true, target: live, remoteName, base, branch, sourceSha: sourceSha.toLowerCase(),
    baseSha: baseLine ? baseLine[0].toLowerCase() : undefined, baseState: baseLine ? "found" : (baseQuery.stdout.toString("utf8").trim() ? "unknown" : "missing"),
    branchRemoteSha: branchLine ? branchLine[0].toLowerCase() : "",
    divergence, existing: { kind: "unknown", note: "未配置 gh，无法确认既有 PR" },
  };
  if (preview.baseState === "missing") preview.existing = { kind: "unknown", note: `目标分支 ${base} 在远端不存在，不能创建 PR` };
  if (!gh || preview.baseState !== "found") { preview.digest = digestPreview(preview); return preview; }
  try {
    const listed = await gh(["pr", "list", "--repo", live.repoSlug, "--state", "open", "--json", "number,state,isDraft,headRefOid,baseRefOid,baseRefName,url", "--limit", "200"], cwd);
    if (listed.code !== 0) { preview.existing = { kind: "unknown", note: `PR 列表查询失败：${(listed.stderr || "").slice(0, 160) || `exit ${listed.code}`}` }; preview.digest = digestPreview(preview); return preview; }
    const rows = parsePrList(listed.stdout.toString("utf8")).filter(row => (row.baseRefName || "").toLowerCase() === base.toLowerCase()
      || (row.headRefOid || "").toLowerCase() === preview.sourceSha!.toLowerCase());
    const exact = rows.find(row => (row.headRefOid || "").toLowerCase() === preview.sourceSha!.toLowerCase()
      && (row.baseRefName || "").toLowerCase() === base.toLowerCase());
    const sameBranch = rows.find(row => (row.baseRefName || "").toLowerCase() === base.toLowerCase());
    preview.existing = exact ? { kind: "reuse", pr: exact, note: `已有 PR #${exact.number} 头提交与源 SHA 一致${exact.isDraft ? "（草稿）" : ""}，复用即可，无需新建` }
      : sameBranch ? { kind: "updates-existing", pr: sameBranch, note: `该分支相对 ${base} 已有 PR #${sameBranch.number}（头 ${String(sameBranch.headRefOid).slice(0, 10)} 与本次源 SHA 不同）——再推送会更新该 PR，需要你明确确认` }
        : { kind: "none", note: branchLine ? `远端已有该分支（${branchLine[0].slice(0, 10)}），但相对 ${base} 没有开放 PR，需要新建` : "远端无该分支、无 PR：将推送分支并新建 PR" };
  } catch (error) {
    preview.existing = { kind: "unknown", note: `PR 列表不可解析，按未知停止：${String((error as Error)?.message || error).slice(0, 160)}` };
  }
  preview.digest = digestPreview(preview);
  return preview;
}

function digestPreview(preview: PrPreview): string {
  return JSON.stringify([preview.target?.displayUrl || "", preview.remoteName, preview.base, preview.branch, preview.sourceSha,
    preview.baseState, preview.baseSha || "", preview.branchRemoteSha || "", preview.existing?.kind, preview.existing?.pr?.number ?? null, String(preview.divergence)]);
}

export type Receipt = { key: string; root: string; branch: string; sourceSha: string; base: string; action: "push" | "pr-create" | "merge"; attemptAt: string; outcome: "ok" | "definite-failed" | "unknown"; detail?: string; prNumber?: number };
export type ReceiptLedger = { load(): Promise<Receipt[]>; save(rows: Receipt[]): Promise<void> };

/** 写前落收据（outcome=unknown），返回收讫句柄；只有执行器确定回传结局时才更新。未知收据由 loadUnknownReceipts 驱动对账，绝不自动重放。
 * 账本读失败＝拒绝任何写入（绝不能因读不到旧收据就当作没有）；settle 读失败则保留原收据不覆盖（保守未知）。 */
async function openReceipt(ledger: ReceiptLedger, fields: Omit<Receipt, "outcome" | "attemptAt">): Promise<{ row: Receipt; settle(outcome: Receipt["outcome"], detail?: string, prNumber?: number): Promise<void> }> {
  const rows = await ledger.load();
  const row: Receipt = { ...fields, attemptAt: new Date().toISOString(), outcome: "unknown" };
  await ledger.save([...rows.filter(item => item.key !== row.key), row]);
  return { row, settle: async (outcome, detail, prNumber) => {
    try {
      const latest = await ledger.load();
      await ledger.save([...latest.filter(item => item.key !== row.key), { ...row, outcome, detail: String(detail || "").slice(0, 400), prNumber }]);
    } catch { /* 保留先前 unknown 收据：宁可多一次人工对账，不制造可重放假象 */ }
  } };
}
export async function loadUnknownReceipts(ledger: ReceiptLedger): Promise<Receipt[]> {
  const rows = await ledger.load();
  return rows.filter(row => row.outcome === "unknown");
}

export type CreateResult = { status: "created" | "reused" | "blocked-unknown" | "failed"; prNumber?: number; url?: string; reason?: string; note?: string };

/**
 * 创建 PR（调用方必须已完成 modal 确认并传入与 preview 一致的 sourceSha/base/digest）。
 * 步骤：写前复核 → 普通 push（如远端缺该 SHA）→ gh pr create → 重查身份。
 * 任何“未知”先落收据并停止；带未知收据的再次调用必须先只读对账，对账确定才继续——不会盲目重发。
 */
export async function createBranchPullRequest(options: {
  git: PullRequestRunner; gh: PullRequestRunner; ledger: ReceiptLedger;
  cwd: string; remoteName: string; registeredRemoteUrl: string; branch: string; base: string; sourceSha: string;
  title: string; body: string; previewDigest: string;
}): Promise<CreateResult> {
  const { git, gh, ledger, cwd, remoteName, branch, base, sourceSha, title, body, previewDigest } = options;
  const key = JSON.stringify([cwd, branch, sourceSha.toLowerCase(), base]);
  let unknowns: Receipt[];
  try { unknowns = (await loadUnknownReceipts(ledger)).filter(row => row.key === key); }
  catch (error) { return { status: "blocked-unknown", reason: `收据账本不可读/已损坏（${String((error as Error)?.message || error).slice(0, 160)}），无法确认是否存在未对账写入，拒绝任何写入。` }; }
  const preview = await previewBranchPullRequest({ git, gh, cwd, remoteName, registeredRemoteUrl: options.registeredRemoteUrl, branch, base, sourceSha });
  if (!preview.ok) return { status: "blocked-unknown", reason: `写前复核未通过：${preview.reason}`, note: unknowns.length ? "存在未对账的写操作收据，未重试任何写入。" : "" };
  if (preview.digest !== previewDigest) return { status: "blocked-unknown", reason: "写前复核与确认时的预览不一致（远端或本地状态已变化），本次未写入任何内容。请重新预览并确认。" };
  if (preview.target === undefined || preview.baseState !== "found") return { status: "blocked-unknown", reason: "目标/基线在写前复核时不可确定，未写入。" };
  if (preview.existing?.kind === "reuse" && preview.existing.pr)
    return { status: "reused", prNumber: preview.existing.pr.number, url: preview.existing.pr.url, note: "按身份复用既有 PR（head SHA 与目标分支一致），未推送、未新建。" };
  const target = preview.target;
  // 只有预览把“既有 PR/远端分支”事实确定为 none/updates-existing 才允许写入；unknown 一律不写（避免重复创建或意外更新他人 PR）。
  if (!["none", "updates-existing"].includes(String(preview.existing?.kind)))
    return { status: "blocked-unknown", reason: `既有 PR/远端状态未能确定（${preview.existing?.note || preview.existing?.kind || "?"}），本次未写入任何内容。${unknowns.length ? "存在未对账写操作收据：只有只读对账能确定动作时才会继续。" : ""}` };
  // 远端分支头已是源 SHA（上次未知写入其实落地了/重复操作）→ 不再推送，只走 PR 步骤。
  const needsPush = (preview.branchRemoteSha || "") !== preview.sourceSha && (preview.existing?.kind === "none" || preview.existing?.kind === "updates-existing");
  if (needsPush) {
    let receipt;
    try { receipt = await openReceipt(ledger, { key, root: cwd, branch, sourceSha: sourceSha.toLowerCase(), base, action: "push" }); }
    catch (error) { return { status: "blocked-unknown", reason: `写入前无法落收据（${String((error as Error)?.message || error).slice(0, 160)}）——没有收据就没有“不重放”保证，本次未写入。` }; }
    let push;
    try { push = await git(["push", remoteName, `refs/heads/${branch}:refs/heads/${branch}`], cwd); }
    catch (error) {
      await receipt.settle("unknown", `push 传输异常：${String((error as Error)?.message || error).slice(0, 200)}`);
      return { status: "blocked-unknown", reason: "推送结果未知（连接中断/超时）。收据已记录，系统不会自动重放；请重新预览对账后再决定。" };
    }
    if (push.code !== 0) {
      const kind = classifyWriteFailure(push.stderr);
      await receipt.settle(kind, push.stderr);
      return kind === "definite-failed"
        ? { status: "failed", reason: `推送被远端确定拒绝：${push.stderr.slice(0, 240)}（未创建 PR）` }
        : { status: "blocked-unknown", reason: `推送退出码 ${push.code} 且无法确定是否已写入远端，按未知停止；收据已记录，不自动重放。` };
    }
    const verify = await git(["ls-remote", "--heads", remoteName, branch], cwd);
    const landed = verify.code === 0 && verify.stdout.toString("utf8").split(/\r?\n/).some(line => { const parts = line.split("\t"); return parts[1] === `refs/heads/${branch}` && parts[0].toLowerCase() === sourceSha.toLowerCase(); });
    if (!landed) { await receipt.settle("unknown", "push exit 0 但远端分支头与源 SHA 不符"); return { status: "blocked-unknown", reason: "推送声称成功但远端分支头与源 SHA 不一致，按未知停止（不重放、不创建 PR）。" }; }
    await receipt.settle("ok", "远端分支头已核等于源 SHA");
  }
  let prReceipt;
  try { prReceipt = await openReceipt(ledger, { key, root: cwd, branch, sourceSha: sourceSha.toLowerCase(), base, action: "pr-create" }); }
  catch (error) { return { status: "blocked-unknown", reason: `创建 PR 前无法落收据（${String((error as Error)?.message || error).slice(0, 160)}），未执行任何写入。` }; }
  let created;
  try { created = await gh(["pr", "create", "--repo", target.repoSlug, "--head", branch, "--base", base, "--title", title, "--body", body, "--json", "number,url,baseRefName,headRefOid"], cwd); }
  catch (error) {
    await prReceipt.settle("unknown", `gh 传输异常：${String((error as Error)?.message || error).slice(0, 200)}`);
    return { status: "blocked-unknown", reason: "创建 PR 结果未知（gh 连接中断/超时）。收据已记录，不自动重放；再次操作将先只读对账。" };
  }
  if (created.code !== 0) {
    const kind = classifyWriteFailure(created.stderr);
    await prReceipt.settle(kind, created.stderr);
    return kind === "definite-failed"
      ? { status: "failed", reason: `gh 确定拒绝创建 PR：${created.stderr.slice(0, 240)}` }
      : { status: "blocked-unknown", reason: `创建 PR 退出码 ${created.code} 无法判定是否已建，按未知停止（不重放）。` };
  }
  let value: { number?: unknown; url?: unknown; baseRefName?: unknown; headRefOid?: unknown } = {};
  try { value = JSON.parse(created.stdout.toString("utf8")); } catch { /* 下面按未知 */ }
  const number = Number(value.number);
  const identityOk = Number.isInteger(number) && number > 0 && String(value.baseRefName || "").toLowerCase() === base.toLowerCase()
    && String(value.headRefOid || "").toLowerCase() === sourceSha.toLowerCase() && String(value.url || "").includes(target.repoSlug);
  if (!identityOk) {
    // gh 非 JSON/身份不符：不能确认，也不能确定没建——按未知，并顺手 list 对账一次（只读）。
    const listed = await gh(["pr", "list", "--repo", target.repoSlug, "--state", "open", "--json", "number,state,headRefOid,baseRefOid,baseRefName,url", "--limit", "200"], cwd).catch(() => undefined);
    let found: PrListRow | undefined;
    if (listed && listed.code === 0) { try { found = parsePrList(listed.stdout.toString("utf8")).find(row => (row.headRefOid || "").toLowerCase() === sourceSha.toLowerCase() && (row.baseRefName || "").toLowerCase() === base.toLowerCase()); } catch { /* 未知 */ } }
    if (found) { await prReceipt.settle("ok", "输出不可解析但 list 对账确认已建", found.number); return { status: "reused", prNumber: found.number, url: found.url, note: "gh 输出异常，但只读对账确认 PR 已存在，按身份复用。" }; }
    await prReceipt.settle("unknown", "gh 输出不可解析且对账未见对应 PR");
    return { status: "blocked-unknown", reason: "创建 PR 返回无法核验身份且对账未见对应 PR，按未知停止；收据已记录，不自动重放。" };
  }
  await prReceipt.settle("ok", "gh 返回身份与源 SHA/目标分支一致", number);
  return { status: "created", prNumber: number, url: String(value.url) };
}

export type MergeResult = { status: "merged" | "not-merged" | "blocked-unknown"; mergeCommit?: string; state?: string; reason?: string };

/** C5 合并：仅 --merge + --match-head-commit；退出码不作结论，必须重查 MERGED+mergeCommit。 */
export async function mergeBranchPullRequest(options: {
  gh: PullRequestRunner; ledger?: ReceiptLedger; cwd: string; repoSlug: string; prNumber: number; verifiedHeadSha: string;
}): Promise<MergeResult> {
  const { gh, ledger, cwd, repoSlug, prNumber, verifiedHeadSha } = options;
  if (!Number.isInteger(prNumber) || prNumber <= 0) return { status: "blocked-unknown", reason: "PR 编号无效。" };
  if (!/^[0-9a-f]{40}$/i.test(String(verifiedHeadSha || ""))) return { status: "blocked-unknown", reason: "缺少已验候选 SHA，拒绝合并（不允许无 match-head 合并）。" };
  const key = JSON.stringify([repoSlug, prNumber, verifiedHeadSha.toLowerCase(), "merge"]);
  let receipt;
  if (ledger) {
    try { receipt = await openReceipt(ledger, { key, root: cwd, branch: `pr#${prNumber}`, sourceSha: verifiedHeadSha.toLowerCase(), base: "", action: "merge" }); }
    catch (error) { return { status: "blocked-unknown", reason: `合并前无法落收据（${String((error as Error)?.message || error).slice(0, 160)}），未执行合并。` }; }
  }
  let merged;
  try { merged = await gh(["pr", "merge", String(prNumber), "--repo", repoSlug, "--merge", "--match-head-commit", verifiedHeadSha], cwd); }
  catch (error) {
    if (receipt) await receipt.settle("unknown", `merge 传输异常：${String((error as Error)?.message || error).slice(0, 200)}`);
    return { status: "blocked-unknown", reason: "合并指令结果未知（gh 中断/超时）。必须稍后只读重查 PR 状态，不自动重放。" };
  }
  const view = await gh(["pr", "view", String(prNumber), "--repo", repoSlug, "--json", "state,mergedAt,mergeCommit"], cwd).catch(() => undefined);
  let state = ""; let mergeCommit = "";
  if (view && view.code === 0) {
    try {
      const value = JSON.parse(view.stdout.toString("utf8"));
      state = String(value?.state || "");
      mergeCommit = String(value?.mergeCommit?.oid || "");
    } catch { /* 未知 */ }
  }
  if (state === "MERGED" && /^[0-9a-f]{40}$/i.test(mergeCommit)) {
    if (receipt) await receipt.settle("ok", `MERGED mergeCommit=${mergeCommit.slice(0, 12)}`);
    return { status: "merged", mergeCommit, state };
  }
  const kind = merged.code === 0 ? "unknown" : classifyWriteFailure(merged.stderr);
  if (receipt) await receipt.settle(state ? "unknown" : kind, `exit=${merged.code} state=${state || "?"} ${(merged.stderr || "").slice(0, 160)}`);
  return state === "MERGED"
    ? { status: "blocked-unknown", reason: "PR 显示 MERGED 但读不到 mergeCommit，祖先更新暂缓。", state }
    : state && state !== "MERGED" && merged.code === 0
      ? { status: "not-merged", reason: `合并未生效（PR 状态 ${state}）：${(merged.stderr || "").slice(0, 200)}`, state }
      : { status: "blocked-unknown", reason: `合并结果未知（exit ${merged.code}，重查状态${state ? " " + state : "失败"}），不重放。`, state: state || undefined };
}

export type FastForwardResult = { status: "fast-forwarded" | "blocked" | "failed"; from?: string; to?: string; reason?: string };

/** 祖先 ff：仅真实 MERGED 之后；干净、在目标分支的登记根本机快进；脏/分叉/非目标分支一律停，绝不 reset/merge 提交。 */
export async function fastForwardAncestorRoot(options: {
  git: PullRequestRunner; cwd: string; remoteName: string; base: string; expectedMergeCommit: string;
  identity: { branch: string; headCommit: string; dirty: boolean; error?: string };
}): Promise<FastForwardResult> {
  const { git, cwd, remoteName, base, expectedMergeCommit, identity } = options;
  if (identity.error) return { status: "blocked", reason: `Git 身份读取失败：${identity.error}` };
  if (identity.dirty) return { status: "blocked", reason: "祖先工作区不干净，跳过快进（不 stash、不覆盖任何文件）。" };
  if (identity.branch !== base) return { status: "blocked", reason: `祖先当前分支是 ${identity.branch || "(detached)"}，不是目标分支 ${base}，跳过快进。` };
  const fetched = await git(["fetch", remoteName, `+refs/heads/${base}:refs/remotes/${remoteName}/${base}`], cwd);
  if (fetched.code !== 0) return { status: "failed", reason: `fetch ${remoteName}/${base} 失败：${(fetched.stderr || "").slice(0, 200) || `exit ${fetched.code}`}` };
  const remoteHead = await git(["rev-parse", `refs/remotes/${remoteName}/${base}`], cwd);
  const to = remoteHead.code === 0 ? remoteHead.stdout.toString("utf8").trim().toLowerCase() : "";
  if (!/^[0-9a-f]{40}$/.test(to)) return { status: "failed", reason: "读取远端目标分支头失败，未改动本机。" };
  if (to !== expectedMergeCommit.toLowerCase()) return { status: "blocked", reason: `远端 ${base} 当前头（${to.slice(0, 10)}）不是刚确认的合并提交（${expectedMergeCommit.slice(0, 10)}），暂缓快进。` };
  const from = identity.headCommit.toLowerCase();
  if (to === from) return { status: "fast-forwarded", from, to };
  const ff = await git(["merge", "--ff-only", `refs/remotes/${remoteName}/${base}`], cwd);
  if (ff.code !== 0) return { status: "blocked", reason: `不能快进（本机 ${from.slice(0, 10)} 与远端 ${to.slice(0, 10)} 已分叉或历史不满足 ff-only）：${(ff.stderr || ff.stdout.toString("utf8") || "").slice(0, 240)}。未做任何合并提交/reset。` };
  return { status: "fast-forwarded", from, to };
}
