# WQQ X Bookmarks Skill Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `wqq-wechat-skills` 中落地完全自包含的 `wqq-x-bookmarks` skill，支持 debug 与导出，并保留已验证行为（默认 50、默认下载媒体、skip、目录命名 `标题-作者-id`）。

**Architecture:** 采用分层最小迁移：先建立 `skills/shared/x-runtime` 作为 X 运行时基础层（认证/请求/转换），再在 `skills/wqq-x-bookmarks/scripts` 构建书签业务层（分页解析、导出编排、调试入口）。CLI 与 Skill 文档按现有仓库模式接入，测试与 smoke 全部纳入目标仓库。

**Tech Stack:** TypeScript, Bun runtime, Bun test, Node.js fs/path/process, existing `skills/shared/*` utilities.

---

### Task 1: 搭建 `wqq-x-bookmarks` 脚手架与参数解析（TDD）

**Files:**
- Create: `skills/wqq-x-bookmarks/SKILL.md`
- Create: `skills/wqq-x-bookmarks/scripts/types.ts`
- Create: `skills/wqq-x-bookmarks/scripts/main.ts`
- Create: `skills/wqq-x-bookmarks/scripts/debug.ts`
- Test: `skills/wqq-x-bookmarks/scripts/main.test.ts`
- Test: `skills/wqq-x-bookmarks/scripts/debug.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { parseExportArgs } from "./main";

describe("parseExportArgs", () => {
  test("uses defaults", () => {
    const args = parseExportArgs([]);
    expect(args.limit).toBe(50);
    expect(args.downloadMedia).toBe(true);
  });
});
```

```ts
import { describe, expect, test } from "bun:test";
import { parseDebugArgs } from "./debug";

describe("parseDebugArgs", () => {
  test("parses count and save raw", () => {
    const args = parseDebugArgs(["--count", "10", "--save-raw"]);
    expect(args.count).toBe(10);
    expect(args.saveRaw).toBe(true);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `bun test skills/wqq-x-bookmarks/scripts/main.test.ts skills/wqq-x-bookmarks/scripts/debug.test.ts`  
Expected: FAIL with module/function missing.

**Step 3: Write minimal implementation**

```ts
export function parseExportArgs(argv: string[]) {
  return { limit: 50, outputDir: "", downloadMedia: true };
}
```

```ts
export function parseDebugArgs(argv: string[]) {
  return { count: 20, saveRaw: false };
}
```

**Step 4: Run tests to verify pass**

Run: `bun test skills/wqq-x-bookmarks/scripts/main.test.ts skills/wqq-x-bookmarks/scripts/debug.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/SKILL.md skills/wqq-x-bookmarks/scripts/types.ts skills/wqq-x-bookmarks/scripts/main.ts skills/wqq-x-bookmarks/scripts/debug.ts skills/wqq-x-bookmarks/scripts/main.test.ts skills/wqq-x-bookmarks/scripts/debug.test.ts
git commit -m "feat: scaffold wqq x bookmarks skill and cli arg parsers"
```

### Task 2: 迁移 `x-runtime` 认证与请求头基础（TDD）

**Files:**
- Create: `skills/shared/x-runtime/types.ts`
- Create: `skills/shared/x-runtime/constants.ts`
- Create: `skills/shared/x-runtime/cookies.ts`
- Create: `skills/shared/x-runtime/http.ts`
- Test: `skills/shared/x-runtime/cookies.test.ts`
- Test: `skills/shared/x-runtime/http.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { hasRequiredXCookies, buildCookieHeader } from "./cookies";

describe("cookies", () => {
  test("checks required cookies", () => {
    expect(hasRequiredXCookies({ auth_token: "a", ct0: "b" })).toBe(true);
  });

  test("builds cookie header", () => {
    expect(buildCookieHeader({ auth_token: "a", ct0: "b" })).toContain("auth_token=a");
  });
});
```

```ts
import { describe, expect, test } from "bun:test";
import { buildRequestHeaders } from "./http";

