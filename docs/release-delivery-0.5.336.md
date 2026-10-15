# 0.5.336 手动停止后派发修复

原实现把“原请求接收情况未知”当作任何新手动请求的前置拒绝条件，明确的停止后派发也在调用停止服务之前被拦截。现允许显式 stopRunning 请求沿用原 Worker 和 commandId，先执行精确取消并主动核实取消围栏及窗口退出，再审核已有产物，最后创建新的执行身份。

未授权停止、原身份缺失、断线或停止尚未核实时仍阻止新启动。保留重复点击与请求身份检查、发送后未知不自动换服务器，以及删除双确认。没有自动停止或重派用户任务。

## 验证

- 回归先复现原拦截；修复后验证 dispatching/unknown 的明确停止后派发、批量等待、失败保留原 commandId、缺少身份拒绝，以及实际 Host 的停止响应丢失后主动查询。
- 隔离真实 tmux 使用轻量 CPU 探针与合成 GPU，验证未接收原请求可先建立取消围栏，迟到原请求收到 TASK_CANCELLED，同卡其他任务保留，随后正常手动任务按指定 GPU 运行。测试按 commandId 选择证据，不依赖清单顺序。
- 最终 npm run package：110 次串行单文件测试，共 726 项测试执行通过。构建、运行闭包、编译面板及三个渲染脚本的 vm.Script 校验通过。未宣称全部历史测试文件已执行。
- VSIX 共 491 项，364 个 dist 文件逐文件匹配构建，八个 Python 文件 AST 通过，491 个文本条目通过凭据模式检查。身份、版本、平台与敏感路径排除通过。

## 发行与安装

- 源码提交 2fee89959740034a97be0f9a4a4ff672ecdcb402，普通 push 后 fetch 确认 origin/master 一致。
- 稳定 Latest Release：[v0.5.336](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.336)，Release 与 tag 均绑定上述提交，draft=false、prerelease=false。
- simple-experiment-0.5.336.vsix：2901957 字节；同名校验文件 98 字节。
- SHA256：79f21f606b6f8c677f3cd8d9a7e24eb9cb0e7727586f6913ff0173c227c3e22b。
- 实际已安装 0.5.335 更新客户端读取公开 Latest，确认 update_available；重新下载 VSIX 和校验文件，身份、平台、大小、SHA256 与本机已验证包一致。
- SimpleSFTP 复用公开稳定 0.2.90：168173 字节，SHA256 d7fcbc0df6eb606d52146e28c30cb1f75851da01e29042a403127f3ffeb4eb65，下载包与本机包一致，未修改或重复安装。
- 仅执行一次 npm run install:latest，已安装 0.5.336。364 个安装 dist 文件与 VSIX 一致，package.json 仅新增 VS Code 安装元数据；simpleex 入口及 --help 正常。

安装后未操作当前面板或调用插件 API。等待用户重载后验收实际手动停止后派发；本轮没有停止、重跑或改派现有任务，没有部署远端、同步生产项目或删除真实产物。
