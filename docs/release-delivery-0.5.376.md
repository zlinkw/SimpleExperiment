# 0.5.376 文件变更后的自动增量核实

0.5.375 仅移除了固定时间的过期计时器，遗漏了真实变更通知仍将页面停在“索引已过期，请刷新”的分支。现场共享索引诊断文件记录本机及 Worker 同时收到“同步范围或删除保留版本发生变化，需重新核实”。该入口即使保留记录完全相同，也会提前使所有观察失效。

本版将文件变更后的状态转为等待增量核实，并合并 200 ms 内的多个节点通知，自动开启新轮次，沿用本机及服务器既有增量基线。操作期间等待原流程完成，取消操作后恢复核实；未激活模式切换时再读。同步保留记录仅在内容实际变化且写入成功后按路径通知，空修改不写盘、不广播。旧缺失立即转未知，迟到回包被拒绝，查询失败不会冒充缺失；不以改文案替代主动查询，不自动重放同步或删除。

回归使用真实 Webview 脚本复现完成后收到多个失效通知却不发新查询；另复现空保留记录修改也触发失效。新增完整 watcher → host 消息桥 → Webview → 真实增量文件系统读取链路，在隔离目录将测试文件移入排除区模拟路径消失，验证自动收敛到确认缺失，断线为未知，恢复后完成。未删除用户文件，未执行新的永久删除。PLAN、产物主动校验和已有删除安全流程未放宽。

npm run package 退出 0，串行 build 与 Windows flow 共 996 项检查通过，失败 0；新增回归先复现失败，再通过修复。npm run lint、git diff --check、UTF-8 严格读取、中文内容和禁止端口检查通过，PanelHtml vm.Script 无异常。包身份、平台、engine、384 个 dist 文件的字节一致性、262 模块/2 入口闭包及秘密/机器状态排除核验通过。

冻结包 simple-experiment-0.5.376.vsix 为 3191355 字节，SHA256 dd0f73e8fb99717b74c90a4286c979f87b07509789b70b85b2edf49d3dd51d27，包含精确文件名绑定的 .vsix.sha256。验收记录、完整日志及冻结字节位于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0376-acceptance-20261018。配套仍使用既有 SimpleSFTP 0.2.97。

源码提交 805ec4a2c806e7de063472d9376872eae3a7246a 已普通 fast-forward 推送 origin/master，fetch 核对一致。[稳定 v0.5.376](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.376) 的 tag 和 targetCommitish 均绑定该提交，draft=false、prerelease=false。真实 0.5.375 ReleaseClient 识别更新并从 Latest 下载主包和配套包及各自 SHA256 清单，大小、身份、平台、精确文件名及字节摘要均与冻结包一致。主包指纹见上；配套 SimpleSFTP 0.2.97 未改变，未重复安装。

显式执行一次 npm run install:latest，0.5.376 安装成功，无 force、无降级；核对 VS Code 已安装版本、384 个 dist 文件、simpleex.cmd 以及 simpleex --help，均通过。安装后停止操作当前 SimpleExperiment API 和面板，等待用户 Developer: Reload Window 后进行真实窗口验收。本轮未部署或重启远端 Agent，未启动科研作业。本记录验收信息于打包后补充，不改变冻结包；真实窗口验收不能用隔离消息桥回归冒充。
