# 0.5.444 试行交付

基于最新试行版 0.5.443（`776c779ce8e40393ca5b9091c9502605e83fba1b`），修复用户已确认的四项问题。独立分支 `codex/trial-isolation-20261030`；权威版固定 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117，[release-policy.json](release-policy.json) 原样保留。本轮继续 Prerelease，latest=false，不自动转正。

## 修改范围

1. 默认 CLI 在入口选择和实际 RPC 前保留当前目录核对，发现文件转交不再绕过项目隔离。显式 workspace、instance 和发现文件方式保留。
2. 内存指标每批连续 120 秒无有效进展时，以 RESULT_READ_IDLE 结束该 Worker 的本轮读取；同轮不拆成逐 job 重读，可以再次主动查询。真实累计文件数和字节数延长等待，重复进度不延长；迟到响应不能覆盖新结果。整批未知时保留原导出。只改结果只读入口，未修改上传、产物同步或表格写入的完成回执规则。
3. 启动入口向子进程转交不含 token 的精确发现文件、实例 ID、工作区及默认目录核对标记。每次 RPC 继续实时握手、核对窗口和复读发现信息，不再重新枚举其他候选；身份、工作区或绑定变化直接拒绝。未通过启动入口的既有 API 选择方式保留。
4. 原“重建当前 Plan 汇总”改名为“重新核实整批结果”，按钮、帮助和缺失文件提示明确整批范围；旧命令、结果更新和汇总处理路径保留。README 和完整使用说明同步更新。

显存预算、OOM 与并行准入、完成事实及原生产物校验模块未改；远端生成物仅版本常量更新。低流量仍严格手动刷新。未部署远端 Agent，未运行科研任务、传输科研文件或清理产物。配套 SimpleSFTP 0.2.117 的内存下载生产者按整批累计上报文件数和字节数，符合本次只读进度观察接口；配套源码与安装均未更改。

## 验证与原始失败

- `npm run compile -- --max-parallel 1` 通过，记录在 `simple_cluster/reports/test-workflow/2026-10-30T01-38-55-570Z-88736-compile/`。
- 定向单文件检查均按 `node --test --test-force-exit --test-timeout 20000` 顺序执行：CLI 稳定入口 6 用例、结果读取 24 用例、Local API 33 用例、统一 CLI 19 用例、结果检查入口 14 用例、手动结果同步 8 用例通过。没有增加性能压测、耗时达标断言或调整已有测试超时。
- 结果读取新增测试初轮退出 1，23 通过、1 失败：测试从 skipped 字段查找错误说明，但该失败按现有返回契约位于 missing；原始工具会话 57558 保留实际失败及堆栈。仅将该断言改为 missing，产品未为该断言修改；随后完整文件 24 用例通过。后续最终全轮也真实运行该文件，不伪造首次绿灯。
- 最终 `npm run package -- --max-parallel 1` 退出 0，318 个规定作业全部通过，maxObservedConcurrent=1，按需未运行文件为 0。日志及输入、结束、包指纹保存在 `simple_cluster/reports/test-workflow/2026-10-30T01-41-42-826Z-372-package/run.json` 与同目录；总计 690824 毫秒，完整检查 668880 毫秒。编译采用原生增量缓存，发包消费本轮已验证输出。
- `vm.Script` 对编译面板入口和实际渲染的 3 段脚本检查通过，并核实旧误导性按钮及帮助文字已替换。
- `npm run verify:package-runtime` 通过：311 个模块、2 个入口。
- `node scripts/verify-vsix-manifest.js --vsix simple-experiment-0.5.444.vsix` 通过：实际包 361 项，泄漏、缺失运行资源与 README 违规均为 0。
- `git diff --check` 通过。重载后的真实面板、科研服务器和用户现场流程不作为本轮已验收。

## 精确包与发行

资产 `simple-experiment-0.5.444.vsix`，2766085 字节，universal，扩展 `simple-local.simple-experiment`，engine `^1.100.0`。

SHA256：`c2e182b7f8eaa68ed84270504a7961158d5941596a5acb2bc48899907908aac7`。

试行地址：[v0.5.444](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.444)。发布绑定本次验证后的源码提交，上传上述精确 VSIX 和绑定文件名的 SHA256；发布后重新读取 tag、下载比较字节，并通过真实更新客户端核实正式 Latest 仍为 0.5.440、SimpleSFTP 为 0.2.117，且不向试行版推送降级。

本机安装只复用这个包一次，不 force、不降级；安装后核对版本与 simpleex，再等待用户 Developer: Reload Window。发布或安装失败必须单独报告，不能以本文件代替真实操作结果；权威提升仍等待用户认可。
