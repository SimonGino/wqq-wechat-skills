# opencode 完整使用指南：从 0 到生产级实战（长文收藏版）

> 阅读建议：先按本文步骤跑通「安装→插件→认证→验证→工作流」，最后再把"完整配置"抄到你的机器上。

---

## 目录

- 01｜opencode 到底强在哪：从"问答"到"调度"
- 02｜安装与启动：5 分钟跑起来
- 03｜必装生态：oh-my-opencode（把订阅"接进来"）
- 04｜认证与 Provider：从入门到进阶
- 05｜配置怎么生效：优先级、文件位置、完整配置项
- 06｜Agents：把角色分工固定下来（效率从这里起飞）
- 07｜oh-my-opencode 核心功能详解
- 08｜权限与安全：让它能干活，但不乱来
- 09｜验证清单：确认你真的配对了
- 10｜常见坑与排查：最容易翻车的点
- 11｜推荐工作流：一个能复用的 Agentic 编程模板
- 12｜总结：模型会过时，结构不会
- 附录｜完整配置参考（放在最后，直接复制粘贴）

---

## 01｜opencode 到底强在哪：从"问答"到"调度"

很多 AI 编码工具的默认心智模型是：

> 我问 → AI 回答

而 opencode（尤其搭配 oh-my-opencode）更像：

> 我下指令 → AI 拆任务 → 多个 Agent 协作完成

当模型越来越强时，工程师价值会更集中在三件事：

1) **拆解**：把模糊需求变成可执行任务  
2) **取舍**：明确边界、风险、回滚策略  
3) **验证**：把"看起来对"变成"能跑、能维护、能回归"  

opencode 的目标不是让你多写几行代码，而是让你更像**带队做项目**。

---

## 02｜安装与启动：5 分钟跑起来

### 2.1 安装 opencode

```bash
curl -fsSL https://opencode.ai/install | bash
```

验证安装成功：
```bash
opencode --version
# 应该显示 v1.0.150 或更高版本
```

### 2.2 启动

```bash
opencode
```

看到 TUI（终端界面）就算成功。界面包含：
- 顶部：当前模型和会话信息
- 中间：对话区域
- 底部：输入框和快捷键提示

### 2.3 基础命令速查

在 opencode 界面里，输入 `/` 可以看到所有命令：

| 命令 | 作用 |
|------|------|
| `/connect` | 添加 Provider 认证 |
| `/models` | 切换模型 |
| `/agents` | 切换 Agent |
| `/compact` | 压缩上下文（token 不够时用） |
| `/share` | 分享当前会话 |
| `/help` | 查看帮助 |

### 2.4（可选）VS Code / Cursor 插件

如果你更习惯 IDE，可以安装插件，但**强烈建议先把终端版本跑通**——终端版功能更完整。

---

## 03｜必装生态：oh-my-opencode（把订阅"接进来"）

> 这一步的目标：让 opencode 具备"可用、好用、可扩展"的基础体验。
> 
> **一句话总结**：oh-my-opencode 是经过 $24,000 token 验证的生产级配置，装上就能用。

### 3.1 为什么需要 oh-my-opencode？

裸装的 opencode 虽然强大，但需要大量配置才能发挥威力。oh-my-opencode 提供：

1. **预置 Agent 团队**：Sisyphus（主编排）、Oracle（架构师）、Librarian（文档专家）等，各司其职
2. **订阅直接用**：Claude Pro/Max、ChatGPT Plus/Pro、Gemini 订阅无需 API Key
3. **LSP 重构工具**：不只分析，还能重命名、跳转、代码操作
4. **后台并行 Agent**：多个 Agent 同时干活，不用干等
5. **Claude Code 兼容**：现有的 `.claude/` 配置直接迁移
6. **精选 MCP**：Context7（官方文档）、grep.app（GitHub 代码搜索）内置

### 3.2 安装方式一：让 Agent 自动装（推荐）

进入 opencode 后，直接输入并回车：

```text
Install and configure by following the instructions here https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/refs/heads/master/README.md
```

它会问你 3 个关键问题：

1. **有 Claude Pro/Max 订阅吗？**
   - 有 → 是 max20 模式吗？（max20 更强但更贵）
   - 没有 → 跳过
2. **有 ChatGPT Plus/Pro 订阅吗？**
3. **要用 Gemini 吗？**

照实回答，它会自动：
- 安装必要插件
- 配置 Agent 模型
- 告诉你接下来要做哪些认证

### 3.3 安装方式二：命令行静默安装

如果你不想交互，可以用 CLI 参数直接装：

```bash
# 全套订阅 + max20
bunx oh-my-opencode install --no-tui --claude=max20 --chatgpt=yes --gemini=yes

# 只有 Claude（没 max20）
bunx oh-my-opencode install --no-tui --claude=yes --chatgpt=no --gemini=no

# 什么订阅都没有（用免费 Provider）
bunx oh-my-opencode install --no-tui --claude=no --chatgpt=no --gemini=no
```

