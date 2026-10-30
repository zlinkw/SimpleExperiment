# 0.5.445 试行交付

基于已核实的最新试行版 0.5.444（`25c4ac4e4bb064dba49104f168afb1ed66239dfb`），在独立分支 `codex/trial-admission-results-20261030` 修复用户确认的四项问题。权威版仍为 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117；[release-policy.json](release-policy.json) 未改。发布为 Prerelease、latest=false，不自动转正。

## 修改范围

1. 剩余 job 批量入服务器队列按审核的 accepted/blocked 子集提交。隔离受阻优先于接受，受阻标记、阶段、原因及操作身份保存到原队列，不能当作用户保留或创建派发身份。只对准入子集重算逐卡配额；全部保留或受阻时不报告已派发。已完成任务不参与本批。
2. CLI 兼容当前结果行结构，按 PLAN、Worker、运行及版本身份、全部维度和来源路径生成稳定行 ID；不同种子、评测协议、Worker 不互相覆盖。使用 API 的完整 summary.results，避免只读取顶层预览。数值指标转换兼容原 Results 导出，seed=0 保留。
3. CLI 默认只调用当前项目 results.list，失败或本轮未知时返回错误，不用本机旧记录、旧 Worker 汇总填充。显式 --history 才读取本机历史，标记 source=history/current=false，并输出未核实提醒。历史入口可离线运行，以本机目录为边界；精确历史结果查看、导出、指标和比较保留。查询失败不覆盖旧导出文件。
4. 手动选择服务器/GPU 时不占全局派发门禁；独立防重选择仍保留。确认后再取得派发门禁、等待原调度轮结束并复核原连接和停止意图。UI 继续传递原任务 commandId，任务变化即拒绝，原有同步、产物审核和精确停止边界保留。

README、配置说明、CLI 帮助及输出字段说明同步更新。低流量仍严格手动刷新；显存预算、OOM/并行准入、已确认完成事实及产物安全模块未改，远端 runtime 仅更新版本常量。未部署远端 Agent/Scheduler，未运行科研任务、传输科研文件或清理产物。原工作目录和旧工作副本保留。

## 验证与实际失败

- 首先单独执行 serverQueueDispatch.test.js，11 用例通过；随后实际 Host 的 manualDispatchHost.test.js 10 用例、CLI simpleCli.test.js 18 用例和 simpleCliStableEntry.test.js 6 用例通过，均采用 `node --test --test-force-exit --test-timeout 20000` 串行执行。
- 首轮 `npm run build` 编译及语法门禁通过，但整体退出 1：268 作业中 267 通过、1 失败。新增 CLI 测试替换 process.stdout.write 时截取到 node:test 的二进制 IPC，导致测试自身 JSON.parse 失败。原始失败保留于 `simple_cluster/reports/test-workflow/2026-10-30T02-54-41-152Z-53976-build/` 的 job-045-simpleCli.test.out.log 与 run.json。只把夹具改为替换 format.writeJson，产品不为此失败修改，完整文件 18 用例随后通过。
- 最终 `npm run package -- --max-parallel 1` 退出 0，318 个规定作业全部通过，按需未运行文件为 0，maxObservedConcurrent=1；重新执行包括前述失败文件在内的完整规定覆盖、build 语法门禁并组装 VSIX。日志、输入和结果见 `simple_cluster/reports/test-workflow/2026-10-30T03-04-52-734Z-71348-package/run.json` 及同目录。总耗时 664532 毫秒，完整检查 653702 毫秒。复用原生增量编译缓存，不调整已有超时、不增加性能压测。
- `npm run verify:package-runtime` 通过：311 模块、2 入口。
- `node scripts/verify-vsix-manifest.js --vsix simple-experiment-0.5.445.vsix` 通过：实际 ZIP 361 项，泄漏、缺失资源与 README 违规均为 0。
- vm.Script 核对编译面板模块及真实渲染的 3 段脚本通过；`git diff --check` 通过。
- 真实科研服务器、用户正在运行的任务和重载后面板不作为本轮已验收，也未以发布或安装替代现场确认。

## 精确包与交付边界

资产 `simple-experiment-0.5.445.vsix`，2768467 字节，universal，扩展 `simple-local.simple-experiment`，engine `^1.100.0`。

SHA256：`cf0b3f6045908091f5213d770e2bcf556cb9d8dd2780185f8cca879b47891d5b`。同名 `.vsix.sha256` 绑定精确文件名。

试行地址：[v0.5.445](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.445)。源码普通 fast-forward 推送并核对本次提交后，发布以上同一 VSIX 与 SHA256；重新读取真实 tag/资产并下载比较字节，通过实际更新客户端确认正式 Latest 仍为 0.5.440、SimpleSFTP 仍为 0.2.117，且试行版不会被推送降级。本轮不更换发行源或覆盖历史资产。

全部验证结束后仅安装以上同一包一次，不 force、不降级，核对安装版本与 simpleex 后等待用户 Developer: Reload Window。发行与安装以实际命令和隔离验证回执为准，失败须单独报告；本文件不是尚未执行环节的成功回执。权威版提升仍需用户明确认可。
