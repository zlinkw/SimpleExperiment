# 0.5.316 交付记录

日期：2026-10-15。范围：PLAN 错误历史无法中止并清理。未停止生产任务、部署远端、删除真实产物或重跑原 PLAN。

## 诊断与修复

当前 discovery 与 capabilities 核对后，只读读取 0.5.315 插件的 state、tasks.list 和操作记录。`corim.yaml` 先因 `%23` 消失导致查询失败，清除部分条目后，又因缺旧 operationId 报 missing-evidence；`comparison_tuning/cpsc.yaml` 存在同类错误。四台启用 Worker 的查询均为 queryComplete=true、tasks=[]，没有从旧失败记录推断服务器仍有任务。

修复清单读取与关闭窗口之间的竞态；窗口退出状态与归属同次读取，不再逐 pane 补查。失败日志读取时窗口消失，不使整个任务生命周期查询失败。

新增从当前原生窗口绑定恢复精确停止目标的路径，旧父操作、旧 revision 和缺失 Scheduler operationId 不再阻断。全部 Worker 确认无目标后，可以清除残留提示及旧进度；确认后再次主动查询，状态变化或失败不会被当作清理完成。显式本机历史清除同时移除旧操作载荷及查询缓存。

实现及边界见 [plan-stop-reconciliation.md](plan-stop-reconciliation.md)。产物仍走独立完整路径双确认，不因本次运行历史清理而删除。

## 验证

- `npm run package` 完整通过，包含构建、typecheck、逐文件串行回归、面板脚本、Windows 流程及运行依赖闭包。
- 核心回归：planStopClear 39 项、terminalPlanHistory 7 项、tmuxTaskLifecycle 2 项、pulledTaskControl 3 项、localStopControl 3 项。覆盖实际隔离 tmux 关窗竞态、丢失停止响应、缺旧记录、旧 running 状态、确认期间失联、跨项目/非法路径保护和其他任务保留。新增负面断言另行重跑对应单文件通过。
- Python Agent、Scheduler 与新增夹具语法检查、面板 vm.Script、git diff --check 通过。
- VSIX 内 360 个 dist 文件与验证构建字节一致；身份、版本、运行闭包及敏感状态文件排除检查通过。
- 只使用临时夹具、模拟节点和轻量 CPU 命令；未运行科研训练。未执行全仓库 npm test，不宣称所有历史测试通过。

## 发行与安装

验证源码提交：`1cc97b58e845b038f12a5ef89af3e836cba5d765`。普通快进推送并 fetch 核对与 origin/master 一致。

稳定 Release：[v0.5.316](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.316)，绑定上述提交，非草稿、非预发行。

安装包：`simple-experiment-0.5.316.vsix`，2805108 字节。

SHA256：`fa1b915259315134e476a17bc76be4bdb1931eab1dba85a591bc1bad51ee3d93`。VSIX 与同名 SHA256 已发布。使用已安装 0.5.315 的 ReleaseClient 核实更新可见，远端包字节、大小、校验和、清单及发行提交均一致。

SimpleSFTP 继续使用 0.2.86；远端发行包与既有验证包一致，无需再次安装。

仅执行一次 `npm run install:latest`，核对 `simple-local.simple-experiment@0.5.316`、`simple-local.simple-sftp@0.2.86` 和 simpleex 入口。已安装宿主、清理控制模块、Agent/Scheduler 与验证构建字节一致。

安装后停止当前面板及 API 操作，等待用户 Developer: Reload Window。之后通过插件更新 Worker Agent/Scheduler 到 0.5.316，并核对实际运行版本；本轮没有自动更新生产 Worker。真实项目中止与清理仍待重载和远端更新后验收，不能用本机夹具通过代替。