> **注意**：如果 `bunx` 不行就换 `npx`。Ubuntu/Debian 用 Snap 装的 Bun 可能会报错，建议用官方脚本重装：`curl -fsSL https://bun.sh/install | bash`

### 3.4 验证安装成功

```bash
# 检查版本（需要 1.0.150+）
opencode --version

# 检查插件是否加载
cat ~/.config/opencode/opencode.json | grep -A5 '"plugin"'
```

确保 `plugin` 数组里包含 `oh-my-opencode`。

---

## 04｜认证与 Provider：从入门到进阶

> 这一步的目标：让你不靠 API Key，也能用订阅直接登录并调用模型。

### 4.1 什么是 Provider？

Provider 就是模型的"来源"。opencode 支持 **75+ Provider**，包括：

| 类型 | 代表 Provider | 特点 |
|------|---------------|------|
| **官方订阅** | Anthropic (Claude Pro/Max)、OpenAI (ChatGPT Plus/Pro) | 用订阅账号登录，无需 API Key |
| **OAuth 代理** | Google Antigravity | 用 Gemini 订阅调用多种模型 |
| **API Key** | DeepSeek、Groq、OpenRouter | 传统 API Key 认证 |
| **本地模型** | Ollama、LM Studio、llama.cpp | 完全免费，离线可用 |
| **企业级** | Amazon Bedrock、Azure OpenAI、Google Vertex AI | 企业合规需求 |

### 4.2 入门推荐：OpenCode Zen（官方托管）

如果你是新手，最简单的方式是用 **OpenCode Zen**——官方测试过的模型列表：

```bash
# 1. 在 opencode 里运行
/connect

# 2. 选择 opencode

# 3. 访问 https://opencode.ai/auth 登录并创建 API Key

# 4. 粘贴 API Key

# 5. 运行 /models 查看可用模型
/models
```

### 4.3 进阶：用现有订阅（推荐）

如果你已经有 Claude Pro/Max 或 ChatGPT Plus/Pro 订阅，可以直接用：

#### 4.3.1 Anthropic (Claude Pro/Max)

```bash
opencode auth login
# Provider 选 Anthropic
# Login method 选 Claude Pro/Max
# 浏览器登录完成 OAuth
```

#### 4.3.2 Google Gemini (Antigravity OAuth)

这是最推荐的方式之一，支持：
- 多账号负载均衡（最多 10 个，一个限流自动切下一个）
- 调用 Gemini 3 Pro/Flash
- 通过 Antigravity 还能调用 Claude 模型

**步骤 1**：添加插件到 `~/.config/opencode/opencode.json`：

```json
{
  "plugin": [
    "oh-my-opencode",
    "opencode-antigravity-auth@1.2.8"
  ]
}
```

