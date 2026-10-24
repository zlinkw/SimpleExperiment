# plan-state-guard 详细计划与 TODO

修订：r19（r22冻结8输入与Linux回归已验；进入Windows完整验收。已读取当前task-code-evidence新版，采用失败分流/同链一次机械自修；串行授权原负责人归档并摘要已验收完成项，未做门禁/有效指导不变）。
负责人：原 CLI 实例 `7d56b783-e8d6-424b-85cb-229863476bcc`；原生 Claude 会话 `7ad89ea3-7db0-49e4-98b1-9081b618c1ab`。
适用版本：worktree `zlk-cluster-orchestrator-plan-state-guard`，分支 `fix-plan-state-guard`，冻结基线 `a7e9c7d35eb49a86447e5546b95ad7ababbba98e`；候选身份见 evidence.md r1 §1 SHA 表。

## 目标、非目标与保护

修复所选 PLAN 提交在 nwpu3 的代码同步前被机器状态映射门禁误拒绝。保留独立端点、实际项目、机器状态目录及祖先保护、未知状态拒绝、批次不回滚和不重复提交。
不修改科研 PLAN/数据/环境、不派发实验、不写外部服务器、不自动部署 Agent、不改清理授权。原脏工作区、其他任务、副本、日志和祖先保留；node_modules 链接不暂存。仅原负责人实现与本地 Git；主控维护本计划、做宿主取证/Windows验收/GitHub操作及最终审核。

## 已确认依据与当前裁定

1. E01/E02/E05：targetRootGuard 中 remotePathKey 是模块未绑定标识符，catch 将错误隐藏为 null；@ts-nocheck 使类型编译不能检出。H04 已安装 0.5.403 的真实编译文件 L9146 也有此调用，SHA256 `90c5e79f752099b77f8a59c7db13ab69f71df02183817bbba0b54c61186f8bab`。
2. E07/H01/H02：旧内存 probe 缺少新绑定字段；仅修复未绑定引用后仍可能被旧形状拒绝。H03 于 2026-10-23T19:58:48Z 只读 GET 实际 Agent health 返回 workerId=nwpu3、协议1及完整状态根，不能把旧缓存缺字段当远端真实缺字段。
3. 不接受候选 hostMatchesOrAbsent/portMatchesOrAbsent 的无条件缺字段放行，也不接受无依据的 Worker id 大小写放宽。完整绑定要求记录的 host/port/绝对项目根与当前有效配置一致；不能只凭缓存键和同拼写项目根授权通过。
4. 优先最小方案：remoteRootsEqual 保留严格绝对路径规范化（无效绝不相等）；在异步代码同步门禁前，对不能安全绑定的旧/缺失 probe 做一次有界只读探测并重核；不修改目标，不重放 PLAN 或任何写入。默认字面值 worker 只按 Agent 合同在端点完整绑定后兼容，其他非默认 id 精确、大小写敏感匹配。
5. stampWorkerProbeGeneration 只跟踪状态/版本/能力变化，不是端点配置代际。不能把 statusGeneration 当作旧 probe 与当前配置匹配的证明。若完整字段重核足以解决旧配置残留，不额外引入全局配置代际框架。

## P0/P1 已裁定（evidence r2 E06/E14）

现成先例为 submissionWorkerProbes 的有界 GET 探测、root/client/generation 围栏与失败即中止，但不直接调用它：它验证任务协议能力，发生在同步之后，且并未解决端点配置在 await 中变化。不得调用 testTunnel/prepareAgents/部署/写证明等替代只读内核。refreshExactPaneStopCapability 缺围栏是旁支问题，本轮不扩修；本操作使用自己的冻结观察，避免背景缓存合并抹掉其结果。

E14 两层 host 不同源风险按当前代码事实直接处理，无需再读宿主 base 设置才能实施：本轮新探测从当前代码同步目标的实际 localForwardHost/localForwardPort/remoteAgentPort、对应 Worker remoteAgentHost（缺省再用既有有效配置）组装 WorkerProbeConfig，不能照搬遗漏 per-worker host 的旧 mapper；传 token 仅走现有探测 header，禁止日志输出。targetRootGuard 与新探测必须使用同一个有效值来源。只影响此次代码同步准备路径，不改全局隧道配置/启动/SSH/SFTP目的地址。

mtime 与同输入重编译不证明历史 src/dist 一致；F04/F05 保留为待生成验证。E06 的非关键 UI 段省略不作为绑定结论，已提供的关键写入/拒绝/围栏足以实施。

## r2 具体接口与执行顺序

1. 在 legacy.ts 的 targetRootGuard 附近增加同步有效探测配置解析方法（建议名 codeSyncRootProbeConfig(target)），使用已冻结的目标字段优先、当前同 id Worker 配置次之、现有合法默认最后；严格核 id、启用状态、有效正整数端口，不能添加固定隧道常量。输出用于 GET 探测的 host/port/realtime 配置和期望绝对 codeRoot。保留 target.remotePath 的现有语义；不能把父目录 agentProjectDir 冒充 codeRoot。
2. targetRootGuard 保持同步方法，允许新增可选第二参数 probeOverride（默认取 lastWorkerProbes[id]），以供本操作消费冻结 probe。导入 remoteRootsEqual 替换未绑定 remotePathKey；完整记录的 host/port 必须匹配，缺 host/port 不直接信任。Worker id 规则为非默认值严格全等、默认字面值 worker 仅在地址/端口/项目完整绑定时兼容；基线空 id 且无新协议的兼容仅在完整 transport 绑定时保留。protocol1 缺任一状态根仍 unknown。不得删/改机器状态路径谓词或显式根并集。
3. 新增异步 helper（建议名 prepareCodeSyncRootGuards(targets, root, assertCurrent, report)），返回 `{ guards: Map<target对象,guard>, assertBindingsCurrent: () => void }`，将 guard 快照与输入目标逐一绑定，不能仅按 id 混合不同目标。先对每目标取得 guard；已有 resolved guard 不额外探测，清单碰状态路径也不能通过刷新来规避。仅 null/unknown/缺可绑定旧 probe 的目标需一次只读探测。已有显式合法配置映射能 resolved 的兼容语义保留，不以新增网络就绪要求扩大限制。
4. 每个需探测目标捕获 project root/client/generation、有效探测配置、同 id 启用 Worker 的项目/安装/状态根/host/port 等相关配置快照、当前 tunnel token 值（只在内存比较），及输入目标原始关键字段。await 前后调用 assertCurrent 并复核全部身份；只比较 captured 对象引用不够，需比较相关字段值，防止原地修改。配置变更/移除/禁用或项目切换则取消，不登记返回结果、不上传。
5. 调用现有 probeWorkerTelemetryTunnel(config,{timeoutMs:8000}) GET 内核，外层沿现有 boundedPromise 约束整个目标探测预算（避免多段 GET 累加到无界），不自动 retry。以 captured codeRoot 调 enforceExpectedAgentProjectRoot；成功后用 probeOverride 计算冻结 guard，再在所有围栏通过时可写 lastWorkerProbes[id]=stampWorkerProbeGeneration(id,probe)。非 ok、异常、超时或仍不可映射，保留明确目标/阶段失败并中止；不将失败包装成通过，不删掉目标继续。控制并发最多2个只读目标请求；若简单串行即可先用串行，不创建后台任务。
6. syncCodeTargets 在 root/enabledTargets 确认后、manifest 构造与任何 confirmRemoteWriteTargets/writeSftpManagerServerProfiles/上传/proof POST 之前调用 helper。为贯穿所有既有 await 边界，可在现有 assertCurrent 定义前设 `let assertMachineStateBindingsCurrent = () => {};`，原 assertCurrent 末尾调用此闭包；helper 返回后赋为其 assertBindingsCurrent 并立即调用 assertCurrent。不得让 helper 的 assertBindingsCurrent 反调这个包装后的 assertCurrent 造成递归。两道原门禁继续存在；远端 guard 检查消费本操作返回的快照，不能被并行背景缓存 timeout 改写。门禁通过到下一次写入之间沿原 assertCurrent，并额外复核目标配置签名；不要擅自改变派发/held Worker/manifest/清理规则。
7. 不实现全局 probe 代际框架，不改所有 cache 写点。不因为新 helper 在测试 mock 中不存在而给生产代码加 typeof fallback；调整相关测试夹具或抽取真实方法。

