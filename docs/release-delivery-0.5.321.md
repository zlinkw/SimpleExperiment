# 0.5.321 交付记录

## 源码、发行和安装

- 验证源码提交：`dd6ddbd9b7c5871dc22f2461f02aa9ec3b9aed32`，已普通推送至 origin/master 并 fetch 核对一致。
- 稳定发行：https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.321
- 包：`simple-experiment-0.5.321.vsix`，2,828,900 字节。
- SHA256：`72964f67563a9979c9221cd6a3e8620f9776c1854aacec01627755ce3d279882`。同名 `.vsix.sha256` 绑定精确文件名，已上传发行源。
- 通过已安装 0.5.320 的真实 ReleaseClient 读取 Latest，确认非 draft/prerelease、绑定上述提交、旧版可见更新；重新读取远端 VSIX 和校验文件，确认字节与本机包一致并验证 manifest。
- 配套 SimpleSFTP 继续使用已发行的 0.2.88，本轮未修改或重复安装。配套发行资产也通过原更新解析器重新核验。
- 最终仅执行一次 `npm run install:latest`，确认已安装 SimpleExperiment 0.5.321、SimpleSFTP 0.2.88 及 simpleex 入口。安装后的关闭协调器、手动派发 Host、面板和 Agent/Scheduler 文件逐项与验证包构建内容一致。

## 修改与验证

- `src/clusterAgentRuntime.legacy.ts`：普通窗口关闭不再因旧管理字段缺失返回 500；会话关闭使用精确 session_id，清空保留一个空闲终端。窗口归属从实际 tmux 原生任务属性取得，移除该查询对旧任务快照的依赖。
- `src/extension/GpuTmuxClose.ts` 与 Host：新操作核对完整目标并确认，随后主动查询实际结果；丢失响应不重复发送。正常阶段/前台命令变化不单独使整会话关闭确认失效，原任务身份变化仍拒绝。
- `src/ui/PanelHtml.legacy.ts`：普通会话提供紧凑的“清空标签页”和“关闭会话”；标签名称合并为可点击入口。已核实原生任务可跨名称前缀归入实际 GPU 卡片，未绑定的相似名称不能冒充本项目任务。
- `src/extension/ManualDispatchHost.ts`：在打开服务器和 GPU 选择器前暂停自动派发，取消、失败和完成均释放暂停；保留原 commandId 与未知启动请求的保护。
- `src/tunnel/TunnelClient.legacy.ts`：错误称为 Worker Agent，不再显示 Hub Agent。
- 先重现缺少旧管理字段的关闭错误，以及选择器打开时自动派发未暂停的竞态，再修复并验证。相关单文件 node:test 串行执行；整会话关闭、保留空闲终端、其他会话/Agent 保护、原生任务归属使用真实隔离 tmux 验证。
- `npm run package` 最终通过完整 build、Windows 流程、Python/runtime 及面板脚本门禁。首次打包在编译版版本常量仍为 0.5.320 时被门禁拒绝；重新编译后完整执行通过，未安装失败产物。
- 额外执行窗口切换、任务标签清理和 Host 回归；vm.Script 校验通过。VSIX 243 个本地运行模块闭包、360 个 dist 文件字节及秘密排除检查通过，`git diff --check` 通过。
- 静默浏览器检查实际渲染的按钮和标签排版，截图已按规范移到专用临时 clean_dir，未写入仓库。

## 待实机验收

用户执行 Developer: Reload Window，并通过插件更新 Worker Agent/Scheduler 至配套 0.5.321 后，验收真实会话关闭、清空、当前运行任务置顶及手动派发。开发未操作生产 tmux、训练或科研产物，也未自动部署远端；本机安装后未继续操作当前 SimpleExperiment 面板。
