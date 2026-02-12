# wqq-wechat-skills

这是一个面向微信公众号教程写作的个人技能仓库，包含：
- `wqq-wechat-article`：把素材整理成教程型公众号文章
- `wqq-image-gen`：生成封面图与信息图（OpenAI / Google）

## MVP 能力

- 手动整理素材（Markdown）
- 自动生成教程文章骨架与草稿
- 自动生成公众号封面 prompt（双裁切规范）
- 自动生成信息图 prompts（可选再生成图片）

## 推荐使用方式（Claude Code）

### 1) 文章生成

```text
/wqq-wechat-article
```

你会得到：
- 文章目录与草稿
- 封面图 prompt（同一张图兼容 `1:1` 和 `2.35:1`）
- 信息图 prompts

### 2) 图片生成

```text
/wqq-image-gen
```

适用场景：
- 公众号封面图
- 文中信息图（流程图、清单卡、对比图等）

## 推荐工作流（MVP）

### 方案 A：直接用技能（推荐）

1) 准备素材文件（Markdown + YAML 元信息）

```markdown
---
title: 资料标题
url: https://example.com
author: 作者名
date: 2026-01-28
---

这里是你摘录的内容与理解。
```

2) 在 Claude Code 中执行：

```text
/wqq-wechat-article
```

3) 根据输出补全 `03-article.md` 细节，按需生成图片。

### 方案 B：命令行直接执行

1) 先准备好 `sources/*.md`

2) 生成文章结构：

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts \
  --sources sources/*.md \
  --summary "手把手教你从 0 到 1 搭建某工具" \
  --outline "安装,初始化,核心配置,实战用法,排错"
```

输出目录示例：

```text
wechat-article/<topic>/
  sources/
  01-sources.md
  02-outline.md
  03-article.md
  04-infographics/
    00-cover-prompt.md
    prompts.md
```

3) 按 prompts 生成图片（可选）：

```bash
# 封面图（双裁切：1:1 + 2.35:1）
npx -y bun skills/wqq-image-gen/scripts/main.ts \
  --prompt "..." \
  --image wechat-article/<topic>/04-infographics/00-cover.png \
  --ar 2.35:1

# 信息图（示例：1:1）
npx -y bun skills/wqq-image-gen/scripts/main.ts \
  --prompt "..." \
  --image wechat-article/<topic>/04-infographics/01-infographic.png \
  --ar 1:1 \
  --quality 2k
```

## 公众号封面双裁切规范

如果一张图要同时用于微信 `1:1` 和 `2.35:1`：
- 画布建议 `2.35:1`
- 关键元素放在居中 `1:1` 安全区
- 左右两翼只做背景延展，不放关键信息
- `2.35:1` 不可用时，用 `21:9` 近似

## 环境变量配置

推荐把本地私有配置放到 `~/.wqq-skills/.env`（不要提交到 Git）：

```bash
mkdir -p ~/.wqq-skills
cat > ~/.wqq-skills/.env << 'EOF'
OPENAI_API_KEY=sk-xxx
OPENAI_IMAGE_MODEL=gpt-image-1.5

GOOGLE_API_KEY=xxx
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview

# 可选：你的历史公众号文章目录（不配置则跳过历史文章参考步骤）
WQQ_PAST_ARTICLES_DIR=/absolute/path/to/your/past-articles
EOF
```

- `wqq-image-gen` 会自动读取 OpenAI / Google 相关配置。
- `wqq-wechat-article` 会读取 `WQQ_PAST_ARTICLES_DIR`：
  - 配置且目录存在：读取该目录下的历史文章作为风格参考
  - 未配置：跳过历史文章步骤（不会再去猜测其他目录）

## 安装

```bash
/plugin marketplace add <your-github-username>/wqq-wechat-skills
```

## 开发

```bash
# 类型检查
bun run typecheck

# 单元测试
bun run test

# 冒烟测试
bun run test:smoke
```

## 项目结构

```text
skills/
  shared/              # 公共工具
  wqq-image-gen/       # 图片生成技能
  wqq-wechat-article/  # 文章生成技能
scripts/
  smoke-test.sh        # 冒烟测试脚本
```

## 说明

这是个人技能仓库，可按需 fork 与二次改造。
