# 0.5.372 交付记录

## 功能

项目同步范围页面的操作状态移到文件树上方，持续显示本机及每个启用 Worker 的索引进度、已读数、完成、部分未核实或失败状态，以及全部完成数。索引未完成、查询失败、未列出与确认缺失分别显示。页面观察过期、文件变化和迟到回包不能恢复旧的缺失结论。

本机文件树和汇总共用同轮受保护扫描，直接复用扫描时的 stat，移除重复逐文件祖先遍历。目录邻接表加速展开，空目录与不存在分别保留；连续 30 秒无进展结束为未知，允许显式新轮次恢复。Worker 同轮列表和汇总共享进度订阅，两个页面模式分别维护轮次。

新增 globalStorage/file-index 共享索引。根文件保存观察范围、用途、身份、时间、完整性和布局；各层文件只保存直属条目、子目录引用及摘要，避免每层重复整棵子树。实际内容不变则跳过目录文件重写。目录 mtime 或“索引文件最新”仅作提示，不能证明深层文件、删除或保留 mtime 的内容没有变化，远端和本机时钟不直接比较。

SFTP 文件统计、目录、内容清单、删除主动 inspect、PLAN 本机及 Worker 源码核实、本机代码清单共用实际查询记录。查询前先写 reading 并使同范围旧观察失效；上传、下载、Worker 间传输和直接上传命令在操作前按精确范围刷新本机 stat、远端 metadataOnly。未提供范围只读取根目录直属项，不隐式全盘扫描；写入开始及 finally 均使索引失效。映射下载区分远端来源和本机目标。token-only 删除执行保留紧邻的主动 inspect/preview，不从历史索引重建授权；Agent lifecycle 只失效，不增加科研目录扫描。

索引文件不恢复为新进程的当前证据，也不替代实时内容哈希、PLAN 身份、最终 artifact manifest、执行或删除核实。失败索引只能表示未知；已有完成确认不因索引 TTL 或断线被撤销。产物变化按精确路径失效，不以无关 job 的变化拒绝 PLAN 输入检查。

文件树每个文件/文件夹新增一键删除，底部新增独立删除多选和一键删除勾选项，支持服务器独有路径，不改变传输范围。保留选择删除位置、完整路径两次确认、安全根、固定类型及直接父目录保护，未执行真实文件删除。

## 验证

- 最终 npm run package 退出 0，完整 build 与 Windows flow 共 978 项测试通过，失败汇总为 0。相关测试单文件串行且有 20 秒上限。
- 新共享索引测试 9 项，覆盖实时读取、用途/轮次隔离、失败与缺失、连接换代、迟到回包、精确失效、分层文件、查询前 reading 落盘、实际操作前刷新及失败边界。本机索引另有共享扫描、空目录和无进展恢复测试。
- npm run lint、git diff --check、vm.Script PanelHtml 模块校验、UTF-8 严格解码、禁止端口扫描通过。
- 真实生成生产页面以隔离数据在 headless Edge 中渲染，检查顶部状态、各节点进度、行内删除、服务器独有路径多选及底部按钮。截图已查看并按截图技能移入 C:/Users/ZLK/AppData/Local/Temp/CodexUiCaptures/clean_dir/ui-ef81df23897643f498c14a23d37fbc20.png。该证据不是现场服务器或已重载扩展验收。
- 实际 VSIX 身份 simple-local.simple-experiment，版本 0.5.372，universal，engine ^1.100.0。549 条 ZIP 记录、382 个 dist 文件与构建产物逐字节一致；261 模块、2 入口运行闭包、runtime 版本、秘密和机器状态排除检查通过。历史文档中的示例路径不作为机器运行状态打包。

未进行真实服务器性能基准、现场全项目索引或删除测试；不能据此宣称所有服务器现场问题已解决。未运行科研实验、修改指标、清理消费项目或更新远端服务。

## 源码与发行

源码提交 d25cc996a6ddea9bc18fb60c423c8f9f5597ce01，普通 fast-forward 推送到 origin/master，并 fetch 核对一致。稳定 [v0.5.372](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.372) 及其 tag 绑定该提交，真实 Latest 的 draft=false、prerelease=false。

- simple-experiment-0.5.372.vsix：3158738 字节。
- SHA256：056d5cd9028c6603642dfbfb1b97d6b484b257b749bb184c47ecacace8bf3432。
- 同名 .vsix.sha256 清单绑定该精确文件名，与真实 Latest 资产摘要一致。
- 使用安装前 0.5.371 的实际 ReleaseClient 查询真实更新源，确认 Windows 可发现 0.5.372，并下载真实 VSIX 和清单；下载字节、大小、包身份和 SHA256 与最终冻结包一致。
- 配套复用 [SimpleSFTP v0.2.97](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.97)，提交 f9cef011a375df1d09c4727e76ec0ee34a4d9d61；171731 字节，SHA256 1dfe226df01ef0d0a9a770d5ec6e9eb8d8a5deb6f0688ab982e54e61b2126af3。真实 Latest、实际下载及清单核验一致，未重复安装。

最终冻结包、真实下载和验证记录位于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0372-delivery-iIpEfp/frozen-preoperation 及其父目录。此前未发行的打包副本保留，发行和安装只使用上述最终字节。

## 安装与现场边界

显式执行一次 npm run install:latest，0.5.372 安装成功，无 force 或降级。立即核对 VS Code 已安装主插件 0.5.372、SimpleSFTP 0.2.97，382 个 dist 文件及 simpleex.cmd 与最终包一致；simpleex 入口和 --help 通过。

安装后不再操作当前 SimpleExperiment 面板、插件 API 或服务器。用户需执行 Developer: Reload Window，再验收新版页面。本轮未自动升级远端 Agent/Scheduler；旧协议缺少索引字段时使用已支持的兼容路径，无法核实显示未知。
