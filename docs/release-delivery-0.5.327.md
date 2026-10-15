# 0.5.327 修复 Agent 部署前的隧道依赖

## 原因与修复

本机操作记录连续出现 `prepareAgents: fetch failed`。通过现有插件 API 的只读 `agents.lifecycle inspect`，确认四台 Worker 的指定 Agent 窗口均运行 0.5.326，来源哈希匹配；本机记录中的四个转发端口未打开。

问题位于同版本 Agent 的复用分支：部署通道已经在服务器本机核实服务归属与健康，Host 随后为了核对独立 Scheduler，又访问尚未打开的本机 HTTP 转发端口。准备流程原本在部署完成后才打开 Xshell，因此复用分支提前失败，自动打开隧道的步骤未执行。

修复后，SimpleSFTP 的受限部署控制器从已验证的服务器本机健康响应中传回 Scheduler 证据，Host 直接使用这些本轮证据。保留原顺序：部署 Agent/Scheduler，然后自动打开 Xshell 隧道，最后核实实际运行版本和文件哈希。没有把打开隧道改成用户必须提前执行的操作。

Scheduler 过旧仍通过已授权的精确 Agent 窗口重启流程完成更新；运行和排队任务保留。缺少 Scheduler 证据继续明确报错，提示更新配套 SimpleSFTP；不假报核实成功。返回字段使用允许列表，不包含 Scheduler 控制通道密钥、端口或其他任意健康字段。

## 发行与安装

| 组件 | 源码提交 | 稳定 Release | VSIX 字节数 | SHA256 |
| --- | --- | --- | ---: | --- |
| SimpleExperiment 0.5.327 | `ea7137d388fc4990016319a1b0be10cef659e055` | https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.327 | 2862226 | `98cc6b4d1fd8bbefdcb4540bb6a5d7b57bd8bed8ffa6ece0f26ec93c017220ea` |
| SimpleSFTP 0.2.90 | `23beafc52e4e310001e74a5730f0eae541bbc1bc` | https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.90 | 168173 | `d7fcbc0df6eb606d52146e28c30cb1f75851da01e29042a403127f3ffeb4eb65` |

两个提交均已确认存在于各自 origin/master。主插件普通推送曾遇到 ref 锁竞争，随后 fetch 与 ls-remote 证实远端已是完全相同的目标提交；没有 force、合并或重写历史。

两个真实 Latest 均非 draft、非 prerelease，分别绑定上述源码提交；包含 `.vsix` 与精确文件名的 `.vsix.sha256`。使用已安装 0.5.326 的真实 ReleaseClient 检查更新并下载实际资产，核实两个包的版本、平台、提交、大小、SHA256 和逐字节一致性。

全部发行验证结束后，各执行一次 `npm run install:latest`。核实已安装 SimpleExperiment 0.5.327、SimpleSFTP 0.2.90，以及 Host、Agent、Scheduler、共享生命周期控制器字节匹配和 simpleex 入口。安装后未操作插件面板或 API，等待用户重载。

## 验证与待验收

- 先新增真实部署方法的关闭隧道复现，旧实现稳定抛出 `fetch failed`，修复后通过。健康 Agent 复用不重启，旧 Scheduler 按证据重启；缺少证据仍拒绝宣称成功。
- 真实隔离 tmux/HTTP 生命周期夹具验证服务复用返回服务器端 Scheduler 证据，并过滤未知密钥字段；保留动态地址、端口、精确窗口、来源哈希与任务保护回归。
- 最终 SimpleExperiment `npm run package` 645/645 串行通过。配套 SimpleSFTP 打包回归通过。build、类型检查、面板脚本、Python 语法、运行闭包与秘密排除通过；361 个主插件 dist 文件及 24 个配套包文件匹配已验证构建。
- 本轮生产操作仅为上述服务器只读检查，未重新部署、重启服务、启动训练或删除真实产物。用户重载后再次点击“准备 Agent”，实际确认自动部署、打开隧道及最终核实的完整入口；这部分实机验收尚未执行。
