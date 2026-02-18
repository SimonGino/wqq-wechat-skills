# Baoyu Danger X To Markdown Shared Runtime Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `wqq-wechat-skills` 中将 X 核心运行时统一到 `skills/shared/x-runtime`，并保证 `baoyu-danger-x-to-markdown` 对外行为 100% 兼容。  
**Architecture:** 采用 shared-first 收敛：先在 shared 增强 cookies refresh 与持久化能力，再将 `baoyu-danger-x-to-markdown` 改为业务编排层（consent/EXTEND/CLI）。`wqq-x-bookmarks` 继续复用 shared，不做行为变更。  
**Tech Stack:** Bun, TypeScript, Node.js fs/path/process, bun:test

---

Skills to apply during execution: `@test-driven-development` `@verification-before-completion` `@coding-standards`

### Task 1: Add shared runtime path helpers

**Files:**
- Create: `skills/shared/x-runtime/paths.ts`
- Create: `skills/shared/x-runtime/paths.test.ts`
- Modify: `skills/shared/x-runtime/constants.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import {
  resolveXRuntimeDataDir,
  resolveXRuntimeCookiePath,
  resolveXRuntimeChromeProfileDir,
} from "./paths";

describe("x-runtime paths", () => {
  test("uses X_DATA_DIR override when provided", () => {
    const dataDir = resolveXRuntimeDataDir({
      env: { X_DATA_DIR: "/tmp/x-data" },
      platform: "darwin",
      homedir: "/Users/demo",
    });
    expect(dataDir).toBe("/tmp/x-data");
  });

  test("builds cookie and profile paths from data dir", () => {
    const env = { X_DATA_DIR: "/tmp/x-data" };
    expect(resolveXRuntimeCookiePath({ env, platform: "linux", homedir: "/home/demo" })).toBe(
      "/tmp/x-data/cookies.json"
    );
    expect(resolveXRuntimeChromeProfileDir({ env, platform: "linux", homedir: "/home/demo" })).toBe(
      "/tmp/x-data/chrome-profile"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/shared/x-runtime/paths.test.ts`  
Expected: FAIL with module not found for `./paths`

**Step 3: Write minimal implementation**

```ts
import os from "node:os";
import path from "node:path";

export type PathEnv = Record<string, string | undefined>;

export function resolveXRuntimeDataDir(input?: { env?: PathEnv; platform?: NodeJS.Platform; homedir?: string }): string {
  const env = input?.env ?? process.env;
  const platform = input?.platform ?? process.platform;
  const home = input?.homedir ?? os.homedir();
  const override = env.X_DATA_DIR?.trim();
  if (override) return path.resolve(override);
  if (platform === "darwin") return path.join(home, "Library", "Application Support", "baoyu-skills", "x-to-markdown");
  if (platform === "win32") return path.join(env.APPDATA ?? path.join(home, "AppData", "Roaming"), "baoyu-skills", "x-to-markdown");
  return path.join(env.XDG_DATA_HOME ?? path.join(home, ".local", "share"), "baoyu-skills", "x-to-markdown");
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/shared/x-runtime/paths.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add skills/shared/x-runtime/paths.ts skills/shared/x-runtime/paths.test.ts skills/shared/x-runtime/constants.ts
git commit -m "refactor(x-runtime): add shared path helpers for x data files"
```

### Task 2: Add shared cookie file persistence helpers

**Files:**
- Create: `skills/shared/x-runtime/cookie-store.ts`
- Create: `skills/shared/x-runtime/cookie-store.test.ts`
- Modify: `skills/shared/x-runtime/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readCookieFile, writeCookieFile } from "./cookie-store";

describe("cookie-store", () => {
  test("reads v1 cookieMap format", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cookie-store-"));
    const file = path.join(dir, "cookies.json");
    writeFileSync(file, JSON.stringify({ version: 1, cookieMap: { auth_token: "a", ct0: "b" } }), "utf8");
    const out = await readCookieFile(file);
    expect(out?.auth_token).toBe("a");
    expect(out?.ct0).toBe("b");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/shared/x-runtime/cookie-store.test.ts`  
Expected: FAIL with module not found for `./cookie-store`

**Step 3: Write minimal implementation**

```ts
export async function readCookieFile(filePath: string): Promise<Record<string, string> | null> {
  // Support legacy {cookies:{...}} and v1 {cookieMap:{...}}
}

export async function writeCookieFile(filePath: string, cookieMap: Record<string, string>, source?: string): Promise<void> {
  // Persist v1 payload with updatedAt/source
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/shared/x-runtime/cookie-store.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add skills/shared/x-runtime/cookie-store.ts skills/shared/x-runtime/cookie-store.test.ts skills/shared/x-runtime/types.ts
git commit -m "feat(x-runtime): add cookie file read/write helpers"
```

### Task 3: Add refreshable cookie loading in shared cookies module

