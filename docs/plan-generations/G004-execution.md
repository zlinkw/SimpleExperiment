# G004 执行登记

压缩前事实及更早原材料引用见 `6f829e1d:docs/plan-generations/G004-execution.md`。逐项receipt/日志/事件/输入见coverage；历史授权、失败、未知和现场保留。本文件cap12000/90%=10800。

## 当前目标与边界

G004 按 identity+argv 冻结增量证据；最终 package 已通过：361 active（125 历史、235 直接、1 新运行）、6 onDemand 未运行。用户批准 219/284 的本任务历史超时例外，原时长分别 20857.309/20119.841ms，不重跑、不放宽未来 20 秒。

不触碰真实 Worker、服务器、SSH、tmux、GPU 或用户配置；新阶段仅授权不抢焦点的现有单项目 UI 检查。真实传输/清理、active results与跨项目未测；本次实际本地UI范围见末节。模拟缺失不证明永久删除。原 26 个脏 dist 中，仅包内 20 项已验证并获准同步，其他 6 项、历史资产及夹具保留。

519重载识别false且缺adapter，未重配重授；341/341及安装为旧版。本人明确业务CLI整体退役，只留UI/MCP；39旧源码已按授权删除并同步，原dist排除而不清理、全局shim不动，仅保留simpleex-mcp。精确范围及六组提交见 `0ff5b277:docs/plan-generations/G004-execution.md`，不得恢复CLI或重放删除。

## 候选、失败与复验

0.5.520 原 compile 8/8 gates exit0/tree confirmed、input=end，receipt `simple_cluster/reports/test-workflow/2026-11-22T18-17-42-383Z-84032-compile/run.json`；Panel模块及三真实script VM通过。生成物保留；该旧证不覆盖当前源码。原完整日志、10890搜索和只读进程短暂重叠及引号失败见 `fc571512:docs/plan-generations/G004-execution.md`。

不利结果保留：B1原失败及20秒timeout后用户准单次复验3/3；tsc首exit2；大删除首遭policy拒、进程未创建；规划、releaseAcceptance、隐私、Worker索引、下载根路径、中立RPC原失败后各自复验，以及CRLF两次失败、fetch TLS失败和恢复，精确结果和日志见 `faffeffc:docs/plan-generations/G004-execution.md`。

runner 增量开发曾有 OOM、解析误拒、临时 JSON 错误、依赖 drift 及旧 mcpWorkerHistory 日志被覆盖；原事件、已修状态与不重跑裁决见 `8ed64825:docs/plan-generations/G004-execution.md`。

actionLifecycle首46/49后修复夹具49/49；接替后误重复已继承job 204/179及误跑onDemand等记录、完整失败与日志见 `170fd06e:docs/plan-generations/G004-execution.md`，误运行不计活动覆盖。

## 审定证据和真实效果

历史job及删锁、runner逐identity+argv审定继承，原日志、未知工具链及284超时例外保留，精确名单见 `52946c4d:docs/plan-generations/G004-execution.md`；不称本轮删除通过或覆盖新G004/289。

旧 Git/UI 夹具、520 与接替后合成验证的逐项输入、结果、失败、工具链和边界见 coverage 与 `6f829e1d`、`9d5cae9f`、`6f14818d` 的本文件；不扩大原证范围或冒称真实 Worker/tmux/删除通过。

旧会话归档后核 session_meta 及原事件，仅修引用路径（`9a69240b` 等），未搬删或重跑；两次逐项数量与待运行结果见 `981fa853:docs/plan-generations/G004-execution.md`。


接替后清理、隔离、同步、tmux、结果及freshResultHost替身检查逐项证据与边界见coverage及 `6afb2ed0:docs/plan-generations/G004-execution.md`，未证明真实删除、Worker或UI。freshResultHost曾20.389秒超时，用户许可修复后原限额复验1/1、7.513秒，原日志保留；旧shell/tmux/GPU等及各job的skip、未知工具链同见该版本，不重跑。

