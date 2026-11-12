import * as fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { runGitBinary, parseLsTreeZ, type HeadBindingRunner } from "./BranchHeadBinding";

type FileCall = (method: string, params: Record<string, any>) => Promise<any>;
export interface GitOverwritePreview {
  root: string; branch: string; head: string; upstream: string; target: string;
  index: string; status: string; writes: string[]; deletes: string[]; indexChanges: string[]; identities: Record<string, string>; cleanup?: any;
}
async function git(root: string, args: string[], run: HeadBindingRunner): Promise<string> {
  const result = await run(args, root);
  if (result.code !== 0) throw Error(`GIT_OVERWRITE_FAILED: ${args[0]}: ${result.stderr}`);
  return result.stdout.toString("utf8");
}
async function filePath(root: string, relative: string): Promise<string> {
  if (!relative || relative.includes("\\") || relative.split("/").some(part => !part || part === "." || part === ".." || part.toLowerCase() === ".git"))
    throw Error("GIT_OVERWRITE_UNSAFE_PATH: " + relative);
  if (process.platform === "win32" && relative.split("/").some(part => /[<>:"|?*\x00-\x1f]/.test(part)
      || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:[.]|$)/i.test(part)))
    throw Error("GIT_OVERWRITE_UNSAFE_PATH: " + relative);
  const absolute = path.resolve(root, relative), inside = path.relative(root, absolute);
  if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) throw Error("GIT_OVERWRITE_UNSAFE_PATH: " + relative);
  for (let current = absolute; current !== root; current = path.dirname(current)) {
    try {
      const info = await fs.lstat(current);
      if (info.isSymbolicLink() || (current === absolute ? !info.isFile() : !info.isDirectory()))
        throw Error("GIT_OVERWRITE_PATH_COLLISION: " + current);
      const physical = await fs.realpath(current);
      if ((process.platform === "win32" ? physical.toLowerCase() !== current.toLowerCase() : physical !== current))
        throw Error("GIT_OVERWRITE_PATH_LINK: " + current);
    } catch (error: any) { if (error.code !== "ENOENT") throw error; }
  }
  return absolute;
}
async function fileIdentity(absolute: string): Promise<string> {
  try {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(absolute)) hash.update(chunk);
    return hash.digest("hex");
  }
  catch (error: any) { if (error.code === "ENOENT") return "missing"; throw error; }
}
async function snapshot(root: string, run: HeadBindingRunner) {
  const read = (args: string[]) => git(root, args, run);
  const [branch, head, upstream, target, index, status] = await Promise.all([
    read(["symbolic-ref", "--quiet", "HEAD"]), read(["rev-parse", "HEAD"]),
    read(["rev-parse", "--symbolic-full-name", "@{upstream}"]), read(["rev-parse", "@{upstream}^{commit}"]),
    read(["ls-files", "--stage", "-z"]), read(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
  ]);
  return { branch: branch.trim(), head: head.trim(), upstream: upstream.trim(), target: target.trim(), index, status };
}
export async function previewGitOverwrite(root: string, call: FileCall, run = runGitBinary): Promise<GitOverwritePreview> {
  root = await fs.realpath(root);
  const actual = (await git(root, ["rev-parse", "--show-toplevel"], run)).trim();
  if (await fs.realpath(actual) !== root) throw Error("GIT_OVERWRITE_ROOT_MISMATCH");
  await git(root, ["fetch", "--all", "--prune"], run);
  const state = await snapshot(root, run);
  const tree = parseLsTreeZ(await git(root, ["ls-tree", "-r", "-z", "--full-tree", state.target], run));
  if ([...tree.values()].some(row => !["100644", "100755"].includes(row.mode)))
    throw Error("GIT_OVERWRITE_UNSUPPORTED_ENTRY: 请先手动处理符号链接或子模块，不会覆盖工作区。");
  if (process.platform === "win32" && new Set([...tree.keys()].map(file => file.toLowerCase())).size !== tree.size)
    throw Error("GIT_OVERWRITE_PATH_COLLISION: 目标提交包含 Windows 无法区分的大小写路径。");
  const changed = (await git(root, ["diff", "--no-ext-diff", "--no-textconv", "--no-renames", "--name-only", "-z", state.target, "--"], run)).split("\0").filter(Boolean);
  const untracked = (await git(root, ["ls-files", "--others", "--exclude-standard", "-z"], run)).split("\0").filter(Boolean);
  const writes = changed.filter(file => tree.has(file));
  const indexChanges = (await git(root, ["diff", "--cached", "--no-ext-diff", "--no-textconv", "--no-renames", "--name-only", "-z", state.target, "--"], run)).split("\0").filter(Boolean);
  const deletes: string[] = [];
  const identities: Record<string, string> = {};
  const fileChanges = new Set([...changed, ...untracked]);
  for (const relative of [...new Set([...fileChanges, ...indexChanges])].sort()) {
    const absolute = await filePath(root, relative);
    identities[relative] = await fileIdentity(absolute);
    if (!fileChanges.has(relative)) continue;
    try { await fs.lstat(absolute); deletes.push(relative); }
    catch (error: any) { if (error.code !== "ENOENT") throw error; }
  }
  const cleanup = deletes.length ? await call("files.cleanup.preview", { node: { id: "local", kind: "local", root }, consumerRoot: root,
    action: "delete", authorizationMode: "confirmed_paths", targets: deletes.map(relativePath => ({ relativePath, type: "file" })) }) : undefined;
  const preview = { root, ...state, writes, deletes, indexChanges, identities, cleanup };
  await assertGitOverwriteCurrent(preview, run);
  return preview;
}
export async function assertGitOverwriteCurrent(preview: GitOverwritePreview, run = runGitBinary): Promise<void> {
  if (await fs.realpath(preview.root) !== preview.root) throw Error("GIT_OVERWRITE_ROOT_CHANGED");
  const current = await snapshot(preview.root, run);
  for (const key of ["branch", "head", "upstream", "target", "index", "status"] as const)
    if (current[key] !== preview[key]) throw Error("GIT_OVERWRITE_CHANGED: " + key);
  for (const [file, identity] of Object.entries(preview.identities))
    if (await fileIdentity(await filePath(preview.root, file)) !== identity) throw Error("GIT_OVERWRITE_CHANGED: " + file);
}
export async function executeGitOverwrite(preview: GitOverwritePreview, call: FileCall, run = runGitBinary): Promise<void> {
  await assertGitOverwriteCurrent(preview, run);
  if (preview.cleanup) {
    const current = await call("files.cleanup.status", { token: preview.cleanup.token, consumerRoot: preview.root });
    if (current.digest !== preview.cleanup.digest || current.confirmations !== 2) throw Error("CONFIRM_REQUIRED");
    await call("files.cleanup.execute", { token: current.token, digest: current.digest, index: 0, consumerRoot: preview.root });
    for (const relative of preview.deletes) {
      try { await fs.lstat(path.join(preview.root, relative)); }
      catch (error: any) { if (error.code === "ENOENT") continue; throw error; }
      throw Error("GIT_OVERWRITE_DELETE_UNCONFIRMED: " + relative);
    }
  }
  // read-tree changes only Git's index; checkout-index writes the reviewed files.
  // All removals use the existing exact-path, parent-verified cleanup engine.
  await git(preview.root, ["read-tree", preview.target], run);
  if (preview.writes.length) {
    const written = await run(["checkout-index", "--force", "-z", "--stdin"], preview.root, preview.writes.join("\0") + "\0");
    if (written.code !== 0) throw Error("GIT_OVERWRITE_WRITE_FAILED: " + written.stderr);
  }
  await git(preview.root, ["diff", "--quiet", "--no-ext-diff", preview.target, "--"], run);
  await git(preview.root, ["update-ref", preview.branch, preview.target, preview.head], run);
}