describe("buildRequestHeaders", () => {
  test("adds csrf and cookie headers", () => {
    const headers = buildRequestHeaders({ auth_token: "a", ct0: "b" });
    expect(headers["x-csrf-token"]).toBe("b");
    expect(headers.cookie).toContain("auth_token=a");
  });
});
```

**Step 2: Run tests to verify fail**

Run: `bun test skills/shared/x-runtime/cookies.test.ts skills/shared/x-runtime/http.test.ts`  
Expected: FAIL with modules missing.

**Step 3: Write minimal implementation**

```ts
export function hasRequiredXCookies(cookieMap: Record<string, string>): boolean {
  return Boolean(cookieMap.auth_token && cookieMap.ct0);
}

export function buildCookieHeader(cookieMap: Record<string, string>): string {
  return Object.entries(cookieMap)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}
```

```ts
export function buildRequestHeaders(cookieMap: Record<string, string>): Record<string, string> {
  return {
    accept: "application/json",
    cookie: buildCookieHeader(cookieMap),
    "x-csrf-token": cookieMap.ct0 ?? "",
  };
}
```

**Step 4: Run tests to verify pass**

Run: `bun test skills/shared/x-runtime/cookies.test.ts skills/shared/x-runtime/http.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add skills/shared/x-runtime/types.ts skills/shared/x-runtime/constants.ts skills/shared/x-runtime/cookies.ts skills/shared/x-runtime/http.ts skills/shared/x-runtime/cookies.test.ts skills/shared/x-runtime/http.test.ts
git commit -m "feat: add shared x runtime cookie and header utilities"
```

### Task 3: 迁移书签解析器（TDD）

**Files:**
- Create: `skills/wqq-x-bookmarks/scripts/bookmarks-parser.ts`
- Test: `skills/wqq-x-bookmarks/scripts/bookmarks-parser.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { extractBookmarkPage } from "./bookmarks-parser";

describe("extractBookmarkPage", () => {
  test("extracts tweet ids and next cursor", () => {
    const payload = {
      data: {
        bookmark_timeline_v2: {
          timeline: {
            instructions: [
              {
                entries: [
                  { content: { itemContent: { tweet_results: { result: { legacy: { id_str: "1001" } } } } } },
                  { content: { cursorType: "Bottom", entryType: "TimelineTimelineCursor", value: "cursor-1" } },
                ],
              },
            ],
          },
        },
      },
    };
    const page = extractBookmarkPage(payload);
    expect(page.tweetIds).toEqual(["1001"]);
    expect(page.nextCursor).toBe("cursor-1");
  });
});
```

**Step 2: Run test to verify fail**

Run: `bun test skills/wqq-x-bookmarks/scripts/bookmarks-parser.test.ts`  
Expected: FAIL (module/function missing).

**Step 3: Write minimal parser implementation**

```ts
export function extractBookmarkPage(payload: unknown): { tweetIds: string[]; nextCursor: string | null } {
  // parse instructions/entries, collect ids and Bottom cursor
  return { tweetIds: [], nextCursor: null };
}
```

**Step 4: Run test to verify pass**

Run: `bun test skills/wqq-x-bookmarks/scripts/bookmarks-parser.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/bookmarks-parser.ts skills/wqq-x-bookmarks/scripts/bookmarks-parser.test.ts
git commit -m "test: add bookmarks timeline parser with cursor extraction"
```

### Task 4: 迁移 queryId 解析与书签 API 客户端（TDD）

**Files:**
- Create: `skills/wqq-x-bookmarks/scripts/bookmarks-api.ts`
- Test: `skills/wqq-x-bookmarks/scripts/bookmarks-api.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { extractBookmarksQueryInfo, resolveBookmarksApiChunkUrl } from "./bookmarks-api";

describe("extractBookmarksQueryInfo", () => {
  test("extracts Bookmarks query id", () => {
    const info = extractBookmarksQueryInfo("queryId:\"abc\",operationName:\"Bookmarks\"");
    expect(info.queryId).toBe("abc");
  });
});

describe("resolveBookmarksApiChunkUrl", () => {
  test("falls back to shared bookmarks chunk", () => {
    const html = "\"shared~bundle.BookmarkFolders~bundle.Bookmarks\":\"0fe48ba\"";
    expect(resolveBookmarksApiChunkUrl(html)).toContain("shared~bundle.BookmarkFolders~bundle.Bookmarks.0fe48baa.js");
  });
});
```

**Step 2: Run test to verify fail**

Run: `bun test skills/wqq-x-bookmarks/scripts/bookmarks-api.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

