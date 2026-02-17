# WQQ X Bookmarks AI Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 `--with-summary` 生成的 `SUMMARY.md` 对每条书签都包含模型总结的三段式内容（`一句话摘要 / 相关性说明 / 来源链接`），并在 OpenAI 调用失败时自动回退到规则摘要且不中断导出。

**Architecture:** 保持最小改动，继续以 `skills/wqq-x-bookmarks/scripts/summary.ts` 作为汇总编排入口。在该文件内新增 OpenAI 总结函数与文本解析函数，`writeBookmarkSummary` 逐条串行调用，失败回退到现有 `excerpt` 逻辑。渲染层统一输出三段式字段，来源链接固定来自 front matter `url`，不信任模型生成链接。

**Tech Stack:** TypeScript, Bun runtime, Bun test, Node.js `fs/path`, OpenAI Chat Completions API (`fetch`)。

**Related Skills:** `@test-driven-development` `@verification-before-completion` `@systematic-debugging`

---

### Task 1: 将 SUMMARY 输出改为三段式（纯渲染层，先不接 AI）

**Files:**
- Modify: `skills/wqq-x-bookmarks/scripts/summary.test.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/summary.ts`

**Step 1: 写失败测试（渲染必须包含三段式字段）**

```ts
import { describe, expect, test } from "bun:test";
import { renderBookmarkSummaryMarkdown } from "./summary";

describe("renderBookmarkSummaryMarkdown", () => {
  test("renders three-part summary format", () => {
    const markdown = renderBookmarkSummaryMarkdown([
      {
        tweetId: "1",
        title: "A title",
        authorUsername: "alice",
        url: "https://x.com/alice/status/1",
        oneLineSummary: "这是一句话摘要",
        relevanceReason: "它解释了工程实践中的关键取舍",
        relativePath: "20260110-100000-a-alice-1/1.md",
      },
    ]);

    expect(markdown).toContain("一句话摘要：这是一句话摘要");
    expect(markdown).toContain("相关性说明：它解释了工程实践中的关键取舍");
    expect(markdown).toContain("来源链接：[原帖](https://x.com/alice/status/1)");
  });
});
```

**Step 2: 运行测试确认失败**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts`  
Expected: FAIL，报错字段不存在（`oneLineSummary` / `relevanceReason`）或断言不匹配。

**Step 3: 写最小实现（仅改渲染与类型）**

```ts
export type BookmarkSummaryEntry = {
  tweetId: string;
  title: string;
  authorUsername: string;
  url: string;
  oneLineSummary: string;
  relevanceReason: string;
  relativePath: string;
};

// render:
lines.push(`一句话摘要：${entry.oneLineSummary || "(empty)"}`);
lines.push(`相关性说明：${entry.relevanceReason || "(empty)"}`);
lines.push(`来源链接：[原帖](${entry.url})`);
```

**Step 4: 运行测试确认通过**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts`  
Expected: PASS。

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/summary.ts skills/wqq-x-bookmarks/scripts/summary.test.ts
git commit -m "feat: render bookmark summary in three-part format"
```

### Task 2: 新增 OpenAI 总结函数与失败回退（单元测试优先）

**Files:**
- Modify: `skills/wqq-x-bookmarks/scripts/summary.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/summary.test.ts`

**Step 1: 写失败测试（AI 成功与失败回退）**

```ts
import { describe, expect, test } from "bun:test";
import { generateAiSummaryForBookmark } from "./summary";

describe("generateAiSummaryForBookmark", () => {
  test("returns structured summary from OpenAI response", async () => {
    const fakeFetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "一句话摘要：这是测试摘要\n相关性说明：这条内容与工程实践直接相关",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await generateAiSummaryForBookmark({
      markdown: "# Title\n\nBody",
      fallbackExcerpt: "Fallback excerpt",
      url: "https://x.com/a/status/1",
      fetchImpl: fakeFetch as typeof fetch,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.openai.com/v1",
      } as NodeJS.ProcessEnv,
    });

    expect(result.oneLineSummary).toContain("测试摘要");
    expect(result.relevanceReason).toContain("工程实践");
    expect(result.usedFallback).toBe(false);
  });

  test("falls back when OpenAI request fails", async () => {
    const fakeFetch = async () => {
      throw new Error("network");
    };

    const result = await generateAiSummaryForBookmark({
      markdown: "# Title\n\nBody",
      fallbackExcerpt: "Fallback excerpt",
      url: "https://x.com/a/status/1",
      fetchImpl: fakeFetch as typeof fetch,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.openai.com/v1",
      } as NodeJS.ProcessEnv,
    });

    expect(result.oneLineSummary).toBe("Fallback excerpt");
    expect(result.relevanceReason).toContain("技术实践相关");
    expect(result.usedFallback).toBe(true);
  });
});
```

**Step 2: 运行测试确认失败**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts -t generateAiSummaryForBookmark`  
Expected: FAIL，函数不存在。

**Step 3: 写最小实现（OpenAI 调用 + 解析 + fallback）**

