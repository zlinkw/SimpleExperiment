# 0.5.312 交付记录

- 已验证源码：`b268a7d00ec70f38ff4fa4002b38b6254cd5a8ed`，普通推送后 fetch 核对与 origin/master 一致。
- 稳定发行：[v0.5.312](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.312)，tag 绑定上述验证提交，非草稿、非预发布。
- 包：`simple-experiment-0.5.312.vsix`，2,783,907 字节。
- SHA256：`70dcf4d377b54fe908cd289f77cb9204b1f53a273d09283c52bc5f62725da9af`；同名 `.vsix.sha256` 绑定精确文件名。
- SimpleSFTP 沿用已发布、已安装的 0.2.85；真实远端 Latest、包字节和 SHA256 已重新核对，无需重复安装。

## 验证

- `npm run package` 通过，包含串行单文件测试、构建、Windows 流程回归及 VSIX 运行闭包核验。
- 新增/更新的回归覆盖真实 actionBody 到覆盖服务的路径传递、旧 projectId 缺失的精确停止、显卡预约、已查询不存在的窗口显示、协议 2 重新运行、Hub 退役及同步就绪。
- 3 段实际渲染面板脚本通过 vm.Script；VSIX 内 358 个 dist 文件与本机构建 SHA256 一致，含 NativePlanRetry 模块。
- 包身份和秘密/状态文件排除检查通过。
- 使用实际已安装 0.5.311 更新客户端查询两个仓库的真实 Latest Release；确认可见 0.5.312，并在内存读取远端 VSIX，核对与本机发行包字节、资产大小、SHA256 和 manifest 一致。
- 显式执行一次 `npm run install:latest`，核对安装版本 0.5.312，SimpleSFTP 0.2.85。`simpleex --help` 通过；CLI shim 指向本项目 0.5.312 包，已安装 NativePlanRetry 字节与发行构建一致。CLI 不支持 `--version`，未将该参数失败冒充版本验证。

## 实机边界

安装前，仅通过插件 API 读取用户当前状态：4 个 Worker 任务查询完整返回，未发现任务窗口；505 条旧记录显示 missing/unknown；部分服务器存在空卡。当前提交错误为 UNSAFE_PATH，旧停止记录出现 TASK_STOP_IDENTITY_REQUIRED。没有证据表明本次点击真的新派发了全部 PLAN。

本次开发没有部署生产服务器、训练、停止真实任务、删除真实产物或删除真实旧缓存。安装后已停止操作 SimpleExperiment 面板。

待用户执行 Developer: Reload Window，并通过插件更新 Worker Agent/Scheduler 至 0.5.312 后，再进行实际入口验收。旧缓存文件是否可弃用，须在新链路实机核实后按精确路径及使用者确认；未确认启动/停止意图和原 commandId 不能提前丢弃。所选 PLAN 的旧本机输入仅在新流程主动核实原任务已释放后移除，其他 PLAN 和产物保留。