**步骤 2**：配置模型（从 [opencode-antigravity-auth README](https://github.com/NoeFabris/opencode-antigravity-auth) 复制完整配置）

**步骤 3**：登录

```bash
opencode auth login
# Provider 选 Google
# Login method 选 OAuth with Google (Antigravity)
# 浏览器登录
```

**可用模型**：
- `google/antigravity-gemini-3-pro-high`
- `google/antigravity-gemini-3-pro-low`
- `google/antigravity-gemini-3-flash`
- `google/antigravity-claude-sonnet-4-5`
- `google/antigravity-claude-sonnet-4-5-thinking-high`
- `google/antigravity-claude-opus-4-5-thinking-high`
- 等等...

#### 4.3.3 OpenAI (ChatGPT Plus/Pro)

**步骤 1**：添加插件：

```json
{
  "plugin": [
    "oh-my-opencode",
    "opencode-openai-codex-auth@4.3.0"
  ]
}
```

**步骤 2**：配置模型（从 [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth) 复制）

**步骤 3**：登录

```bash
opencode auth login
# Provider 选 OpenAI
# Login method 选 ChatGPT Plus/Pro (Codex Subscription)
# 浏览器登录
```

**可用模型**：
- `openai/gpt-5.2`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.1-codex-max`

**Variants（推理强度）**：可以通过 `--variant=<none|low|medium|high|xhigh>` 控制。

### 4.4 其他常用 Provider

#### GitHub Copilot（需要 Pro+ 订阅）

```bash
/connect
# 选择 GitHub Copilot
# 访问 github.com/login/device 输入代码
```

#### DeepSeek（性价比之选）

```bash
/connect
# 选择 DeepSeek
# 输入 API Key（从 platform.deepseek.com 获取）
```

#### Ollama（本地模型，完全免费）

在 `opencode.json` 里配置：

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "llama2": {
          "name": "Llama 2"
        }
      }
    }
  }
}
```

### 4.5 多 Provider 分工策略

生产级推荐配置是**双 Provider + 分工**：

| 角色 | Provider | 模型 | 用途 |
|------|----------|------|------|
| **主力** | Google Antigravity | Claude Opus 4.5 Thinking High | 复杂编排、深度思考 |
| **快枪手** | Google Antigravity | Gemini 3 Flash | 快速搜索、简单任务 |
| **大脑** | OpenAI | GPT 5.2 | 架构决策、代码审查 |
| **前端** | Google Antigravity | Gemini 3 Pro | UI/UX 设计 |

这样配置后，oh-my-opencode 会自动根据任务类型选择合适的模型。

---

## 05｜配置怎么生效：优先级、文件位置、完整配置项

> 你不需要一上来就写"完整配置"。先理解 3 件事：文件在哪、谁覆盖谁、你最该配哪几项。

### 5.1 配置文件位置

opencode 有两套配置：

| 配置文件 | 位置 | 作用 |
|----------|------|------|
| `opencode.json` | `~/.config/opencode/opencode.json`（全局）<br>`./opencode.json`（项目级） | opencode 核心配置 |
| `oh-my-opencode.json` | `~/.config/opencode/oh-my-opencode.json`（全局）<br>`./.opencode/oh-my-opencode.json`（项目级） | oh-my-opencode 插件配置 |

### 5.2 配置格式：支持 JSONC（带注释）

opencode 支持 **JSONC** 格式，可以写注释：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  
  // 主题配置
  "theme": "opencode",
  
  /* 主模型 */
  "model": "anthropic/claude-sonnet-4-5",
  
  // 自动更新
  "autoupdate": true,
}
```

### 5.3 配置优先级（从低到高）

```
1. 远程组织配置（.well-known/opencode）← 最低
2. 全局配置（~/.config/opencode/opencode.json）
3. 自定义配置（OPENCODE_CONFIG 环境变量）
4. 项目配置（./opencode.json）
5. .opencode 目录
6. 运行时内联配置（OPENCODE_CONFIG_CONTENT）← 最高
```

**关键理解**：配置是**合并**的，不是替换。后面的配置只覆盖冲突的字段。

### 5.4 核心配置项详解

#### 5.4.1 模型配置

```json
{
  "model": "anthropic/claude-sonnet-4-5",      // 主模型
  "small_model": "anthropic/claude-haiku-4-5"  // 轻量任务（标题生成等）
}
```

#### 5.4.2 Provider 配置

```json
{
  "enabled_providers": ["google", "openai"],  // 只启用这些
  "disabled_providers": ["ollama"],           // 禁用这些（优先级更高）
  
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000,        // 请求超时（毫秒）
        "setCacheKey": true       // 启用缓存
      }
    }
  }
}
```

#### 5.4.3 权限配置

```json
{
  "permission": {
    "read": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow"
    },
    "edit": "ask",    // 修改文件前询问
    "bash": {
      "*": "ask",
      "git status": "allow",
      "npm test": "allow"
    }
  }
}
```

#### 5.4.4 文件监控配置

```json
{
  "watcher": {
    "ignore": [
      "node_modules/**",
      "dist/**",
      ".git/**",
      ".next/**",
      "build/**",
      "target/**"
    ]
  }
}
```

#### 5.4.5 上下文压缩配置

```json
{
  "compaction": {
    "auto": true,   // 上下文满了自动压缩
    "prune": true   // 删除旧的工具输出节省 token
  }
}
```

#### 5.4.6 TUI 界面配置

```json
{
  "tui": {
    "scroll_speed": 3,
    "scroll_acceleration": {
      "enabled": true
    },
    "diff_style": "auto"  // 或 "stacked"
  }
}
```

#### 5.4.7 自定义 Agent

```json
{
  "agent": {
    "code-reviewer": {
      "description": "代码审查专家",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "你是代码审查专家，关注安全、性能和可维护性。",
      "tools": {
        "write": false,  // 禁止修改文件
        "edit": false
      }
    }
  },
  "default_agent": "plan"  // 默认使用的 Agent
}
```

#### 5.4.8 变量替换

配置文件支持变量：

```json
{
  // 环境变量
  "model": "{env:OPENCODE_MODEL}",
  
  // 文件内容
  "provider": {
    "openai": {
      "options": {
        "apiKey": "{file:~/.secrets/openai-key}"
      }
    }
  }
}
```

### 5.5 oh-my-opencode 配置详解

在 `oh-my-opencode.json` 里：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  
  // 使用 Antigravity 认证
  "google_auth": false,
  
  // Agent 模型覆盖
  "agents": {
    "Sisyphus": {
      "model": "google/antigravity-claude-opus-4-5-thinking-high"
    },
    "oracle": {
      "model": "openai/gpt-5.2"
    },
    "librarian": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "explore": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/antigravity-gemini-3-pro-high"
    }
  },
  
  // 禁用不需要的 Hook
  "disabled_hooks": ["comment-checker"],
  
  // 禁用不需要的 Agent
  "disabled_agents": [],
  
  // 禁用不需要的 MCP
  "disabled_mcps": [],
  
  // Ralph Loop 配置
  "ralph_loop": {
    "enabled": true,
    "default_max_iterations": 100
  },
  
  // Claude Code 兼容性
  "claude_code": {
    "mcp": true,
    "commands": true,
    "skills": true,
    "agents": true,
    "hooks": true
  }
}
```

