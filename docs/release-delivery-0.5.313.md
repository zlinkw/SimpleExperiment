# 0.5.313 交付记录

- 验证源码：`11bd99e2e34a276474020a71c215500b8f8359b6`，普通推送后 fetch 确认与 origin/master 一致。
- 稳定发行：[v0.5.313](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.313)，绑定上述提交，非草稿、非预发布。
- 包：`simple-experiment-0.5.313.vsix`，2,789,326 字节。
- SHA256：`bf180fba1ad336f7d7bfedf4ec8508870b1bba72d6f5a184bb2aa6ed6051fff6`。同名 `.vsix.sha256` 绑定精确文件名。
- 配套 SimpleSFTP 沿用已发布、已安装的 0.2.85；重新核对远端包字节与 SHA256，无需重复安装。

## 修改与验证

- 所有 SimpleExperiment 显式远端删除入口移除 `sync.deletePath` 调用，使用现有受管清理协议；历史通用传输记录不参与删除准入和成功判断。
- 主动核实实际文件与清理窗口；丢失执行响应时只查询，不重复发送。保留完整路径双确认、类型、链接、安全根及直接父目录保护。
- 文件树在完成、部分失败及异常后重新读取实际父目录，废弃旧响应及等待标志；已不存在的项退出树、筛选及勾选。根目录批量操作会重新读取仍展开的子目录。
- 新增调用链、响应丢失、查询未知、实际执行器防重及面板刷新回归。修复既有隔离 tmux 手动准入夹具的固定等待时间竞争；生产调度代码未改。
- 最终 `npm run package` 通过，包含构建及串行单文件回归、面板脚本、Windows 流程和运行闭包检查。另核验 vm.Script、359 个 VSIX 内 dist 文件与本机构建字节一致、包身份及秘密/状态文件排除。
- 配套 SimpleSFTP 的 `cleanupManaged.test.js` 3 项及 `cleanupExplicitTarget.test.js` 1 项通过，包含真实隔离 tmux 删除、移动、目标重建和执行响应丢失。
- 实际安装的 0.5.312 更新客户端识别真实 Latest 0.5.313；在内存读取两组件远端包，核对资产大小、字节、SHA256、manifest 和绑定提交。
- 显式执行一次 `npm run install:latest`，核对安装 0.5.313、SimpleSFTP 0.2.85、simpleex 入口与版本，以及关键安装模块字节。

## 实机范围

安装前只读查询：nwpu3、nwpu2 的 work_dirs 各有 26 项，nwpu5 有 25 项，jqg_zlk 有 0 项。新清理查询接口确认 nwpu3 的 corim 目录存在、jqg_zlk 的同路径不存在，两处均没有活动清理窗口。

没有修改服务器配置、清空真实缓存、部署远端、同步生产项目、训练或删除真实产物。安装后已停止操作当前插件面板，等待用户执行 Developer: Reload Window 并重新打开“项目同步范围与状态”。真实批量删除及完整操作验收待用户重载后确认路径执行，不能用本机回归代替。
