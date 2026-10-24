"use strict";
/**
 * r22 重写：acceptance 不再是嵌套重复入口（旧版 build→test→features→package 会把整条 build 链跑 4 遍、
 * 完整输出截断 8000 字符只存 latest）。现在同一清单同一 runner：entry=acceptance =
 * compile + 原全覆盖并集（递归展开、按文件+参数矩阵去重）+ 全部有效非测试门禁（lint/语法/依赖/文档）。
 * 退役的 `node dist/cli.js status` 旧命令不在真实用户实例执行；其原意由隔离契约 test/cli/simpleCli.test.js
 * （project status，隔离 cwd/apiFile）在本清单 fullCheck 内覆盖。完整 stdout/stderr 逐子项独占日志；
 * simple_cluster/reports/acceptance/latest.{json,md} 仅作摘要并引用完整日志路径（不再截断）。
 * 退出码为 runner 真实聚合退出码（任何必需失败/超时/取消/未知 ⇒ 非零）。
 */
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const result = spawnSync(process.execPath, [path.join(__dirname, "test-workflow.js"), "acceptance", ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit", windowsHide: true });
if (result.error) {
  process.stderr.write(result.error.message + "\n");
  process.exitCode = 1;
} else process.exitCode = result.status === null ? 1 : result.status;