```ts
export async function generateAiSummaryForBookmark(input: {
  markdown: string;
  fallbackExcerpt: string;
  url: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): Promise<{ oneLineSummary: string; relevanceReason: string; usedFallback: boolean }> {
  // 1) read env: OPENAI_API_KEY, OPENAI_BASE_URL (default https://api.openai.com/v1)
  // 2) call /chat/completions
  // 3) parse two labeled lines
  // 4) any error -> fallback
}
```

Fallback 规则（固定）：
- `oneLineSummary = fallbackExcerpt || "(empty)"`
- `relevanceReason = "与技术实践相关，建议按需阅读原文。"`

**Step 4: 运行测试确认通过**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts -t generateAiSummaryForBookmark`  
Expected: PASS。

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/summary.ts skills/wqq-x-bookmarks/scripts/summary.test.ts
git commit -m "feat: add OpenAI-based summary generation with fallback"
```

### Task 3: 集成到 writeBookmarkSummary（逐条串行调用）

**Files:**
- Modify: `skills/wqq-x-bookmarks/scripts/summary.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/summary.test.ts`

**Step 1: 写失败测试（writeBookmarkSummary 产出包含三段式）**

```ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { writeBookmarkSummary } from "./summary";

test("writeBookmarkSummary writes three-part items", async () => {
  const out = await mkdtemp(path.join(tmpdir(), "x-bookmarks-"));
  const itemDir = path.join(out, "20260110-100000-a-alice-1");
  await Bun.write(path.join(itemDir, "1.md"), `---
url: "https://x.com/alice/status/1"
authorUsername: "alice"
---

# Title
Body`);

  const summaryPath = await writeBookmarkSummary(out, [
    { tweetId: "1", markdownPath: path.join(itemDir, "1.md") },
  ]);
  const text = await readFile(summaryPath!, "utf8");

  expect(text).toContain("一句话摘要：");
  expect(text).toContain("相关性说明：");
  expect(text).toContain("来源链接：[原帖](https://x.com/alice/status/1)");
});
```

**Step 2: 运行测试确认失败**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts -t writeBookmarkSummary`  
Expected: FAIL，输出仍是旧字段或未包含三段式。

**Step 3: 写最小实现（集成 AI 总结）**

```ts
for (const source of sources) {
  const markdown = await readFile(source.markdownPath, "utf8");
  const parsed = parseBookmarkMarkdown(source.tweetId, markdown);
  const ai = await generateAiSummaryForBookmark({
    markdown,
    fallbackExcerpt: parsed.excerpt,
    url: parsed.url,
    log,
  });

  entries.push({
    tweetId: parsed.tweetId,
    title: parsed.title,
    authorUsername: parsed.authorUsername,
    url: parsed.url,
    oneLineSummary: ai.oneLineSummary,
    relevanceReason: ai.relevanceReason,
    relativePath: path.relative(outputDir, source.markdownPath).split(path.sep).join("/"),
  });
}
```

实现约束：
- 串行调用 AI（不加并发）
- 即使没有 `OPENAI_API_KEY` 也不抛错，直接 fallback
- 每条失败只记录日志，不影响其余条目

**Step 4: 运行测试确认通过**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts`  
Expected: PASS。

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/summary.ts skills/wqq-x-bookmarks/scripts/summary.test.ts
git commit -m "feat: integrate ai summary generation into bookmark summary pipeline"
```

### Task 4: 文档同步（说明 OpenAI 依赖与回退行为）

**Files:**
- Modify: `skills/wqq-x-bookmarks/SKILL.md`
- Modify: `skills/wqq-x-bookmarks/README.md`
- Modify: `README.md`

**Step 1: 更新技能文档用法**

需要明确：
- `--with-summary` 现在会尝试 OpenAI 总结
- 使用 `OPENAI_API_KEY`（可选 `OPENAI_BASE_URL`）
- OpenAI 失败会自动回退规则摘要，不中断导出

**Step 2: 运行帮助命令做文档一致性检查**

Run: `npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --help`  
Expected: 正常输出 CLI 帮助，无运行时错误。

**Step 3: Commit**

```bash
git add skills/wqq-x-bookmarks/SKILL.md skills/wqq-x-bookmarks/README.md README.md
git commit -m "docs: document ai summary behavior and fallback"
```

### Task 5: 完整验证与交付检查

**Files:**
- No file changes (verification only)

**Step 1: 运行目标测试集合**

Run: `bun test skills/wqq-x-bookmarks/scripts/summary.test.ts skills/wqq-x-bookmarks/scripts/main.test.ts`  
Expected: PASS。

**Step 2: 运行类型检查**

Run: `bun run typecheck`  
Expected: PASS（无 TS 错误）。

**Step 3: 实际小样本导出（可选但推荐）**

Run: `npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 3 --with-summary --output /tmp/wqq-x-bookmarks-ai-summary-demo`  
Expected:
- 控制台输出 `summary: .../SUMMARY.md`
- `SUMMARY.md` 每条包含三段式字段
- 若 OpenAI 调用失败，仍有 fallback 内容

**Step 4: 提交验证记录（如需要）**

```bash
git status
```

Expected: 干净工作区或仅包含计划中的改动。
