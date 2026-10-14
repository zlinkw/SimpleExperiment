# 0.5.314 / SimpleSFTP 0.2.86 交付记录

日期：2026-10-15。范围：批量删除预览、清理查询进度、文件传输实际进度及固定停滞取消。本轮没有部署生产服务器、同步生产项目、训练或删除真实产物。

## 原因与修改

- 删除预览仍逐字读取权重计算 SHA256，清理请求又未接入进度通道。只读复现中存在性查询约 0.48 秒，预览超过 50 秒仍未返回；客户端原来将其当作 30 秒静默控制请求。改为按路径删除的真实元数据清单，清理扫描接入本次请求的内存进度，错误显示具体接口。普通移动和恢复仍保留内容核验。
- 实际传输在 preparing 阶段受 120 秒停滞取消影响。改为停滞提示，恢复真实写入后继续计算；用户取消和实际错误处理保留。查询控制请求仍有界，查询失败不能解释为目标不存在或操作完成。
- 上传前用一条只读通道取得所选文件基线，按实际远端文件大小、本批完整字节数、已写满文件数及总文件数显示进度。未变化旧副本不算新增进度，大小一致不算内容成功；最终仍要求执行成功及原有 SHA256 核验。进度只在内存中计算，不写状态文件。
- 删除保留完整路径两次确认、安全根、固定类型、链接及挂载保护、物理直接父目录核实和 `./直接子项` 限制。丢失执行响应后只查询实际窗口与文件，不重复删除。预览查询失败后不继续给整批剩余目录重复发送相同请求。

主要文件：SimpleExperiment 的 `src/core/ProgressInactivity.ts`、`src/core/SimpleSftpProgressWait.ts`、`src/features/SyncScopeDelete.ts`、`src/extension/legacy.ts`；SimpleSFTP 的 `cleanup-files.py`、`cleanup-file-api.js`、`extension.js`、`transfer-file-progress.js`、`progress-inactivity.js`。版本、构建产物、配套测试和功能说明同步更新。

## 验证

按单文件串行执行目标测试，两个仓库的最终 `npm run package` 均通过；构建、Python 和面板脚本校验以及 VSIX 文件一致性通过。

SimpleExperiment 目标测试：`sftpProgressWait` 10 项、`syncScopeDeletionRefresh` 6 项、`syncScopeDelete` 3 项、`codeSyncDataManifest` 7 项、`projectCodeSyncState` 7 项。

SimpleSFTP 目标测试：`confirmedPathDelete` 3 项、`metadataTreeRead` 5 项、`cleanupManaged` 3 项、`cleanupFiles` 18 项、`remoteFileProgress` 1 项、`transferInactivity` 5 项、`apiUploadProgress` 4 项。覆盖真实临时文件的部分写入、空文件、旧副本排除，64GB 稀疏权重不读取内容，隔离 tmux 中丢失执行响应后的主动查询，以及停滞恢复和手动取消。

额外运行的三个旧测试文件未通过：`distributedRerunAndWorkerDelta` 夹具缺少 `manualJobSelections`，`planRunFeedback` 查找已退役的运行流程片段，`remotePathConfirmationWorkflow` 仍要求旧部署及配置写入形状。相关旧生产区域在本轮未变化；尝试更新这些断言的修改已还原，未纳入交付。不能据此声称全仓库所有测试通过；当前必需构建和打包门禁均通过。

## 发布与安装

| 项目 | 测试及发行提交 | 稳定 Release |
| --- | --- | --- |
| SimpleExperiment 0.5.314 | `7907024bdeaade60cb9f0f33e8e17501511f7d5d` | [v0.5.314](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.314) |
| SimpleSFTP 0.2.86 | `4088bd3e9a0def7485a3a803a188618d4452245b` | [v0.2.86](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.86) |

两个发行均绑定上表提交，非草稿、非预发行，VSIX 与校验文件已发布。提交已普通快进推送，fetch 后核对与各自 `origin/master` 一致。

| VSIX | 字节数 | SHA256 |
| --- | ---: | --- |
| `simple-experiment-0.5.314.vsix` | 2793054 | `5da6a85841591b122486f0a0c52e36dc785e2ba235416211538f94dd16865720` |
| `simple-sftp-0.2.86.vsix` | 167157 | `42432a1e4eb80f667aa6864cd339860dfc04850b3ff0e9f869e826e559165093` |

SimpleExperiment 的 359 个 dist 文件及 SimpleSFTP 的 23 个声明运行文件与包内字节一致。通过旧版 0.5.313 更新客户端核对两项更新可见，并将下载包的字节、大小、SHA256、清单及绑定提交与本地发行核对一致。

两个版本各执行一次 `npm run install:latest`，安装结果分别为 `simple-local.simple-experiment@0.5.314`、`simple-local.simple-sftp@0.2.86`。`simpleex --help`、`simple-sftp-api --help` 通过，安装目录关键模块与测试构建字节一致。未重复安装、强制安装或降级。

## 待实机验收

用户执行 Developer: Reload Window 前不再操作当前面板或调用新插件 API。重载后重新打开同步页面，先主动读取目标实际状态，再通过实际入口验证删除预览、确认与文件树刷新，以及 NWPU3 代码同步的真实字节/文件进度和停滞后恢复。没有在生产环境执行本轮删除、同步或训练，不能将本机夹具通过视为生产成功。

本轮没有自动更新远端 Agent/Scheduler。扩展版本与远端正在运行的版本分别显示和核对；远端更新与随后实际提交验收仍须按用户授权进行。
