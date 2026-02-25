# WQQ X URLs Zh Markdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new skill that exports a provided list of X status URLs to per-tweet Markdown directories, localizes media, and translates English content to Chinese while preserving Markdown structure.

**Architecture:** Add a thin `wqq-x-urls-zh-md` skill that reuses shared `x-runtime` modules for tweet fetching and media localization plus `wqq-x-bookmarks` output naming helpers. Add a dedicated translation module using OpenAI with Markdown/frontmatter preservation and English-detection gating.

**Tech Stack:** Bun (TypeScript), existing shared x-runtime modules, OpenAI HTTP API (`/responses` fallback `/chat/completions`), bun:test

---

### Task 1: Add Failing Tests for New Skill CLI and Translation Helpers

**Files:**
- Create: `skills/wqq-x-urls-zh-md/scripts/main.test.ts`
- Create: `skills/wqq-x-urls-zh-md/scripts/translate.test.ts`
- Create: `skills/wqq-x-urls-zh-md/scripts/main.ts` (test import target, minimal stub allowed)
- Create: `skills/wqq-x-urls-zh-md/scripts/translate.ts` (test import target, minimal stub allowed)

**Step 1: Write failing tests**

- `parseCliArgs` defaults and `--urls` parsing
- `isLikelyEnglishMarkdown` English vs Chinese skip detection
- `translateMarkdownToChinese` preserves frontmatter and code fences while translating body (mock fetch)
- `runXUrlsExport` skips existing files and aggregates success/skipped/failed using injected dependencies

**Step 2: Run targeted tests to verify RED**

Run: `bun test skills/wqq-x-urls-zh-md/scripts/*.test.ts`

Expected: FAIL with missing exports or failing assertions

**Step 3: Commit**

Skip commit unless explicitly requested.

### Task 2: Implement Translation Module (Minimal Green)

**Files:**
- Modify: `skills/wqq-x-urls-zh-md/scripts/translate.ts`

**Step 1: Implement Markdown/frontmatter split + English detection**

- Keep frontmatter unchanged
- Heuristic English detection on body text (ignore URLs/code fences enough to avoid obvious false positives)
- Return original markdown for non-English content

**Step 2: Implement OpenAI translation request**

- Use `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, optional `OPENAI_MODEL`
- Try `/responses`, fallback `/chat/completions`
- Prompt must preserve Markdown structure, links, inline code, fenced code blocks

**Step 3: Add placeholder preservation**

- Preserve fenced code blocks and inline code before model translation
- Restore placeholders after translation
- Reject obviously invalid output (empty body)

**Step 4: Run translation tests**

Run: `bun test skills/wqq-x-urls-zh-md/scripts/translate.test.ts`

Expected: PASS

### Task 3: Implement Batch X URL Export CLI (Minimal Green)

**Files:**
- Modify: `skills/wqq-x-urls-zh-md/scripts/main.ts`
- Create: `skills/wqq-x-urls-zh-md/scripts/types.ts` (if needed)

**Step 1: Implement CLI parser**

- `--urls <urls...>` (required)
- `--output <dir>` (optional, default `wqq-x-urls-zh-md-output`)
- `--no-download-media` (optional)
- `--help`

**Step 2: Implement export loop with dependency injection**

- Reuse `loadXCookies` and `hasRequiredXCookies`
- Reuse `tweetToMarkdown`
- Reuse `buildTweetOutputDirName`, `findExistingTweetMarkdownPath`, `resolveTweetOutputPath`
- Reuse `localizeMarkdownMedia`
- Call translation module and write final Chinese markdown only
- Aggregate `success/skipped/failed`

**Step 3: Run CLI unit tests**

Run: `bun test skills/wqq-x-urls-zh-md/scripts/main.test.ts`

Expected: PASS

### Task 4: Add Skill Packaging and Documentation

**Files:**
- Create: `skills/wqq-x-urls-zh-md/SKILL.md`
- Modify: `README.md`
- Modify: `scripts/smoke-test.sh` (help smoke checks)

**Step 1: Write concise SKILL.md**

- Trigger conditions for pasted X status URLs
- Usage examples with `--urls`
- Note env vars (`X_AUTH_TOKEN`, `X_CT0`, `OPENAI_API_KEY`)
- Output directory structure matches `wqq-x-bookmarks`

**Step 2: Update README**

- Add skill to list + example commands
- Mention chaining into `wqq-wechat-article --workspace`

**Step 3: Add smoke test help check**

- Verify `bun skills/wqq-x-urls-zh-md/scripts/main.ts --help`

### Task 5: Verification

**Files:**
- No code changes (verification only)

**Step 1: Run targeted tests**

Run: `bun test skills/wqq-x-urls-zh-md/scripts/*.test.ts`

Expected: PASS

**Step 2: Run broader sanity checks**

Run: `bun run test:smoke`

Expected: PASS (or note unrelated failures)

**Step 3: Summarize outputs and usage**

- Provide exact command example for user’s pasted URLs
- Note prerequisites and known failure modes (cookie expiry, translation API errors)
