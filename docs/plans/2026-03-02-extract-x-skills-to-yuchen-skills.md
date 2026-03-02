# Extract X Skills to yuchen-skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract `wqq-x-bookmarks` and `wqq-x-to-md` (and their shared `x-runtime`) from `wqq-wechat-skills` into a new standalone repo `~/Code/Personal/yuchen-skills`.

**Architecture:** Simple file copy approach — no git history migration. New repo gets a fresh `git init`, copied files, proper `package.json`/`tsconfig.json`/`CLAUDE.md`/`marketplace.json`, and an initial commit. Then `wqq-wechat-skills` is cleaned up by deleting the moved files and updating docs.

**Tech Stack:** Bun runtime, TypeScript, Claude Code skills plugin system (`.claude-plugin/marketplace.json`)

---

### Task 1: Initialize the new yuchen-skills repository

**Files:**
- Create: `~/Code/Personal/yuchen-skills/` (new git repo)

**Step 1: Create directory and initialize git**

```bash
mkdir -p ~/Code/Personal/yuchen-skills
cd ~/Code/Personal/yuchen-skills
git init
```

Expected output: `Initialized empty Git repository in .../yuchen-skills/.git/`

**Step 2: Create the skills/shared directory structure**

```bash
mkdir -p ~/Code/Personal/yuchen-skills/skills/shared
mkdir -p ~/Code/Personal/yuchen-skills/.claude-plugin
mkdir -p ~/Code/Personal/yuchen-skills/node_modules
```

---

### Task 2: Copy shared utilities to new repo

**Files:**
- Source: `~/Code/Personal/wqq-wechat-skills/skills/shared/` (all files)
- Dest: `~/Code/Personal/yuchen-skills/skills/shared/`

**Step 1: Copy all shared files (including x-runtime)**

```bash
cp -r ~/Code/Personal/wqq-wechat-skills/skills/shared/. \
      ~/Code/Personal/yuchen-skills/skills/shared/
```

**Step 2: Verify the copy**

```bash
ls ~/Code/Personal/yuchen-skills/skills/shared/
```

Expected: `arg-parser.ts  arg-parser.test.ts  retry.ts  retry.test.ts  wqq-skills-env.ts  x-runtime/`

---

### Task 3: Copy X skills to new repo

**Files:**
- Source: `~/Code/Personal/wqq-wechat-skills/skills/wqq-x-bookmarks/`
- Source: `~/Code/Personal/wqq-wechat-skills/skills/wqq-x-to-md/`
- Dest: `~/Code/Personal/yuchen-skills/skills/`

**Step 1: Copy wqq-x-bookmarks**

```bash
cp -r ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-bookmarks \
      ~/Code/Personal/yuchen-skills/skills/
```

**Step 2: Copy wqq-x-to-md**

```bash
cp -r ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-to-md \
      ~/Code/Personal/yuchen-skills/skills/
```

**Step 3: Verify**

```bash
ls ~/Code/Personal/yuchen-skills/skills/
```

Expected: `shared/  wqq-x-bookmarks/  wqq-x-to-md/`

---

### Task 4: Create package.json and tsconfig.json

**Files:**
- Create: `~/Code/Personal/yuchen-skills/package.json`
- Create: `~/Code/Personal/yuchen-skills/tsconfig.json`

**Step 1: Create package.json**

```bash
cat > ~/Code/Personal/yuchen-skills/package.json << 'EOF'
{
  "name": "yuchen-skills",
  "version": "0.1.0",
  "private": true,
  "description": "Personal Claude Code skills for X/Twitter media platform research",
  "scripts": {
    "test": "bun test skills/**/*.test.ts",
    "typecheck": "bunx tsc --noEmit"
  },
  "devDependencies": {
    "bun-types": "^1.3.7"
  }
}
EOF
```

**Step 2: Create tsconfig.json** (identical to wqq-wechat-skills)

```bash
cat > ~/Code/Personal/yuchen-skills/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "skills/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    ".wqq-skills",
    ".baoyu-skills"
  ]
}
EOF
```

**Step 3: Install bun-types**

```bash
cd ~/Code/Personal/yuchen-skills && bun install
```

Expected: `bun-types` installed, `bun.lock` created.

---

### Task 5: Create marketplace.json for Claude plugin registration

**Files:**
- Create: `~/Code/Personal/yuchen-skills/.claude-plugin/marketplace.json`

**Step 1: Create marketplace.json**

```bash
cat > ~/Code/Personal/yuchen-skills/.claude-plugin/marketplace.json << 'EOF'
{
  "name": "yuchen-skills",
  "owner": {
    "name": "wqq",
    "email": ""
  },
  "metadata": {
    "description": "Personal skills for X/Twitter media research and export",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "x-media-tools",
      "description": "X/Twitter content export and research tools",
      "source": "./",
      "strict": false,
      "skills": [
        "./skills/wqq-x-bookmarks",
        "./skills/wqq-x-to-md"
      ]
    }
  ]
}
EOF
```

---

### Task 6: Create CLAUDE.md for new repo

**Files:**
- Create: `~/Code/Personal/yuchen-skills/CLAUDE.md`

**Step 1: Write CLAUDE.md**

