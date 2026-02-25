# wqq-wechat-skills

这是一个面向微信公众号教程写作的个人技能仓库，包含：
- `wqq-wechat-article`：把素材整理成教程型公众号文章
- `wqq-image-gen`：生成封面图与信息图（OpenAI / Google）
- `wqq-x-bookmarks`：导出 X 书签为 Markdown（支持 debug、skip、`--with-summary` AI 汇总）
- `wqq-x-urls-zh-md`：将指定 X 链接导出为 Markdown，并在英文内容时自动翻译为中文

## MVP 能力

- 自动扫描 workspace 内 `md/txt` 素材（递归）
- 自动生成教程文章骨架与草稿
- 自动生成 `00-summary.md`（一句话总结 + 提纲）
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

### 3) X 书签导出

```bash
# 先验证认证
npx -y bun skills/wqq-x-bookmarks/scripts/debug.ts --count 5 --save-raw

# 再导出（默认 50 条，默认下载媒体）
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --output /tmp/wqq-x-bookmarks-demo

# 导出并生成 AI 汇总（需要 OPENAI_API_KEY）
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --with-summary --output /tmp/wqq-x-bookmarks-demo
```

`--with-summary` 说明：
- 缺少 `OPENAI_API_KEY` 会直接报错
- OpenAI 请求失败时自动回退到规则摘要，不影响其他条目导出

### 4) 指定 X 链接导出（自动英译中）

```bash
npx -y bun skills/wqq-x-urls-zh-md/scripts/main.ts \
  --urls \
  https://x.com/elvissun/status/2025920521871716562 \
  https://x.com/wangzan101/status/2025948108098854969
```

导出后可直接作为 `wqq-wechat-article` 的 workspace：

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts --workspace ./wqq-x-urls-zh-md-output
```

## 推荐工作流（MVP）

### 方案 A：直接用技能（推荐）

1) 在当前工作目录放入素材（支持 `*.md`、`*.txt`，会递归扫描子目录）
  - 默认排除目录：`.git`、`node_modules`、`wechat-article`
  - 缺失 front matter 会自动补齐最小字段（`title/source_path/ingested_at/tags`）

2) 在 Claude Code 中执行：

```text
/wqq-wechat-article
```

3) 根据输出补全 `03-article.md` 细节，按需生成图片。

### 方案 B：命令行直接执行

1) workspace-first（推荐，默认使用当前目录）

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts
```

或指定 workspace：

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts --workspace /path/to/workspace
```

2) legacy 模式（兼容旧参数）

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts \
  --sources sources/*.md \
  --summary "手把手教你从 0 到 1 搭建某工具" \
  --outline "安装,初始化,核心配置,实战用法,排错"
```

输出目录示例：

```text
<workspace>/wechat-article/<topic>/
  00-summary.md
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
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-1.5

GOOGLE_API_KEY=xxx
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview

# 可选：你的历史公众号文章目录（不配置则跳过历史文章参考步骤）
WQQ_PAST_ARTICLES_DIR=/absolute/path/to/your/past-articles
EOF
```

- `wqq-image-gen` 会读取 `~/.wqq-skills/.env`：
  - file-only：`OPENAI_API_KEY` / `OPENAI_BASE_URL` / `GEMINI_API_KEY` / `GOOGLE_BASE_URL` / `GOOGLE_IMAGE_MODEL`
  - 且 `OPENAI_BASE_URL/GOOGLE_BASE_URL` 必填。
- `wqq-x-bookmarks` 的 `--with-summary` 会从 `~/.wqq-skills/.env` 读取 `OPENAI_API_KEY/OPENAI_BASE_URL`。
- `wqq-x-urls-zh-md` 的英译中会从 `~/.wqq-skills/.env` 读取 `OPENAI_API_KEY/OPENAI_BASE_URL`。
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
  wqq-x-bookmarks/     # X 书签导出技能
  wqq-x-urls-zh-md/    # 指定 X 链接导出 + 英译中
scripts/
  smoke-test.sh        # 冒烟测试脚本
```

## 说明

这是个人技能仓库，可按需 fork 与二次改造。