---

## 06｜Agents：把角色分工固定下来（效率从这里起飞）

当你把 Agent 分工固定下来，你就能从"对话"升级成"调度"。

### 6.1 内置 Agent 团队

| Agent | 默认模型 | 角色定位 | 最佳使用场景 |
|-------|----------|----------|--------------|
| **Sisyphus** | Claude Opus 4.5 | 主编排器 | 复杂任务拆解、多 Agent 调度、Todo 驱动开发 |
| **oracle** | GPT 5.2 | 架构师 + 调试专家 | 架构决策、代码审查、疑难杂症 |
| **librarian** | Gemini 3 Flash / Claude Sonnet | 文档专家 | 查官方文档、找开源实现、代码考古 |
| **explore** | Grok Code / Gemini 3 Flash | 快速扫描器 | 代码库结构、模式匹配、快速定位 |
| **frontend-ui-ux-engineer** | Gemini 3 Pro | 前端设计师 | UI/UX 设计、样式调整、组件开发 |
| **document-writer** | Gemini 3 Pro | 技术作家 | README、API 文档、架构文档 |
| **multimodal-looker** | Gemini 3 Flash | 视觉专家 | 图片/PDF/图表分析 |

### 6.2 如何调用 Agent？

**方式一：直接 @ 提及**
```text
让 @oracle 审查这个架构设计，列出风险点
让 @librarian 查查 React Query 的最佳实践
让 @explore 找出所有用户认证相关的代码
```

**方式二：切换默认 Agent**
```text
/agents
# 选择想用的 Agent
```

**方式三：用魔法关键词**（oh-my-opencode 特有）
```text
# ultrawork / ulw - 全力并行编排
帮我重构这个模块 ultrawork

# search / find - 触发 explore + librarian 并行搜索
search 项目里所有 API 调用

# analyze / investigate - 触发深度分析
analyze 这个性能问题的根因
```

### 6.3 Agent 协作示例

**场景**：重构一个老旧的用户认证模块

```text
你：帮我重构 auth 模块 ultrawork

Sisyphus 会自动：
1. 派 @explore 并行扫描 auth 相关代码
2. 派 @librarian 查最新的认证最佳实践
3. 派 @oracle 出架构方案 + 风险评估
4. 自己创建 Todo 列表并逐项推进
5. 完成后派 @oracle 做最终 review
```

### 6.4 自定义 Agent

在 `oh-my-opencode.json` 里覆盖：

```json
{
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.2",
      "temperature": 0.3,
      "prompt_append": "回答时用中文。"
    },
    "explore": {
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  }
}
```

---

## 07｜oh-my-opencode 核心功能详解

这一节展开讲 oh-my-opencode 的杀手级功能。

### 7.1 后台并行 Agent

传统 AI 编程工具是**串行**的——一个任务做完才能做下一个。oh-my-opencode 支持**后台并行**：

```text
# GPT 还在调试，Claude 已经在用另一个思路找根因
# Gemini 写前端，Claude 同步写后端
# 发起大规模并行搜索，主 Agent 继续干别的
```

**工作原理**：
1. 主 Agent 启动后台任务，拿到 task_id
2. 继续处理其他事情
3. 后台任务完成时收到通知
4. 需要结果时用 `background_output(task_id)` 获取

### 7.2 LSP 工具套件

oh-my-opencode 把 IDE 的能力给了 Agent：

| 工具 | 作用 | 示例 |
|------|------|------|
| `lsp_hover` | 查看类型和文档 | 光标放到函数上看签名 |
| `lsp_goto_definition` | 跳转到定义 | 从调用跳到函数定义 |
| `lsp_find_references` | 查找所有引用 | 看这个函数被哪里调用了 |
| `lsp_rename` | 全项目重命名 | 安全重命名变量/函数 |
| `lsp_code_actions` | 快速修复和重构 | 自动导入、提取函数 |
| `ast_grep_search` | AST 感知代码搜索 | 用语法模式搜索（支持 25 种语言） |

### 7.3 Ralph Loop（干到完才停）

灵感来自 Anthropic 的 Ralph Wiggum 插件——**自参照开发循环**：

```text
/ralph-loop "实现一个完整的 REST API"
```

Agent 会一直干，直到：
- 检测到 `<promise>DONE</promise>` 标记
- 达到最大迭代次数（默认 100）
- 用户输入 `/cancel-ralph`

**特点**：
- 支持所有编程语言
- 中途停了会自动续上
- 不需要人工干预

### 7.4 Todo 驱动开发

oh-my-opencode 强制 Agent 完成 Todo：

```text
# Agent 创建了 5 个 Todo
# 只完成了 3 个就想停？
# 系统会强制踢回去继续干
```

这就是为什么叫"西西弗斯"——像神话中的人物一样，永不停歇地推石头。

