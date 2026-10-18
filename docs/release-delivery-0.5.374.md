# 0.5.374 文件索引增量加速交付

## 实现

本机持久加速基线采用带事务摘要的有界增量日志，重载后主动校验目录及文件身份，只重新枚举变化目录，文件属性采用有界并发。目录时间不能验证已有文件内容，因此 Windows 与无连续可靠日志的文件系统仍执行实时 stat；不依赖另装 Everything 或管理员服务。

Worker 在既有 Agent 状态目录内保存 SQLite WAL 事务基线。已识别的 Linux 本地文件系统使用 inotify；刷新前后主动排空通知，按变化目录更新。溢出、监听失败、取消、重启和未知/网络文件系统转为保守校验，至少每 30 秒的主动刷新也核对所有身份。关闭页面保留最多两代快照；VS Code 重载通过主动刷新核对 Agent 实例及 generation 后接收增量，游标不可用时重取完整基线。

共享目录 JSON 缓存直属条目、子目录引用和汇总，只重算变化路径及祖先。文件操作前后主动刷新精确范围并失效旧观察；删除后的后代、计数和摘要跟随实际查询更新。目录被文件替代时，其旧后代也确认不存在。失败和未查完不生成缺失。PLAN、产物及源码确认继续实际读取 stat、SHA256、manifest 和身份，不直接使用加速基线。

## 验证

- 最终 npm run package 退出 0，完整 build 与 Windows flow 共 990 项测试通过，失败 0；单文件串行运行，有 20 秒上限。新索引回归 6 项，包括 WSL 原生 Linux inotify、SQLite 重启恢复、单文件/目录消失及重建、日志损坏、查询失败、节点变更和过期确认防护。共享索引回归 14 项，包含生产文件操作前后挂钩。
- npm run lint、git diff --check、PanelHtml vm.Script、UTF-8 严格解码、禁止端口检查通过。
- 消费项目 d:/GitRepo/MultiModal 现场 16668 文件：旧全量扫描 4150 ms，新冷启动 1477 ms，无变化刷新 433 ms，重载校验 491 ms。新旧路径、大小及毫秒修改时间一致；无变化刷新与重载均未枚举任何目录。顺序读取会受到系统缓存影响，此数据仅代表本次现场观察。
- 通过当前 SimpleSFTP 主动读取四台启用 Worker，nwpu3=20167、nwpu2=20063、nwpu5=19934、jqg_zlk=19640 文件，本机及四台全部完成；查询过程中未完成位置始终为未知。该轮使用既有服务器运行版本，不能当作新 Worker 加速器已经部署或完成新面板验收。
- 通过 agents.lifecycle inspect 核对四台当前 Agent 均运行 0.5.373；未更新或重启远端 Agent/Scheduler，未启动科研任务，未修改消费项目文件或执行新的永久删除。隔离测试用移入排除区验证真实路径消失及增量更新。

## 安装包

最终包 simple-experiment-0.5.374.vsix，3182365 字节，SHA256 为 962311b895cd04d5dd5481618d6a551a4d5ef1d631fcab0d81f03554c3128e81。

身份 simple-local.simple-experiment，universal，engine ^1.100.0；553 条 ZIP 记录、384 个 dist 文件与最终构建字节一致，262 模块/2 入口运行闭包、runtime 版本、UTF-8、秘密及机器状态排除核验通过。冻结包及精确文件名绑定的 .vsix.sha256 保存在 C:/Users/ZLK/AppData/Local/Temp/simpleex-0374-acceptance-20261018/frozen。打包不会自动安装或发布。

现场证据和日志保存在 C:/Users/ZLK/AppData/Local/Temp/simpleex-0374-acceptance-20261018；discovery token 未写入证据或提交。配套复用 SimpleSFTP v0.2.97，当前稳定更新源及已有 SHA256 已核对，无需变更或降级。

## 发行与安装

源码提交 2549fac9c66a63f6e617dd7288ecbe814853eeb3 普通 fast-forward 推送 origin/master，fetch 核对一致。[稳定 v0.5.374](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.374) 和 tag 均绑定该提交。真实 Latest 为 draft=false、prerelease=false，资产名、大小及摘要与冻结包一致；刚发布时有一次旧 CDN 回应，随后实际 0.5.373 ReleaseClient 重新查询通过，识别 0.5.374 更新，并下载真实主包、配套包及各自清单，验证精确字节、SHA256 和身份。

主包为 simple-experiment-0.5.374.vsix 与 simple-experiment-0.5.374.vsix.sha256。配套 SimpleSFTP v0.2.97，提交 f9cef011a375df1d09c4727e76ec0ee34a4d9d61，171731 字节，SHA256 1dfe226df01ef0d0a9a770d5ec6e9eb8d8a5deb6f0688ab982e54e61b2126af3，真实 Latest 下载及清单一致，未重复安装或修改配套插件。

显式执行一次 npm run install:latest，0.5.374 安装成功，无 force 或降级。立即核对 VS Code 已安装主插件 0.5.374、SimpleSFTP 0.2.97，384 个 dist 文件和 simpleex.cmd 与发行字节一致，simpleex --help 通过。安装后停止当前插件 API 与面板操作，等待用户 Developer: Reload Window。

远端 Agent 仍为现场 inspect 取得的 0.5.373。新服务器加速器的实际部署、部署后冷/热读取及重载后的真实面板验收尚未执行；需重载并按实际节点、运行目录和指定 tmux 窗口确认远端更新，不能将隔离回归或旧版服务器元数据查询冒充部署验收。此交付记录在打包后补充，不改变已冻结、发布及安装的 VSIX。
