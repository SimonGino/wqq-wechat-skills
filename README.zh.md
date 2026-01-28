# wqq-wechat-skills

[English](./README.md) | 中文

面向微信公众号教程类文章的个人 Claude Code Skills（MVP）。

## MVP

- 你手动收集素材 → 整理成 Markdown sources
- 生成教程风格的公众号 Markdown 正文
- 生成信息图提示词并可选生成图片

## 在 Claude Code 中使用

### 使用 Skill 命令（推荐）

最简单的方式是在 Claude Code 中直接使用 skill：

1) 准备素材文件（带 YAML frontmatter 的 Markdown）
2) 在 Claude Code 中运行：

```
/wqq-wechat-article
```

Claude 会：
- 询问你的一句话总结和大纲
- 读取你的素材文件
- 自动生成完整的文章结构

生成图片：

```
/wqq-image-gen
```

Claude 会询问提示词并生成图片。

## 推荐工作流（MVP）

### 方式 1：在 Claude Code 中使用（推荐）

1) 手动收集素材，保存为带 YAML frontmatter 的 Markdown 文件：

```markdown
---
title: 文章标题
url: https://example.com
author: 作者名
date: 2026-01-28
---

素材内容...
```

2) 在 Claude Code 中运行：

```
/wqq-wechat-article
```

Claude 会引导你完成整个流程。

### 方式 2：直接使用 CLI

1) 准备素材文件（同上）

2) 运行文章生成脚本：

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts \
  --sources remotion-skills/sources/*.md \
  --summary "手把手教你使用remotion生成视频" \
  --outline "安装环境,创建项目,编写代码,测试部署"
```

输出：
- `wechat-article/<topic>/01-sources.md`：合并的素材
- `wechat-article/<topic>/02-outline.md`：文章大纲
- `wechat-article/<topic>/03-article.md`：文章草稿（需手动完善）
- `wechat-article/<topic>/04-infographics/prompts.md`：信息图提示词

3) 根据教程模板完善 `03-article.md`

4) （可选）生成信息图：

```bash
npx -y bun skills/wqq-image-gen/scripts/main.ts \
  --prompt "创建关于...的流程图" \
  --image wechat-article/<topic>/04-infographics/01-flowchart.png \
  --ar 1:1 \
  --quality 2k
```

## 特性

- **自动化工作流**：脚本自动处理文件组织和模板生成
- **智能重试**：图片生成失败自动重试，指数退避（3 次）
- **错误处理**：详细的错误提示和故障排查建议
- **类型安全**：完整的 TypeScript 类型检查
- **测试覆盖**：单元测试 + 集成烟雾测试

## 环境配置（API Key）

`wqq-image-gen` 支持 OpenAI 或 Google（自动按可用 key 选择）。

建议用 `.env` 文件（不要提交到 git）：

```bash
mkdir -p ~/.wqq-skills
cat > ~/.wqq-skills/.env << 'EOF'
# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_IMAGE_MODEL=gpt-image-1.5

# Google
GOOGLE_API_KEY=xxx
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview
EOF
```

加载优先级（高→低）：
1. 命令行环境变量
2. `process.env`
3. `<cwd>/.wqq-skills/.env`
4. `$HOME/.wqq-skills/.env`

## 已知限制

- 当前版本不提供自动抓取/爬取功能（避免被平台反爬、登录、JS 渲染等问题卡住）。
- 如果你需要采集自动化，可以后续加一个"浏览器抓取"型 skill（非 MVP）。

## 安装

```bash
/plugin marketplace add <你的 GitHub 用户名>/wqq-wechat-skills
```

## Skills

- `wqq-wechat-article` - 微信教程文章生成器
- `wqq-image-gen` - 信息图生成器（OpenAI/Google）

## 开发

### 环境配置

```bash
# 安装依赖
bun install

# 类型检查
bun run typecheck

# 运行测试
bun run test

# 运行烟雾测试
bun run test:smoke
```

### 项目结构

```
skills/
  shared/              # 共享工具模块
    retry.ts           # 指数退避重试
    arg-parser.ts      # CLI 参数解析辅助函数
  wqq-image-gen/       # 图片生成 skill
  wqq-wechat-article/  # 微信文章 skill
scripts/
  smoke-test.sh        # 集成测试
remotion-skills/       # 示例素材
  sources/             # 测试用的 Markdown 素材
```

### 贡献

这是一个个人 skills 仓库，欢迎 fork 后按需修改。