### 7.5 上下文注入器

**Directory AGENTS.md 注入**：读文件时自动把路径上的所有 `AGENTS.md` 注入上下文

```
project/
├── AGENTS.md              # 项目级规则
├── src/
│   ├── AGENTS.md          # src 规则
│   └── components/
│       ├── AGENTS.md      # 组件规则
│       └── Button.tsx     # 读它时，上面 3 个 AGENTS.md 全生效
```

**条件规则注入**：从 `.claude/rules/` 按条件加载规则

```markdown
---
globs: ["*.ts", "src/**/*.js"]
description: "TypeScript/JavaScript coding rules"
---
- Use PascalCase for interface names
- Use camelCase for function names
```

### 7.6 精选 MCP

| MCP | 作用 | 使用场景 |
|-----|------|----------|
| **Context7** | 查询最新官方文档 | "React 19 的新特性？" |
| **grep.app** | 在百万 GitHub 仓库中秒搜代码 | "找个 JWT 认证的例子" |
| **Exa** | 联网搜索 | "最近有什么新的 AI 框架？" |

### 7.7 Claude Code 兼容层

如果你之前用 Claude Code，现有配置可以直接迁移：

| Claude Code 路径 | 作用 |
|------------------|------|
| `~/.claude/commands/` | 自定义斜杠命令 |
| `~/.claude/skills/` | 技能目录 |
| `~/.claude/agents/` | 自定义 Agent |
| `~/.claude/.mcp.json` | MCP 服务器 |
| `~/.claude/settings.json` | Hooks（PreToolUse、PostToolUse 等） |

**禁用兼容性**（如果不需要）：

```json
{
  "claude_code": {
    "mcp": false,
    "commands": false,
    "hooks": false
  }
}
```

### 7.8 其他实用功能

| 功能 | 说明 |
|------|------|
| **注释检查器** | 禁止 AI 写废话注释，保持代码干净 |
| **思考模式** | 检测到 "think deeply" 自动启用深度思考 |
| **上下文窗口监控** | 用了 70% 时提醒 Agent，防止焦虑 |
| **预防性压缩** | 85% 时自动压缩，不等爆了再处理 |
| **会话恢复** | 工具出错、消息为空自动恢复 |
| **会话通知** | Agent 完成任务发系统通知 |

---

## 08｜权限与安全：让它能干活，但不乱来

生产环境最怕两件事：

1) 读取敏感信息（.env、私钥、token）  
2) 执行破坏性命令（rm、批量替换、错误脚本）

### 8.1 推荐权限配置

```json
{
  "permission": {
    "read": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow"
    },
    "edit": "ask",
    "bash": {
      "*": "ask",
      "git status": "allow",
      "git diff": "allow",
      "git log": "allow",
      "npm test": "allow",
      "npm run lint": "allow"
    }
  }
}
```

### 8.2 Agent 级别权限

在 `oh-my-opencode.json` 里给特定 Agent 设权限：

```json
{
  "agents": {
    "explore": {
      "permission": {
        "edit": "deny",     // 不允许修改文件
        "bash": "ask",      // 执行命令前询问
        "webfetch": "allow" // 允许上网
      }
    }
  }
}
```

### 8.3 权限值说明

| 值 | 意义 |
|----|------|
| `"allow"` | 直接放行，不询问 |
| `"ask"` | 每次都询问用户确认 |
| `"deny"` | 直接拒绝 |

---

## 09｜验证清单：确认你真的配对了

> 配置完千万别"感觉没报错就算成功"。按这个清单自检，省掉 80% 的坑。

### 9.1 文件存在

```bash
ls -la ~/.config/opencode/
```

应看到：
- `opencode.json` 或 `opencode.jsonc`
- `oh-my-opencode.json`
- `auth.json`（认证信息）

### 9.2 插件是否加载

```bash
cat ~/.config/opencode/opencode.json | grep -A10 '"plugin"'
```

确保包含：
- `oh-my-opencode`
- `opencode-openai-codex-auth`（如果用 ChatGPT）
- `opencode-antigravity-auth@1.2.8`（如果用 Gemini）

### 9.3 Provider 是否正确

运行 `/models` 命令，应该只看到你配置的 Provider 的模型。

### 9.4 权限是否生效

测试：
- 让它读取 `.env` → 应该拒绝
- 让它执行 `rm -rf /` → 应该询问确认
- 让它执行 `git status` → 可自动放行

### 9.5 Agent 是否可用

运行 `/agents`，应该看到：
- Sisyphus
- oracle
- librarian
- explore
- frontend-ui-ux-engineer
- document-writer
- multimodal-looker

---

## 10｜常见坑与排查：最容易翻车的点

### 坑 1：JSON 写了注释导致解析失败

**症状**：配置不生效，报 JSON 解析错误  
**原因**：JSON 不支持注释  
**解决**：用 `.jsonc` 后缀，或删除注释