本轮mcpProjectOpsContract 11/11、windowScopeIsolation 8/8及命令包装1/1均exit0；夹具日志见 `c2c60767:docs/plan-generations/G004-execution.md`。

旧67/68/69、91/222/225、226/227/252、141/340/341有限继承，工具链或69根字节未知、340仅现存30项；219/284超时例外与289唯一fresh保留，详见 `6afb2ed0:docs/plan-generations/G004-execution.md`，未证真实外部效果。

历史 dry-run、219/284 用户例外、外层期限修复和脏树 planner 拒绝的逐项细节及原日志保留于 `c2c60767:docs/plan-generations/G004-execution.md`。旧选择不代表当前 build；未运行 planner 拒绝的三项。

## 最终打包与生成物同步

原520 package构建 `f66d3694`，13 gates exit0，包2919747字节、SHA256 `aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba`；闭包/Panel/10890通过，20生成物分组提交，6旧脏文件保留。首git add exit1但已暂存7项，总控审后提交；完整receipt与原事实见 `49e1cebd:docs/plan-generations/G004-execution.md`，旧包不覆盖后续源码。

试行 Release `v0.5.520` 已发布，`prerelease=true`、`draft=false`，远端 tag 指向 `7bf49ba84802df56821b098b440b289d3d3eb61e`；VSIX 与同名 SHA256 资产已上传，隔离下载的 SHA256 与已验证包一致，manifest 校验 exit0。实际 ReleaseClient 核实 0.5.482 可见权威 0.5.483、0.5.520 不降级，SFTP 0.2.120 不降至权威 0.2.118。

520唯一安装 exit0，安装日志 `%TEMP%/g004-520-install-20261123.log` 保留DEP0169警告；原安装/重载及shim字节证据见 `86e35b7b:docs/plan-generations/G004-execution.md`，当前源码未装。

## 520 单项目界面及只读验收

520专用窗口PID45080、根及SFTP同实例身份和识别后的真实UI/MCP只读证据、初次坐标失败、恢复及日志见 0a662506:docs/plan-generations/G004-execution.md 和coverage；默认稿件未调用，低流量保留、onboarding=true，Worker/GPU/tmux未查询。初始probe pending不是已通过；未真实传输、清理或跨项目。文档压缩两次写前超限失败及恢复保留于原记录。

## 当前预览修复与探针调查

原 `synthetic/final.csv` 合法宽表两行因只按文件名选long误报0；现预览传文本及列映射，并只计含指标记录，保留后行有值场景。原文件及底层解析不变，细节见 `e9ed2a97:docs/plan-generations/G004-execution.md`。

CSV宽/长/JSON原回归及两次首失败日志见 `18f587b2:docs/plan-generations/G004-execution.md`；520仍旧实现。