**Files:**
- Modify: `skills/shared/x-runtime/cookies.ts`
- Modify: `skills/shared/x-runtime/cookies.test.ts`
- Create: `skills/shared/x-runtime/chrome-login.ts`
- Create: `skills/shared/x-runtime/chrome-login.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { loadXCookies, refreshXCookies } from "./cookies";

describe("cookies refresh", () => {
  test("refreshXCookies uses interactive loader and returns required cookies", async () => {
    const map = await refreshXCookies(undefined, {
      refreshFromBrowser: async () => ({ auth_token: "fresh-auth", ct0: "fresh-ct0" }),
      cookiePath: "/tmp/fake-cookies.json",
      writeToFile: async () => {},
    });
    expect(map.auth_token).toBe("fresh-auth");
    expect(map.ct0).toBe("fresh-ct0");
  });

  test("loadXCookies reads file before browser refresh", async () => {
    const map = await loadXCookies(undefined, {
      readFromFile: async () => ({ auth_token: "file-auth", ct0: "file-ct0" }),
      loadFromBrowser: async () => ({}),
    });
    expect(map.auth_token).toBe("file-auth");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/shared/x-runtime/cookies.test.ts`  
Expected: FAIL with `refreshXCookies is not a function` or options type mismatch

**Step 3: Write minimal implementation**

```ts
export async function loadXCookies(log?: (message: string) => void, options: LoadXCookiesOptions = {}): Promise<XCookieMap> {
  // Priority: env -> file -> browser fallback
}

export async function refreshXCookies(log?: (message: string) => void, options: RefreshXCookiesOptions = {}): Promise<XCookieMap> {
  // Force browser refresh, persist file, return cookie map
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/shared/x-runtime/cookies.test.ts skills/shared/x-runtime/chrome-login.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add skills/shared/x-runtime/cookies.ts skills/shared/x-runtime/cookies.test.ts skills/shared/x-runtime/chrome-login.ts skills/shared/x-runtime/chrome-login.test.ts
git commit -m "feat(x-runtime): add refreshable cookie loading with browser login"
```

### Task 4: Keep shared consumers stable (bookmarks compatibility)

