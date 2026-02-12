# CLAUDE.md

This repository contains personal Claude Code skills.

## Principles

- Workflows live in `SKILL.md` + `references/`.
- Deterministic work lives in `scripts/*.ts` executed via Bun.
- No external npm dependencies for MVP (Bun runtime only).

## Running scripts

```bash
npx -y bun skills/<skill>/scripts/main.ts --help
```

### Direct script execution

Both skills now support direct CLI execution:

```bash
# Generate WeChat article
npx -y bun skills/wqq-wechat-article/scripts/main.ts \
  --sources sources/*.md \
  --summary "一句话总结" \
  --outline "要点1,要点2,要点3"

# Generate infographic
npx -y bun skills/wqq-image-gen/scripts/main.ts \
  --prompt "Create an infographic" \
  --image output.png \
  --ar 1:1
```

## Secrets

- Put API keys in `$HOME/.wqq-skills/.env`.
- Optional: set `WQQ_PAST_ARTICLES_DIR` in `$HOME/.wqq-skills/.env` for private past-articles path.
- Do not commit secrets; `.wqq-skills/` is gitignored.
- Priority: process.env > `$HOME/.wqq-skills/.env`

## Development

### Type checking

```bash
bun run typecheck
```

### Testing

```bash
# Unit tests
bun run test

# Smoke tests
bun run test:smoke
```

### Project structure

```
skills/
  shared/              # Shared utilities
    retry.ts           # Retry with exponential backoff
    arg-parser.ts      # CLI argument parsing helpers
  wqq-image-gen/       # Image generation skill
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
  wqq-wechat-article/  # WeChat article skill
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
scripts/
  smoke-test.sh        # Integration smoke tests
```