### 坑 2：模型名/Provider 名不一致

**症状**：模型找不到，或用了错误的模型  
**原因**：插件的模型名和内置的不一样  
**解决**：以插件 README 为准。例如：
- Antigravity 插件：`google/antigravity-gemini-3-pro-high`
- OpenAI Codex 插件：`openai/gpt-5.2`

### 坑 3：大仓库卡顿、CPU 飙高

**症状**：opencode 启动慢，CPU 占用高  
**原因**：watcher 扫描了 node_modules 等大目录  
**解决**：扩展 ignore 配置

```json
{
  "watcher": {
    "ignore": [
      "node_modules/**",
      "dist/**",
      ".git/**",
      ".next/**",
      "build/**",
      "target/**",
      "*.log"
    ]
  }
}
```

### 坑 4：bash 自动执行让人不放心

**症状**：Agent 自动执行了危险命令  
**原因**：bash 权限设成了 `allow`  
**解决**：

```json
{
  "permission": {
    "bash": {
      "*": "ask",
      "git status": "allow"
    }
  }
}
```

### 坑 5：Token 爆了

**症状**：对话到一半报错 token 超限  
**解决**：
1. 开启自动压缩：`"compaction": { "auto": true, "prune": true }`
2. 开启预防性压缩（oh-my-opencode 默认开启）
3. 手动运行 `/compact`

### 坑 6：版本太低

**症状**：功能不生效，插件报错  
**原因**：opencode 版本低于 1.0.150  
**解决**：

```bash
# 检查版本
opencode --version

# 更新
curl -fsSL https://opencode.ai/install | bash
```

---

## 11｜推荐工作流：一个能复用的 Agentic 编程模板

### 11.1 基础模板：方案→证据→边界→实现→复核

```text
1. @oracle：出架构方案 + 风险清单 + 回滚策略
2. @librarian：找证据（现有实现、提交记录、规范文档）
3. @explore：画模块地图（入口、边界、调用链路）
4. Sisyphus：拆 Todo 并逐项推进（每步可验证）
5. @oracle：最终 review（边界条件、失败路径、回归风险）
```

### 11.2 一键工作流：ultrawork

**最简单的方式**——在提示词里加上 `ultrawork`（或简写 `ulw`）：

```text
帮我实现用户认证功能 ultrawork
```

Agent 会自动：
1. 分析项目结构
2. 并行搜索相关代码和文档
3. 制定实现计划
4. 创建 Todo 列表
5. 逐项实现并验证
6. 完成后自我 review

### 11.3 场景工作流示例

#### 新功能开发

```text
我要实现一个新的支付功能 ultrawork

需要：
1. 集成 Stripe API
2. 支持微信/支付宝
3. 有订单管理后台
```

#### Bug 修复

```text
analyze 用户登录偶尔失败的问题

已知信息：
- 错误日志：xxx
- 复现步骤：xxx
```

#### 代码重构

```text
帮我重构 auth 模块 ultrawork

要求：
1. 拆分成更小的模块
2. 增加单元测试
3. 保持 API 兼容
```

#### 代码审查

```text
让 @oracle review 这个 PR：

重点关注：
1. 安全性
2. 性能影响
3. 边界条件
```

---

## 12｜总结：模型会过时，结构不会

opencode 不是"更聪明的 AI"，而是更成熟的工程结构：

| 层级 | 你需要做的 | 它帮你做的 |
|------|-----------|-----------|
| **Provider 分层** | 配置主力/备选 | 自动选择、失败切换 |
| **模型分层** | 指定大/小模型 | 按任务复杂度选用 |
| **Agent 分工** | 定义角色职责 | 自动调度协作 |
| **权限控制** | 设置边界 | 拦截危险操作 |
| **工作流模板** | 定义流程 | 自动推进验证 |

**当这些配好后，模型升级只是"换发动机"，你的系统仍然能跑。**

---

# 附录｜完整配置参考（建议最后再复制粘贴）

> 说明：下面是完整的生产级配置。  
> 你可以先按正文步骤完成安装、插件、认证、验证，最后再把这两份配置放进对应位置。

---