```ts
export function extractBookmarksQueryInfo(chunk: string): { queryId: string } {
  const match = chunk.match(/queryId:\"([^\"]+)\",operationName:\"Bookmarks\"/);
  if (!match?.[1]) throw new Error("Bookmarks queryId not found");
  return { queryId: match[1] };
}

export function resolveBookmarksApiChunkUrl(html: string): string {
  // api hash -> shared bundle hash -> bundle hash
  return "";
}
```

**Step 4: Complete fetch + retry implementation**

```ts
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  // retry on 429/5xx with 1s/2s/4s
}

export async function fetchBookmarksPage(params: {
  cookieMap: Record<string, string>;
  count: number;
  cursor?: string;
}): Promise<unknown> {
  // load home html -> resolve chunk -> parse queryId -> request graphql
}
```

**Step 5: Run test to verify pass**

Run: `bun test skills/wqq-x-bookmarks/scripts/bookmarks-api.test.ts`  
Expected: PASS.

**Step 6: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/bookmarks-api.ts skills/wqq-x-bookmarks/scripts/bookmarks-api.test.ts
git commit -m "feat: add bookmarks graphql client with dynamic query id and retry"
```

### Task 5: 迁移输出命名与 skip 策略（TDD）

**Files:**
- Create: `skills/wqq-x-bookmarks/scripts/output.ts`
- Test: `skills/wqq-x-bookmarks/scripts/output.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { buildTweetOutputDirName, findExistingTweetMarkdownPath } from "./output";

describe("buildTweetOutputDirName", () => {
  test("uses title-author-id order", () => {
    const markdown = `---\nauthorUsername: "AI_Jasonyu"\n---\n\n# AI 增长框架\n正文`;
    const dir = buildTweetOutputDirName("2022", markdown);
    expect(dir.startsWith("AI-增长框架-")).toBe(true);
    expect(dir).toContain("-AI_Jasonyu-2022");
  });
});
```

**Step 2: Run test to verify fail**

Run: `bun test skills/wqq-x-bookmarks/scripts/output.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

```ts
export function buildTweetOutputDirName(tweetId: string, markdown: string): string {
  // prefer first H1 title, fallback body line
  return `${tweetId}`;
}

export function findExistingTweetMarkdownPath(baseDir: string, tweetId: string): string | null {
  // scan dirs and locate <tweetId>.md
  return null;
}
```

**Step 4: Run test to verify pass**

Run: `bun test skills/wqq-x-bookmarks/scripts/output.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/output.ts skills/wqq-x-bookmarks/scripts/output.test.ts
git commit -m "feat: add bookmark output naming and skip detection"
```

### Task 6: 实现 debug 入口并验证认证路径（TDD）

**Files:**
- Modify: `skills/wqq-x-bookmarks/scripts/debug.ts`
- Test: `skills/wqq-x-bookmarks/scripts/debug.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { parseDebugArgs } from "./debug";

describe("parseDebugArgs", () => {
  test("parses --count and --save-raw", () => {
    const args = parseDebugArgs(["--count", "5", "--save-raw"]);
    expect(args.count).toBe(5);
    expect(args.saveRaw).toBe(true);
  });
});
```

**Step 2: Run test to verify fail**

Run: `bun test skills/wqq-x-bookmarks/scripts/debug.test.ts`  
Expected: FAIL.

**Step 3: Implement debug flow**

```ts
// load cookies -> fetchBookmarksPage -> extractBookmarkPage -> print ids/cursor -> optional save raw
```

**Step 4: Verify tests and auth smoke**

Run: `bun test skills/wqq-x-bookmarks/scripts/debug.test.ts`  
Expected: PASS.