## 实现要求与边界

- `src/features/ProjectRootMap.ts::remoteRootsEqual`：双方 canonicalRemotePath.ok 才比较；保持 POSIX 大小写与 Windows 盘符语义，不影响其他映射函数。
- `src/extension/legacy.ts::targetRootGuard`：改为真实导入的根比较函数；移除缺字段中性化和 Worker id 大小写放宽；保留 map 的显式状态根并集、protocol1 缺状态根 unknown、无可绑定 probe 且无显式状态映射 unknown、异常返回 fail-closed。
- `syncCodeTargets`：只读补探测必须发生在远端确认/写入前；按目标 id/有效地址端口/项目绑定，开始前捕获上下文，await 后同时重核项目与相关目标配置；变化则取消，不把旧请求结果登记给新配置。最多每个受影响端点一次，不无限重试；探测失败仍阻断且保留明确错误。不为避免门禁跳过 Worker、删清单项或猜状态目录。
- 不将清理/传输安全的同步 guard 变成隐式远程刷新；异步补探测只属于此次代码同步准备路径。
- 回归测试必须直接执行真实编译 guard 与真实同步入口；VM 不得注入生产没有的自由变量。真实模块绑定或生产入口覆盖要能检出重新引入 remotePathKey。哨兵只能证明到门禁之后、上传之前，不宣称真实上传或训练通过。

## TODO

| ID | 依赖 | 动作 | 验收与证据 | 状态 |
|---|---|---|---|---|
| P0 | evidence r1 | 补 r2 指定源码、异步围栏及 H03/H04；保留完整失败历史 | evidence r2 E06/E14 与 H03/H04，哈希已复核 | 已验证 |
| P1 | P0、GPT r2 | 落定 helper、精确文件/接口及失败分支，更新本计划 | 本修订具体接口/执行顺序；原负责人读取后实施 | 已验证 |
| P2 | P1 | 收紧现候选并加一次只读旧缓存补探测 | r5源码c966021a56831bc7，R31–R41边界已核 | 已验证 |
| P3 | P2 | 补真实调用链回归并登记新测试 | r5目标测试7e3cb2790f4dec78，26/26 exit0；原断言保留 | 已验证 |
| P4 | P3 | 必需生成/编译与开发域单文件串行验证 | r5批18文件192/192、rootMap14/14、隔离warm20/20；编译生成字节比对 | 已验证 |
| P5 | P4 | 核远端版本后同步唯一 patch/lock/runtime；完整交付验收与打包 | 第二轮Windows package216文件通过；2项Linux专属补齐；419包项、字节/秘密/平台/版本通过 | 已验证 |
| P6 | P5 | 主控审核真实 diff，原负责人精确暂存/提交 | 509dcb03160a59867a070bc8dcbb42ef1cd965d1，parent=a7e9c7d3，18文件hash逐一核实；docs/node_modules未入提交 | 已验证 |
| P7 | P6 | 主控推任务分支、PR审核通过后合并 | PR7远端18blob逐一等于509dcb03；MERGEABLE/CLEAN正常merge；merge=ab2a1171，API/fetch核最新包含 | 已验证 |
| P8 | P7 | 原负责人参与已登记本机 master/干净祖先仅快进同步 | 双角色master-ancestor仅ff到ab2a1171；三SHA一致、实际18hash/tree等于509candidate、原脏树/任务/其他指纹保护 | 已验证 |
| P9 | P8 | 按项目完成必要发行、一次安装与实际版本校验 | 稳定405 Release/两资产digest、公开ReleaseClient真实发现、一次安装、固定verify-install417文件通过 | 已验证 |
| P10 | P9、用户重载 | 确认405运行与最终CLI；最终功能验收转P17 | 00:39Z宿主已证安装/运行405；新配套更新失败F15须修复，不能宣称配套完成 | 待做 |
| P11 | evidence r15/E16h/F16、宿主快照及journal | 冻结新主线身份/保护指纹，原副本创建返修分支 | fix-paired-update-legacy-lease@ab2a1171；四保护已核，红灯日志p11-red-pairedUpdateLegacyLease完整 | 已验证 |
| P12 | P11、GPT r14–18 | 旧v2兼容、安全读取与PID复用判断；补真实失败回归 | r22八输入冻结；缺根/现代PID复用、侧车、严格idle/时间、持有证明源码审核闭合；用户文件不改 | 已验证 |
| P13 | P12 | 开发编译与目标域串行单文件验收 | r22 Linux legacy35过/1win32待执行、gate2过；tsc0，事务/Bootstrap/实际未变域证据复用；Windows专属属P14 | 已验证 |
| P14 | P13 | 406声明同步、Windows完整package、Linux专属补验、包门禁 | 已核sourcePackageSHA/217唯一路径/0重复与宿主preflight b0b4716e；待原native完整package+原生R60+最终归档 | 进行中 |
| P15 | P14 | GPT审核真实diff，原负责人提交；宿主PR/审核合并 | 本任务范围/基线/SHA核对，普通push/merge，不绕保护 | 待做 |
| P16 | P15 | 原负责人仅ff同步已登记干净master/祖先 | 冻结/脏副本不动，真实代码与候选核验 | 待做 |
| P17 | P16 | 稳定406发行/公开更新发现/安全安装与用户重载验收 | 保留原冻结405+SFTP108事务，不重复安装405或跳锁；安装/运行/重载分别报告 | 待做 |

## 失败指导与旧证据处置

F01–F05 仅保留为历史。新增 helper 不存在的 TypeError 不当作全部产品缺陷；基线阻断所有路径使控制组通过不代表安全保护已被验证。F03 将兄弟文件误认祖先是测试夹具错误，保留旧失败与修正依据，不能删除保护断言。旧 shell echo/grep 顶层退出和未冻结输入之通过不作为最终候选验收。

每次完整实现/验证失败：原负责人写 F 编号、适用计划修订、输入/实际 diff、完整命令/堆栈/真实退出码/唯一日志；通知主控并停止修补。主控依据新增证据修订本计划后，通过同一实例 send 续接。不得自行循环、换负责人、修改验收标准或掩盖失败。

## r2 测试与交付细则

开发先生成当前候选（node node_modules/typescript/bin/tsc -p . --pretty false），核源码/生成物hash，再单独完整执行 planSubmissionStateGuard.test.js。该文件改为执行真实编译 targetRootGuard/同步 helper/入口；只 stub 网络边界与门禁后的写入哨兵，断言 GET 配置、次数、调用顺序及写入次数。覆盖：旧缓存缺字段通过一次新探测获H03形状后通过；缺字段且探测失败仍阻断；现有完整匹配 probe 不探测；worker级 host 与 base 不同按worker实际地址探测；明确记录的异host/port/项目/id不能直接放行；探测后仍错误则失败；默认 worker id 与其他id大小写变体；protocol1缺状态根；配置切换/禁用/移除/项目或client/generation变化，结果不得入缓存或写远端；后台缓存降级不抹掉已冻结观察；嵌套状态文件/祖先阻断和兄弟放行；他端点probe不可借用。测试 timeout 用注入替身，不真实等8秒。

