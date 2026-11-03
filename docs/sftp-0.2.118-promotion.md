# SimpleSFTP 0.2.118 正式提升

2026-11-03 用户明确回复“确认无误，SFTP试行版转正式版号”，满足具体版本实际认可和提升授权。只提升 SimpleSFTP 0.2.118，SimpleExperiment 权威版仍为 0.5.440，现有 0.5.482 继续试行。

现有 [v0.2.118 Release](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.118) 使用 gh release edit 改为 draft=false、prerelease=false、latest=true，更新正式标题及说明；不创建新版本、不移动 tag、不替换资产。发布 tag/target 保持 `23cbf92918c7b63cf4674a4159c3f06120037e5d`。原 69 文件/465 项测试与用户实际认可继续有效，不为元数据提升重复构建、打包或安装。

原包 `simple-sftp-0.2.118.vsix` 为 242568 字节，SHA256 `edf506aa2b01933eb8a348a42787ad62f0179913109b658753137d29ab21b3ba`；逐包清单 91 字节，SHA256 `c97a8b56f75d94334fd4ceb1ac6e9f63ff9708067e1ab8790e4bc807536ec6b7`。提升前再次从公开资产地址下载两文件，与已验证本机文件一致；保留于系统临时 `sftp-promote-118-4c2d4523f3104ec392877f277a09411c`，没有清理文件。

提升后网页 /releases/latest 重新解析到 0.2.118 并显示 Latest。实际 ReleaseClient 读取两仓公开 GitHub Latest 均 HTTP 200，核对 SFTP 非 draft/非 prerelease、target、两资产名称/大小/摘要；0.2.117 可看到 0.2.118 更新，已装 0.2.118 无更新，已装 SE 0.5.482 不降级。SimpleExperiment Latest 保持 0.5.440。真实记录系统临时 `sftp-118-stable-promotion-1793709783520.json`，没有 mock 或伪造返回。

本仓只同步权威 JSON、package 的权威标签元数据、README、交付约定、AGENTS 和本记录，共六文件；不改运行逻辑、版本号、依赖或构建产物。原 adapterTaskTypeLabelClarity 5/5、exit=0，覆盖权威元数据与 JSON 一致和实际生成设置文字；日志系统临时 `sftp-118-promotion-policy.log`。UTF-8 复读、JSON 解析及 diff 检查通过后按普通 push/fetch 同步。已发布/安装的 SE 0.5.482 包不覆盖，其内嵌权威标签仍是打包时的 SFTP 0.2.117；实时正式更新源已为 0.2.118，新标签随下一次正常 SE 版本打包生效，不为此发行空版本或重装。

SimpleSFTP 仓库另同步当前说明及原交付记录，历史试行经过保留。没有重新安装、重载窗口、访问训练服务器、传输、清理、科研运行或远端 Agent 部署。用户本次确认用于 SFTP 版本认可，不扩大为服务器现场安全验收。完成两仓源码同步后本次转正完成，无额外用户操作。
