# plan-run-single-batch 计划

## 阶段状态
1. [完成] 新副本初始化（b65 冻结 SHA + 扁平分支；root-owned fix/ 命名空间冲突未绕过权限，改扁平命名由 GPT 裁定）。
2. [完成] 定向证据：共同提交路径导航 + 排除矩阵（见 evidence.md）。
3. [结束-已被反证] 旧“安装污染优先”调查由 GPT 撤回（TS18004 即真因，evidence.md 保留原文并明确标注历史）；宿主哈希/抓栈请求作废。
4. [完成，待 GPT high 审核] 最小修复（GPT 批准方案）：仅两处简写→`planFile: body.planFile`（diff 见 git；无其他源码改动、无新全局/多级 fallback）。先红后绿：RED=真实 ReferenceError 复现 exit1，GREEN=5/5 exit0；受影响既有套 82/82 exit0（日志路径见 evidence.md）。版本升级/打包/发行/安装与全量 218 未做（按令留待主控定 407 与 Windows 完整验收）。未 commit（node_modules 软链与 /tmp 编译副本不入库；等审核裁定提交面）。：仅在缺陷被证实于 b65 源码/或证实为安装物污染后按对应面处置；测试必须保留**单选 runPlan** 与**多选 runSelectedPlans** 两入口覆盖（现有域：test/features/ 下 batch/ledger 系列 + planRun 相关），复现层优先真实调用共用提交函数而非字符串断言。

## 现行阶段（GPT 批准）
5. [进行中] 0.5.407 冻结候选：根 version+lock/packages[''].version+RuntimeManifest 生成输入同步→纯 compile 入口（tsc-cached）→权威 package 清单发现核验（新测试文件收录，数量由 planner 实算）→精确 stage/commit；不跑 Linux 全量/组装包。

## 停止条件
- 不清理、不动外部服务器；补丁块已完成并过审；宿主安装目录只读哈希；若证据指向 SimpleSFTP 导出面或工作区适配代码，交回主控扩权后再查。
