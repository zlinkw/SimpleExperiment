# 0.5.370 / 0.2.97 交付记录

## 证据与行为

本轮开始通过 discovery 和 capabilities 确认实际运行 SimpleExperiment 0.5.369、SimpleSFTP 0.2.96，PID 51500。真实生成页面的新增回归首先复现了“折叠目录不自动请求递归汇总”；原页面即使取得 ScopeStatus，也会被目录自身 observations 遮住计数。问题不是只缺一条提示文字。

2026-10-17T11:05:44.596Z，经当时运行的 SimpleSFTP API 只读查询 experiments/plans/comparison，nwpu3、nwpu2、nwpu5、jqg_zlk 各列出 20 个文件，耗时分别约 1589、602、1043、2680 毫秒，本机同目录为 14 个文件。新聚合器处理这份本轮清单得到本机缺失 6 项、大小或修改时间差异 20 项。缺失与差异可重叠；这不表示 20 份文件的内容哈希不同，也不是实验失败或未完成的结论。此项验证是现场清单与新聚合器的结合验证，不是新版面板或远端索引验收。

文件夹恢复整个子树的缺失和差异数量，不需要逐级展开。传输范围勾选不再遮蔽范围外的手动管理信息；差异筛选、批量选择、精确副本选择和主动 SHA256 内容比较保留。文件信息比较明确标注内容未比较，不能把大小和时间相同当作内容核实通过。目录自身信息不再遮住汇总；保存范围也不会无故清空仍有效的文件差异。

按用户后续要求加入仅限“项目同步范围与状态”页面的 Agent 内存索引。普通健康、任务进度、调度、结果、自动同步及删除审核不启动或依赖它。Agent 在页面发出更新请求后执行新的元数据扫描；只读目录、类型、大小、修改时间，并维护目录递归文件数和字节数，不打开文件内容、不写缓存清单。首次分批返回，之后按已确认 generation 返回新增、变化和删除增量，无变化时返回空增量。同轮列表和计数共用读取，展开、切换模式、刷新和文件操作完成触发新一轮。

索引状态归 HTTP server 实例私有管理，扫描使用独立线程和锁，短票据、轮询及分页归读取槽位。请求绑定项目根、页面、requestId、Agent instance 和 generation；分页必须连续，旧回包、连接换代、旧请求的晚到释放不能覆盖或取消新一轮。单页最多 512 项且条目负载不超过 128 KiB。关闭页面释放会话，取消只影响该页读取，空闲会话有界回收。外部程序的新增、删除或修改在下一次展开、切换或刷新时重新读取，不设置全局文件监视器，不用目录 mtime 替代文件观察。

旧 Agent 不支持索引时，兼容使用 SimpleSFTP 0.2.97 的 metadataOnly；它不读取内容或写哈希数据库，并与大文件传输、SHA 清单、目录浏览和删除审核分开限流。真实索引错误显示未知，不冒充旧协议或空目录；新鲜 capability 未声明 metadataOnly 时，拒绝把该请求退化为全项目哈希。实际同步及删除仍使用原完整核实、全部启用 Worker、精确路径、父目录和删除双确认保护，索引不作为写入或删除授权。

## 代码验证与现场边界

目录、索引、缓存及构建清单相关 11 个单文件串行回归共 88 项通过；Agent 启动与实际 HTTP 关闭处理的 3 项专门回归也通过。索引测试执行真实扫描器、从生产 runtime 提取的 POST 方法和真实隧道适配方法，覆盖增删改、首次分页、空增量、重启、错项目、迟到响应、连接换代、权限失败及释放。没有 import 或 exec 整个 Agent，Python 子进程均有 10 秒上限。

最终 npm run package 退出 0，完整 build、Windows flow、259 模块及 2 入口闭包通过，包含原有完成事实、PLAN 计数、慢日志、请求排队、断线和迟到响应门禁。typecheck、lint、vm.Script 模块与实际生成页面脚本、UTF-8 复读、禁止端口及 git diff --check 通过。SimpleSFTP 全量 42 文件串行回归 277 项通过，自身 build、package 和 23 文件运行闭包通过。

构建过程中旧按钮文案断言与新增 HTTP 闭包状态的隔离测试暴露了问题，最终改为 server 实例私有状态并重新验证；Windows 对 panel-build-manifest.json 的 CREATE_ALWAYS 写入曾返回 UNKNOWN，构建器改为保留文件身份的 UTF-8 原位写入，并跳过相同内容，真实写入和受限写入回归通过。没有 20 秒挂起后重试，也没有绕过失败门禁交付。

安装前两个本机 API 查询均出现 fetch failed，不能据此推断远端或新插件已经运行。新版现场验收尚未完成；远端 Agent/Scheduler 没有由本轮自动升级，不能用插件版本推断其实际运行版本。新索引协议必须在远端部署后再验收，旧 Agent 的兼容路径也需重载后验证。没有启动、停止、重跑、重提科研任务，没有修改现场项目、环境、指标、日志或权重，没有删除或覆盖现场文件。

## 源码、发行与安装

主插件源码提交 ca819ea9954aa3a3e2d67aa92d51b6aeebf3d1bd，配套 SimpleSFTP 提交 f9cef011a375df1d09c4727e76ec0ee34a4d9d61，均普通 fast-forward 推送 origin/master，fetch 核对一致。

- [SimpleExperiment 稳定 v0.5.370](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.370)：simple-experiment-0.5.370.vsix，3131437 字节，SHA256 24ed98d7ea7d189a122b11b358c94d057b12c9063378b1676b9bab6910eb3e73。
- [SimpleSFTP 稳定 v0.2.97](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.97)：simple-sftp-0.2.97.vsix，171731 字节，SHA256 1dfe226df01ef0d0a9a770d5ec6e9eb8d8a5deb6f0688ab982e54e61b2126af3。

两个真实 Latest 的 tag 均指向上述提交，draft=false、prerelease=false，VSIX 与逐包 .vsix.sha256 齐全。使用实际已安装 0.5.369 的 ReleaseClient，确认 0.5.369 / 0.2.96 能看到配套更新；校验实际 checksum，下载真实资产与清单，逐字节等于冻结包。主包 545 条 ZIP 记录、380 个 dist 文件，universal 身份可匹配 Windows；秘密、机器状态与依赖闭包检查通过。验证副本保留于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0370-delivery-MUoRCa。

两个仓库各显式执行一次 npm run install:latest，0.5.370 和 0.2.97 安装成功，没有 force 或降级。立即核对 VS Code 列出的两个版本、simpleex 入口和 --help；主插件 380 个已安装 dist 文件及入口、SimpleSFTP 23 个非 manifest 运行文件逐字节等于发行包。此后停止插件 API、面板和服务器操作，仅补充本记录及 Git 同步。需要用户 Developer: Reload Window，再按既有流程准备新版 Agent 并只读验收；本记录不宣称现场问题已解决。
