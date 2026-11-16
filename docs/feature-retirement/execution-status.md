# Windows 功能精简执行登记

唯一写入者：调度《Windows 功能精简调度与持续验收》01a1e34e-e63d-79a2-9175-7a1afa97578d / local。2026-11-16 由总控从 README.md 迁入既有执行事实完成交接，之后总控只读。本文件仅登记实际执行及证据引用，不授权改计划、批次边界或验收标准；完整计划与职责见 README.md。验收结论由独立验收会话决定，未运行的静态切片不算通过。

## 当前交付与新代承接

G001功能精简R01-R08已独立验收交付，原代码/运行/失败/未测证据及0712388、886139eb提交事实保持。用户显式指定剩余全入口补验为G003，此前暂沿G001的分类已纠正，不重开旧代。完整计划见 ../plan-generations/G003-plan.md，所有在途R09-R15执行事实一次承接到 ../plan-generations/G003-execution.md；本文件不滚动维护G003，不重复其进度。原在途会话/租约/证据保留，不重建或重跑，无文件删除。

## 历史执行事实（G001当前交付结论见末尾）

R01–R07 均实现完成待集成，R05 模板与 R06 旧 CLI 返修已由独立验收关闭；尚无本轮运行回归或 UI 通过证据。R07 原静态冻结后，独立验收发现基础 result parse 两个错误边界覆盖被混合删除，调度派回原 R07 会话后已恢复同一文件内缺参数退出 1、缺 CSV 退出 3 的普通解析用例，未恢复 paper-table。独立验收已复核关闭，scoped diff check 0，未运行测试。R08 已获并完成首轮独占目标检查，当前 runner 退出 1、锁 released；没有最终 build、HTML/UI/MM 证据。现仅 R07 在原测试范围返修两项失败，工厂固定行数门禁失败已交总控裁定。

职责交接时调度确认无测试、build 或源码宿主独占验证，无活动计划写入；R08 是既定范围内产品侧准备写入者，R01–R07 冻结，验收只读。调度已成功通知全部八个实现会话及独立验收并取得确认，无遗漏。调度保留测试许可，待总控交接完成后按计划安排独占。

调度最近核对：master HEAD d42aaa8e203bec353b7e025cc20a9e5dbf7fa864，origin https://github.com/zlinkw/SimpleExperiment.git，与已 fetch 基线一致，未提交。恢复时重核实际状态。Fast 无接口字段，未显式设置。

| 批次 | 实现会话 | 状态 | 验收证据 | 归档 |
| --- | --- | --- | --- | --- |
| R01 | 01a1e34f-88e7-7ce2-9074-b192311ebced / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R02 | 01a1e34f-916d-7900-8ec0-943c0dafd147 / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R03 | 01a1e34f-8c95-7510-a452-d4dee8f7583a / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R04 | 01a1e351-f0f8-70a1-933d-9a23bc33f8c3 / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R05 | 01a1e353-fa50-7301-a5f9-d800d7500143 / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R06 | 01a1e351-b010-7090-9a7c-255f53c3f5e3 / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R07 | 01a1e357-0649-7c31-995d-ec5d1f294134 / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |
| R08 | 01a1e35e-b521-7261-bd34-733a2068543e / local | 独立验收通过 | 原始检查、失败与有效增量见下文；最终独立结论通过 | 是 |

## 已发生移交与历史静态反馈

- R02 获得 package.json，仅删除两项 PPT 配置，版本仍 0.5.512，用户磁盘旧设置保持。
- R06 获得 src/cli.legacy.ts，关闭旧 results paper-table 可达问题，已复审，待集成。
- R08 获得 .vscodeignore 与 scripts/package-content-policy.json，仅修本轮删除模块闭包引用；先准备清单/文档/精确 dist 删除预检，再由调度分配独占运行。
- 首轮 R01/R02/R03/R04 无必须返修，后续 R05 模板文案与 R06 旧 CLI 问题均已关闭。上述静态检查不等于全局回归通过，不归档实现会话。

## 验收权威与原始证据

独立验收：《功能精简独立验收》01a1e34f-5e2d-7661-83b8-01190466df99 / local。本轮结论和必须返修反馈保留在该会话；运行日志继续使用项目原 test-workflow 记录，不另建验收报告。调度后续在这里引用真实命令、日志路径、退出码、实点证据及独立结论，不代签通过。

MultiModal 原版恢复、未保存文档、训练/任务/结果、拒删文件与无关 VSIX 校验文件的保护事实保留在 README.md；不据历史窗口直接执行动作，最终只按计划主动 inspect，不部署。

## 本轮运行证据