后补显式 metric/value 列映射、alias 及零值验证，原单文件 6/6 exit0、799.2334ms，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`。

旧母集11缺陷逐ID对账；原失败保留，未审及外部效果不冒通过，实际窗口范围见coverage。

## 当前探针及构建门禁

探针补真实RAF同ID ACK及hidden/generation保护，Host保留pending前停滞计数；原11/13 exit1，修协议和经本人批准的offscreen夹具后13/13及Host 6/6 exit0。日志 `%TEMP%/g004-render-full-current-20261123.*.log`、`g004-render-host-progress-20261123.*.log`；首失败 `g004-render-probe-20261123.*.log` 保留，未构建部署。

原build含禁止重跑场景，未启动；增量build保留原门禁、assemble仅package。先前规划316/367、按需0非构建通过；G004 pattern 1/1日志 `%TEMP%/g004-build-incremental-runner-20261123.*.log`、`g004-build-incremental-aggregate-20261123.*.log`，runner `6afb2ed0`。planner拒绝依赖漂移，需逐项对账及总控审定；总控只读路径/glob错误未触产品，原文见 `49e1cebd:docs/plan-generations/G004-execution.md`。

旧执行会话归档后核实60条direct的122个原事件哈希和session身份，仅修coverage路径。新增7项同根520 MCP只读与plan_list合成证据见coverage，真实Worker和跨项目未测；压缩前两稿11639、11331字符均写前断言退出。

## 停止路由及旧证

停止精确Worker与未知保留意图候选、假端12/12、首次失败及未部署状态见 `cd66811a:docs/plan-generations/G004-execution.md` 和coverage；未访问真实Worker。SFTP 28087f3取消归属、假handler8/8及首2/4失败与旧119/120原日志缺口亦见该版本，未真实取消。草稿全机制退役，旧测试/兼容记录仅历史事实，不恢复。旧attempt提示仅旧或异常响应可达；当前declared路径无证创建attempt。所有旧glob/引号/压缩/探测失败保留该版本，未改产品。

## 当前补充调查

压缩前完整逐项、首失败、日志、真实限制及历史状态保留在 `7dfd6db5:docs/plan-generations/G004-execution.md`；当时的候选/HEAD为历史，以下是当前事实。旧资料不可代替新源码构建。

停止路由候选按精确Worker/command停止并保留unknown意图，假端12/12及首失败见 `cd66811a`；渲染和结果候选仍未build、未安装。草稿和业务CLI已退役，旧记录仅历史事实。

缓存confirmed_paths源码 `7845afea`、Plan恢复 `0b6b4b4e`、Git项目绑定 `0a1eb56f`/`82e3093b` 已同步；原假端验证、首失败及真实效果限制见压缩前记录。缓存持久请求和原子发布围栏不能证明重启前未知执行器退出。

SFTP `28087f3`、`d4ed002`、`b3da0b5` 分别修取消归属、交接目标和严格下载范围，受控测试和首次失败见压缩前记录及coverage；旧119/120逐文件日志及工具链缺口仍待收敛，未实际传输或安装。只读比对时误猜tag `0.2.120` exit1，随后查得 `v0.2.120` 并完成差异对照；未执行Git写入。

增量build此前规划316任务/0按需，旧HEAD和selection已过期。Agent仅24旧job与14 direct的精确依赖按总控审阅适用，旧skip/超时/工具链未知保留；下一首拒legacy漂移，未运行编译、构建或矩阵。逐ID现行源码及有界旧证见coverage，不能汇总为全部通过。

输出模板生成项目绑定及发布前fence `fedd8bc9`/`7dfd6db5` 已同步并经总控源审，假端4/4 exit0，首2/3失败及原因见压缩前记录；未build。审核页5个确认变体逐ID受限证据见 `3a916416`，实际删除/覆盖未执行。

隔离永久删除源码 `0275a980` 已同步：去历史队列资格门禁，原ID及后端逐组发送状态持久化，同锁防重复；旧未知不得因文件缺失抹除，已发组仅真实对应回执可结清。纯内存真实方法 `%TEMP%/g004-isolated-confirmed-v9-20261123.{out,err}.log` 11/11 exit0，前v1至v8各自真实结果保留；共享缓存原消费者 `%TEMP%/g004-isolated-cache-consumer-v1-20261123.{out,err}.log` 1/1 exit0。原fixture含rename未执行；跨Host崩溃后原发起者未证结束保持unknown，旧版已完全抹除的身份不能恢复。不称构建、部署或真实效果通过。

裸PlanCleanup内部消费者使用真实后端completion receipt判定，不因缺Host钩子假成功；`%TEMP%/g004-isolated-confirmed-v11-20261123.{out,err}.log` 12/12 exit0，含完整真实service配内存fs/后端的完成及丢回执。首次v10 11/12 exit1，因测试把apiData.code按message匹配，修断言后复验；原日志保留。共享缓存当前单项 `%TEMP%/g004-isolated-cache-consumer-v2-20261123.{out,err}.log` 1/1 exit0。原 planRunIsolateRerun 精确case的fixture已更新真实协议字段，原断言保留、尚未执行，待实际新build产物后按总控批准原20秒验一次；其他旧fixture/oracle也未运行。

Git覆盖审核等待状态或写入期间切换项目时，现于后续fetch、确认、删除、暂存索引写、工作文件写和引用更新前检查原项目，已发生的操作如实保留。真实方法配假VS Code/Git/文件端 `%TEMP%/g004-git-overwrite-project-v2-20261123.{out,err}.log` 3/3 exit0，首v1 2/2按当时输入保留；未运行真实Git覆盖、删除或跨项目操作，源码待build。

总控更新plan时首次候选16267字符触发写前断言退出1，外层后续diff-check显示0；文件未写。缩短后16183字符并UTF8复读通过，原事实保留。

检查服务器配置入口发现共享SimpleSFTP profiles读取错误及坏JSON被当空配置覆盖，且等待中切项目后仍可写配置或启动下一动作。候选仅将ENOENT当缺省，其他读取/格式错误向上抛出；绑定当前项目并在原子发布前复核，快速配置等待后不继续新动作。真实方法配假fs和假发布器 `%TEMP%/g004-sftp-profile-fence-v2-20261123.{out,err}.log` 4/4 exit0；v1 3/3为增加首个等待分支前证据。未读写真实共享配置、启动Agent或访问Worker；发布前检查与系统rename并非不可分割事务，候选尚待构建及源码复核。

补核同一共享文件可由另一窗口修改，发布前比对本次原始文本；变化则报错保留对方更新。假端 `%TEMP%/g004-sftp-profile-fence-v3-20261123.{out,err}.log` 5/5 exit0，原消费单项 `%TEMP%/g004-sftp-profile-consumer-v2-20261123.{out,err}.log` 1/1 exit0。只保证发布前可观察到的变化会停止，不称检查与系统rename不可分割；未读写真实共享文件。

原setupWorkDirectoryWorkflow静态消费者夹具仍要求已退役Hub文案；按当前Worker唯一入口更新等价检查后，纯源码文件 `%TEMP%/g004-sftp-profile-original-consumer-v3-20261123.{out,err}.log` 3/3 exit0。它不执行Agent、项目配置或Worker操作，也不证明外部效果。

调度设置原先边构造数组边调用config.update，后续字段校验失败时前面的全局设置可能已写；现先计算并校验整组再启动原更新。真实Host方法配假配置 `%TEMP%/g004-scheduler-config-validation-20261123.{out,err}.log` 2/2、原设置消费者 `%TEMP%/g004-scheduler-settings-consumer-20261123.{out,err}.log` 4/4、配额精确case `%TEMP%/g004-scheduler-quota-consumer-20261123.{out,err}.log` 1/1，均exit0。未修改真实设置；若实际update异步失败，已发生的其他更新仍可能保留，不称事务回滚；未build。

删除Worker配置确认等待期间，同ID配置可被替换；现重核被确认的配置快照，变更则要求重确认，原取消及只移除所选项不变。真实方法配假配置 `%TEMP%/g004-worker-config-confirm-20261123.{out,err}.log` 2/2，原消费者精确case `%TEMP%/g004-worker-config-consumer-20261123.{out,err}.log` 1/1，均exit0；未修改真实Worker或共享配置，未build。

资源树tmux总览和等待占位的点击只导航并上报section interest，并不直接调用刷新；源码候选将提示改为使用刷新按钮，未触发真实tmux查询。该文案在Panel源内，与健康探针组一起等待原build及真实内嵌脚本VM门禁，未提交。

生成隧道脚本原先选择保存位置等待期间可能混合旧Worker和新项目/配置；现保留原保存入口并在生成前核项目和实际Worker隧道参数。原真实方法假对话框/假写入器及命令构造 `%TEMP%/g004-tunnel-script-identity-20261123.{out,err}.log` 2/2 exit0，包括切项目/配置无写入；未写真实脚本、启动隧道或访问服务器，待build。
