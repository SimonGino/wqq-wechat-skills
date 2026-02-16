---
name: wqq-x-bookmarks
description: 导出 X 书签到 Markdown，支持 debug 认证验证、分页抓取、媒体下载与重复导出 skip。
---

# WQQ X Bookmarks Workflow

目标：将 X 书签导出为本地 Markdown，目录命名为 `标题-作者-id`，重复执行自动跳过已导出内容。

## Prerequisites

- 需要环境变量：
  - `X_AUTH_TOKEN`
  - `X_CT0`

## Step 1: 先做 debug 认证验证

```bash
npx -y bun skills/wqq-x-bookmarks/scripts/debug.ts --count 5 --save-raw
```

说明：
- 输出 `tweetIds` 和 `nextCursor`
- `--save-raw` 会保存原始 JSON，便于排查结构变化
- 如果返回 401/403，说明 cookie 失效，需要刷新认证信息

## Step 2: 执行导出链路

默认行为：
- 默认 `--limit 50`
- 默认下载媒体（不传 `--no-download-media`）
- 单条失败不中断整体
- 已存在 `<tweetId>.md` 自动 skip

```bash
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts
```

常用参数：

```bash
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --output /tmp/wqq-x-bookmarks-demo
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --no-download-media
```

## Output

```text
<output>/<标题-作者-id>/<tweetId>.md
<output>/<标题-作者-id>/imgs/*
<output>/<标题-作者-id>/videos/*
```

命令结束会输出汇总：
- `success`
- `skipped`
- `failed`