- 单项 check-static：2026-11-16T08-07-35-793Z-38216-test，目标与10 gates全部exit0。
- 精确目标批：2026-11-16T08-08-12-570Z-36512-test，run.json记录29项、26通过、3失败、未运行按需0，编译10 gates exit0，runner最终exit1，锁released；target-mode-plan无新增diff。日志均在simple_cluster/reports/test-workflow/对应批次。
- 失败：job-007-factories_integration.test.out.log固定400行门禁报3个本轮未改源码超限，待总控裁定；job-011-resultRuntimeActions.test.out.log归档CSV仅表头；job-018-publicBrandingText.test.out.log专用文本旧断言。后两项已交R07定位，不能放宽基础归档覆盖。首次失败日志保留，未启动最终build/HTML VM/UI/MMinspect，8个专用dist仍待删除。

## 首轮失败后的处理

- R07两测试已返修冻结待独立复核：branding换实际保留设置标签；归档后显式parse-results刷新并加archived/eligible断言，原CSV断言保持。尚未补跑。
- 总控裁定工厂固定400行门禁保留，3个本轮未改模块的真实失败作为基线阻塞；不授权拆模块、加白、改阈值、跳子测试或伪造通过。总控等待用户新范围决策，最终build暂缓；不重复执行未变化的同失败，其余独立定向验证可推进。

- 两文件补跑 2026-11-16T08-11-56-515Z-50308-test/run.json：resultRuntimeActions/publicBrandingText均通过、10 gates exit0、runner exit0、maxObservedConcurrent=1、锁released；target-mode-plan diff0。独立验收已认可测试修复语义，运行结果待最终汇总。
- 用户已在总控明确批准仅移除工厂独立固定行数检查，其他工厂行为/类型/加载/端口/VM不变；已释放计划写入窗口给总控修README/R07，待正式修订后派原R07。工厂首次失败保留，未重复运行。最终build/HTML/UI/MMinspect与8dist删除仍未完成。

- 用户批准的工厂独立行数子测试已由原R07移除，独立验收精确diff复核关闭；其余7完整工厂子测试和全部断言保留，不改3基础产品模块。记获准退役，不记原门禁通过；等待R08完整文件运行。两其他补跑套件已由独立验收核receipt为运行通过，可复用。

- 完整工厂文件补跑2026-11-16T08-14-47-153Z-62948-test/run.json：保留7项及10 gates exit0、runner exit0、maxObservedConcurrent1、lockReleased=true；独占释放。原行数失败/授权退役保留。R08现准备最终test-workflow清单、dist闭包和指南，不启动build；其余源码/测试冻结。

## 最新消息边界

用户最新规则已成功发至R01-R08全部8会话与独立验收，无发送遗漏。日常进度/验收/计划内失败与返修仅登记本文件、反馈调度，不消息总控；仅确需改计划、用户决定/专项授权、整份计划完成三类事件由调度合并升级。总控按项目模型/最近已验基线和规划时按需快照工作，不持续跟踪；本次同步不发总控确认。既有成果/证据与保护不变，文档治理仅候选研究未授权实施。

- 总控四提示消息规则修订已落盘并释放窗口，无新增产品改动；此前新规则已成功送达8实现及验收，不向总控回执。R08最终准备冻结：8约定专用dist已安全删除并确认存活JS无相应模块消费者，收包清单各删3失用路径；test-workflow仅删除2完整失效parallel证明以退回exclusive，其他JSON语义保持。build dry-run exit0给286jobs全部exclusive、按需未运行0、16组保护恢复，是计划非通过。

- 最终build首次真实运行2026-11-16T08-18-32-672Z-76172-build/run.json：286作业284通过2失败、10 gates exit0、runner exit1、最大并发1、按需未运行0、锁released、target-mode-plan diff0。失败job044 remoteResultInspectionWorkflow与job235 multiFormatOutputContract交原R07按现有test边界返修，保持基础远端错误/内存读取/多格式/跨PLAN/元数据覆盖，不复活退役主动检查。其他284与编译证据保留，不假称整轮通过。
- 构建独占释放后给总控G002计划写入窗口；G001目录与成果保持，尚无额外PanelVM/HTML/UI/MM证据，不授新测试直至计划窗口释放。

## 代次归属与当前增量

本轮功能退役R01-R08整体登记为G001，原路径/成果不搬移。独立治理G002计划和事实入口为../plan-generations/G002-plan.md、G002-execution.md，此处不复制其进度表；总控已释放新计划安全窗口。

R03已最小修复JSON解码吞错与候选文件无数值不报原因：汇总记录path/error，判原始空记录早于跨PLAN过滤，metadata/快照/metrics_case既有排除保持。独立验收静态复核无必须返修，未运行；R07两测试按实际保留接口调整及补边界。必要增量消费者组由独立验收建议现有9套，待冻结后R08执行，其余有效证据按真实影响组合复用。