projectRootMap.test.js 保留现有保护断言，移除注入虚构 remotePathKey；根比较新增有效/无效/Windows/POSIX边界。新测试只登记一次到 test:plan-run，新增任务相关测试若拆分也按真实文件一次登记。开发域按反向调用者覆盖相关PLAN准备/提交、传输安全和清理guard测试；原负责人在证据中列精确文件/命令及依据，不以文件名猜覆盖。显式文件测试经现有 pi-test-evidence.py，运行前语法检查、完整日志/真实退出码，单文件20秒、串行；完整测试失败立即更新证据并等GPT指导，不自行改测试再重跑。

首次新回归若确需展示红灯，注明红灯是计划预期的缺陷证明，也须先记录并通知主控更新指导后进入修复；不要为补历史反复还原源码。可复用F01已证明的原缺陷，避免再次破坏当前候选。完成P2–P4后一次提交可审核diff、hash及测试证据；先不递增版本/提交/执行完整package，等主控核最新稳定版本与Windows前置后进入P5。不降低项目强制build/package门禁；完整交付阶段由既有package执行入口覆盖的测试不重复登记运行，先按package的windows-flow-incremental真实去重设计核清。

当前无需用户另行审批计划；合并授权保留。P2–P4不得报告全部完成：存在下面的真实审查问题和必需测试失败。原负责人按r3本次指导返修，任何完整尝试失败先更新证据/通知GPT，再等待新指导；旧计划对局部写法自主决定不构成失败后自行修补重跑的豁免。

## r3 审查与F07后的具体返修指导

### R31：已resolved目标也必须冻结并复核配置

当前prepareCodeSyncRootGuards在`if (guard && !guard.unknown) { guards.set(target, guard); continue; }`提前跳过快照；返回assertBindingsCurrent只遍历observations（仅需探测的目标）。因此完整缓存或显式合法状态配置的目标在清单读取/确认等待期间若变更、被移除或禁用，仍可能用旧guard继续写。15/15没有覆盖这个分支，不接受此实现。

先为所有输入目标建立绑定快照（target对象、root/client/generation/token、相关worker/target/effective字段），单独维护needsProbe子集。assertBindingsCurrent遍历全体绑定；resolved路径不增加任何GET，但不能不围栏。第一次异步前应验证该id确实存在于当前Worker配置且未禁用；缺行不得凭冻结target仍有地址而自行组装网络请求。保留显式合法workerStateDir不增加网络要求，但该目标仍须存在/启用并受配置变化围栏。初始guard结构与同步清理保护规则不顺带改为权限开关；当前运行目标有效性在异步准备helper中核对。

所有探测成功缓存登记前检查`probe.status === "ok"`与完整绑定/guard，不得仅凭显式配置resolved将探测失败回执当成功。syncCodeTargets远端门禁删去`guards.get(target) || this.targetRootGuard(target)`回退，冻结map缺项即原样fail-closed，不从共享活动缓存悄悄补全。整个operation保留已有assertCurrent调用覆盖所有现有await后的写入边界。

新增回归：①现代完整缓存（零GET）在afterBuild中禁用/删除/原地改变目标路径/配置状态根/token/client/generation，必须在sentinel前取消；②显式状态根resolved（零GET）相同变化必须取消；③两个目标中一个resolved另一个需探测，在第二个probe await中修改第一个配置必须取消，不写远端；④开始前配置行已缺失/禁用，无GET也不放行；⑤冻结map缺项不能共享缓存兜底。cache取消断言比较原probe引用/完整字段或整个map快照，不仅断言status仍'ok'。

### R32：取消测试不能成功后continue跳过断言

当前测试`config, endpoint, project, client, generation or token change during the probe...`的catch分支含`if (thrown.message === "SENTINEL-PASSED-GUARD") continue`，恰在出现最危险的误放行时跳过本变体全部断言。删除该逃生分支；sentinel出现必须assert.fail(label...)或交到blocked=false后必然失败。保留全部变体和零写入断言，不删用例。

### R33：端口不允许非法值回退到另一端点

positivePort目前用Number.isFinite并依次跳过非法输入回退默认，接受小数，违反r2正整数和无效映射失败关闭要求。按已规定的target→worker→base优先级选择第一个真正已声明值，再用Number.isInteger且1..65535验证；undefined/null/空白作为未声明可以继续查找，明确的0、负数、>65535、小数、非数值不得跳到下一层或18765。默认值仅在所有层均未声明时沿既有合法默认使用。保持当前字段precedence，不借此改全局配置mapper。新增0/-1/65536/12.5/'bad'与未声明/空白的参数矩阵，断言无GET/无sentinel；明确记录的错端口仍阻断或只在配置稳定时对正确当前端点一次GET，绝不探测回退地址。

### R34：两项warm缓存失败先修进程环境，不改权限或断言

p4-planPreflightProgressSpeed-r2.log完整堆栈已读：warm unchanged... L283 1!==0；warm local listing... L549 40!==0，日志有EACCES `/home/node/AppData/Local/SimpleExperiment/host-operation-lease.json.resources-v2/...ownership.writing`。生产LocalCodeManifestCache.writeCache调用HostOperationLeaseManager；`src/core/HostOperationLease.legacy.ts::defaultHostOperationLeasePath` L353读取`process.env.LOCALAPPDATA || path.join(os.homedir(),'AppData','Local')`。这提供合法的进程局部隔离入口，不需修改生产代码、测试断言或宿主/沙箱目录权限。

由node身份在系统临时根创建本轮独立可写目录，给本轮Linux测试进程及其整条子进程链设置LOCALAPPDATA到该目录，先记录规范路径/uid/写入能力与环境（不含秘密），再通过pi-test-evidence.py完整重跑该单文件（不是只挑2例）。不chown/chmod、不切root、不写真实用户配置、不清理旧证据。环境改变是必要重验原因，记录新日志和hash；若仍失败，完整记录并停等指导，不再自行换路径重跑。基线'同样失败'目前仅会话摘要、未独立日志，不视作最终通过或免责。Windows完整验收仍保留，不用Linux隔离通过冒充Windows通过。

### 执行批次与停点

一次修改完成R31–R33相关功能及回归（不先跑一版再自行试错），生成后先跑目标文件；完整失败即补证据并停止。目标绿后按受影响输入重新计算开发域，必要重验注明源码/测试/环境改变原因。R34在同一合法隔离环境中单文件完整运行；域仍失败就停。补主证据新修订，记录F07历史偏差及本次R31–R34依据和结果，不覆写历史日志。完成后交真实diff/冻结hash/所有必要日志及退出码，等待主控审核；不进入版本、完整包、提交或远端阶段。

## r4 收口指导 R41（基于实际源码与22条回归）

已接受：`enabled !== false`是项目启用惯例，保留未声明enabled的合法Worker，不改成必须true；原计划要求是缺行/显式禁用拒绝，不要求布尔字段必须物化。R31全体快照、R32取消硬失败、map缺项硬拒绝、R34合法LOCALAPPDATA整文件20/20均有对应证据。P4旧warm失败已闭合为隔离环境通过，不能因此省Windows最终验收。

