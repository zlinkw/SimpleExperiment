# 0.5.371 交付记录

## 问题与修复

隔离回归复现了失败响应携带空 files 时被判定为 absent 的漏洞；没有收到清单的节点也可能被当作缺失。现在元数据查询拒绝失败、无效和显式不完整的响应，未收到本轮清单及不可读子树均为未知。主动内容比较也拒绝失败或不完整清单。成功读取的空清单与查询失败分别处理，不刷新旧证据冒充成功。

页面默认隐藏本轮比较信息一致的文件和子树，查询未知项仍可见，也纳入异常筛选。全部查询失败、无法列出任何文件名时，目录标题直接列出未读成功的服务器，不以“0 个文件”表示空目录。确认缺失、查询失败、读取中和本轮未列出分开显示，具体错误留在提示中。

同一文件按类型、大小和修改时间合并副本位置，例如 nwpu2、nwpu3 共用一份时间及大小信息。主动内容比较按完整 SHA256 和时间分组，界面只显示缩短的指纹；目录仅合并相同汇总展示，不以相同计数证明内容相同。每个服务器保留独立来源及操作按钮，分组不是批量操作授权。“显示一致项”和“显示全部”退出组合筛选，不改变传输范围或原有勾选。

完整文件核实、全部启用 Worker、主动内容比较、精确路径、父目录检查及永久删除双确认保留。未启动、停止、重提或重跑科研任务，未修改现场项目、环境、产物、指标、日志或权重，未执行清理。

## 代码验证

相关单文件串行回归共 32 项通过：元数据 7 项、真实生成页面及实际调用链 20 项、编译后 UI 5 项。覆盖失败响应与成功空清单、部分成功、全部失败、不可读子树、断线恢复、旧轮次回包、取消、分组来源绑定、隐藏一致项、保存范围及组合筛选。新增用例先复现失败，再修复并通过；没有 20 秒挂起后重试。

最终 npm run package 退出 0，完整 build、Windows flow 和 259 模块、2 入口运行闭包通过。lint、vm.Script 模块与真实生成脚本、UTF-8 严格解码、禁止端口扫描和 git diff --check 通过。打包不安装；补充组合筛选及全部失败展示用例后重新完成最终打包，发行只使用最终冻结包。

VSIX 身份 simple-local.simple-experiment，版本 0.5.371，平台 universal，546 条 ZIP 记录、380 个 dist 文件。包内版本、runtime 指纹、依赖闭包、秘密及机器状态排除检查通过。

## 当前现场证据与验收边界

安装前通过新读 discovery 和 capabilities 确认 SimpleExperiment 实际运行 0.5.370、SimpleSFTP 0.2.97，PID 11880。当前工作区 MultiModal，四个启用 Worker 的配置根与已观察项目根一致。本轮没有将插件版本当作远端 Agent 或 Scheduler 版本。

通过 SimpleSFTP API 的 metadataOnly 只读查询 experiments/plans/comparison，nwpu3、nwpu2、nwpu5、jqg_zlk 各返回 20 个文件，耗时分别为 507、964、1398、3604 毫秒，无未知条目。2026-10-17T12:00:42Z 对本轮清单的新聚合重放记录为 Worker 间缺失 0、大小或时间差异 19、信息一致 1、查询未知 0。例如 aoept.yaml 的 nwpu3、nwpu2、nwpu5 可合并为一组，jqg_zlk 为另一组。

本机随后同目录只读枚举为 13 个文件；与本轮远端清单合并得到本机缺失 7、大小或时间差异 20。缺失与差异可重叠，未比较内容，不表示科研任务失败。这是当前有限目录清单验证，不是整个项目、远端索引性能或新版面板的现场验收。错误响应与断线等故障情形由隔离回归验证，不能冒充本轮现场故障。

## 源码、发行、安装

源码提交 94d47a92d8b681c811ac6967b30d15360603600e，普通 fast-forward 推送 origin/master，fetch 核对一致。稳定 [v0.5.371](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.371) 及其 tag 均绑定此提交，真实 Latest 的 draft=false、prerelease=false。

- simple-experiment-0.5.371.vsix：3137002 字节，SHA256 7b753cd999835d90bc618563baabf2a326708a06b4cecdd4c76fca9f697d93bb。
- 同名 .vsix.sha256 清单绑定上述精确文件名。通过实际已安装 0.5.370 的 ReleaseClient 确认 Windows 可发现更新，并下载真实 VSIX 和清单；其字节等于冻结包。
- 配套复用 [SimpleSFTP v0.2.97](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.97)，提交 f9cef011a375df1d09c4727e76ec0ee34a4d9d61；171731 字节，SHA256 1dfe226df01ef0d0a9a770d5ec6e9eb8d8a5deb6f0688ab982e54e61b2126af3。真实 Latest 与下载字节一致，未修改或重复安装配套包。

冻结包与真实下载验证副本保留在 C:/Users/ZLK/AppData/Local/Temp/simpleex-0371-delivery-VP4Zae。

显式执行一次 npm run install:latest，0.5.371 安装成功，无 force 或降级。立即核对 VS Code 已安装主插件 0.5.371、SimpleSFTP 0.2.97，380 个主插件 dist 文件及 simpleex.cmd 与发行包逐字节一致；simpleex 入口与 --help 通过。此后停止插件 API、面板和服务器操作，仅补充本记录及 Git 同步。

需要用户 Developer: Reload Window 后再验收新版页面。本轮未升级远端 Agent 或 Scheduler，不宣称新版现场问题已经解决。