- R03解析增量受影响9套真实通过：2026-11-16T08-37-02-776Z-41728-test（单multiFormat0/10gate0）与2026-11-16T08-37-24-119Z-57944-test（其余8全0/10gate0/max1/按需0），锁released、target计划diff0。额外dist/ui/PanelHtml.js VM与真实renderPanelHtml生成2script VM exit0。原286批failed不改写，组合覆盖由独立验收核对。
- R08现获源码独立开发宿主UI实点和动态只读MMinspect许可，禁止安装/部署/原窗口重载/保存丢弃/新训练/真实删除；无测试运行。尚无UI/MM完成证据。

## 历史导出准确性增量

R08真实history导出发现latest-results.json固定控制快照被当数值指标。总控已正式纳入G001最小修订并释放窗口：原R06仅result.ts自动发现排既有固定控制文件，原R07仅现有simpleCli测试扩普通CSV/JSON/registry/共享metric与compare覆盖，通用parse/active查询/历史数据不改。已派原会话，未运行测试/UI。res-1隔离fixture两格式accuracy0.91成功仅记fixture，协议字段旧输出保留但不算指标通过。

独立验收已接受原282有效通过+4最新替换+5额外=291任务身份组合覆盖，原286failed记录不改写；当前新history源码将按真实影响增量验证。R08已清点167静态来源/42命令/137工具，7选择器、160其他候选非覆盖率；UI与MM细节在其原记录及manual/coverage，待最终验收。

- 当前来源167已R08逐条分类并冻结：本轮实点1、历史证据97（69点击/28预览，非本轮点击，依赖变化不由文本匹配证明）、正常待验5、本人3、具体缺条件25、暂缓1、selector7、无producer兼容28；形式markup39/动态121/selector7。10旧命令只标静态消失，旧179证据保留。normal5为validate/dryRun/chooseCsvDir/saveCsvDir/splitResult，后续按真实副作用与现场边界补实点或列具体限制，不强行写数据/部署。
- history代码与simpleCli增量已独立静态复核0，必要补跑3套（完整simpleCli、simpleCliLifecycleCommands、mcpProject）。现在所有输入/文档冻结，准备授R08独占；G002项目与技能验收通过、治理实现已归档，Git待G001统一交付。

## 最后history回归与实点边界

2026-11-16T08-55-54-117Z-67916-test完整simpleCli exit0/10gates0；2026-11-16T08-56-28-732Z-66492-test的Lifecycle+mcpProject全0/10gates0/max1/按需0，锁released、target计划diff0。原history伪指标输出仍保留为修前失败，最新共享消费者已验，待独立验收组合确认。

R08目录浏览预览后取消，值未变记preview；其余4未点：validate/dryRun会同步Worker代码、saveCsvDir写配置、split表可能覆盖产物，与本轮不部署/不改消费数据边界冲突，列具体条件未冒做。当前167=本轮click1/preview1/历史97/未执行4/本人3/条件25/暂缓1/selector7/无producer28，历史非本轮实点。manual与coverage冻结，UTF8/JSON/求和/diff0，无UI或测试活动；最终结论已交独立验收。

## 最终独立结论与交付状态

独立验收明确判R01-R08在既定退役/保留边界内通过，无实现或验收阻塞；截至提交前，Git同步待执行。291任务身份按原282有效记录+4最新替换+5额外组成，history再以同身份3套替换，最新覆盖通过；不是一次全绿，原286首次失败与伪指标输出保留。Panel真实HTML两script、源码宿主局部UI、两格式fixture及MM原512/machine/project/window54/两hash均获核对，无部署/安装/训练。

167来源最终分类为click1、preview1、history96（68/28）、未执行4、本人3、条件26、暂缓1、selector7、无producer28，manual/coverage一致。10022声明-only兼容、10027Worker条件，原历史不改。目录框仅取消预览；映射未保存/拆表未生成，旧自定义无样本；4写入/同步入口未执行。通过不等于167项现版全实点，既有边界和外部条件继续保留。

R01-R08八实现会话已按独立通过归档，原会话/证据不删除；G002实现已独立通过归档。调度准备统一scope提交并普通ff push/fetch，版本512/SFTP120不变，无打包安装发行或MCP/Worker更新。
## Git交付事实

2026-11-16 源码与G001/G002授权资料统一提交0712388ffe21310e560a35c1f6d56baa232e9d6f（Retire advanced experiment tooling and preserve basic result workflows），133个范围内路径。普通git push origin master成功，随后fetch核HEAD与origin/master均为该提交，ahead/behind为0/0；无跟踪文件剩余改动。无关VSIX sha256保持未跟踪未删除，未混入提交。此次Git成功事实与索引状态作为纯文档交付登记提交，不改变已验产品，不重复产品回归。

G001已独立验收并同步，无剩余本轮实现/验收/Git工作；外部条件及本人操作/未执行分支保留为明确限制，不等于全入口现版实点通过。不打包安装发行，现用户安装与Worker仍原版本，源码变化未部署。