## A1）~/.config/opencode/opencode.json（完整版）

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  
  // ========== 插件配置 ==========
  "plugin": [
    "oh-my-opencode",
    "opencode-openai-codex-auth@4.3.0",
    "opencode-antigravity-auth@1.2.8"
  ],
  
  // ========== Provider 配置 ==========
  "enabled_providers": ["google", "openai"],
  
  // ========== 模型配置 ==========
  "default_agent": "plan",
  "model": "google/antigravity-claude-opus-4-5-thinking-high",
  "small_model": "google/antigravity-claude-sonnet-4-5",
  
  // ========== TUI 界面配置 ==========
  "tui": {
    "scroll_speed": 3,
    "scroll_acceleration": {
      "enabled": true
    },
    "diff_style": "auto"
  },
  
  // ========== 文件监控配置 ==========
  "watcher": {
    "ignore": [
      "node_modules/**",
      "dist/**",
      ".git/**",
      ".next/**",
      "build/**",
      "target/**",
      "*.log",
      ".cache/**"
    ]
  },
  
  // ========== 权限配置 ==========
  "permission": {
    "read": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow",
      "**/.env": "deny",
      "**/credentials*": "deny",
      "**/*secret*": "deny"
    },
    "edit": "ask",
    "bash": {
      "*": "ask",
      "git status": "allow",
      "git diff": "allow",
      "git log": "allow",
      "git branch": "allow",
      "npm test": "allow",
      "npm run lint": "allow",
      "npm run build": "allow",
      "pnpm test": "allow",
      "pnpm lint": "allow",
      "yarn test": "allow",
      "yarn lint": "allow"
    }
  },
  
  // ========== 上下文压缩配置 ==========
  "compaction": {
    "auto": true,
    "prune": true
  },
  
  // ========== 自动更新 ==========
  "autoupdate": true,
  
  // ========== 分享配置 ==========
  "share": "manual",
  
  // ========== Provider 详细配置 ==========
  "provider": {
    "openai": {
      "name": "OpenAI",
      "options": {
        "timeout": 600000,
        "reasoningEffort": "medium",
        "reasoningSummary": "auto",
        "textVerbosity": "medium",
        "include": ["reasoning.encrypted_content"],
        "store": false
      },
      "models": {
        "gpt-5.2": {
          "name": "GPT 5.2 (OAuth)",
          "limit": {
            "context": 272000,
            "output": 128000
          },
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "variants": {
            "none": {
              "reasoningEffort": "none",
              "reasoningSummary": "auto",
              "textVerbosity": "medium"
            },
            "low": {
              "reasoningEffort": "low",
              "reasoningSummary": "auto",
              "textVerbosity": "medium"
            },
            "medium": {
              "reasoningEffort": "medium",
              "reasoningSummary": "auto",
              "textVerbosity": "medium"
            },
            "high": {
              "reasoningEffort": "high",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            },
            "xhigh": {
              "reasoningEffort": "xhigh",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            }
          }
        },
        "gpt-5.2-codex": {
          "name": "GPT 5.2 Codex (OAuth)",
          "limit": {
            "context": 272000,
            "output": 128000
          },
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "variants": {
            "low": {
              "reasoningEffort": "low",
              "reasoningSummary": "auto",
              "textVerbosity": "medium"
            },
            "medium": {
              "reasoningEffort": "medium",
              "reasoningSummary": "auto",
              "textVerbosity": "medium"
            },
            "high": {
              "reasoningEffort": "high",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            },
            "xhigh": {
              "reasoningEffort": "xhigh",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            }
          }
        },
        "gpt-5.1-codex-max": {
          "name": "GPT 5.1 Codex Max (OAuth)",
          "limit": {
            "context": 272000,
            "output": 128000
          },
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "variants": {
            "low": {
              "reasoningEffort": "low",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            },
            "medium": {
              "reasoningEffort": "medium",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            },
            "high": {
              "reasoningEffort": "high",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            },
            "xhigh": {
              "reasoningEffort": "xhigh",
              "reasoningSummary": "detailed",
              "textVerbosity": "medium"
            }
          }
        }
      }
    },
    "google": {
      "name": "Google",
      "models": {
        "antigravity-gemini-3-pro-high": {
          "name": "Gemini 3 Pro High (Antigravity)",
          "attachment": true,
          "limit": {
            "context": 1048576,
            "output": 65535
          },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-gemini-3-pro-low": {
          "name": "Gemini 3 Pro Low (Antigravity)",
          "attachment": true,
          "limit": {
            "context": 1048576,
            "output": 65535
          },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-gemini-3-flash": {
          "name": "Gemini 3 Flash (Antigravity)",
          "attachment": true,
          "limit": {
            "context": 1048576,
            "output": 65536
          },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-sonnet-4-5": {
          "name": "Claude Sonnet 4.5 (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-sonnet-4-5-thinking-low": {
          "name": "Claude Sonnet 4.5 Low (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-sonnet-4-5-thinking-medium": {
          "name": "Claude Sonnet 4.5 Medium (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-sonnet-4-5-thinking-high": {
          "name": "Claude Sonnet 4.5 High (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-opus-4-5-thinking-low": {
          "name": "Claude Opus 4.5 Low (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-opus-4-5-thinking-medium": {
          "name": "Claude Opus 4.5 Medium (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        },
        "antigravity-claude-opus-4-5-thinking-high": {
          "name": "Claude Opus 4.5 High (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": {
            "input": ["text", "image", "pdf"],
            "output": ["text"]
          }
        }
      }
    }
  }
}
```

---

## A2）~/.config/opencode/oh-my-opencode.json（完整版）

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  
  // ========== 认证配置 ==========
  // 使用外部 opencode-antigravity-auth 插件时设为 false
  "google_auth": false,
  
  // ========== Agent 模型覆盖 ==========
  "agents": {
    "Sisyphus": {
      "model": "google/antigravity-claude-opus-4-5-thinking-high"
    },
    "oracle": {
      "model": "openai/gpt-5.2",
      "temperature": 0.3
    },
    "librarian": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "explore": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/antigravity-gemini-3-pro-high"
    },
    "document-writer": {
      "model": "google/antigravity-gemini-3-pro-high"
    },
    "multimodal-looker": {
      "model": "google/antigravity-gemini-3-flash"
    }
  },
  
  // ========== Sisyphus Agent 配置 ==========
  "sisyphus_agent": {
    "disabled": false,
    "default_builder_enabled": false,
    "planner_enabled": true,
    "replace_plan": true
  },
  
  // ========== Ralph Loop 配置 ==========
  "ralph_loop": {
    "enabled": true,
    "default_max_iterations": 100
  },
  
  // ========== 后台任务并发配置 ==========
  "background_task": {
    "defaultConcurrency": 5,
    "providerConcurrency": {
      "anthropic": 3,
      "openai": 5,
      "google": 10
    },
    "modelConcurrency": {
      "anthropic/claude-opus-4-5": 2,
      "google/antigravity-gemini-3-flash": 10
    }
  },
  
  // ========== 禁用的 Hook ==========
  // 可选值: todo-continuation-enforcer, context-window-monitor, 
  // session-recovery, session-notification, comment-checker,
  // grep-output-truncator, tool-output-truncator, directory-agents-injector,
  // directory-readme-injector, empty-task-response-detector, think-mode,
  // anthropic-context-window-limit-recovery, rules-injector,
  // background-notification, auto-update-checker, startup-toast,
  // keyword-detector, agent-usage-reminder, non-interactive-env,
  // interactive-bash-session, empty-message-sanitizer,
  // compaction-context-injector, thinking-block-validator,
  // claude-code-hooks, ralph-loop, preemptive-compaction
  "disabled_hooks": [],
  
  // ========== 禁用的 Agent ==========
  // 可选值: oracle, librarian, explore, frontend-ui-ux-engineer,
  // document-writer, multimodal-looker
  "disabled_agents": [],
  
  // ========== 禁用的 MCP ==========
  // 可选值: context7, grep_app
  "disabled_mcps": [],
  
  // ========== Claude Code 兼容性 ==========
  "claude_code": {
    "mcp": true,
    "commands": true,
    "skills": true,
    "agents": true,
    "hooks": true,
    "plugins": true
  },
  
  // ========== 实验性功能 ==========
  "experimental": {
    "preemptive_compaction_threshold": 0.85,
    "truncate_all_tool_outputs": false,
    "aggressive_truncation": false,
    "auto_resume": false,
    "dcp_for_compaction": false
  }
}
```

---

## A3）快速入门配置（最小化版本）

如果你只想快速开始，用这个最小配置：

### opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-opencode"],
  "autoupdate": true,
  "permission": {
    "bash": { "*": "ask" }
  }
}
```

### oh-my-opencode.json

```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json"
}
```

然后按需添加 Provider 和模型配置。

---

## A4）常用命令速查表

| 命令 | 作用 |
|------|------|
| `/connect` | 添加 Provider 认证 |
| `/models` | 切换模型 |
| `/agents` | 切换 Agent |
| `/compact` | 压缩上下文 |
| `/share` | 分享会话 |
| `/ralph-loop "任务"` | 启动 Ralph Loop |
| `/cancel-ralph` | 取消 Ralph Loop |
| `ultrawork` / `ulw` | 魔法关键词，触发全力并行编排 |
| `search` / `find` | 触发 explore + librarian 并行搜索 |
| `analyze` | 触发深度分析 |

---

## A5）快捷键速查表

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+C` | 中断当前操作 |
| `Ctrl+D` | 退出 opencode |
| `↑/↓` | 历史消息导航 |
| `Tab` | 自动补全 |
| `Ctrl+L` | 清屏 |

---

## A6）相关链接

| 资源 | 链接 |
|------|------|
| OpenCode 官方文档 | https://opencode.ai/docs/ |
| OpenCode GitHub | https://github.com/anomalyco/opencode |
| oh-my-opencode GitHub | https://github.com/code-yeongyu/oh-my-opencode |
| opencode-antigravity-auth | https://github.com/NoeFabris/opencode-antigravity-auth |
| opencode-openai-codex-auth | https://github.com/numman-ali/opencode-openai-codex-auth |
| OpenCode Discord | https://opencode.ai/discord |

---

> **最后提醒**：
> 1. 配置文件支持 `.jsonc` 格式（带注释），但如果你用 `.json` 后缀，需要删除所有注释
> 2. 配置是合并的，不是替换的——后面的配置只覆盖冲突的字段
> 3. 有问题先检查版本：`opencode --version`（需要 1.0.150+）
> 4. 最简单的使用方式：在提示词里加上 `ultrawork`，让 Agent 自己搞定一切
