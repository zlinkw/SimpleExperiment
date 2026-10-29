# 0.5.442 试行交付

基于最新试行版 0.5.441（`d17cc3520a544c9b6176d71566355b60a73deac2`）继续开发。权威版保持 SimpleExperiment 0.5.440 / SimpleSFTP 0.2.117，未改 [release-policy.json](release-policy.json)。本次按用户明确要求发布 Prerelease，保持 Latest 不变；后续以最新试行版继续优化，用户实际认可后再转正式。

## 八项修改

1. 同项目、同查询范围的带取消信号请求共享底层读取，取消和进度观察按入口分别管理。
2. 等待其他范围的查询可立即取消；最后一个使用者取消才中止底层读取。自动调用统一处理主动取消；面板显示正常取消回执，保留已有导出。
3. CLI 帮助离线可用；明确 workspace/instance 时复用现有实例解析和实时身份校验，默认窗口失效不阻断明确目标。业务命令仍加载匹配实际运行版本的 CLI，歧义、身份与版本不符继续拒绝。
4. GPU 区域刷新改用已有 GPU 专用入口；全局刷新保留。
5. 结果进度显示 PLAN 声明、Worker 实际产物、内存指标读取数量与本机表格生成阶段；复用原请求，不新增网络查询。
6. 更新页分别显示运行试行版、权威版和正式更新通道，不再将试行版称为“已是最新”或自动转正。
7. 配置说明、AI 接入链接及复制任务绑定当前安装版本的 tag，复制任务包含版本；保留未提供版本的旧帮助函数签名。
8. 切换任务类型即时更新建议文字，不重绘或覆盖已填指标。

显存预算与 OOM、队列分配、完成事实和原生产物校验模块未改；远端 runtime 生成物仅跟随版本信息更新。没有部署 Worker、运行训练、同步科研文件或清理产物。

## 验证与原始失败保留

- 目标回归通过：结果共享/取消/导出保护 21 用例，CLI 入口 4 用例，任务类型与试行显示 5 用例，版本指南与复制任务 13 用例，手动结果同步 7 用例。
- `npm run package -- --max-parallel 1` 完成 318 个规定作业：317 通过，`extensionUpdates.test.js` 的旧文案断言失败，原退出码为 1。日志与失败收据原样保留在 `simple_cluster/reports/test-workflow/2026-10-29T18-43-14-685Z-40176-package/`。
- 仅修正该测试对旧“已是最新”文案的要求，保留更新判定、安装按钮和重载保护断言。单跑 `node --test --test-force-exit --test-timeout 20000 test/features/extensionUpdates.test.js` 的 7 用例全部通过，退出码 0；日志为 `simple_cluster/reports/test-workflow/extensionUpdates-recheck-0.5.442.log`。
- 修正前后的产品源码、脚本、CLI、编译输出及构建配置共 889 个文件指纹完全相同：`49d668862d72380b0e3fba6446083e163deee3a058c3279e367f1d34e3c21f25`。采用完整轮有效覆盖加该文件补跑，不伪称一次全量全绿，不改写失败收据。
- 现有执行器不支持组合收据；核实原编译门禁通过且产品未变后，显式执行原 post/assemble 命令：生成最小 README、原计划压缩入口、`verify:package-runtime`、锁定版本 vsce 的相同 package 参数。组合记录在 `simple_cluster/reports/test-workflow/trial-0.5.442-combined-coverage.json`，上述本机报告不入仓和 VSIX。
- 编译及三个实际渲染脚本的 `vm.Script` 校验通过。运行闭包验证为 311 个模块、2 个入口。实际包的 manifest 检查为 361 条目，泄漏、缺失运行文件与 README 违规均为 0。

## 精确包身份

资产：`simple-experiment-0.5.442.vsix`，2,763,613 字节，平台 universal，engine `^1.100.0`。

SHA256：`d6f287b8a7a3b7d1bbb032855c53cbbc08474ed0dbef298322a89f94b1a9e4d9`。

试行发行：[v0.5.442](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.442)。发布核实须逐包比较远端与本机字节，并以真实更新客户端确认正式通道仍为 0.5.440、不向试行版发起降级。安装复用同一个包，每版本一次；用户重载后再核实活动面板，自动测试不代替现场使用反馈。
