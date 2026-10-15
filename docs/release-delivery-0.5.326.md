# 0.5.326 PLAN 准备与 tmux 展示

## 发行与安装

| 组件 | 验证源码提交 | 稳定 Release | VSIX 字节数 | SHA256 |
| --- | --- | --- | ---: | --- |
| SimpleExperiment 0.5.326 | `da5494b22fafb36da649defd09304ec6b250be82` | https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.326 | 2858713 | `5ecefbf6b4641251948f9d2c9ab9b196533a9851a1447c883155bc581f760c6d` |
| SimpleSFTP 0.2.89 | `80853726e75702f7433fc140d0f1ed106256cb48` | https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.89 | 168064 | `e8548c7ff9f83b8273027fd718b5c7e4da30494eaed0a2b3a3f19621b4489f5d` |

两个源码提交均已普通推送，并 fetch 确认与各自 origin/master 相等。发行分别绑定上述提交，非 draft、非 prerelease。资产为 `simple-experiment-0.5.326.vsix`、`simple-sftp-0.2.89.vsix` 及各自精确文件名的 `.vsix.sha256`。

重新读取两个真实 Latest，下载发行资产，逐字节匹配本地已验证包及 SHA256 清单。用已安装 0.5.325 的真实 ReleaseClient 检查，确认旧版可以识别主插件及配套 SimpleSFTP 更新；实际 VSIX 身份和 win32-x64 平台选择通过。

全部打包和发行验收结束后，各显式执行一次 `npm run install:latest`，没有 force 或降级。核实 VS Code 安装为 0.5.326 和 0.2.89；Host、面板、Agent、Scheduler 与 SimpleSFTP 清理实现的安装字节匹配验证包，simpleex 入口存在。安装后未操作 SimpleExperiment/SimpleSFTP 面板或 API，等待用户重载。

## 变更

- GPU 会话只在置顶卡片表示，选中后展开任务与终端，总览不再重复列出 GPU 窗口。普通窗口名称直接点击查看日志，单窗格不再重复显示第二个名称。
- 配置前缀区分我的其他会话和其他前缀会话；真实任务及本项目控制窗口绑定可以识别旧前缀归属。Agent、Scheduler 单列插件服务。前缀仅影响展示分类，关闭仍使用原精确窗口身份及确认。
- 运行前版本核对与代码清单、同步重叠执行，目标须同时完成同步和版本核对才释放。保留先就绪服务器提交、慢服务器继续准备，涉及删除仍等待完整预检。
- 修正结构校验复用读取的版本字段，兼容实际 `capabilities.agentVersion`。代码、PLAN、环境、项目或 runtime generation 变化均使复用失效；远端已有产物仍重新查询。
- 提交使用 validate-plan 已展开且已完成入口检查的 job 清单，不再重复加载历史队列、查询 GPU 并模拟资源分配。显式预演入口保留；实际派发前仍主动获取任务及 GPU 准入证据。
- SimpleExperiment 将当前设置前缀传入两类清理入口，SimpleSFTP 冻结本次请求前缀并创建 `<前缀>-clean-<项目短ID>`。非法前缀在创建前拒绝，旧清理执行器仍按原 operationId、实际 tmux 和文件系统查询，不重复创建执行器。
- 新建 Scheduler 会话使用 `<前缀>-sch-<项目短ID>`。已经存在的旧控制会话按原生项目/Worker 绑定继续定位，保留运行和排队任务；旧控制会话消失后，新建才使用当前前缀。不批量改名或关闭现存窗口。
- 未新增服务器作业状态文件。内存中的有限控制地址提示仅用于定位；每次控制请求仍验证真实端点身份，不能据此判定运行状态。

自动同步、静态入口探针、全部启用 Worker 就绪检查、正式输出目录创建、精确删除双确认和目录安全保护均保留。没有新增科研依赖、数据或环境检查。

## 验证

- 最终 SimpleExperiment `npm run package` 644/644 串行通过，包括 build、类型检查、面板脚本、真实隔离 tmux、运行/排队保留及新任务六槽并发回归。
- SimpleSFTP `npm run package` 的全部串行回归通过，含实际隔离清理窗口前缀、删除/移动、丢失响应主动查询、忙操作等待及固定路径保护。
- 新增或补充回归验证版本字段、相关变化失效、减少资源预演请求、同步与版本检查重叠但不提前释放目标、两个清理入口传入前缀、非法前缀拒绝和旧 Scheduler 兼容。
- Headless Edge 使用实际面板生成脚本，点击 GPU 卡片、返回总览和分组展开，确认各任务入口只出现一次；截图已按约束移入系统临时截图目录的 clean_dir。
- vm.Script、渲染后脚本解析及 Agent/Scheduler/清理 Python 语法检查通过；未写入额外 bytecode。主插件 361 个包内 dist 文件、配套包 24 个 extension 文件逐项匹配磁盘构建，运行闭包及秘密排除通过。
- 首轮构建发现 HTTP 测试夹具缺少新控制窗口查询依赖；补齐夹具后通过。原隔离 tmux 测试偶遇退出标记早于退出码的读取竞态，改为有界等待完整退出证据，未为测试修改生产退出判定。最终完整打包重新通过。
- 保留原有 pycache、迁移脚本、运行目录及历史包校验文件，未纳入提交。

## 待实机验收

用户执行 **Developer: Reload Window** 后，通过“准备 Agent”正常更新远端 Agent 与独立 Scheduler。既有旧控制会话名称可继续保留，不代表又创建了无前缀窗口；以后新建使用当前设置。

本轮没有部署生产服务器，没有启动科研训练或删除真实产物。实际插件重载后的分组展示、生产端清理窗口命名和真实 PLAN 提交耗时仍待实机验收；隔离 CPU 回归不替代生产运行验收，也不承诺未经测量的提速比例。
