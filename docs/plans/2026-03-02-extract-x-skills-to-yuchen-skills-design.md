# Design: Extract X Skills to yuchen-skills

Date: 2026-03-02

## Background

`wqq-wechat-skills` currently contains four skills:
- `wqq-wechat-article` — WeChat tutorial article generation
- `wqq-image-gen` — AI image generation backend
- `wqq-x-bookmarks` — Export X bookmarks to Markdown
- `wqq-x-to-md` — Convert X/Twitter URLs to local Markdown

The X-related skills (`wqq-x-bookmarks`, `wqq-x-to-md`) and their shared runtime (`shared/x-runtime/`) serve a different domain (media platform research) from the WeChat article workflow. Splitting them into a dedicated repository improves cohesion.

## Goal

Create a new repository `~/Code/Personal/yuchen-skills` containing the X-platform skills, and clean up `wqq-wechat-skills` to contain only WeChat-related skills.

## Approach

**Method: Simple file copy (no git history migration)**

These are personal skill tool repos where commit history is not a critical asset. A clean copy is simpler and avoids git surgery risk.

## Target Structure

### `wqq-wechat-skills` (after cleanup)

```
skills/
  shared/
    retry.ts
    arg-parser.ts
    wqq-skills-env.ts
  wqq-image-gen/
  wqq-wechat-article/
```

### `yuchen-skills` (new repo at ~/Code/Personal/yuchen-skills)

```
skills/
  shared/
    retry.ts
    arg-parser.ts
    wqq-skills-env.ts
    x-runtime/           ← moved from wqq-wechat-skills
  wqq-x-bookmarks/       ← moved from wqq-wechat-skills
  wqq-x-to-md/           ← moved from wqq-wechat-skills
.claude-plugin/
  marketplace.json       ← new, registers both X skills
package.json             ← name: yuchen-skills
tsconfig.json
CLAUDE.md
```

## Execution Steps

1. `git init ~/Code/Personal/yuchen-skills`
2. Copy `skills/shared/` (all files) + `skills/wqq-x-bookmarks/` + `skills/wqq-x-to-md/` to new repo
3. Copy `package.json` and `tsconfig.json`, update `name` to `yuchen-skills`
4. Create `.claude-plugin/marketplace.json` registering `wqq-x-bookmarks` and `wqq-x-to-md`
5. Create `CLAUDE.md` describing the new repo purpose
6. Initial commit in new repo
7. Delete `skills/wqq-x-bookmarks/`, `skills/wqq-x-to-md/`, `skills/shared/x-runtime/` from `wqq-wechat-skills`
8. Update `wqq-wechat-skills/CLAUDE.md` to remove X-related references
9. Commit cleanup in `wqq-wechat-skills`

## Success Criteria

- `yuchen-skills` passes `bun run typecheck` and `bun run test`
- `wqq-wechat-skills` passes `bun run typecheck` and `bun run test`
- Both repos have correct `marketplace.json` registrations
- No cross-repo file references remain
