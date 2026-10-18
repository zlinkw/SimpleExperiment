# 0.5.377 删除后索引进度统一

此前操作后刷新先重置位置卡片，再等待目录列表完成才启动索引摘要；等待阶段只显示重新读取文件列表，部分结果发布还会覆盖真实扫描进度。现在删除后的重读与手动刷新共用 beginIndexRefresh，立即建立新轮次并启动摘要，和目录列表共用本轮增量基线。

各位置从等待、读取到完成或失败独立展示；部分结果发布保留真实进度，不以笼统更新提示代替。部分操作失败的提示与后续索引进度并列，失败不冒充完成。保留迟到回包拒绝、每模式每轮一次摘要及操作后文件树实际重读，不增加内容哈希扫描，不执行新的永久删除，不放宽删除确认。

新增真实 Webview 脚本回归先复现两个失败：删除完成后尚未发出新摘要，以及部分删除失败遮住索引进度。修复后验证目录列表尚未返回即开始索引、读进度不被部分结果覆盖、完成/失败计数准确、旧轮次被拒绝、两种模式不重复请求。

首次完整打包在原有 Linux inotify 回归中遇到 WSL 子进程 10 秒启动超时，单文件进程按上限结束，未延长超时或修改生产索引逻辑。检查时发行版未在运行；已有环境准备命令执行 2519 ms，同一运行时的后续空命令仅 120 ms。为避免构建前预热后长时间闲置，再进入原生回归时冷启动，将既有 WSL 准备步骤放到原生索引测试文件之前，继续保留 Python 10 秒、单文件 20 秒上限。

原生文件回归在准备运行时后 6 项通过，其中真实 inotify 检查 237 ms。最终 npm run package 退出 0，串行 build 与 Windows flow 共 998 项通过，失败 0；初次失败日志保留为 package-final.log，最终成功日志为 package-rechecked.log。npm run lint、git diff --check、UTF-8 严格读取与中文文本、禁止端口检查及 PanelHtml vm.Script 均通过。

冻结包 simple-experiment-0.5.377.vsix 为 3193959 字节，SHA256 ce4add3c66fbf894837105c7c7eeb5c5ccc7dfa847ac653efef68dc8a0ffecef，身份 simple-local.simple-experiment，universal，engine ^1.100.0。557 条 ZIP 记录、384 个 dist 文件与最终构建字节一致，262 模块/2 入口闭包、秘密及机器状态排除核验通过。精确文件名绑定的 .vsix.sha256 和冻结包、日志位于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0377-acceptance-20261018。配套仍为 SimpleSFTP 0.2.97。

源码提交 08fd8029257b92d8ab470dbcb67290c5aa8d6d13 已普通 fast-forward 推送 origin/master，fetch 核对一致。[稳定 v0.5.377](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.377) 的 tag 和 targetCommitish 均绑定该提交，draft=false、prerelease=false。实际 0.5.376 ReleaseClient 识别更新并从真实 Latest 下载主包、配套包及各自清单，身份、平台、精确文件名、大小和 SHA256 与冻结字节一致。配套仍为既有 SimpleSFTP 0.2.97，未重复安装。

显式执行一次 npm run install:latest 安装 0.5.377，无 force、无降级；核对已安装版本、384 个 dist 文件、simpleex.cmd 与 simpleex --help，均通过。安装后停止操作当前 SimpleExperiment API 和面板，等待用户 Developer: Reload Window 后现场验收。本轮未部署或重启远端 Agent，未执行新的永久删除或科研作业。本记录验收信息于打包后补充，不改变冻结包；真实面板验收等待用户重载窗口。
