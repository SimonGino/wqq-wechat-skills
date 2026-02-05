# Claude Code 省钱攻略：通过 Antigravity 反代复用 Google AI Pro 订阅

Google AI Pro 订阅除了 Gemini，还附带 Anthropic 的 Claude 模型。问题是：这些模型被锁在 Antigravity IDE 里，无法在 Claude Code CLI 或其他工具中使用。

![Google Antigravity](https://oss.mytest.cc/2026/01/7161f3faa56566219ad371a238f433bf.png)

**Antigravity Tools** 解决了这个问题——它是一个账号管理 + 协议反代系统，能把 Google AI Pro 里的 Claude 模型暴露成标准 API。

![Antigravity Tools](https://oss.mytest.cc/2026/01/44fab765f51dd2ead95adfcb12397b69.png)

## 核心能力

**协议转换**

支持三种 API 格式输出：
- `/v1/chat/completions`：OpenAI 格式，兼容 99% 的 AI 应用
- `/v1/messages`：Anthropic 原生格式，完整支持 Claude Code CLI（思维链、系统提示词等）
- Gemini 格式：Google 官方 SDK 直接调用

**智能容错**

遇到 `429`（限速）或 `401`（过期）时，自动重试并静默切换账号，业务无感知。

**多账号管理**

- OAuth 2.0 授权流程，支持自动/手动完成
- 批量导入（JSON 格式）、旧版本数据库热迁移
- 403 封禁检测，自动跳过异常账号

如果你有多个 Google AI Pro 账号，可以实现负载均衡——Opus 4.5 额度不够用的问题迎刃而解。

## 安装

### 方式一：Homebrew（macOS / Linux）

```shell
brew tap lbjlaq/antigravity-manager https://github.com/lbjlaq/Antigravity-Manager
brew install --cask antigravity-tools
```

> macOS 遇到权限问题可加 `--no-quarantine` 参数。

### 方式二：手动下载

前往 [GitHub Releases](https://github.com/lbjlaq/Antigravity-Manager/releases)，按系统选择：
- macOS：`.dmg`（支持 Apple Silicon & Intel）
- Windows：`.msi` 或便携版 `.zip`
- Linux：`.deb` 或 `AppImage`

## 配置使用

打开程序，在「账号管理」中添加 Google 账号并完成 OAuth 授权：

![仪表盘 - 全局配额监控与一键切换](https://github.com/lbjlaq/Antigravity-Manager/raw/main/docs/images/dashboard-light.png)

![账号列表 - 高密度配额展示与 403 智能标注](https://github.com/lbjlaq/Antigravity-Manager/raw/main/docs/images/accounts-light.png)

进入「API 反代」页面，启动服务（默认端口 8045）：

![API 反代 - 服务控制](https://github.com/lbjlaq/Antigravity-Manager/raw/main/docs/images/v3/proxy-settings.png)

终端设置环境变量后启动 Claude Code：

```shell
export ANTHROPIC_API_KEY="sk-antigravity"
export ANTHROPIC_BASE_URL="http://127.0.0.1:8045"
claude
```

完成。现在 Claude Code CLI 会通过本地反代调用你 Google AI Pro 订阅里的 Claude 模型。

![Claude Code 联网搜索 - 结构化来源与引文显示](https://github.com/lbjlaq/Antigravity-Manager/raw/main/docs/images/usage/claude-code-search.png)



## 其他替代方案

类似的反代工具还有 **sub2api** 等，功能相近，可按需选择：

![sub2api](https://oss.mytest.cc/2026/01/c367b2a998114cd1cf8067f0c4befd87.png)

<img src="https://oss.mytest.cc/2026/01/99d04a64fd6425cdf924fdbadc53def8.png" alt="alma" style="zoom: 50%;" />
