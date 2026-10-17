# 0.5.373 现场索引验收与删除修复

## 现场与故障证据

用户重载后，本地 discovery 和 capabilities 确认实际运行 SimpleExperiment 0.5.372、SimpleSFTP 0.2.97，Extension Host PID 57404，当前工作区 MultiModal。仅选择配置中明确启用的 nwpu3、nwpu2、nwpu5、jqg_zlk，逐一核对 SimpleSFTP 项目根与当前 SimpleExperiment 配置一致，未连接历史 Hub。

用户删除后截图中四个 Worker 均显示 FILE_INDEX_CONNECTION_REPLACED，页面验收因此未通过。实际 globalStorage 索引只留下 cleanup.inspect 的失效观察，不能据此判断文件仍存在或目录为空。

根因是完整 SFTP DTO 带有 networkHost，而删除节点投影只有 host、root、user 和 port。旧连接指纹直接包含这些可选字段，并区分字符串/数值端口，将同一服务器误判成新连接；新对象夺取同一索引文件的 owner 后，页面持有的旧对象持续报错，注册表又返回不能写入的旧对象。另一个缺陷是现场 cleanup.inspect 返回的 target 只有 absolutePath、type、missing，不重复 relativePath，旧归一化没有记录目标缺失。局部完整清单与 64 条观察历史裁剪还会让部分旧条目无法更新为缺失。

隔离回归先复现上述三个失败，再修复通过。补充测试另复现了 ok=true 但缺少必要清单/exists 的响应被判为完整的漏洞，现按失败/未知处理。

## 实际文件系统与索引记录

本轮通过生产本机扫描器和 SimpleSFTP metadataOnly API 只读读取整个项目，不哈希文件内容、不下载原始指标、不运行科研检查。每个 API 调用使用新读 discovery 和当前 capabilities，未直接 SSH。

| 位置 | 文件数 | 只读清单耗时 | 修复代码与索引落盘验收耗时 |
| --- | ---: | ---: | ---: |
| 本机 | 16676 | 4.31 秒 | 18.13 秒 |
| nwpu3 | 20182 | 6.62 秒 | 14.05 秒 |
| nwpu2 | 20078 | 2.63 秒 | 12.06 秒 |
| nwpu5 | 19949 | 6.93 秒 | 9.31 秒 |
| jqg_zlk | 19655 | 4.73 秒 | 9.58 秒 |

两列是不同轮次的现场观察，后者包含首次分层索引写入，不是性能基准或优化倍数。五个位置均返回 complete，没有未核实路径。后者执行修复后的生产 Host 方法、ProjectFileIndex 和本机 reader，连接实际 SimpleSFTP，但将诊断索引写入隔离临时目录，避免改写正在运行的 0.5.372 面板状态；不能冒充已安装 0.5.373 的真实面板验收。

用户此前删除的 comparison_methods/methods/dpl，本机 stat 返回 ENOENT，四个 Worker 的主动目录查询均返回 exists=false。四个 Worker 的 cleanup.inspect 还确认 target.missing=true，且对应清理执行器列表为空。修复代码按原删除节点投影再次只读核实该目标，确认与完整服务器 DTO 共用同一索引，精确路径写为 absent，根摘要文件数与实际清单一致。验收封锁了 confirm/execute，未新增删除。

在真实分批返回的文件清单聚合中，断言尚未完成位置的每个副本只能为 unknown，不能为 absent。失败、空清单、无字段响应、不可读路径、旧回包、取消等边界由隔离测试验证，未人为断开用户的服务器连接。

操作前更新通过生产刷新挂钩，实际查询本机和一个 Worker 的 README.md，检查 purpose=before-operation 及 generation 前进；随后仅演练索引失效，再主动 stat 确认获得新观察。未执行对应上传或其他文件写入，因此该项证明刷新/失效/重查链路，不能冒充一次实际传输。删除后的现场缺失查询与索引回填已验证；执行后重查失败或目标重现不重复删除由回归覆盖。

## 修复边界

连接指纹归一当前客户端会话、实际 host、数值端口和用户名；字段投影不再误换代，真正换机仍隔离旧证据，恢复先前配置也创建空的新 owner。读取旧 owner 时连同其同轮缓存一起拒绝。

精确删除观察核对请求相对路径与响应 absolutePath 后落盘，不依赖响应重复 relativePath。主动确认目录不存在后，同时更新已知后代与逐级计数。完整目录枚举可以更新其覆盖范围中遗漏的旧条目；文件清单不推断空目录缺失。条目来源范围不依赖被裁剪的观察历史。失败、未查完和缺字段响应不因遗漏生成缺失。

删除执行器完成后主动 inspect 同一目标，将最终存在性回填索引；若查询失败、仍有执行器或目标重新出现，报告未核实，不重复发送删除。完整路径双确认、安全根、固定类型、直接父目录和最短子项保护保持不变。

## 回归与安装包

最终 npm run package 退出 0，完整 build 与 Windows flow 共 983 项测试通过，失败汇总为 0。共享索引 13 项、删除流程 6 项，另有页面更新 25 项、本机扫描及元数据故障边界回归。目标测试先单文件运行，全部测试串行并有 20 秒上限。npm run lint、git diff --check、vm.Script PanelHtml、UTF-8 严格解码和禁止端口检查通过。

VSIX 身份 simple-local.simple-experiment，版本 0.5.373，universal，engine ^1.100.0；550 条 ZIP 记录、382 个 dist 文件与最终构建字节一致，261 模块/2 入口运行闭包、runtime 版本、秘密与机器状态排除核验通过。发行仅使用补充缺字段保护后重新打包的最终字节。

## 交付

源码提交 0a1d4f16bcfbb023cba6b6305c03b2ca1f137a6d，普通 fast-forward 推送 origin/master，fetch 核对一致。[稳定 v0.5.373](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.373) 和 tag 绑定此提交，真实 Latest 的 draft=false、prerelease=false。

- simple-experiment-0.5.373.vsix：3163764 字节。
- SHA256：1cb82c70ad56c4bc55249cafa69876d6c341af7c1f50cc08e38dd531454108a0。
- 同名 .vsix.sha256 清单绑定精确文件名。安装前 0.5.372 的实际 ReleaseClient 能发现更新，并下载真实包和清单，大小、身份、摘要及字节与最终冻结包一致。
- 配套复用 SimpleSFTP v0.2.97，提交 f9cef011a375df1d09c4727e76ec0ee34a4d9d61。真实 Latest 包为 171731 字节，SHA256 1dfe226df01ef0d0a9a770d5ec6e9eb8d8a5deb6f0688ab982e54e61b2126af3，下载和清单一致，未重复安装。

现场证据、最终冻结包及真实下载保留于 C:/Users/ZLK/AppData/Local/Temp/simpleex-0373-acceptance-1792269275638。discovery token 未写入证据或提交。

显式执行一次 npm run install:latest，0.5.373 安装成功，无 force 或降级。立即核对 VS Code 已安装主插件 0.5.373、SimpleSFTP 0.2.97，382 个 dist 文件和 simpleex.cmd 与发行字节一致，simpleex --help 通过。安装后停止当前插件 API、面板和服务器操作。

用户还需再次 Developer: Reload Window，使新修复进入 Extension Host，然后验收真实面板。此前重载已正确运行 0.5.372，但该版本包含本次确认的缺陷，不能将底层只读通过当作其页面通过。本轮未更新远端 Agent/Scheduler，未启动、停止、重跑科研任务，未写消费项目、传输文件或新增删除。
