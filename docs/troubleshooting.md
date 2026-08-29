# 故障排查

优先运行 `SimpleExperiment：打开面板` 后的“自检”。

常见状态：

- `Agent stale`：实时流心跳超时。插件会保留 last-known-good 数据。请部署最新版 runtime 或重启 Agent。
- `Hub offline`：Hub 本地隧道或 Agent 不可达。不会自动启动 Worker 扇出。
- `Worker degraded`：只有该 Worker 过期或离线，其他 Worker 继续工作。
- `Runtime outdated`：runtime manifest 或 hash 不一致。请运行“部署最新版 Agent 到全部服务器”。
- `Direct fallback disabled`：插件已禁用直接远端回退路径，所有访问必须走本机 Xshell 隧道。

需要定位问题时，运行“生成脱敏调试包”。调试包包含脱敏后的配置、诊断、操作记录、错误、审计日志尾部、runtime 状态、Agent 状态和自检结果，不包含实验产物或大日志。

## 远端执行（tmux / bash -lc / conda）专项坑

Agent、Scheduler、Worker 任务都通过 `tmux ... bash -lc "<script>"` 在远端运行。下列坑专门记录在此：
[bash -lc 远程执行踩坑记录](bash-lc-pitfalls.md)（conda 激活失败致会话自毁、嵌套双引号吞掉日志重定向、
tmux 继承 SERVER 环境、`>> log` 只重定向末条命令、Python 3.8 运行时兼容等）。改运行时模板前必读第 7 节自检清单。
