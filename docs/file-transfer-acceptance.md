# SimpleSFTP 文件传输验收清单

## 固定边界

- `SimpleExperiment` 不直接执行 SSH、SCP 或 RSYNC，也不使用 SFTP 传输实时状态。
- `SimpleSFTP` 负责代码、Plan、配置、Agent runtime 和用户主动选择的真实文件传输。
- GPU、日志尾部、任务状态和操作进度只通过 Xshell 本地隧道后的 Hub/Worker Agent 获取。
- 上传目标由 Hub/Worker 的“项目父目录”派生为 `<项目父目录>/<当前项目名>`，Agent runtime 位于 `<项目父目录>/simple_agent`。

## 发布前检查

1. Hub 与每个启用 Worker 都已配置 Xshell 会话和项目父目录。
2. SimpleExperiment 的“项目关键入口”显示服务器与运行门禁通过。
3. SimpleSFTP 已安装且可在命令面板看到 `SimpleSFTP：上传工作区到目标`。
4. 目标服务器目录由当前用户写入，不使用管理员账户或共享凭据。
5. `%APPDATA%/SimpleSFTP/server-profiles/servers.json` 中的 Hub/Worker 目标指向 `<项目父目录>/<当前项目名>`，不再写入旧私有扩展的 server-profiles 路径。

## 手动验收

1. 上传 Hub 代码。
   操作：在“发布与代码同步”点击“首次上传到 Hub”。
   预期：只上传轻量项目代码；远端位置为 Hub 项目父目录下自动追加当前项目名的目录。

2. 上传 Worker 代码。
   操作：点击“首次上传到 Worker”。
   预期：每个启用 Worker 的上传结果独立显示；单台失败不会伪装为全部成功。

3. 部署 Agent runtime。
   操作：点击“部署最新版 Agent”。
   预期：`cluster_agent.py` 和 `cluster_scheduler.py` 写入每台服务器的 `simple_agent/runtime`，不覆盖项目代码目录。

4. 忽略规则。
   操作：点击“配置 SFTP 忽略”。
   预期：数据集、权重、checkpoint、日志和结果产物不进入代码同步 manifest。

5. 提交 Plan 前同步。
   操作：对小 Plan 依次执行“校验”“预演”“提交运行”。
   预期：提交前会同步代码并核验 fingerprint；缺少项目父目录、SimpleSFTP、Plan 配置或输出门禁时必须阻止运行。

6. 传输失败。
   操作：暂时配置一个不可达 Worker 后上传。
   预期：错误明确标明 Worker 和原因；Hub 与其他 Worker 的成功状态保持可见，可修正后重试。

## 不属于文件传输的操作

- 运行状态、GPU、任务日志和归档终态不应通过 SimpleSFTP 轮询。
- 结果预览、质量门禁、统计、论文表和 PPT 绘图只读取项目内轻量结果文件；不扫描数据集、checkpoint 或权重。