Run: `X_AUTH_TOKEN=fake X_CT0=fake npx -y bun skills/wqq-x-bookmarks/scripts/debug.ts --count 5 --save-raw`  
Expected: 明确 401/403 认证错误或 cookie 无效提示。

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/debug.ts skills/wqq-x-bookmarks/scripts/debug.test.ts
git commit -m "feat: add debug entry for x bookmarks auth and pagination"
```

### Task 7: 实现导出主链路并做 10 条 demo 验证（TDD）

**Files:**
- Modify: `skills/wqq-x-bookmarks/scripts/main.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/types.ts`
- Test: `skills/wqq-x-bookmarks/scripts/main.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { parseExportArgs } from "./main";

describe("parseExportArgs", () => {
  test("parses limit and no-download-media", () => {
    const args = parseExportArgs(["--limit", "10", "--no-download-media"]);
    expect(args.limit).toBe(10);
    expect(args.downloadMedia).toBe(false);
  });
});
```

**Step 2: Run test to verify fail**

Run: `bun test skills/wqq-x-bookmarks/scripts/main.test.ts`  
Expected: FAIL.

**Step 3: Implement export orchestration**

```ts
// collectBookmarkTweetIds -> exportSingleTweet -> summary
// ensure no empty dir on failure
// default limit 50, default media download true
```

**Step 4: Verify tests + 10-item demo**

Run: `bun test skills/wqq-x-bookmarks/scripts/main.test.ts`  
Expected: PASS.

Run: `npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --output /tmp/wqq-x-bookmarks-demo`  
Expected: 输出 success/failed/skipped。

Run (rerun): `npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --output /tmp/wqq-x-bookmarks-demo`  
Expected: skipped 显著增加。

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/main.ts skills/wqq-x-bookmarks/scripts/types.ts skills/wqq-x-bookmarks/scripts/main.test.ts
git commit -m "feat: export latest x bookmarks to markdown with skip policy"
```

### Task 8: 文档与仓库集成（README + smoke + skill docs）

**Files:**
- Create: `skills/wqq-x-bookmarks/README.md`
- Modify: `README.md`
- Modify: `scripts/smoke-test.sh`
- Modify: `skills/wqq-x-bookmarks/SKILL.md`

**Step 1: Write failing smoke expectation**

在 `scripts/smoke-test.sh` 添加新检查前，先执行当前 smoke：

Run: `bun run test:smoke`  
Expected: 当前不包含 `wqq-x-bookmarks` 检查（后续需要补齐）。

**Step 2: Add documentation and smoke checks**

新增内容：
- README 增加 `wqq-x-bookmarks` 用法
- SKILL 补齐 debug/export 工作流、参数、输出结构
- smoke 新增：
  - `bun skills/wqq-x-bookmarks/scripts/main.ts --help`
  - `bun skills/wqq-x-bookmarks/scripts/debug.ts --help`

**Step 3: Verify**

Run: `bun run test`  
Expected: PASS.

Run: `bun run test:smoke`  
Expected: PASS.

**Step 4: Commit**

```bash
git add skills/wqq-x-bookmarks/README.md skills/wqq-x-bookmarks/SKILL.md README.md scripts/smoke-test.sh
git commit -m "docs: integrate wqq x bookmarks skill into repository workflows"
```

### Task 9: 全量验证与完成前检查

**Files:**
- Verify only (no required code changes)

**Step 1: Run full verification**

Run: `bun run typecheck`  
Expected: PASS.

Run: `bun run test`  
Expected: PASS.

Run: `bun run test:smoke`  
Expected: PASS.

**Step 2: Manual demo verification**

Run: `npx -y bun skills/wqq-x-bookmarks/scripts/debug.ts --count 5 --save-raw`  
Expected: 输出 ids/cursor 或明确认证错误。

Run: `npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --output /tmp/wqq-x-bookmarks-demo-final`  
Expected: 产出 `标题-作者-id/<tweetId>.md`，无空目录。

**Step 3: Commit final docs/adjustments if needed**

```bash
git add -A
git commit -m "chore: finalize wqq x bookmarks migration verification"
```

## Execution Notes

- Relevant skills: @test-driven-development @coding-standards @verification-before-completion
- YAGNI: 仅迁移并固化 PoC 必需能力，不增加平台化抽象。
- DRY: 优先复用 `skills/shared`，避免 `wqq-x-bookmarks` 内重复底层逻辑。
- Frequent commits: 每个 Task 完成后单独提交。