**Files:**
- Modify: `skills/wqq-x-bookmarks/scripts/main.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/debug.ts`
- Test: `skills/wqq-x-bookmarks/scripts/main.test.ts`
- Test: `skills/wqq-x-bookmarks/scripts/debug.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { parseExportArgs } from "./main";

describe("bookmarks compatibility", () => {
  test("keeps default flags unchanged", () => {
    const args = parseExportArgs([]);
    expect(args.limit).toBe(50);
    expect(args.downloadMedia).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails (if API drift breaks imports/types)**

Run: `bun test skills/wqq-x-bookmarks/scripts/main.test.ts skills/wqq-x-bookmarks/scripts/debug.test.ts`  
Expected: FAIL if shared cookie API changes are incompatible

**Step 3: Write minimal implementation**

```ts
// Keep existing call sites unchanged:
const rawCookieMap = await loadXCookies(log);
if (!hasRequiredXCookies(rawCookieMap)) {
  throw new Error("Missing auth cookies. Provide X_AUTH_TOKEN and X_CT0.");
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/wqq-x-bookmarks/scripts/main.test.ts skills/wqq-x-bookmarks/scripts/debug.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add skills/wqq-x-bookmarks/scripts/main.ts skills/wqq-x-bookmarks/scripts/debug.ts skills/wqq-x-bookmarks/scripts/main.test.ts skills/wqq-x-bookmarks/scripts/debug.test.ts
git commit -m "test(bookmarks): lock compatibility with shared cookie API"
```

### Task 5: Move baoyu main flow to shared runtime imports

**Files:**
- Modify: `skills/baoyu-danger-x-to-markdown/scripts/main.ts`
- Create: `skills/baoyu-danger-x-to-markdown/scripts/main.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { parseArgs } from "./main";

describe("x-to-markdown args", () => {
  test("parses --download-media and --json", () => {
    const args = parseArgs(["https://x.com/a/status/1", "--download-media", "--json"]);
    expect(args.downloadMedia).toBe(true);
    expect(args.json).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/baoyu-danger-x-to-markdown/scripts/main.test.ts`  
Expected: FAIL because `parseArgs` not exported or behavior mismatch

**Step 3: Write minimal implementation**

```ts
import { fetchXArticle } from "../../shared/x-runtime/graphql";
import { formatArticleMarkdown } from "../../shared/x-runtime/markdown";
import { localizeMarkdownMedia } from "../../shared/x-runtime/media-localizer";
import { hasRequiredXCookies, loadXCookies, refreshXCookies } from "../../shared/x-runtime/cookies";
import { tweetToMarkdown } from "../../shared/x-runtime/tweet-to-markdown";
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/baoyu-danger-x-to-markdown/scripts/main.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add skills/baoyu-danger-x-to-markdown/scripts/main.ts skills/baoyu-danger-x-to-markdown/scripts/main.test.ts
git commit -m "refactor(x-to-markdown): use shared x-runtime in main flow"
```

### Task 6: Implement EXTEND preferences with blocking first-time setup

**Files:**
- Create: `skills/baoyu-danger-x-to-markdown/scripts/extend.ts`
- Create: `skills/baoyu-danger-x-to-markdown/scripts/extend.test.ts`
- Modify: `skills/baoyu-danger-x-to-markdown/scripts/main.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { resolvePreferenceValues } from "./extend";

describe("extend preferences", () => {
  test("applies priority cli > extend > default", () => {
    const out = resolvePreferenceValues(
      { cliDownloadMedia: undefined, cliOutput: null },
      { downloadMedia: "1", defaultOutputDir: "/tmp/x-out" }
    );
    expect(out.downloadMedia).toBe(true);
    expect(out.defaultOutputDir).toBe("/tmp/x-out");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/baoyu-danger-x-to-markdown/scripts/extend.test.ts`  
Expected: FAIL with module not found for `./extend`

**Step 3: Write minimal implementation**

```ts
export type ExtendConfig = {
  downloadMedia: "ask" | "1" | "0";
  defaultOutputDir: string;
};

export async function ensureExtendConfig(log: (message: string) => void): Promise<ExtendConfig> {
  // Find project/user EXTEND.md; if missing, run blocking interactive setup then persist.
}

export function resolvePreferenceValues(
  cli: { cliDownloadMedia: boolean | undefined; cliOutput: string | null },
  config: ExtendConfig
): { downloadMedia: boolean | "ask"; defaultOutputDir: string } {
  // Priority: CLI > EXTEND > defaults
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/baoyu-danger-x-to-markdown/scripts/extend.test.ts skills/baoyu-danger-x-to-markdown/scripts/main.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add skills/baoyu-danger-x-to-markdown/scripts/extend.ts skills/baoyu-danger-x-to-markdown/scripts/extend.test.ts skills/baoyu-danger-x-to-markdown/scripts/main.ts skills/baoyu-danger-x-to-markdown/scripts/main.test.ts
git commit -m "feat(x-to-markdown): add EXTEND preference flow with blocking setup"
```

### Task 7: Remove duplicated runtime files from baoyu skill

**Files:**
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/constants.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/cookie-file.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/cookies.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/graphql.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/http.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/markdown.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/media-localizer.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/thread-markdown.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/thread.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/tweet-article.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/tweet-to-markdown.ts`
- Delete: `skills/baoyu-danger-x-to-markdown/scripts/types.ts`
- Modify: `skills/baoyu-danger-x-to-markdown/SKILL.md`

**Step 1: Write the failing safety check**

```bash
rg -n "from \"\./(cookies|graphql|http|markdown|media-localizer|thread|tweet|types|constants)" skills/baoyu-danger-x-to-markdown/scripts
```

Expected before cleanup: non-empty output

**Step 2: Run safety check to verify references exist**

Run: the `rg` command above  
Expected: matches found in `main.ts`

**Step 3: Write minimal implementation**

```ts
// main.ts imports only shared x-runtime modules and local extend/paths helpers.
```

Then remove duplicate files listed above.

**Step 4: Run verification to confirm cleanup passes**

Run:
- `rg -n "from \"\./(cookies|graphql|http|markdown|media-localizer|thread|tweet|types|constants)" skills/baoyu-danger-x-to-markdown/scripts`
- `bun run typecheck`

Expected: no stale local runtime imports, typecheck PASS

**Step 5: Commit**

```bash
git add skills/baoyu-danger-x-to-markdown/scripts skills/baoyu-danger-x-to-markdown/SKILL.md
git commit -m "refactor(x-to-markdown): remove duplicated runtime and rely on shared layer"
```

### Task 8: Update docs and smoke coverage, then full verification

**Files:**
- Modify: `README.md`
- Modify: `skills/baoyu-danger-x-to-markdown/SKILL.md`
- Modify: `scripts/smoke-test.sh`

**Step 1: Write the failing smoke expectation**

```bash
bun skills/baoyu-danger-x-to-markdown/scripts/main.ts --help | rg "Usage:"
```

Expected before update: may fail if smoke script has no x-to-markdown coverage

**Step 2: Run smoke expectation to verify gap**

Run: `./scripts/smoke-test.sh`  
Expected: currently does not check `baoyu-danger-x-to-markdown`

**Step 3: Write minimal implementation**

```bash
# Add smoke sections:
# Test: x-to-markdown --help
# Test: x-to-markdown --login help/error branch
```

And add concise usage docs to root README.

**Step 4: Run full verification**

Run:
- `bun run typecheck`
- `bun run test`
- `bun run test:smoke`

Expected: all PASS

**Step 5: Commit**

```bash
git add README.md skills/baoyu-danger-x-to-markdown/SKILL.md scripts/smoke-test.sh
git commit -m "docs(test): add x-to-markdown smoke coverage and usage docs"
```

## Final Verification Checklist

- [ ] `baoyu-danger-x-to-markdown` retains consent flow and `--login` behavior.
- [ ] EXTEND first-time setup is blocking and persisted.
- [ ] CLI priority is `CLI > EXTEND > default`.
- [ ] `wqq-x-bookmarks` behavior unchanged.
- [ ] No duplicated X runtime implementation remains under `skills/baoyu-danger-x-to-markdown/scripts`.
- [ ] `bun run typecheck && bun run test && bun run test:smoke` all pass.
