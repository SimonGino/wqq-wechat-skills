# wqq-x-bookmarks

导出 X（Twitter）书签为 Markdown，支持调试认证、分页抓取、媒体本地化和重复导出 skip。

## 前置条件

- 需要可用的 X cookies：`auth_token`、`ct0`
- 可通过环境变量注入：

```bash
export X_AUTH_TOKEN="..."
export X_CT0="..."
```

## 调试认证与分页

```bash
npx -y bun skills/wqq-x-bookmarks/scripts/debug.ts --count 5 --save-raw
```

能力：
- 验证认证是否可用
- 拉取一页书签并输出 `tweetIds` / `nextCursor`
- 可选保存原始响应 JSON

## 导出书签

默认导出最新 50 条，默认下载媒体：

```bash
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts
```

常用参数：

```bash
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --output /tmp/wqq-x-bookmarks-demo
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --no-download-media
```

## 输出结构

```text
<output>/<标题-作者-id>/<tweetId>.md
<output>/<标题-作者-id>/imgs/*
<output>/<标题-作者-id>/videos/*
```

重复导出同一目录时，若已存在 `<tweetId>.md`，会自动 `skipped`。