```bash
cat > ~/Code/Personal/yuchen-skills/CLAUDE.md << 'EOF'
# CLAUDE.md

This repository contains personal Claude Code skills for X/Twitter media platform research.

## Principles

- Workflows live in `SKILL.md` + `references/`.
- Deterministic work lives in `scripts/*.ts` executed via Bun.
- No external npm dependencies for MVP (Bun runtime only).

## Running scripts

```bash
npx -y bun skills/<skill>/scripts/main.ts --help
```

### Direct script execution

```bash
# Export X bookmarks
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 50

# Convert X URLs to Markdown
npx -y bun skills/wqq-x-to-md/scripts/main.ts \
  --urls https://x.com/<user>/status/<id>
```

## Secrets

- Put API keys in `$HOME/.wqq-skills/.env`.
- Do not commit secrets; `.wqq-skills/` is gitignored.
- File-only keys (read only from `$HOME/.wqq-skills/.env`): `OPENAI_API_KEY`, `OPENAI_BASE_URL`.
- X auth: `X_AUTH_TOKEN`, `X_CT0` (or auto-read from Chrome cookies via `python3` + `browser_cookie3`).

## Development

### Type checking

```bash
bun run typecheck
```

### Testing

```bash
bun run test
```

### Project structure

```
skills/
  shared/              # Shared utilities
    retry.ts           # Retry with exponential backoff
    arg-parser.ts      # CLI argument parsing helpers
    wqq-skills-env.ts  # Env/secrets loader
    x-runtime/         # X/Twitter API client, auth, media download
  wqq-x-bookmarks/     # Export X bookmarks to Markdown
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
  wqq-x-to-md/         # Convert X URLs to Markdown
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
```
EOF
```

---

### Task 7: Create .gitignore

**Files:**
- Create: `~/Code/Personal/yuchen-skills/.gitignore`

**Step 1: Write .gitignore**

```bash
cat > ~/Code/Personal/yuchen-skills/.gitignore << 'EOF'
node_modules/
dist/
.wqq-skills/
.baoyu-skills/
*.local
EOF
```

---

### Task 8: Verify new repo builds and tests pass

**Step 1: Run typecheck**

```bash
cd ~/Code/Personal/yuchen-skills && bun run typecheck
```

Expected: No errors output.

**Step 2: Run tests**

```bash
cd ~/Code/Personal/yuchen-skills && bun run test
```

Expected: All tests pass (same test suite as was passing in wqq-wechat-skills for these files).

---

### Task 9: Initial commit in new repo

**Step 1: Stage all files**

```bash
cd ~/Code/Personal/yuchen-skills
git add .
```

**Step 2: Commit**

```bash
git commit -m "feat: initial commit — X/Twitter media research skills

Extracted from wqq-wechat-skills. Contains:
- wqq-x-bookmarks: export X bookmarks to Markdown
- wqq-x-to-md: convert X/Twitter URLs to Markdown
- shared/x-runtime: X API client, auth, media download"
```

---

### Task 10: Remove X files from wqq-wechat-skills

**Working directory:** `~/Code/Personal/wqq-wechat-skills`

**Step 1: Delete wqq-x-bookmarks skill**

```bash
rm -rf ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-bookmarks
```

**Step 2: Delete wqq-x-to-md skill**

```bash
rm -rf ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-to-md
```

**Step 3: Delete shared/x-runtime**

```bash
rm -rf ~/Code/Personal/wqq-wechat-skills/skills/shared/x-runtime
```

**Step 4: Verify remaining shared files are intact**

```bash
ls ~/Code/Personal/wqq-wechat-skills/skills/shared/
```

Expected: `arg-parser.ts  arg-parser.test.ts  retry.ts  retry.test.ts  wqq-skills-env.ts`

---

### Task 11: Update CLAUDE.md in wqq-wechat-skills

**Files:**
- Modify: `~/Code/Personal/wqq-wechat-skills/CLAUDE.md`

**Step 1: Update the project structure section** — remove x-runtime reference, update description to remove X mention

Replace the project structure block so it reads:

```
skills/
  shared/              # Shared utilities
    retry.ts           # Retry with exponential backoff
    arg-parser.ts      # CLI argument parsing helpers
    wqq-skills-env.ts  # Env/secrets loader
  wqq-image-gen/       # Image generation skill
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
  wqq-wechat-article/  # WeChat article skill
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
scripts/
  smoke-test.sh        # Integration smoke tests
```

Use the Edit tool (not sed) to make this change precisely.

---

### Task 12: Verify wqq-wechat-skills still builds and tests pass

**Step 1: Run typecheck**

```bash
cd ~/Code/Personal/wqq-wechat-skills && bun run typecheck
```

Expected: No errors.

**Step 2: Run tests**

```bash
cd ~/Code/Personal/wqq-wechat-skills && bun run test
```

Expected: All tests pass (wqq-wechat-article and wqq-image-gen tests only).

---

### Task 13: Commit cleanup in wqq-wechat-skills

**Step 1: Stage deletions and CLAUDE.md update**

```bash
cd ~/Code/Personal/wqq-wechat-skills
git add -A
git status
```

Verify only deleted files and CLAUDE.md modification are staged.

**Step 2: Commit**

```bash
git commit -m "chore: extract X skills to yuchen-skills repo

Removed wqq-x-bookmarks, wqq-x-to-md, and shared/x-runtime.
These are now maintained in ~/Code/Personal/yuchen-skills."
```
