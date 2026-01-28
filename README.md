# wqq-wechat-skills

English | [中文](./README.zh.md)

Personal Claude Code skills for a simple WeChat tutorial article workflow.

## MVP

- Manually collect sources → save as markdown files
- Draft a tutorial-style WeChat article in Markdown
- Generate infographic prompts and images (optional)

## Usage in Claude Code

### Using skills directly

The recommended way is to use the skills within Claude Code:

1) Prepare your source materials as markdown files with YAML frontmatter
2) Use the skill command:

```
/wqq-wechat-article
```

Claude will:
- Ask you for the one-sentence summary and outline
- Read your source files
- Generate the complete article structure automatically

For image generation:

```
/wqq-image-gen
```

Claude will ask for the prompt and generate the image.

## Recommended MVP workflow

### Option 1: Using skills in Claude Code (Recommended)

1) Manually collect sources and save them as markdown files with YAML frontmatter:

```markdown
---
title: Source Title
url: https://example.com
author: Author Name
date: 2026-01-28
---

Source content here...
```

2) In Claude Code, run:

```
/wqq-wechat-article
```

Claude will guide you through the process.

### Option 2: Using CLI directly

1) Prepare sources as above

2) Run the article generation script:

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts \
  --sources sources/*.md \
  --summary "手把手教你使用某技术" \
  --outline "安装环境,创建项目,编写代码,测试部署"
```

Outputs:
- `wechat-article/<topic>/01-sources.md`: Merged sources
- `wechat-article/<topic>/02-outline.md`: Article outline
- `wechat-article/<topic>/03-article.md`: Draft article (needs manual completion)
- `wechat-article/<topic>/04-infographics/prompts.md`: Infographic prompts

3) Complete the article by editing `03-article.md` based on the tutorial template.

4) (Optional) Generate infographics:

```bash
npx -y bun skills/wqq-image-gen/scripts/main.ts \
  --prompt "Create a flowchart about..." \
  --image wechat-article/<topic>/04-infographics/01-flowchart.png \
  --ar 1:1 \
  --quality 2k
```

## Features

- **Automated workflow**: Scripts handle file organization and template generation
- **Smart retry**: Image generation retries with exponential backoff (3 attempts)
- **Error handling**: Helpful error messages with troubleshooting tips
- **Type safety**: Full TypeScript type checking
- **Tested**: Unit tests + integration smoke tests

## API keys

`wqq-image-gen` supports OpenAI or Google (auto-detected by available keys).

Recommended `.env` setup (do not commit):

```bash
mkdir -p ~/.wqq-skills
cat > ~/.wqq-skills/.env << 'EOF'
OPENAI_API_KEY=sk-xxx
OPENAI_IMAGE_MODEL=gpt-image-1.5

GOOGLE_API_KEY=xxx
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview
EOF
```

## Limitations

- This MVP does not include automated web scraping/crawling.

## Install

```bash
/plugin marketplace add <your-github-username>/wqq-wechat-skills
```

## Skills

- `wqq-wechat-article` - WeChat tutorial article generator
- `wqq-image-gen` - Infographic image generator (OpenAI/Google)

## Development

### Setup

```bash
# Install dependencies
bun install

# Type checking
bun run typecheck

# Run tests
bun run test

# Run smoke tests
bun run test:smoke
```

### Project structure

```
skills/
  shared/              # Shared utilities
    retry.ts           # Retry with exponential backoff
    arg-parser.ts      # CLI argument parsing helpers
  wqq-image-gen/       # Image generation skill
  wqq-wechat-article/  # WeChat article skill
scripts/
  smoke-test.sh        # Integration tests
remotion-skills/       # Example source materials
  sources/             # Sample markdown sources for testing
```

### Contributing

This is a personal skills repository. Feel free to fork and adapt for your needs.
