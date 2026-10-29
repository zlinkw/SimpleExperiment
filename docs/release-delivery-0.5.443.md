# 0.5.443 试行交付

基于最新试行版 0.5.442（`048043eeaf16062133a919a1a5127e4afb83f912`）修复用户批准的六项问题。独立分支 `codex/trial-recovery-20261030`。权威版固定 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117；未修改 [版本策略](release-policy.json)，不提升正式 Latest。

## 六项修改及边界

1. 当前 Plan 的“更新结果总表”恢复整批实时核实与本机实际导出，标题明确会包含其他 Plan；明确指定 planFiles 的局部 API 查询继续只读，不覆盖整批表格。
2. 无响应的旧只读能力查询取消后释放共享查询；迟到响应不得读入指标或覆盖新结果。保留其他读者的共享请求和最终写入真实回执，不抢跑写入。
3. CLI 枚举安装版本先读元数据，只核实实际选中的入口；残缺的无关旧版本不阻断帮助和工作区路由。实际运行版本缺文件仍失败，不换其他版本执行。
4. CLI 实例核实支持取消、标准错误进度及 30 秒总等待上限。仍核实全部候选，不将未核实候选当作不可达后猜测唯一目标；原枚举、握手预算、工作区和身份校验保留。
5. 结果查询显示慢 Worker、读取阶段、当前尝试次数、等待秒数及单次请求预算。显示计时器仅更新本机文字，不增网络请求；保留全部启用 Worker 的实际产物查询与原重试预算。
6. PLAN 声明进度区分已处理、已核实和待核实，失败不计作通过。

显存保护、OOM 预算、派发队列、已确认完成事实和原生产物校验模块未改；生成的远端 Python 仅版本常量变化。低流量仍严格手动刷新。未部署 Worker、运行科研任务、同步研究文件或清理产物。README 与完整使用说明已更新。

## 验证

- 目标回归分别单文件顺序运行，参数均为 `node --test --test-force-exit --test-timeout 20000`：`freshResultHost.test.js` 23、`simpleCliStableEntry.test.js` 5、`localApi.test.js` 33、`manualOnlyResultSync.test.js` 8、`remoteResultInspectionWorkflow.test.js` 14 用例通过，退出码 0。新增的是取消、截止、完整核实与导出正确性检查，无吞吐压测或耗时达标断言。
- 首两次 compile 因新增只读等待使覆盖表类型推断为 unknown 而退出 2；补充精确类型后 `npm run compile -- --max-parallel 1` 通过。原失败日志保留于 `simple_cluster/reports/test-workflow/2026-10-29T19-37-46-286Z-88400-compile/` 与 `2026-10-29T19-38-36-203Z-91740-compile/`；通过记录为 `2026-10-29T19-38-48-780Z-28924-compile/`。
- 最终 `npm run package -- --max-parallel 1` 退出 0，318 个规定作业全部通过；最大同时执行作业为 1，未跳过按需旧组。完整原始日志、输入与结束指纹及真实退出码在 `simple_cluster/reports/test-workflow/2026-10-29T19-39-26-711Z-31704-package/run.json` 及同目录。总计 696515 毫秒，完整检查 684718 毫秒。编译复用同输入缓存，发包阶段未无条件重编译。
- `vm.Script` 对编译入口及实际渲染的 3 段面板脚本检查通过。
- `npm run verify:package-runtime` 通过，311 个模块、2 个入口。
- `node scripts/verify-vsix-manifest.js --vsix simple-experiment-0.5.443.vsix` 通过，实际包 361 项；泄漏、缺失运行资源及 README 违规均为 0。
- `git diff --check` 通过。权威策略原样保留；科研服务器现场和重载后的面板不作为本轮已验收。

## 精确包与发行

资产 `simple-experiment-0.5.443.vsix`，2764971 字节，universal，扩展 `simple-local.simple-experiment`，engine `^1.100.0`。

SHA256：`7d65d4d3f483fb4df0b91e6a56416ba8e2eebac50ef7bd7522f23a61327527e1`。

试行地址：[v0.5.443](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.443)。发布使用 `--prerelease --latest=false`，绑定本次经验证源码提交，并同时上传精确文件名 SHA256。发布后须重新下载比较字节、用真实更新客户端核实正式 Latest 仍为 0.5.440、SimpleSFTP 为 0.2.117，且试行不被自动降级；任何失败必须单独报告，不能以本文件代替真实验收。

安装只复用该精确包一次，不 force、不降级；安装后核对扩展版本及 simpleex 入口，然后等待用户 Developer: Reload Window。用户现场认可后再决定提升权威版。
