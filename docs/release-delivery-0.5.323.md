# 0.5.323 交付记录

## 源码、发行和安装

- 验证源码提交：`78b2390b98e009a9db1995b1eaaeea7c20e9b17a`，普通推送 origin/master 后 fetch 核对一致。
- 稳定发行：https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.323 。非 draft/prerelease，绑定上述提交。
- VSIX：`simple-experiment-0.5.323.vsix`，2,844,653 字节。
- SHA256：`4a1aeabe082572fa29ce6f1c8549144a00fb5a9ef0347909e196d8f7849ce71a`。同名 `.vsix.sha256` 绑定精确文件名；两项资产已发布。
- 通过实际安装的 0.5.322 ReleaseClient 查询 Latest，旧版可见更新；重新下载发行 VSIX 和校验文件，确认字节、大小、SHA256、平台 manifest 与绑定提交。配套 SimpleSFTP 0.2.88 资产复核一致，本轮未修改或重复安装。
- 最终仅执行一次 `npm run install:latest`，核实安装 SimpleExperiment 0.5.323、SimpleSFTP 0.2.88 及 simpleex 入口。Host、查询模块、原生生命周期模块及 Agent/Scheduler 文件逐项与构建核对一致。安装后停止操作当前插件面板及 API，等待用户重载。

## 复现和修复

- 通过正在运行的 0.5.322 插件只读 API 连续六次采样，复现多个 PLAN 的同一失败 job 在 failed 与 unknown 间反复切换；正常执行中的 job 保持稳定。没有启动、停止或重跑任务。
- 当前失败 job 被结果查询选择排除；服务端查询又过滤未选中的已退出窗口，随后本机改为 unknown，下一轮又查到失败。修复为持续查询当前失败 job，并保留实际 tmux 中存在的所有本项目任务窗口。不会将缺少身份的历史记录补成当前任务。
- 提交预检的临时查询不再覆盖运行进度使用的查询结果；查询失败、恢复和原生执行/结果变化正确使显示失效，缓存有明确有效期，不把旧缓存当作当前服务器状态。
- 未新增服务器状态文件；未恢复旧回执、事件或任务记录裁决；真实错误和对应窗口日志入口继续保留。

## 项目报错核对

- 当前 H20 的 unimix_ad PAD seed 43、44 失败窗口退出码为 1，日志明确为 `ValueError: 模型类别维度与 label_schema 不一致`。当前卡片中另有相同错误的 corim、tmdc、aoept PAD 任务记录。
- 对照项目本机源码，异常位于 `experiments/quality_composition.py:221`：配置 `model.num_classes` 非零且不同于预处理 `label_schema.json` 的 `index_to_label` 数量。该检查由 `test.py` 的质量评价分支调用。
- 这证明项目测试配置与预处理标签定义不一致，不能仅据此认定原始数据损坏或判定应修改哪一方。未修改科研配置、标签、数据、权重、环境或重新运行任务；nvJitLink 环境库优先提示不是这条 ValueError 的原因。

## 验证与限制

- 新增 taskProgressStability 单文件回归先复现 5/5 失败，再验证 5/5 通过；包含实际 Python 查询函数、当前失败结果选择、Host 查询发布、错误/恢复、投影到期和临时清单隔离。Python 只提取被测函数。
- 串行执行现行任务生命周期、实际隔离 tmux、查询回归、卡片简洁显示与队列稳定性回归。
- 最终 `npm run package` 退出码 0，必需串行回归 615/615 通过，包含 build/typecheck、Python/runtime、面板脚本、Windows 流程及 VSIX 闭包门禁。
- `vm.Script`、`git diff --check`、包内秘密排除检查通过；361 个 dist 文件逐项匹配，244 个本地运行模块闭包通过。
- 额外旧 serverAuthoritativeProgress.test.js 在本轮源码与基线 429cbad0 Host 源码下同为 5 通过、7 失败，包含旧协议夹具和缺少 cleanupDigest 的抽取环境；未计为通过，不属于当前 package 门禁，未为此恢复旧协议。
- 原有 pycache、旧校验文件和未跟踪迁移脚本没有提交或清理。诊断采样仅放本机临时目录，不参与插件状态归并。
- 本机安装后尚待用户 Developer: Reload Window。远端 Agent/Scheduler 未自动部署，重载及远端更新后的实际卡片验收尚未执行；本轮未改变生产服务器任务、产物或项目文件。
