# future-gpu-roots v1 实施计划（简短版，非 FINAL）

批准：用户 2026-10-22 明确“确认无误，全部实现”；父交接要求 Linux 实现→测试→返修，本会话唯一 writer。
边界：不合并/不 push/不 Release/不安装/不部署/不写远端/不改科研环境/不碰真实产物；NWPU213 永久排除；无历史移动/删除授权。
输入基线：A=aa677984741196419f246b9502ae7b899f9790d7（本树 future-gpu-roots-audit），B=13ef630a12c6ea02ad9277452e75dbf443b9a34b（B 树仅阶段3评估相关，暂不改）。

## 阶段 1：GPU 独立单采集源（本树）
目标：每 Worker 一个结构化采集循环，独立 tmux 会话承载（复用既有 task-queue 控制器惯例：确定性会话名 + @se_* endpoint 绑定 + remain-on-exit + has-session 幂等 ensure），Agent/VS Code 退出后继续；Agent、Scheduler、监控显示只作消费者，去掉重复 nvidia-smi。禁止新系统 daemon、新 socket 配置、NVML、解析 watch 屏幕、批量关窗/PID 杀进程。
- 新增 src/runtime/GpuCollector.ts（Python 块）：
  - 帧文件 <worker 状态根>/gpu_collector/frame.json（原子写；属机器状态根，不在项目代码/产物范围，天然不进科研同步/清理枚举——阶段2 固化）。
  - 帧字段：schemaVersion、workerId、collectorEpoch（随采集器代际：monotonic+pid，仅采集器重启变）、seq（采集器代际内单调，Agent 重启不重置）、collectedAt、collectedMonotonic（CLOCK_MONOTONIC，跨进程可比，时钟回拨不造假）、status/error、completeness、gpus、frameSource。
  - gpu_collector_main 循环（1s，与既有核心频率一致，不降频）；gpu_collector_ensure 幂等启动（tmux new-session 确定性名，绝不批量关闭/重启他窗）；read_gpu_collector_frame 供各消费者。
  - 准入因果：gpu_admission_frame 先记请求前 seq 水位 W，仅接受 seq>W 且 monotonic 年龄有界的帧；等待有界，超时=不准入并保持 pending；采集器缺失（旧端）→ 走原直采但证据标 gpuSampleMode="direct_unoptimized"，不悄悄放宽阈值/频率。
- 改 src/clusterAgentRuntime.legacy.ts：main() 增 `gpu-collector` 子命令；api_worker_gpu 优先读帧（fresh→返回，保留 source=worker_telemetry 兼容入环，附 frameSource/collectorEpoch），缺失/过期→原直采并标记；telemetry 采样线程改为读帧不再自采；drain/准入循环用 gpu_admission_frame 替代直采。
- 帧完整性：atomic_write 复用既有；读取失败=completeness partial 显示未知。
反向调用者清点：api_worker_gpu 调用方=HTTP /worker/gpu、api_worker_availability、write_worker_gpu_snapshot、task_execution_inventory 捎带（缓存语义保持）；collect_local_gpu 调用方=drain、scheduler 准入、lifecycle GPU 数核验（lifecycle 属部署一次性核验，不改）。
测试域（单文件 20s，Python 只提取被测函数，先查并发测试进程）：
- test/agent/gpuCollectorFrame.test.js：帧原子读、seq 单调、Agent 重启（重写同文件）epoch/seq 不变、时钟回拨（伪造 wall clock）不产生新鲜性、缺失/坏帧→degraded。
- test/agent/gpuAdmissionCausality.test.js：水位因果（请求前 W，seq≤W 拒）、超时 pending 不降级、旧端缺失→direct_unoptimized 标记且阈值不变、多消费者并发读同帧一致。
- test/features/gpuSampleRingCollectorEpoch.test.js：TS 环：Agent 重连同采集器代际续接、采集器重启新代际且旧代迟到帧拒收。
门禁钩子去重：build 链含 taskLifecycle/tmuxTaskLifecycle/gpuMemoryAdmission 等（开发期只跑影响域；最终候选跑 build 规定集，168 文件清单已审计，不新增重复）。

## 阶段 2：四根映射（兼容读取，不迁移）
目标：稳定项目身份→程序根/机器状态根/代码根/声明产物根只读映射 + 接线（非仅映射）：
- TS：src/features/ProjectRootMap.ts——按现有配置/策略解析四根并持久只读观察；面板/宿主读取处接映射（ProviderSnapshot 暴露），不改现有同步/清理执行路径的判定语义。
- 新机器状态（阶段1帧文件等）写受管状态根；核实并断言其不进入同步范围枚举与清理候选（SyncScopeStatus/PlanCleanup 既有排除 + 新状态路径回归测试）。
- 保持 tmp/result、work_dirs/work_dir、用户勾选范围语义（PlanCleanupEvidence.ts:365 等既有断言不动）。
- 历史四根内容零移动/零迁移；如需搬迁只列精确对象+备份方案并标待批准。
测试域：rootMap 解析/绑定/跨 UID-Worker-项目边界；同步/清理排除回归（复用既有测试名 planCleanup/cleanupMissingTargets 的影响域子集）。

## 阶段 3：条件优化（证据门）
仅当有实测重复工作/瓶颈证据：区分初建/热读/变更更新与完整操作成本对比 rsync/find。当前无真实原通道/网络证据→预期结论“条件未成立，保持 rsync 与既有 ProjectFileIndex”，可做的仅是本机有界合成样本计数（不冒充远端吞吐），并如实标注真实远端取证须父另行只读宿主步骤。不复活 v1.7/v1.8，不为“全部实现”强行接线。

## 验证与交付
- 开发：编译生成（tsc + write-agent-runtime.js）+ 影响域单文件测试；最终候选跑 package.json 规定完整门禁集（Linux 可跑部分），Windows 专属链交父（准确树/SHA/命令清单）。
- 显式测试走 pi-test-evidence.py SPEC.json（/host/d/OpenChamber-AgentConfig/OpenChamberProjectSandbox/pi-test-evidence.py），唯一证据目录+原始日志+真实退出码。
- 不 bump 版本、不 package/install（避免与另一会话发行冲突）；提交仅本新分支，不合并。

## 阶段 3 结论（2026-10-22 实测取证，条件未成立）
- 有界本机合成样本（/tmp，2000 文件小文件树，WSL ext4，事后已删）：冷遍历 6ms、热遍历 5ms、rsync -ain 无变更 dry-run 54ms。仅本机数字，不含真实远端通道/网络，不冒充远端吞吐。
- 无任何获批的真实 Worker 通道证据；文档与既有原型记录（v1.7/v1.8 已关闭）也无实测重复工作证明。按门禁契约判定：条件未成立——保持 rsync 与既有 ProjectFileIndex，不复活 v1.7/v1.8，不为"全部实现"强行接线。真实远端取证须父另行只读宿主步骤。