还需同一原负责人一次完成以下小改（不要扩大设计）：
1. 快照targetFields当前遗漏`enabled`，但准备入口明确把target.enabled===false当禁用信号；加入两处相同序列化清单并在后置核对处显式拒绝当前target.enabled===false。新增完整缓存零GET的afterBuild中仅改target.enabled=false用例，必须取消；保留worker行启用兼容。修正文档/注释中误写的target enabled!==true与实际===false不一致处。
2. resolved显式状态根路径目前在snapshot.effective为null时仍可能跳过GET并继续。对所有目标在任何guard冻结/continue之前要求effective有效（不只needsProbe分支），明确无效端点拒绝。新增显式合法workerStateDir+目标或Worker有效层声明端口0/小数时0GET且不触写哨兵的参数矩阵，防止R33在resolved路径失效。有效显式状态配置仍零GET、不新增网络要求。
3. 按r3明确要求，探测回执单独验证`probe?.status === 'ok'`后再接受frozen guard并登记缓存，避免未来显式映射分支变化将non-ok当成成功。保留所有非ok/异常/项目不符的拒绝用例。

端口空白字符串按r3‘未声明’处理（trim为空与空串等价）；显式非法数字仍不得下移。新增一个空白→下层有效端口的断言，避免把正常字段空白当数值0。（以上R41已由evidence r5闭合，历史指导保留。）

执行：改完生成→目标单文件完整运行→按受影响输入必要重验开发域，复用本轮合法隔离LOCALAPPDATA；所有退出码/完整日志/输入hash记录。前置脚本或验证器失败也属于本次验证失败，不允许自定‘脚手架不算失败’例外；立即留原日志并通知主控等指导。F08被覆盖的node误执行.py失败日志不能凭记忆补造，保留原生会话事件引用并如实标原独立日志已覆盖，不再覆盖任何日志。通过后报证据修订和冻结文件hash，不自行进入P5。（历史停点由下节P5a授权更新。）

## r5 P5a：唯一版本、真实命令清单与Windows冻结交接

主控2026-10-24T04:32:52+08重新通过既有gh核实master仍a7e9c7d35eb49a86447e5546b95ad7ababbba98e，Latest=v0.5.404且绑定a7e9c7d3；固定交付脚本核v0.5.405 Release明确404、候选暂存为空且无阻塞。允许本任务唯一下一patch为0.5.405；不碰配套SFTP版本。回执 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/delivery-check/df5fb544-c4ca-4735-a0e3-111d446f5a89/receipt.json；远端日志 host-windows/8fd208e6-020d-48d8-95f6-31b0d79f2bc5-stdout.log。

原负责人仅执行以下连续准备，再交回并保持无活动写入：
1. 同步package.json/version、package-lock根version与packages[''].version、src/runtime/RuntimeManifest.ts::CURRENT_RUNTIME_VERSION到0.5.405（先定向核所有声明输入）。不手改生成Python或生成dist版本、不npm version自动commit/tag。功能源码与测试保持r5已审核字节。
2. 完整展开npm run package→build/test:windows-flow-incremental/compact/verify/vsce及其pre/post钩子，生成项目内docs/agent-tasks/plan-state-guard/package-test-inventory.json，列每个真实测试文件/argv/调用链；按规范身份核恰一次，不只grep脚本个数。不额外跑npm test/npm build重复覆盖；package本身已有完整build。无重复则注明可直接npm run package；有重复仅报告精确链，不能改命令/删断言跳门禁。
3. 提供docs/agent-tasks/plan-state-guard/host-handoff.json：canonical Linux/Windows cwd、base/HEAD/branch/common-dir/index、无活动写入声明、所有本任务改动（含新测试、版本源/lock）精确路径/sha256和分类。排除node_modules链接、证据/日志、缓存、pyc与非任务内容。说明当前dist仍0.5.404是预期暂态，最终由Windows package生成0.5.405，不能把此暂态打包。
4. 只读检查Git worktree登记和master占用，报告是否已有明确可同步的专用干净祖先副本；未登记先报告缺项，不拿原脏目录/进行中任务冒充、不自行更新master。不新建/切换原工作区。本轮不创建额外Git副本，以便主控串行处理Windows原生验收树。
5. 核最终暂存仍空、HEAD/base未变，新增版本源的内容/语法合理；不再单跑tsc或测试，因为下一阶段npm run package会在同一最终输入重新生成并完整验收。更新evidence r6并通知路径/版本/精确交接文件。完整准备/验证失败仍先记证据停等。

Windows阶段使用独立原生验收worktree（从冻结base生成、只覆盖本任务冻结文件并逐文件核hash、复用本机已存在依赖junction），不会改变Linux实现归属；两端共享Git元数据写入串行。主控执行package和真实归档/秘密/闭包检查，回传真实日志/退出码给原负责人；生成物由原负责人按核准清单同步回任务副本，最终核源内容/测试输入一致后再考虑提交/PR。此节不授权原负责人调用Windows或GitHub，不授权提交、安装/发布或远端Agent更新；后续按原项目规则及用户合并授权分步执行。

## r6 / F11：Windows完整验收失败后的具体指导

