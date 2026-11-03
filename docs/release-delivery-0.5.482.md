# 0.5.482 试行交付

2026-11-03 完成产品优化及前缀整改的本机验证、源码同步、试行发行和一次安装。用户重载及真实 Extension Host/服务器验收仍待进行。本轮没有连接训练服务器、部署 Agent、自动重跑、传输或清理科研产物，没有科研分析或环境修改。

## 源码与发布

- 最终运行修改提交：`58f413eea49e5a85b73d11705e86c577d39a9ec2`。
- 最终说明提交及发布 tag 绑定：`7235742e883d4f8c39b5d7afc0a9c7c33a0ba967`；与运行提交之间只改变七份文档，包内运行输入未变。
- [v0.5.482 试行发布](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.482)：公开可见、非 draft、Pre-release，创建使用 `--prerelease --latest=false`；未覆盖历史 tag/资产。
- 资产：`simple-experiment-0.5.482.vsix`，2780142 字节。
- SHA256：`44089996f9d45ff8a519461bc0e299d622fb4ddcffddf38d04e7e21b9f2c61e4`。
- 配套清单：`simple-experiment-0.5.482.vsix.sha256`，97 字节，UTF-8/LF，精确绑定上述文件名。

已从真实发布网页下载 VSIX 与清单，核对大小、SHA、逐字节一致及 ZIP 包身份 `simple-local.simple-experiment@0.5.482`。下载文件保留于本机 Downloads，没有删除旧包。远端 tag 的实际提交与上述源码一致。

## 验证范围

最终规定 package receipt：`simple_cluster/reports/test-workflow/2026-11-03T00-01-01-057Z-81868-package/run.json`，318 作业全部通过，未运行 0，最大实际并发 1，exit=0，721997ms。362 项实际包内容检查零违规，运行闭包、平台/版本/身份、秘密排除及实际生成主 HTML 三段脚本解析通过。最终 D2b 定向 86 项及真实隔离浏览器回归通过；此前各批有各自有效规定测试及实际失败记录。

最终纯文档补充 17 项检查通过、exit=0；七文档 UTF-8 严格复读、363 本机链接与原生入口索引行号存在性通过，未为纯文档重编译或重打包。索引中 332 处是源码调用位置，不等于 332 个实机页面已通过。

真实更新客户端使用公开 GitHub 返回、无 mock：当前 0.5.482/0.2.117 不需要稳定更新；旧 0.5.439/0.2.116 可看到 0.5.440/0.2.117。两仓实际 Latest 请求均 HTTP 200。发布后重新从网页 `/releases/latest` 导航，仍分别为 0.5.440 与 0.2.117；试行未进入稳定通道，SimpleSFTP 未修改或重复发行。

本机证据保留在 `simple_cluster/reports/product-optimization/final-0.5.482/`：`remote-release.json`、`actual-update-client.json`、`install.log`、`simpleex-help.log` 及文档测试日志。这些运行证据不提交进源码或发行包，原失败记录也未清理。

## 安装与待验证

全部代码、打包、发行及下载核对结束后显式执行一次 `npm run install:latest`，exit=0；没有 `--force`、降级或重复安装。随后 `code --list-extensions --show-versions` 核对为 SimpleExperiment 0.5.482、SimpleSFTP 0.2.117。安装器刷新稳定 `simpleex` 入口，本机命令路径及离线 `simpleex --help` exit=0。VS Code CLI 的 `DEP0169` 弃用提示保留在日志，安装及版本核对均成功。

安装后停止操作实际 SimpleExperiment 面板，等待用户 **Developer: Reload Window**，约一分钟。所有相关窗口重载后核对运行版本、全局前缀逐次提醒、自定义布局及草稿；未重载不能把磁盘版本当作 Extension Host 已生效。

前缀唯一用户级全局来源默认 `simple`，`zlk` 仍是合法自选值；没有替用户改设置。旧目录、窗口及显式配置不自动迁移、重启或清理。Agent 等默认项目内，GPU 采样保留账号公共唯一源。实际共享账号旧服务归属、服务器接收/运行/停止、产物与逐 Worker 同步、原生对话键盘和真实 VS Code 缩放仍为待验证，不用隔离渲染或包校验代替。

完整实施与边界见 [分批计划](product-optimization-plan.md)、[流程覆盖表](product-ui-coverage.md) 和 [原生入口索引](ui-dialog-inventory.md)。本轮本机交付完成；后续现场操作需遵守原用户授权及 SimpleExperiment/SimpleSFTP API，不因已安装而自动执行。
