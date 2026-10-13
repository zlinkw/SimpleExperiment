# 插件更新源交付

本规范将已验证插件包进入用户实际“检查更新”发行源列为交付门禁。AGENTS.md 中的常规发布授权适用于今后的运行版本交付；不授权修改科研结果、训练、清理或自动部署 Worker。

## 交付顺序

1. 核对当前仓库 Git 状态、origin、目标平台、更新客户端的真实发行源及配套依赖。保留用户改动。仅修改约束或文档时，执行适用验证、提交和推送，无需新运行版本。
2. 实现及回归通过后递增 patch，同步 package、lock 和 runtime。显式运行 `npm run package`，验证实际 VSIX 的 publisher/name、版本、平台、engine、运行依赖闭包和秘密排除。保存这个确定包的字节大小与 SHA256，不在后续安装或上传时换包。
3. 检查差异，仅提交本批次文件。普通 push 到既有 `origin/master`，fetch 确认 HEAD 相等。不得改写远端历史。运行版本 Release 的 tag 必须绑定已验证源码提交；若有包内文档提交，也记录实际构建来源。
4. 向实际 GitHub 更新源显式上传稳定 Release 的 VSIX 与同名 `.vsix.sha256`。校验清单使用 UTF-8，格式为 `<64位SHA256>  <精确VSIX文件名>`。配套 SimpleSFTP 所需版本若尚未可取得，也必须经过自身约束和验证后发布到其自身更新源；可以复用已核验一致的现有资产。
5. 重新查询真实 Latest Release 并核对资产，再用实际更新解析逻辑验证较旧版本可识别该目标平台的更新。必要时将这两个精确包读取到本机隔离验证目录核验 SHA、ZIP 和内嵌 manifest；保留验证文件，不以顺手清理删除历史内容。仅检查 main/master、tag 或 release 创建回执不算验收。
6. 全部修改、打包及发行验证完成后，显式执行一次 `npm run install:latest`。同版本跳过，不 force、不降级。核对已安装版本与 CLI，随后等待用户 Developer: Reload Window。远端 Agent/Scheduler 更新及科研运行仍需遵循原授权边界，不因 GitHub 包发布而自动执行。

## 发行源与平台

Windows 的实际来源由 `src/updates/ReleaseClient.ts` 和 `src/features/ExtensionUpdates.ts` 确定：分别读取 SimpleExperiment、SimpleSFTP 仓库的公开稳定 Latest Release，选择身份、版本、平台匹配的 VSIX。源码分支推送不能让该入口自动发现更新。

Mac 若采用其他发行索引，按该平台的当前实现核对。禁止将 Mac 的版本号、仓库、扩展身份或包当成 Windows 包发布。若更新客户端以后改变协议，发布和验收规则必须随实际客户端一起更新。

## 幂等及失败边界

- 发布前核对同版本 tag 的实际提交、现有资产以及当前 Latest 版本。仅同身份、同提交、同包指纹可跳过重复步骤；同名不同字节或错误绑定阻断，不覆盖资产、重打 tag 或删除历史 Release。
- 远端已有更高稳定版本时不能将较旧包标为 Latest。draft、prerelease、只有源码压缩包、缺少配套包/VSIX/可信 SHA、错误平台或 Latest 不可见均为发行未完成。
- 完整发布包必须排除 token、凭据、用户设置、discovery 文件、科研数据、日志和结果。失败时只报告具体环节和错误，不暴露认证头或秘密。
- 成功报告分别给出源码提交、Release 链接、精确资产/指纹、本机安装及重载状态、远端部署状态。发布失败时明确“源码已推送，远端发行未完成”；不得将本机安装或 mock 更新检查当成远端发行通过。