首轮Windows `npm run package` 在原生树 `D:/GitRepo/MCP/zlk-cluster-orchestrator-plan-state-guard-win` 执行，base=a7e9c7d3，版本0.5.405、Node24.18.0、Python3.14.6；Git六项定位变量无注入，夹具整链已隔离。2026-10-23T20:41:42Z开始、20:44:13Z结束，package真实exit1，未生成VSIX、未安装/发布/提交。完整stdout/stderr：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/bc349c92-d20d-4638-8f72-805bfb693739-{stdout,stderr}.log`，stdout1270行。原生准备receipt=`C:/Users/ZLK/AppData/Local/Temp/plan-state-win-6m6MEH/setup.json`，11文件哈希覆盖、216文件Windows规范身份去重均已核。

F11失败：`test/features/planJobDeleteRequeue.test.js:158`，完整名称`并发双击恰一次：在途时第二次显式拒绝`；7用例中6通过/1失败。错误`Error: 此 job 正在执行删除并重新排队，请完成当前操作。`，堆栈`at Object.eval (eval at <anonymous> (D:\\GitRepo\\MCP\\zlk-cluster-orchestrator-plan-state-guard-win\\test\\features\\planJobDeleteRequeue.test.js:25:17), <anonymous>:69:11)`。必需全量失败阻断交付，不能忽略、跳用例或用开发阶段通过替代。

主控定向读到的关键事实：retryPulledJob先await fs.readFile/来源核对等I/O，之后才查manualDispatchInFlight并占guardKey；测试以`const first=world.retry(); await new Promise(resolve=>setImmediate(resolve)); await assert.rejects(()=>world.retry(),...)`假设第一调用已拿到锁。setImmediate不保证前面的异步文件读完成，Windows上第二调用可能先拿锁，使first拒绝而当前assert.rejects等待的是另一调用。此为确定性同步缺口的强假设，原负责人先将相关完整源码/哈希、fixture返回对象、失败日志及该方法基线/候选body逐字节对照并入evidence新E15/F11；若方法差异或事实反驳此判断，立即补证据停等，不猜改生产。

若原文/对照支持该判断，授权仅修改该测试夹具同步：为makeWorld的cleanupHost.service.preview增加一次性`previewEntered` Promise/latch（只在真实mock preview被首次调用时resolve，先通知再等待既有inPreviewGate），通过world返回该Promise；并发用例在发起first后await这个真实入口信号，再发起第二次并assert.rejects，最后releaseGate并await first。不得sleep/setTimeout/盲轮询，不依赖setImmediate次数，不改生产锁、两次确认、原卡/精确路径/删除与入队次数断言。适当finally释放门以免断言失败留下挂起，但不能吞掉首/次调用错误；其他6用例语义不变。

先经pi-test-evidence完整运行该单文件（Linux修复域阶段、20秒、隔离LOCALAPPDATA；失败先记录停等），无需重复整个Linux开发域：业务源字节不变且本次仅测试同步，记录受影响输入理由。成功后把新测试文件纳入host-handoff精确任务清单（不得漏原11文件），更新inventory真实hash/来源、evidence及无活动写入声明。不要重做版本、不生成/编译业务源、不提交/远端，不动Windows验收树。主控将只覆盖新增变更的测试并核完整冻结源，再按‘失败修复及候选测试输入变化’理由重跑一次完整Windows package；其他已通过测试不在此前额外登记运行。所有旧失败日志/验收副本保留。

r7审核结果：新测试SHA256=3ed4e6ce58cc93dabd445c868a6eba6792e449a6d8f38973a012d2c6ba72a6f5，真实previewEntered在占锁后的preview入口通知，才进入第二调用；额外setImmediate不承担拿锁证明，不构成盲轮询，全部7条断言保留。first错误被追踪并最终抛出，finally释放gate，未更改生产代码/确认与删除语义。Linux修复域完整exit0，证据 /tmp/pi-test-4ob6eiar；handoff12文件、inventory216唯一文件/零重复已核。允许Windows原生树仅覆盖该测试，保持其他已冻结源哈希，保留首轮生成的0.5.405产物（不可回覆Linux旧0.5.404生成物）；因F11失败修复与测试输入变化，完整package必需重验，不计重复登记。失败仍先回原负责人补证据并由GPT更新指导，禁止自动重试结果未知写入。

## r8：P5 Windows通过，P6与本机祖先登记授权

Windows完整package第二轮exit0，216文件/1676用例：1674通过、0失败/取消，2个Linux专属跳过。冻结源/test字节一致、runtime SHA链和额外vm.Script均通过。日志：host-windows/8fccc9e2-923b-44d8-b436-78cde9d998be-{stdout,stderr}.log；汇总baf9f461-d007-48d7-a437-ee7561934e56-stdout.log（完整绝对前缀沿前节）。

最终VSIX：原生验收树simple-experiment-0.5.405.vsix，2603277字节，SHA256=0c1504047112a7978ec6e296d483b674547a633af752a4ebdb919e446d9a8db9；同名.sha256已独占创建。项目内容策略验真实归档419项通过，417个extension文件与构建期望字节相同，身份/0.5.405/universal/秘密检查通过；9个核准生成物的完整hash在 `/host/c/Users/ZLK/AppData/Local/Temp/plan-state-win-6m6MEH/final-archive-receipt.json`，另有final-archive-files.txt/final-test-receipt.json。主控已审实际源码/版本/测试及生成闭包，批准在下面补验通过后本地提交，仍不授权Linux远端Git或Windows操作。

包后扫描首次README与源不等，exit1日志140846a2-9253-4300-8ea2-f06cf595af45；证实为vsce4的强制相对链接重写，调用已导出ReadmeProcessor生成期望后与ZIP严格字节相同（SHA17abaf61af801b72150588b5c25aee7079d14e3c3a1c088bbbe2641219cb592b，5616c77f-510f-481b-a4d9-2ac2fc13ec3c-stdout.log）。只修此工具链期望后所有门禁通过（c0cef1a0-7924-4539-bed8-3bac63c97a1c-stdout.log），未改包/README或放宽其他文件/秘密检查。实际内容策略日志5c64c3a8-b993-4477-81f5-e90f63b79d06。保留全部失败证据，不伪称首次全过。

原负责人连续执行：
1. 从 `/repos/MCP/zlk-cluster-orchestrator-plan-state-guard-win` 按final-archive-receipt.generatedOutputs精确9文件同步回本任务副本，前后逐文件sha相同；其他源/测试与host-handoff冻结字节一致。不得Git操作Windows原生树、不改.git、不复制node_modules/pyc/证据/未知生成物；不重编译或打包。Windows真实生成物替换Linux旧0.5.404暂态。
2. 在node身份和合法新进程局部隔离LOCALAPPDATA下，经pi-test-evidence单文件串行/20秒补 `test/agent/cacheRetentionBatch.test.js` 与 `test/features/incrementalMetadata.test.js`，这是本轮最终Linux平台覆盖（Windows按平台skip），不要再跑20个开发文件/全build。须真实执行且无skip；失败完整证据+停等指导，不能自动返修。它们通过后P5闭合。
3. 允许精确stage+commit18个任务文件：`host-handoff.taskFiles`与`final-archive-receipt.generatedOutputs`规范路径的并集（12+9去掉3个共同生成路径=18）；生成物hash以最终receipt覆盖旧handoff暂态，非生成源/test/package/lock保持handoff hash。逐项核跟踪/忽略、真实staged diff/--check、base祖先与当前branch不是master。名单/规模/内容有意外即停，不全仓add或force-add。node_modules、主证据/计划/交接JSON与日志保持本机未暂存（避免发布机器特定取证），不入PR或包。提交建议 `fix: refresh bound worker state probes before plan code sync`，保留真实本地commit日志与candidate/parent/root/index身份，不push。
4. 已明确报告缺少专用干净祖先副本且master未在任何worktree检出。为满足原授权合并后的本机同步，允许核规范父目录/目标不存在、当前master占用/HEAD/工作区/活动写入无冲突后，新建 `/repos/MCP/zlk-cluster-orchestrator-master-ancestor` 检出既有master；登记这个同一副本为‘本机master所在可同步副本’与‘专用干净祖先’，不是活动任务冻结祖先。当前只创建/登记，不推进master；refs/占用/身份变化或目录已存在先报告阻塞，不覆盖/重建/repair/改原脏树。合并后主控fetch给精确远端SHA，再由你在此副本merge --ff-only。
5. 原脏目录及其他活动任务HEAD/branch/index/源码与未提交内容保留，Git元数据写入串行；本轮主控不写共享Git元数据。更新evidence记录Windows包/两个Linux结果/提交SHA/18文件和双角色祖先登记，完成后停等主控远端步骤。提交不代表PR已审或已合并；后续主控仍审核实际commit/PR diff并绑定SHA。

## r10 P8：已合并后的本机快进同步

PR=https://github.com/zlinkw/SimpleExperiment/pull/7；candidate=509dcb03160a59867a070bc8dcbb42ef1cd965d1；mergeCommit=ab2a11711a7c1f702f7327be81cd829165f3d52e；mergedAt=2026-10-23T21:13:49Z。主控已将GitHub PR实际18个blob与本地已审核提交逐一比对相同，记录SHA绑定审核评论（issuecomment-6374857534），只在MERGEABLE/CLEAN时普通merge，无admin/force/删分支。fetch后origin/master与GitHub API最新值均精确ab2a1171，merge commit已确认被包含。完整日志host-windows/fcfd4346-7df6-4de6-8a51-39246ce9b13e-{stdout,stderr}.log；已合并不等于交付同步完成。

原负责人先在 `/repos/MCP/zlk-cluster-orchestrator-master-ancestor` 预检登记身份：branch=master、root/git-dir/common/index正确、原HEAD=a7e9c7d3、暂存/未暂存/未跟踪全空、无其他活动写入；本机origin/master仍ab2a1171且当前master为其祖先。写前立即重核，随后只在这个已登记副本执行 `git merge --ff-only ab2a11711a7c1f702f7327be81cd829165f3d52e`。refs/状态/写入者意外变化即停；不reset/rebase/repair/stash，不切换或更新原脏目录/任务branch，不删除任何历史。

同步后逐项核本机refs/heads/master、祖先副本HEAD都等于已核最新origin/master=ab2a1171，diff/cached diff/porcelain（含未跟踪）全空；比较merge tree与candidate tree一致，再逐文件读实际18个任务文件hash与最终receipt/handoff一致。tree和实际代码输入未变时复用已完成Windows完整验收+Linux补验，不重复跑同候选同输入测试。原实现分支仍509dcb03、冻结base仍a7e9c7d3，原脏树/其他活动worktree HEAD/branch/index和内容保护指纹前后不变。共享Git元数据写入本轮由你串行执行，主控不fetch/本地Git并行写；不执行GitHub远端或Windows。更新主证据并回报前后SHA/实际代码核对/完整日志退出码/保护结果，随后原实例停等发行/安装结果回传。

## r12 P9最终事实与P10用户重载边界

Release已发布并回读验证：https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.405，tag轻量commit精确ab2a11711a7c1f702f7327be81cd829165f3d52e；draft=false/prerelease=false，Latest=405。VSIX 2603277字节，服务器digest=sha256:0c1504047112a7978ec6e296d483b674547a633af752a4ebdb919e446d9a8db9；同名.sha256资产97字节、服务器digest=fe509736e707c0ed780de345d3fca8e732f7d18fb0f37662579ac2ed4125b46b，与本机精确文件一致。未覆盖历史tag/资产。日志host-windows/bbb0d6d9-e5f6-46f2-a043-a1cd46a329cc-stdout.log；receipt=`/host/c/Users/ZLK/AppData/Local/Temp/plan-state-win-6m6MEH/release-receipt.json`。

实际编译ReleaseClient默认公开fetch（无mock/无认证fallback）验证win32-x64旧403可发现405精确资产/可信SHA，status update_available；未改的配套SimpleSFTP真实稳定108可取得，本机107无需本任务升级。日志93d862de-df0f-4e68-a71d-1f824878d81a-stdout.log；同目录public-update-receipt.json。

npm run install:latest仅一次成功exit0，无force/降级；安装405且既有simpleex稳定shim更新，未重载。日志f5438d45-5263-45c7-ab44-8fd1a199f694-{stdout,stderr}.log（Code的url.parse弃用警告非失败）。真实安装路径从extensions.json解析为 `C:/Users/ZLK/.vscode/extensions/simple-local.simple-experiment-0.5.405`；PATH上simpleex入口标记/launcher字节等于已安装包。

simpleex --help的全局launcher先做身份握手，不是纯静态help；因此一次诊断exit2，报`Running plugin identity/version mismatch; reload the installed extension`（af68c96c-c0c9-4a0f-a4f0-4c4834050f9a-stderr.log；另有证据目录simpleex-help.stderr.log）。没有改源码/关握手/重装绕过：发现文件仍记录运行403，安装405，按项目版本保护要求需用户重载。此后未再调用面板/API，仅只读登记与入口确认（65987444-ae63-4963-898f-bf3c57ff2a17-stdout.log，installed-entry-receipt.json）。不能声称当前运行已405或CLI功能正常。

固定pi-delivery-check verify-install退出0，417个extension文件全部对冻结VSIX校验通过，仅规范化已确认VSCode installer metadata，无其他差异：`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/delivery-check/73975034-1644-4e6b-8922-f5cb6502b2e5/receipt.json`；日志eb2c5d48-5ec9-4c46-9cb4-bb3a9041bc93-stdout.log。最终源码/发行/安装交付完成，P10尚未执行。

用户需要在正在使用SimpleExperiment的VSCode窗口执行 Developer: Reload Window，约1分钟；回复已重载后，主控再做一次只读运行版本/身份/CLI握手核验，并按必要事实交回原实例，不自动启动PLAN、同步/部署Agent、重试提交或清理。原负责人当前仅将以上事实补主证据，业务源码/Git/包不再变化，不生成额外FINAL报告。

## r13 F15 返修实施计划（以本节为当前授权）

依据evidence r14/E16及宿主00:39Z全335记录：79个合法旧v2根无processId；其中3条有旧lease，14764已被新Code复用。补证 `/host/c/Users/ZLK/AppData/Local/Temp/paired-update-extra-jVwtW7/evidence.json` 含旧windowId/三条lease时间；`paired-update-journal-phngXn/evidence.json` 证实journal failed、installationRequested=false、completed=[experiment]，冻结SFTP108的SHA ef6c561e8804e00437aa349a2fb605561569cc3db1d45d0d4dc20fdd27dc09ac；不改数据库或journal。两文件同在 `/host/c/Users/ZLK/AppData/Local/Temp/`。宿主fetch/API日志7a652b22-7a11-4e79-b15c-6fc3bd613688确认最新master=ab2a1171、Latest405；本机509分支/索引未动，宿主Git阶段已结束。

1. 原负责人先核Linux node/Git定位、原脏树/祖先及当前509指纹，确认tracked干净，保留未跟踪证据。在同一原任务worktree创建不存在的 `fix-paired-update-legacy-lease`，从完整ab2a11711a7c1f702f7327be81cd829165f3d52e起步；旧fix分支509和原a7冻结身份不改，独占元数据写入。无reset/rebase/repair。新基线/分支写证据。
2. 安全reader：优先将ResourceOperationLease私有readRegistry现有完整安全读取原样抽成可复用导出（或独立core模块），返回record+mtimeMs供gate使用，manager协调/写入/过期/冲突语义不得变化。保留无链接/多硬链/大小/句柄身份/读取中变化检查及有效lease.resources约束。gate读取主文件；损坏时仅按现有ownership恢复规则取可信侧车，双缺失仅处理已被原子消费的空槽；未知记录阻断。扫描不可忽略可能活跃的ownership孤槽。禁止清理或改写任何用户租约。
3. UpdateGate兼容：保留构造第二参数ownerAlive注入，新增可选依赖供测试。显式有效根PID优先；仅根字段确实缺失时，从历史windowId的严格正整数PID段恢复，核对非空lease的PID/windowId一致。非法显式PID/未知身份/矛盾字段拒绝，不能任意fallback。正确理解choosing/ticket/admission及非空leases；真正已释放的空闲记录不阻断。活主即使心跳过期仍等待，不能仅凭expiresAt或mtime超时放行。
4. PID复用：只在已获退出证明时判旧主不存在。默认ESRCH可证退出；活/权限未知时，Windows以一次有界异步批量Get-Process读取所需PID的真实StartTime（纯正整数参数、timeout/输出上限、无命令注入、不安装工具）。仅当该进程启动明确晚于此快照的文件mtime、所有有效lease时间、admissionExpiresAt的最大界限并留精度余量时，证明其不可能是旧主。记录含缺失/非法时间或探测失败不冒充退出。其他平台无可靠时间来源则保守等待；注入map覆盖跨平台单测。只有明确的旧主退出证明可缓存，其他探测不无界重试；取消信号贯穿读取/探测/等待，原300秒总预算不扩大。
5. 回归先补正确接缝：旧v2空闲/choosing崩溃/3条非空旧lease；PID真死、复用真新、仍为原主、未知/拒绝访问；非法/冲突PID、坏JSON/链接/硬链/过大、读取变更/侧车异常；断言不修改用户文件，活主过期仍阻断、取消不中断传输、新入场被关闭。既有expired-live夹具若不符合真实schema，补齐windowId/resources等，不删断言。事务测冻结405+108、Experiment已405或更高时只补SFTP，失败不回滚/不重复安装、不替换批次。原失败红灯作为预期证明必须先保存并报GPT，等新指导再改生产码。
6. 新原生进程时间 helper只供更新gate，不扩改远端Agent/队列/业务锁规则。开发使用已有tsc+目标域、单文件20秒串行证据入口；遇完整失败先F编号/日志/退出码并停等指导。完成P13交精确diff、SHA、映射/清单及Windowshandoff，主控接宿主验证，原实例保留返修。版本目标406，package/lock/runtime一次同步后最终验收与打包；新代码不能复用405通过证据。最终发行/安装前另核公开Latest、原冻结事务与真实租约安全状态；不自动重载活动窗口，不重提PLAN，不写服务器。

主控最终审核与合并授权沿用。无需用户额外操作；运行生效/配套安装事实未确认前不得报告全部完成。

## r14 F16红灯后的具体指导

主控已精读新9项回归、原gate夹具与完整红灯日志；F16是预期证明，允许现在修生产，不重复跑原样红灯。P11分支/基线与保护满足计划。按r13连续完成P12/P13；无新失败无需逐步请示。完成后同步406的package/lock/runtime并准备精确Windows交接，Linux不运行Windows package/安装/远程Git。

- 构造第三参数沿本轮测试接缝 `{processStartedAt(pid):number|undefined}`，可另增批量provider注入；生产默认必须先收集候选PID再一次有界异步Get-Process批量查询，不能每文件spawn或读取主控历史快照充生产依据。Windows首轮探测、异常/未知/取消/输出越界都须测试；未知时间不能伪装成退出；3e5ms等待总预算包含探测时间。复用证明用实时快照有效mtime/租约时间/admission上界+精度余量，非单个日期/过期即退场。
- 明确保守规则：根PID缺失的旧记录即使leases空且flags为零，在ownerAlive仍活/未知且无可靠复用证明时继续等待（9项第6例）；可验证已释放的正常新根不阻断。缺字段不再等于损坏；显式非法值与字段矛盾明确拒绝，不能fallback掩盖。根与内层PID/windowId一致性、严格历史PID段、schema/resources安全读取、侧车及未知活动保护保持r13。
- 新回归异步收尾：LIVE/pending用例必须在finally取消并await原wait Promise结算后才结束；不能靠after移除目录令等待意外成功，或让force-exit掩盖悬空任务。只读守卫在修复后也断言gate成功而非catch吞错。补至少一例非ASCII测试主机名（不硬编码真实宿主身份）；保留原两项断言。当前F16夹具的只读守卫不承担功能通过证明。
- 除原9项绿灯，补计划r13安全边界（尤其孤ownership、损坏双槽/读取变化/链接/多硬链/大文件、探测失败、原主晚心跳与PID复用反例）及事务405已完成/更高406时只补108且不重复安装的回归。不得为了绿灯删断言、修改实际协议或跳过未知锁。新增测试在npm链只登记一次，展开嵌套去重。
- 新抽reader若改ResourceOperationLease，仅语义等价委托，不修改其admission/TTL/冲突/回收；根据实际反向调用者扩展host/resource lease域。reader/StartTime/helper平台命令的精确接口、bounds、测试清单与diff均入证。每次完整验证失败保留退出码/完整日志，先通知GPT等新指导。

P12–13交付须带：当前branch/HEAD/common-dir/index/活动写入者、基线ab2、所有变更/新增/必要生成物精确路径和SHA、开发测试文件清单/命令/退出码/日志；版本406全部声明一致；沿用现有host-handoff与package-test-inventory脚本，增量更新而非另写整套验证程序。Windows阶段仍由主控在原独立native验收树中执行，失败回原实例。

## r15 R51–58：F17候选审核返修（完整package尚未开始）

主控已精读两生产文件及全部新19例/原gate/交接。F17的tsc首跑TS1005 exit2虽已保留，但应失败即停等GPT；以后不得自行修后继续。当前已完成证据按实际内容复用，不为流程惩罚重跑无关域。Linux stage/commit仍由本实例在后续明确授权后执行，不转给主控；主控仅Windows/GitHub与审核。

R51 必修：defaultStartTimes当前Get-Process Select-Object Id,StartTime转JSON在本机返回 `/Date(1792803730983)/`，Date.parse=NaN（宿主真实只读日志985ce89f-65e7-4af9-b95d-1f97d5ad555a-stdout.log）。改PowerShell显式输出可信epoch毫秒（例如DateTimeOffset.ToUnixTimeMilliseconds）或明确ISO UTC再解析；不能只测注入Map。加默认命令/解析真实格式边界单测，Windows默认provider正向测试用本测试Node进程PID与足够旧合法快照，必须真实放行；Linux按平台明确不执行原生Windows项。

R52 必修：当前explicit分支直接continue，256个有根PID的旧记录仍遇PID复用。宿主6397137489...json根PID35152/ticket1已由新Edge identity_helper复用；不能只修79个根缺PID。统一对所有有持有迹象、owner活/未知的可信记录使用相同StartTime退出证明；正常有显式PID的已释放空闲记录不阻断。补现代根+旧lease/choosing/ticket的PID复用放行、原主不放反例。严格区别真正ESRCH与权限/未知。

R53 必修：gate仍只枚举64hex.json，新增测试反而宣称忽略孤ownership，与r13/r14相反。扫描主名与合法64hex.json.ownership的去重并集，传基准主路径给安全reader；活跃/未知孤侧车必须等待，损坏孤侧车必须拒绝，死主可信孤侧车可过。writing与无关名字仍不当完整声明。修正helper注释与错误测试，不改变manager原协调遍历语义。

R54 必修：`explicit = processId!==undefined && processId!==null`把显式null偷变旧格式；只在根key确实缺失时恢复。显式值须安全范围正整数；内层存在但非法/缺PID/windowId、与根恢复PID矛盾一律未知/拒绝，不是best-effort忽略。复用证明的时间不得`Date.parse(...)||0`：活动lease缺失/非法时间、非法admission、未来StartTime、超范围数都不能用不完整上界证明退出。补null/string/负数/零/超大PID、内层非法、坏/缺时间、未来时间及边界5s反例。owner确定ESRCH的完整合法旧记录继续可过，不扩宽未知路径。

R55 必修：取消信号在await reader/probe后及return/注册等待前重核，防已取消时仍放行或丢中止。probe timeout取8秒与300秒剩余预算的较小值，探测耗尽总预算不得另加8秒；默认异常保持unknown，外部取消必须按原reason及时结算。等候预算检查覆盖读取/探测。mock不要真等300秒。

R56 补原计划未完成安全门禁：链接/多硬链/过大/读取中变化、孤侧车、探测输出异常/超时/中止的真实断言不能靠Map注入绿灯替代。可复用核心已有同范围、同字节、完整日志证据，不能声称没有执行的覆盖通过。新文件20秒总预算，pending先进入点闩后短时观察并finally abort+await，避免新增许多900ms等待把Windows单文件拖过20秒。

R57 现批量测试随机hash文件顺序却断言PID数组固定[31337,31338]，存在偶发失败。生产批量去重后按数值排序，或测试比较集合；必须验证一次覆盖所有候选、不依赖目录顺序。F17 readonly/pending收尾改进保留。

R58 原实例将真实git diff（含新文件正文/精确SHA）保存任务证据目录可供主控审核，不提交证据。按上述修后编译+相关gate/legacy/transaction/Bootstrap及实际改动波及域重验；core未变化的有效原记录可按范围复用。更新handoff和inventory、版本406仍一致，Linux过渡生成物不可称最终包。完整失败照规范更新F并停等GPT；成功才交原native Windows验收，勿再将本轮候选称全部完成。

## r16 F18指导与R59–62（原负责人继续，不新建实现者）

已读r19完整UpdateGate、29项日志及关键测试：唯一已执行失败为/Date(ms)/正则转义次序，现有保存正确。批准将 `/^\/Date\((-?[0-9]+)\/\)$/` 改为 `/^\/Date\((-?[0-9]+)\)\/$/`，保留断言，不再跑原样失败。在同轮修完下列已读源码确定的问题后再编译/验证；不必制造额外预期红灯。

R59：现循环只验证lease.processId合法，却没将其数值与rootPid直接比较，旧反例碰巧被windowId推导挡住。必须显式比较 `lease.processId !== rootPid`；补root/windowId都31337而lease.processId=41000且lease.windowId保持同根的两例（根有PID与历史缺PID），ownerAlive=false也必须拒绝。不得拿windowId比较代替真实数值比较。

R60：当前所谓“Windows默认provider正向”实为注入自行JSON.stringify的StartMs并根本未spawn，不是原生测试。将其如实命名为注入解析测试；另加真正仅win32执行、非win32 t.skip的测试：真实process.pid+旧快照，`new UpdateGate(leasePath)`不传provider，让默认powershell完成StartTime正向。非win32默认分支测试也仅在对应平台执行，不能让Windows依赖fake PID31337恰不存在。安全链接夹具Windows若缺file-symlink权限，采用不提权的隔离目录junction拒绝验证，并保留Linux真实file-symlink覆盖；不可让权限前置失败拖进全量。明确平台覆盖，不模拟Windows通过。

R61：proofBoundMs不能把缺admissionExpiresAt注释成默认0，活动choosing/ticket记录缺该值应无退出时间证明；负数/无效类型同样unknown/拒绝。只有字段完整可信的正常explicit released idle才可以快速跳过（choosing布尔、ticket非负安全整数、admission合法）；坏/缺形状不得当已释放。现安全测试说hostOperationLeaseReadOnlyView覆盖读取中变更不属实：主控已读该文件，5项是UI只读不占写锁，没有这项断言。补共享secure reader实际读取过程中字段/mtime变化的定向测试（可在隔离夹具通过handle.read闩触发真实文件变化；不影响其他用例），纠正覆盖说明。

R62：r19 wait循环移除了原 `await this.held?.assertHeld()`！必须恢复每轮入场及最终放行前的持有证明，探测后亦核当前升级门仍归本次；否则升级锁被换后仍可能继续安装。加真实临时gate.begin、丢失/替换其v1租约后wait拒绝且不安装的回归，原传输继续/取消保护保留。可选deps/onPoll仅测试观察不能成为绕过held检查的路径。

顺便消除R55测试“60ms内必须探测”墙钟假设：用probeEntered闩确认进入，finally取消并await，不留悬空Promise。时间helper接受值须安全整数epoch、<=当前时间；probe运行前后/注册sleep前取消与预算保持。真实Windows完整package尚未开始，Linuxcore未改且证明输入不变的已过域仍按边界复用。修后tsc→legacy/gate/transaction/bootstrap受影响域→handoff/inventory+真实diff；任一完整失败照F流程停等。

## r17 R61最后两处准确修正（其余r20逻辑保留）

主控已核r20 gate原文/身份/持有证明/35项及8输入handoff；native验收树只读预检通过c93fe6fb...，尚未复制或执行package。为避免模糊“完整shape”再遗漏，具体定义正常已释放explicit idle：`record.leases.length === 0 && record.choosing === false && Number.isSafeInteger(record.ticket) && record.ticket === 0 && typeof record.admissionExpiresAt === 'number' && record.admissionExpiresAt === 0 && typeof record.windowId === 'string' && record.windowId.length > 0`，加hasExplicit。现仅every(hasOwnProperty)仍会把choosing=null、ticket=null、admission=null等当正常并跳过。原式替换为上述严格判断，未知类型不经idle快道；proofBoundMs的admission亦只接受非负安全整数epoch（0合法），负数/字符串/缺值都无退出证明。补坏类型及负admission成组反例，原正常explicit idle正例保留。

现名“读取中真实变更”测试只是返回Object.assign伪造stat，不是实际文件变化。无需改production reader；在测试patched handle.stat第2次先对该隔离file执行真实utimes（例如mtime加5秒），再调用原realStat，确保读取前后真正不同且reader拒绝。测试隔离/恢复patch不变，文案/证据如实。

只动UpdateGate及legacy测试，版本/核心reader/事务/Bootstrap不扩改；tsc+legacy/gate两文件串行重验（相关输入改变所需重验），有效其他域记录复用，更新handoff/diff/evidence后立即停止源码写入交宿主。失败仍F流程。Linux后续提交仍待主控Windows成功后的精确授权，不替主控安装/远程Git。

## r18 F20指导

主控已精读r21全失败日志与L317–338：mtime保留亚毫秒，而Date截断亚毫秒造成附加佐证相差0.347ms；`assert.rejects(/变化/)`和statCalls>=2已通过，生产不再改。批准仅把佐证改成 `assert.ok(Math.abs(fs.statSync(file).mtimeMs - (Math.round(originalMtimeMs) + 5000)) <= 1, '文件mtime必须被真实修改（容忍Date/文件系统亚毫秒精度差）')`。1ms容差仅属fixture时间取整，不放宽生产读取中变化/五秒PID证明等断言。重跑legacy+gate两文件串行，失败仍完整F停等；绿后冻结8输入SHA、handoff/inventory/diff/evidence交宿主立即完整package。

## r19 当前交接与新版规则

用户本轮明确批准仅对继续中的原任务应用新版调度；主控已完整读取新版SKILL及references/documents.md。原实例/原生会话/模型强度/并发3不变，不重启、不迁会话、不测速。自本节起失败按新版分流：证据唯一明确的机械语法/拼写/已核参数或映射错误，同一失败链允许一次最小自修并受影响复验；成功并入正常交付且不单独唤醒主控。原因不明、一次自修仍败、逻辑/安全/跨平台语义/接口范围改变先报证据+建议等GPT指导。保留首次错误/完整日志/真实退出码；无断言/门禁降低、无盲装、无未知写入重放。旧节“任何失败均等GPT”在此前时间有效，自本节起由新版替代，不重做过去尝试。

主控本次明确交出plan.md r19的状态/完成项维护权：此后不并发写该文件，待原实例归档/摘要报告后再明确接回或通过send更新事实。可摘要已完整验收的P0–P9、P11，以及仅Linux开发验收完成的P12–13；P10最终运行/CLI未闭合、P14–17待办、当前相关E16/R51–62原文和有效指导/授权/验收标准必须保留。先用当前技能code_evidence.py archive保存当前evidence/plan/存在元数据到唯一修订，再verify-archive；成功方可摘要完成项，留任务/代码与版本/测试命令与平台/退出码/风险/完整日志+精确归档章节及文档SHA。不能把Windows未执行写成已验。摘要结束核原文能按manifest取回，原文件/日志历史不删；归档失败停下仅保留结果，不覆盖活动文档。

业务源码/测试/版本/冻结8输入、handoff/inventory不再改，Linux索引仍空。该文档整理不读取native正在生成的产物，也不执行任何测试/Git写入，不影响宿主原native完整package；Windows/GitHub仍主控。记录实际新规则已读、归档校验及活动指导保留；本轮尚未出现新规下机械自修或逻辑升级的自然触发，先标未验证，不制造错误或新验证任务。
