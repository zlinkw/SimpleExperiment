# 0.5.369 交付记录

## 问题证据与修复

用户截图中的“待核验”不是一次真实文件读取失败，而是展示链路错误：sync.projectTree 已返回 size、modifiedAtMs、directory，本机/远端 union 却只保留名称和 locations；页面又把完整内容比较的 ScopeStatus 当作展示及来源选择门禁。因此已列出的副本仍显示“尚未校验”，来源按钮被禁用。修复前新增真实调用链与页面回归分别出现元数据缺失 TypeError、实际大小未展示断言失败，目标文件 11/13 通过，复现了截图的问题。

本轮最初通过 discovery 与 capabilities 确认实际运行 SimpleExperiment 0.5.368、SimpleSFTP 0.2.96，PID 26708，启动时间分别为 2026-10-17T10:06:37.618Z、2026-10-17T10:06:36.703Z。随后尝试只读核对截图目录时两个本机 API 都返回 ECONNREFUSED，打包后复查仍如此；没有以旧目录或旧探活数据代替本轮服务器观察，也没有绕过插件直连服务器。

现在普通展开与“刷新文件状态”只读取目录，直接显示本机和各 Worker 的文件/目录存在、文件大小、修改时间和读取时间。没有列出的路径明确写“本轮未列出”，不冒充已证明不存在；查询失败显示失败原因，不能沿用上一轮存在/大小/时间作为新证据。部分或全部 Worker 读取失败不抹掉已成功读取的本机文件信息。目录展示目录本身信息，不再声称已经递归核实整个子树。

已读取到的副本可直接点击“以此版同步到其他位置”或删除，不要求先点击内容核验。每个副本保留自己的实际文件/目录类型。执行时仍进入既有来源完整核实、全部启用 Worker 同步、精确路径确认及删除双确认；没有把列表读取当作覆盖、删除授权，没有缩减写入后校验和路径保护。完整 SHA256 比较作为独立“比较文件内容（可选）”入口保留；普通刷新及操作后刷新不再自动启动它。刷新会取消旧内容比较，晚到进度/响应不能覆盖新范围；页面关闭和路径操作的只读取消与换代保护继续有效。

## 验证与现场边界

相关五个单文件串行回归共 38 项通过：syncScopeDeletionRefresh 14、真实生成页面 syncScopeTree 5、syncScopeTransferBatch 7、syncScopeDelete 5、syncScopeBatch 7。覆盖实际目录元数据保留、不运行内容清单即可显示大小/时间并启用来源、全部服务器断开时仍展示本机、查询失败后旧事实失效、选择精确来源、局部操作后只重新读取目录、重复刷新和旧响应隔离。本机真实文件系统用 lstat/readdir 验证大小、修改时间和目录类型，测试没有提供文件内容读取接口；元数据补充最多八路，并未递归散列目录。

最终 npm run package 退出 0，包含完整 build、Windows flow、完成事实/PLAN 计数、慢日志、断线、迟到响应等既有串行门禁及 257 模块/2 入口运行闭包检查。typecheck、lint、vm.Script 模块及实际生成页面脚本、UTF-8 复读、禁止端口检查、git diff --check 通过。没有 20 秒挂起后重试。保留预先存在的 pyc 改动、迁移脚本和历史校验清单。

本轮未能完成新版现场验收：本机 API 拒绝连接，不能验证当前服务器目录或新版面板实际结果。没有启动、停止、重跑、重提科研任务，没有修改现场项目、环境、指标、日志、权重或同步范围，没有删除或覆盖现场文件，没有自动部署 Agent/Scheduler。

## 源码、发行、安装

源码提交 385aed0b6ede90c8deff9fb4fb45c6401f6aeb6d 已普通 fast-forward 推送 origin/master，fetch 核对一致。[稳定 v0.5.369](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.369) 的真实 Latest 和 tag 绑定该提交，draft=false、prerelease=false；simple-experiment-0.5.369.vsix 为 3112103 字节，SHA256 0ba4024b92a8e396f6a746203d0538a09e92465c90730fe31d77b5d915849c99，同名 .vsix.sha256 绑定精确文件名。540 个 ZIP 条目、377 个 dist 文件，身份、universal 平台、版本、runtime SHA、运行闭包和秘密排除检查通过。

实际安装旧版 0.5.368 的 ReleaseClient 从真实 Latest 识别 0.5.369 更新，下载 VSIX 与清单，逐字节等于冻结包。配套 SimpleSFTP 0.2.96 的真实稳定包继续复用，171416 字节，SHA256 52a0acf130e5f69ba889a29e2351ce7d7e1c8e7ad1003244ce7612715ad2b271，目标提交 fed954a00ead166644b8bb9e23512e6022efd798；重新下载核对一致，更新器正确判定它无需更新，未重复安装。验证文件保留于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0369-delivery-aRmtTm。

显式 npm run install:latest 仅执行一次，0.5.369 安装成功，没有 force 或降级。立即核对 VS Code 已安装 0.5.369 / 0.2.96、simpleex 入口与 --help；主插件 377 个已安装 dist 文件逐字节等于发行包。之后停止插件 API、面板及服务器操作，只完成本交付记录和 Git 同步。需要用户 Developer: Reload Window 后再验收；代码、发行、安装通过不代表新版现场问题已经验证解决。
